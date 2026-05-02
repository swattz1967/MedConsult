import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CalendarClock, Loader2, ArrowRight } from "lucide-react";
import { addMinutes, format } from "date-fns";
import { cn } from "@/lib/utils";

interface Appointment {
  id: number;
  startTime: string;
  endTime: string;
  slotMinutes?: number | null;
  fee?: number | null;
  status: string;
  surgeon?: { firstName: string; lastName: string } | null;
  event?: { name: string } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment;
  customerId: number;
  customerEmail?: string | null;
  customerName: string;
}

const SLOT_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
];

function toLocalDateTimeString(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RescheduleAppointmentDialog({
  open,
  onOpenChange,
  appointment,
  customerId,
  customerEmail,
  customerName,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateAppointment = useUpdateAppointment();

  const [startTime, setStartTime] = useState(toLocalDateTimeString(appointment.startTime));
  const [slotMinutes, setSlotMinutes] = useState(String(appointment.slotMinutes ?? 30));
  const [fee, setFee] = useState(appointment.fee != null ? String(appointment.fee) : "");

  // Sync fields when a different appointment is opened
  useEffect(() => {
    setStartTime(toLocalDateTimeString(appointment.startTime));
    setSlotMinutes(String(appointment.slotMinutes ?? 30));
    setFee(appointment.fee != null ? String(appointment.fee) : "");
  }, [appointment.id, appointment.startTime, appointment.slotMinutes, appointment.fee]);

  const endTime = startTime
    ? addMinutes(new Date(startTime), Number(slotMinutes)).toISOString()
    : "";

  const originalStart = new Date(appointment.startTime);
  const newStart = startTime ? new Date(startTime) : null;
  const timeChanged = newStart && newStart.getTime() !== originalStart.getTime();
  const slotChanged = Number(slotMinutes) !== (appointment.slotMinutes ?? 30);
  const feeChanged = (fee === "" ? null : Number(fee)) !== appointment.fee;
  const hasChanges = timeChanged || slotChanged || feeChanged;

  function handleSubmit() {
    if (!startTime || !hasChanges || updateAppointment.isPending) return;

    updateAppointment.mutate(
      {
        id: appointment.id,
        data: {
          startTime: new Date(startTime).toISOString(),
          endTime,
          slotMinutes: Number(slotMinutes),
          ...(fee !== "" && { fee: Number(fee) }),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListAppointmentsQueryKey({ customerId }),
          });
          toast({
            title: "Appointment rescheduled",
            description: customerEmail
              ? `Notification emails sent to ${customerEmail} and the surgeon.`
              : "Appointment updated successfully.",
          });
          onOpenChange(false);
        },
        onError: () => {
          toast({
            title: "Failed to reschedule",
            description: "Please check the details and try again.",
            variant: "destructive",
          });
        },
      },
    );
  }

  const surgeonName = appointment.surgeon
    ? `${appointment.surgeon.firstName} ${appointment.surgeon.lastName}`
    : "Unknown surgeon";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Reschedule Appointment
          </DialogTitle>
          <DialogDescription className="space-y-0.5">
            <span>
              {customerName} · {appointment.event?.name ?? "Consultation"} · {surgeonName}
            </span>
            {customerEmail && (
              <span className="block text-xs mt-1">
                Reschedule emails will be sent to the patient and surgeon.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Current → new time display */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
            <div className={cn("flex-1 text-center", timeChanged && "line-through text-muted-foreground")}>
              <div className="text-xs text-muted-foreground mb-0.5">Current</div>
              <div className="font-medium">{format(originalStart, "MMM d, yyyy")}</div>
              <div className="text-muted-foreground">{format(originalStart, "h:mm a")}</div>
            </div>
            <ArrowRight className={cn("h-4 w-4 shrink-0", timeChanged ? "text-primary" : "text-muted-foreground/40")} />
            <div className="flex-1 text-center">
              <div className="text-xs text-muted-foreground mb-0.5">New</div>
              {newStart && timeChanged ? (
                <>
                  <div className="font-semibold text-primary">{format(newStart, "MMM d, yyyy")}</div>
                  <div className="text-primary">{format(newStart, "h:mm a")}</div>
                </>
              ) : (
                <>
                  <div className="font-medium text-muted-foreground">{format(originalStart, "MMM d, yyyy")}</div>
                  <div className="text-muted-foreground">{format(originalStart, "h:mm a")}</div>
                </>
              )}
            </div>
          </div>

          {/* New date/time */}
          <div className="space-y-1.5">
            <Label>New Date &amp; Time</Label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          {/* Duration + fee */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <Select value={slotMinutes} onValueChange={setSlotMinutes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLOT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fee (optional)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 250"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />
            </div>
          </div>

          {/* End time preview */}
          {startTime && (
            <p className="text-xs text-muted-foreground -mt-1">
              Ends at{" "}
              <span className="font-medium text-foreground">
                {format(addMinutes(new Date(startTime), Number(slotMinutes)), "h:mm a, MMM d")}
              </span>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!hasChanges || updateAppointment.isPending} className="gap-2">
            {updateAppointment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {updateAppointment.isPending ? "Saving…" : "Reschedule & Notify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
