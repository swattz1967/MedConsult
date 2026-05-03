import { useState, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useUser } from "@clerk/react";
import {
  useGetCurrentUser,
  useGetEvent,
  useListEventSurgeons,
  useGetSurgeon,
  useListAppointments,
  useCreateAppointment,
  useListAgencies,
  getListAppointmentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays,
  Clock,
  Stethoscope,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, addDays, isSameDay, parseISO, eachDayOfInterval, addMinutes, startOfDay, setHours, setMinutes, isAfter, isBefore, formatISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import type { Agency } from "@workspace/api-client-react";

const WORK_START_HOUR = 9;
const WORK_END_HOUR = 17;

function generateSlots(date: Date, slotMinutes: number): Date[] {
  const slots: Date[] = [];
  let current = setMinutes(setHours(startOfDay(date), WORK_START_HOUR), 0);
  const end = setMinutes(setHours(startOfDay(date), WORK_END_HOUR), 0);
  while (isBefore(current, end)) {
    slots.push(new Date(current));
    current = addMinutes(current, slotMinutes);
  }
  return slots;
}

export default function BookingPage() {
  const { id, surgeonId: surgeonIdParam } = useParams<{ id: string; surgeonId: string }>();
  const eventId = Number(id);
  const surgeonId = Number(surgeonIdParam);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { isSignedIn, isLoaded: isClerkLoaded } = useUser();
  const { data: currentUser, isLoading: isLoadingUser } = useGetCurrentUser();

  const { data: event, isLoading: isLoadingEvent } = useGetEvent(eventId);
  const { data: surgeon, isLoading: isLoadingSurgeon } = useGetSurgeon(surgeonId);
  const { data: eventSurgeons } = useListEventSurgeons(eventId);
  const { data: existingAppointments } = useListAppointments({ eventId, surgeonId });
  const { data: agencies } = useListAgencies();

  const createAppointment = useCreateAppointment();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [booked, setBooked] = useState(false);
  const [dateOffset, setDateOffset] = useState(0);

  const agency = agencies?.find(a => a.id === event?.agencyId);
  const agencyCurrency = (agency?.currency ?? "GBP") as "GBP" | "EUR" | "TRY";
  const brandColor = agency?.primaryColor ?? "#1a6b5c";

  const eventSurgeon = eventSurgeons?.find((es) => es.surgeonId === surgeonId);
  const slotMinutes = eventSurgeon?.defaultSlotMinutes ?? 30;
  const fee = eventSurgeon?.defaultFee;

  const eventDays = useMemo(() => {
    if (!event) return [];
    return eachDayOfInterval({ start: parseISO(event.startDate), end: parseISO(event.endDate) });
  }, [event]);

  const visibleDays = eventDays.slice(dateOffset, dateOffset + 5);

  const slots = useMemo(() => {
    if (!selectedDate) return [];
    return generateSlots(selectedDate, slotMinutes);
  }, [selectedDate, slotMinutes]);

  const bookedSlotTimes = useMemo(() => {
    return new Set(
      (existingAppointments ?? [])
        .filter((a) => a.status !== "cancelled")
        .map((a) => new Date(a.startTime).getTime()),
    );
  }, [existingAppointments]);

  const isLoading = !isClerkLoaded || isLoadingUser || isLoadingEvent || isLoadingSurgeon;

  if (!isClerkLoaded || (!isLoadingUser && isSignedIn === false)) {
    const bookingPath = `/events/${eventId}/book/${surgeonId}`;
    setLocation(`/sign-in?redirect_url=${encodeURIComponent(bookingPath)}`);
    return null;
  }

  if (!isLoadingUser && isSignedIn && !currentUser?.customerId) {
    setLocation(`/register?eventId=${eventId}&surgeonId=${surgeonId}`);
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!event || event.status !== "published") {
    return (
      <div className="min-h-[100dvh] bg-slate-50 p-12 text-center text-muted-foreground">
        Event not found or no longer available.
      </div>
    );
  }

  if (!surgeon || !eventSurgeon) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 p-12 text-center text-muted-foreground">
        Surgeon not available for this event.
      </div>
    );
  }

  if (booked) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
        <PageHeader agency={agency} brandColor={brandColor} />
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12 flex items-center justify-center">
          <Card className="w-full border-green-200">
            <CardContent className="py-14 flex flex-col items-center text-center gap-5">
              <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-1">Booking Confirmed!</h2>
                <p className="text-muted-foreground max-w-sm">
                  Your consultation has been scheduled. You will receive a confirmation shortly.
                </p>
              </div>
              {selectedSlot && (
                <div className="flex flex-col items-center gap-1 text-sm bg-muted/50 px-6 py-3 rounded-lg">
                  <div className="font-semibold text-foreground">{surgeon.firstName} {surgeon.lastName}</div>
                  <div className="text-muted-foreground">{event.name}</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {format(selectedSlot, "EEEE, MMMM d, yyyy 'at' h:mm a")}
                  </div>
                  {fee && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="text-sm">Consultation fee: {formatCurrency(Number(fee), agencyCurrency)}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <Button onClick={() => setLocation("/portal")} className="gap-2">
                  Go to My Portal
                </Button>
                <Button variant="outline" onClick={() => setLocation(`/events/${eventId}`)}>
                  Back to Event
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const handleConfirm = () => {
    if (!selectedSlot || !currentUser?.customerId) return;
    const startTime = formatISO(selectedSlot);
    const endTime = formatISO(addMinutes(selectedSlot, slotMinutes));

    createAppointment.mutate(
      {
        data: {
          eventId,
          surgeonId,
          customerId: currentUser.customerId,
          startTime,
          endTime,
          fee: fee ?? null,
          slotMinutes,
          status: "scheduled",
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey({ eventId, surgeonId }) });
          setBooked(true);
          toast({ title: "Appointment booked successfully!" });
        },
        onError: () => {
          toast({ title: "Booking failed. Please try again.", variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
      <PageHeader agency={agency} brandColor={brandColor} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-8 space-y-6">
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to {event.name}
        </Link>

        {/* Surgeon + Event info */}
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${brandColor}20` }}
              >
                <Stethoscope className="h-7 w-7" style={{ color: brandColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold">
                  {surgeon.firstName} {surgeon.lastName}
                </h1>
                <div className="text-sm text-muted-foreground mb-3">{surgeon.specialization}</div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    {format(parseISO(event.startDate), "MMM d")}–{format(parseISO(event.endDate), "MMM d, yyyy")}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {event.venue}
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-4 w-4" style={{ color: brandColor }} />
                    {slotMinutes}-min slot
                  </div>
                  {fee && (
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <span style={{ color: brandColor }}>●</span>
                      {formatCurrency(Number(fee), agencyCurrency)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1 — Date */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span
                className="h-6 w-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
                style={{ backgroundColor: brandColor }}
              >1</span>
              Choose a date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={dateOffset === 0}
                onClick={() => setDateOffset((o) => Math.max(0, o - 5))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex gap-2 flex-1 overflow-x-auto pb-1 scrollbar-none">
                {visibleDays.map((day) => {
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => {
                        setSelectedDate(day);
                        setSelectedSlot(null);
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-xl border-2 px-3 py-2.5 min-w-[60px] transition-all",
                        isSelected
                          ? "border-transparent text-white shadow-sm"
                          : "border-border bg-background hover:border-primary/50 hover:bg-muted/40",
                      )}
                      style={isSelected ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}
                    >
                      <span className="text-xs font-medium uppercase opacity-70">{format(day, "EEE")}</span>
                      <span className="text-xl font-bold leading-tight">{format(day, "d")}</span>
                      <span className="text-xs opacity-70">{format(day, "MMM")}</span>
                    </button>
                  );
                })}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={dateOffset + 5 >= eventDays.length}
                onClick={() => setDateOffset((o) => o + 5)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step 2 — Time slot */}
        {selectedDate && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span
                  className="h-6 w-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
                  style={{ backgroundColor: brandColor }}
                >2</span>
                Choose a time slot
              </CardTitle>
              <CardDescription>
                {format(selectedDate, "EEEE, MMMM d, yyyy")} · {slotMinutes}-minute appointments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {slots.map((slot) => {
                  const isTaken = bookedSlotTimes.has(slot.getTime());
                  const isSelected = selectedSlot && slot.getTime() === selectedSlot.getTime();
                  return (
                    <button
                      key={slot.toISOString()}
                      disabled={isTaken}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                        isTaken
                          ? "border-border bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                          : isSelected
                          ? "border-transparent text-white shadow-sm"
                          : "border-border bg-background hover:border-primary/50 hover:bg-muted/30",
                      )}
                      style={isSelected ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}
                    >
                      {format(slot, "h:mm a")}
                      {isTaken && (
                        <div className="text-[10px] leading-tight opacity-60">Taken</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3 — Confirm */}
        {selectedSlot && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span
                  className="h-6 w-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
                  style={{ backgroundColor: brandColor }}
                >3</span>
                Confirm your booking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-background border px-4 py-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Surgeon</span>
                  <span className="font-medium">{surgeon.firstName} {surgeon.lastName}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{format(selectedSlot, "EEEE, MMMM d, yyyy")}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">
                    {format(selectedSlot, "h:mm a")} – {format(addMinutes(selectedSlot, slotMinutes), "h:mm a")}
                  </span>
                </div>
                {fee && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Consultation fee</span>
                      <span className="font-semibold">{formatCurrency(Number(fee), agencyCurrency)}</span>
                    </div>
                  </>
                )}
              </div>

              <Button
                className="w-full gap-2 text-white"
                size="lg"
                onClick={handleConfirm}
                disabled={createAppointment.isPending}
                style={{ backgroundColor: brandColor, borderColor: brandColor }}
              >
                {createAppointment.isPending ? "Booking..." : "Confirm Booking"}
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function PageHeader({ agency, brandColor }: { agency: Agency | undefined; brandColor: string }) {
  return (
    <header className="border-b bg-white">
      <div className="max-w-3xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight" style={{ color: brandColor }}>
          {agency?.logoUrl ? (
            <img src={agency.logoUrl} alt={agency.name} className="h-8 w-8 object-contain rounded" />
          ) : (
            <div
              className="h-8 w-8 rounded flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: brandColor }}
            >
              {agency?.name?.[0]?.toUpperCase() ?? "M"}
            </div>
          )}
          <span className="hidden sm:inline">{agency?.name ?? "MedConsult"}</span>
        </Link>
        <Link href="/portal">
          <Button variant="ghost" size="sm">My Portal</Button>
        </Link>
      </div>
    </header>
  );
}
