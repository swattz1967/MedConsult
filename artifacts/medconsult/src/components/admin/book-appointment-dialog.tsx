import { useState, useEffect } from "react";
import {
  useListEvents,
  useListEventSurgeons,
  useListSurgeons,
  useCreateAppointment,
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
import { CalendarDays, Mail, Loader2 } from "lucide-react";
import { addMinutes, format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number;
  customerName: string;
  customerEmail?: string | null;
}

const SLOT_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
];

export function BookAppointmentDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  customerEmail,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [eventId, setEventId] = useState<string>("");
  const [surgeonId, setSurgeonId] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [slotMinutes, setSlotMinutes] = useState<string>("30");
  const [fee, setFee] = useState<string>("");

  const { data: events } = useListEvents();
  const { data: allSurgeons } = useListSurgeons();
  const { data: eventSurgeons } = useListEventSurgeons(Number(eventId) || 0);

  const createAppointment = useCreateAppointment();

  // Reset surgeon when event changes
  useEffect(() => {
    setSurgeonId("");
  }, [eventId]);

  const publishedEvents = events?.filter((e) => e.status === "published") ?? [];

  const endTime = startTime
    ? addMinutes(new Date(startTime), Number(slotMinutes)).toISOString()
    : "";

  const canSubmit =
    !!eventId && !!surgeonId && !!startTime && !createAppointment.isPending;

  function handleSubmit() {
    if (!canSubmit) return;

    createAppointment.mutate(
      {
        data: {
          customerId,
          eventId: Number(eventId),
          surgeonId: Number(surgeonId),
          startTime: new Date(startTime).toISOString(),
          endTime,
          slotMinutes: Number(slotMinutes),
          fee: fee ? Number(fee) : undefined,
          status: "scheduled",
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListAppointmentsQueryKey({ customerId }),
          });
          toast({
            title: "Appointment booked",
            description: customerEmail
              ? `A confirmation email has been sent to ${customerEmail}.`
              : "Appointment created successfully.",
          });
          onOpenChange(false);
          setEventId("");
          setSurgeonId("");
          setStartTime("");
          setSlotMinutes("30");
          setFee("");
        },
        onError: () => {
          toast({
            title: "Failed to book appointment",
            description: "Please check the details and try again.",
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
            <CalendarDays className="h-5 w-5 text-primary" />
            Book Appointment
          </DialogTitle>
          <DialogDescription>
            Booking for <span className="font-medium text-foreground">{customerName}</span>.
            {customerEmail && (
              <span className="flex items-center gap-1 mt-1 text-xs">
                <Mail className="h-3 w-3" />
                A confirmation email will be sent to {customerEmail}.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Event */}
          <div className="space-y-1.5">
            <Label>Event</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Select event…" />
              </SelectTrigger>
              <SelectContent>
                {publishedEvents.length === 0 && (
                  <SelectItem value="none" disabled>No published events</SelectItem>
                )}
                {publishedEvents.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.name}
                    {e.venue ? ` — ${e.venue}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Surgeon */}
          <div className="space-y-1.5">
            <Label>Surgeon</Label>
            <Select value={surgeonId} onValueChange={setSurgeonId} disabled={!eventId}>
              <SelectTrigger>
                <SelectValue placeholder={eventId ? "Select surgeon…" : "Select event first"} />
              </SelectTrigger>
              <SelectContent>
                {(eventSurgeons ?? []).length === 0 && eventId && (
                  <SelectItem value="none" disabled>No surgeons on this event</SelectItem>
                )}
                {(eventSurgeons ?? []).map((es) => {
                  const surgeon = allSurgeons?.find((s) => s.id === es.surgeonId);
                  return (
                    <SelectItem key={es.surgeonId} value={String(es.surgeonId)}>
                      {surgeon ? `${surgeon.firstName} ${surgeon.lastName}` : `Surgeon #${es.surgeonId}`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Date & time */}
          <div className="space-y-1.5">
            <Label>Date &amp; Time</Label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
            />
          </div>

          {/* Slot duration + fee in a row */}
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
            <p className="text-xs text-muted-foreground">
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
          <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-2">
            {createAppointment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {createAppointment.isPending ? "Booking…" : "Book & Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
