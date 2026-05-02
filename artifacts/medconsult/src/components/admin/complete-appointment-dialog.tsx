import { useState } from "react";
import { useLocation } from "wouter";
import {
  useUpdateAppointment,
  useCreateConsultationRecord,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, FileText } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Appointment {
  id: number;
  surgeonId: number;
  customerId: number;
  startTime: string;
  slotMinutes?: number | null;
  fee?: number | null;
  surgeon?: { firstName: string; lastName: string } | null;
  event?: { name: string } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment;
  customerId: number;
  customerName: string;
}

export function CompleteAppointmentDialog({
  open,
  onOpenChange,
  appointment,
  customerId,
  customerName,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const updateAppointment = useUpdateAppointment();
  const createRecord = useCreateConsultationRecord();
  const [createConsultation, setCreateConsultation] = useState(true);

  const surgeonName = appointment.surgeon
    ? `${appointment.surgeon.firstName} ${appointment.surgeon.lastName}`
    : "Unknown surgeon";

  const apptDate = new Date(appointment.startTime);
  const ago = formatDistanceToNow(apptDate, { addSuffix: true });
  const isPending = updateAppointment.isPending || createRecord.isPending;

  function handleConfirm() {
    updateAppointment.mutate(
      { id: appointment.id, data: { status: "completed" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListAppointmentsQueryKey({ customerId }),
          });

          if (createConsultation) {
            createRecord.mutate(
              {
                data: {
                  appointmentId: appointment.id,
                  surgeonId: appointment.surgeonId,
                  customerId: appointment.customerId,
                },
              },
              {
                onSuccess: (record) => {
                  toast({
                    title: "Appointment completed",
                    description: "Consultation record created — opening it now.",
                  });
                  onOpenChange(false);
                  navigate(`/admin/consultations/${record.id}`);
                },
                onError: () => {
                  toast({
                    title: "Appointment completed",
                    description:
                      "Status updated, but the consultation record could not be created. You can create it manually.",
                    variant: "destructive",
                  });
                  onOpenChange(false);
                },
              },
            );
          } else {
            toast({
              title: "Appointment completed",
              description: "Status updated and notification emails sent.",
            });
            onOpenChange(false);
          }
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
    <Dialog open={open} onOpenChange={(o) => { if (!isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-700">
            <CheckCircle2 className="h-5 w-5" />
            Mark as Completed
          </DialogTitle>
          <DialogDescription>
            This marks the consultation as done and notifies both the patient and surgeon.
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
              <span className="text-muted-foreground">Took place</span>
              <span className="font-medium">
                {format(apptDate, "d MMM yyyy, h:mm a")}
                <span className="text-muted-foreground font-normal ml-1.5 text-xs">({ago})</span>
              </span>
            </div>
            {appointment.fee != null && (
              <div className="flex justify-between items-center px-4 py-2.5">
                <span className="text-muted-foreground">Fee</span>
                <span className="font-medium">£{appointment.fee.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Create consultation record option */}
          <div
            className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
              createConsultation
                ? "bg-blue-50/60 border-blue-200"
                : "bg-muted/30 border-border"
            }`}
            onClick={() => setCreateConsultation((v) => !v)}
          >
            <Checkbox
              id="create-record"
              checked={createConsultation}
              onCheckedChange={(checked) => setCreateConsultation(!!checked)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label
                htmlFor="create-record"
                className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                Create consultation record
              </Label>
              <p className="text-xs text-muted-foreground">
                Opens a blank record for the surgeon's notes, answers, and clinical findings.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Go Back
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {isPending
              ? createConsultation
                ? "Creating record…"
                : "Completing…"
              : createConsultation
                ? "Complete & Create Record"
                : "Mark Complete & Notify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
