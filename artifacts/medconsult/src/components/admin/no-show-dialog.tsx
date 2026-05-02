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
import { useToast } from "@/hooks/use-toast";
import { UserX, Loader2, Mail } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

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

export function NoShowDialog({
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

  const surgeonName = appointment.surgeon
    ? `${appointment.surgeon.firstName} ${appointment.surgeon.lastName}`
    : "Unknown surgeon";

  const apptDate = new Date(appointment.startTime);
  const ago = formatDistanceToNow(apptDate, { addSuffix: true });

  function handleConfirm() {
    updateAppointment.mutate(
      { id: appointment.id, data: { status: "no_show" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListAppointmentsQueryKey({ customerId }),
          });
          toast({
            title: "Marked as no-show",
            description: customerEmail
              ? `Notification emails sent to ${customerEmail} and the surgeon.`
              : "Appointment status updated.",
          });
          onOpenChange(false);
        },
        onError: () => {
          toast({
            title: "Failed to update appointment",
            description: "Please try again.",
            variant: "destructive",
          });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-orange-500" />
            Mark as No-Show
          </DialogTitle>
          <DialogDescription>
            This records that the patient did not attend and sends notification emails to both parties.
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
              <span className="text-muted-foreground">Was scheduled for</span>
              <span className="font-medium">
                {format(apptDate, "d MMM yyyy, h:mm a")}
                <span className="text-muted-foreground font-normal ml-1.5 text-xs">({ago})</span>
              </span>
            </div>
          </div>

          {/* Email notice */}
          {customerEmail && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-orange-50/70 border border-orange-200 text-xs text-orange-800">
              <Mail className="h-4 w-4 shrink-0 mt-0.5 text-orange-500" />
              <p>
                A no-show notification will be sent to{" "}
                <span className="font-semibold">{customerEmail}</span> with a prompt to rebook, and to the surgeon for their records.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateAppointment.isPending}
          >
            Go Back
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={updateAppointment.isPending}
            className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
          >
            {updateAppointment.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {updateAppointment.isPending ? "Saving…" : "Mark No-Show & Notify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
