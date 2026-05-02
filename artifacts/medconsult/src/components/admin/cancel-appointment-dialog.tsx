import { useState } from "react";
import {
  useUpdateAppointment,
  getListAppointmentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2, Mail } from "lucide-react";
import { format } from "date-fns";

interface Appointment {
  id: number;
  startTime: string;
  slotMinutes?: number | null;
  surgeon?: { firstName: string; lastName: string } | null;
  event?: { name: string } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment;
  customerId: number;
  customerName: string;
  customerEmail?: string | null;
}

export function CancelAppointmentDialog({
  open,
  onOpenChange,
  appointment,
  customerId,
  customerName,
  customerEmail,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateAppointment = useUpdateAppointment();
  const [reason, setReason] = useState("");

  const surgeonName = appointment.surgeon
    ? `${appointment.surgeon.firstName} ${appointment.surgeon.lastName}`
    : "Unknown surgeon";

  function handleCancel() {
    updateAppointment.mutate(
      {
        id: appointment.id,
        data: {
          status: "cancelled",
          ...(reason.trim() && { notes: reason.trim() }),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListAppointmentsQueryKey({ customerId }),
          });
          toast({
            title: "Appointment cancelled",
            description: customerEmail
              ? `Cancellation emails sent to ${customerEmail} and the surgeon.`
              : "Appointment has been cancelled.",
          });
          onOpenChange(false);
          setReason("");
        },
        onError: () => {
          toast({
            title: "Failed to cancel appointment",
            description: "Please try again.",
            variant: "destructive",
          });
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setReason("");
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancel Appointment
          </DialogTitle>
          <DialogDescription>
            This will cancel the appointment and send notification emails to the patient and surgeon.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Appointment summary */}
          <div className="rounded-lg border bg-muted/40 divide-y text-sm">
            <div className="flex justify-between items-center px-4 py-2.5">
              <span className="text-muted-foreground">Patient</span>
              <span className="font-medium">{customerName}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5">
              <span className="text-muted-foreground">Event</span>
              <span className="font-medium">{appointment.event?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5">
              <span className="text-muted-foreground">Surgeon</span>
              <span className="font-medium">{surgeonName}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5">
              <span className="text-muted-foreground">Date &amp; Time</span>
              <span className="font-medium">
                {format(new Date(appointment.startTime), "d MMM yyyy, h:mm a")}
                {appointment.slotMinutes ? ` · ${appointment.slotMinutes} min` : ""}
              </span>
            </div>
          </div>

          {/* Email notice */}
          {customerEmail && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50/60 border border-blue-200 text-xs text-blue-800">
              <Mail className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
              <p>
                A cancellation email will be sent to{" "}
                <span className="font-semibold">{customerEmail}</span> and the surgeon automatically.
              </p>
            </div>
          )}

          {/* Optional reason */}
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason" className="text-sm">
              Cancellation reason{" "}
              <span className="text-muted-foreground font-normal">(optional — included in the email)</span>
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="e.g. Patient requested cancellation, surgeon unavailable…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setReason("");
              onOpenChange(false);
            }}
            disabled={updateAppointment.isPending}
          >
            Keep Appointment
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={updateAppointment.isPending}
            className="gap-2"
          >
            {updateAppointment.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {updateAppointment.isPending ? "Cancelling…" : "Cancel & Notify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
