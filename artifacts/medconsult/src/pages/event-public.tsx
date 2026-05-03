import { useParams } from "wouter";
import { useGetEvent, useListEventSurgeons, useListAppointments, useListSurgeons, useGetCurrentUser, useListAgencies } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Stethoscope, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/currency";

export default function EventPublic() {
  const { id } = useParams();
  const eventId = Number(id);

  const { isSignedIn } = useUser();
  const { data: currentUser } = useGetCurrentUser();

  const { data: event, isLoading: isLoadingEvent } = useGetEvent(eventId);
  const { data: eventSurgeons, isLoading: isLoadingSurgeons } = useListEventSurgeons(eventId);
  const { data: allSurgeons } = useListSurgeons();
  const { data: appointments } = useListAppointments({ eventId });
  const { data: agencies } = useListAgencies();

  const agency = agencies?.find(a => a.id === event?.agencyId);
  const agencyCurrency = (agency?.currency ?? "GBP") as "GBP" | "EUR" | "TRY";
  const brandColor = agency?.primaryColor ?? "#1a6b5c";

  const getBookingHref = (surgeonId: number) => {
    if (!isSignedIn) {
      return `/sign-in?redirect_url=${encodeURIComponent(`/events/${eventId}/book/${surgeonId}`)}`;
    }
    if (!currentUser?.customerId) {
      return `/register?eventId=${eventId}&surgeonId=${surgeonId}`;
    }
    return `/events/${eventId}/book/${surgeonId}`;
  };

  if (isLoadingEvent) {
    return <div className="min-h-[100dvh] bg-slate-50 p-8"><Skeleton className="h-64 max-w-4xl mx-auto" /></div>;
  }

  if (!event || event.status !== "published") {
    return <div className="min-h-[100dvh] bg-slate-50 p-12 text-center">Event not found or not available.</div>;
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
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
          <Link href="/events"><Button variant="ghost" size="sm">Browse Events</Button></Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-8 md:py-12 space-y-8">
        <div>
          <Link href="/events" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to events
          </Link>
          <h1 className="text-4xl font-bold tracking-tight mb-4">{event.name}</h1>
          
          <div className="flex flex-wrap gap-4 text-muted-foreground mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              <span>{format(new Date(event.startDate), "MMMM d")} - {format(new Date(event.endDate), "MMMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <span>{event.venue}</span>
            </div>
          </div>

          {agency && (
            <div className="flex items-center gap-2 mb-4">
              {agency.logoUrl ? (
                <img src={agency.logoUrl} alt={agency.name} className="h-5 w-5 object-contain rounded" />
              ) : (
                <div
                  className="h-5 w-5 rounded text-[10px] flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: brandColor }}
                >
                  {agency.name?.[0]?.toUpperCase()}
                </div>
              )}
              <span className="text-sm text-muted-foreground">Hosted by <span className="font-medium text-foreground">{agency.name}</span></span>
            </div>
          )}
          
          {event.description && (
            <div className="prose max-w-none text-muted-foreground">
              <p>{event.description}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight border-b pb-4">Attending Surgeons</h2>
          
          {isLoadingSurgeons ? (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : eventSurgeons?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Surgeons have not been assigned to this event yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {eventSurgeons?.map((es) => {
                const surgeon = allSurgeons?.find(s => s.id === es.surgeonId);
                const bookedCount = appointments?.filter(a => a.surgeonId === es.surgeonId).length || 0;
                
                return (
                  <Card key={es.id} className="overflow-hidden">
                    <div className="md:flex">
                      <div className="p-6 md:w-1/3 bg-slate-100/50 border-r flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${brandColor}20` }}>
                            <Stethoscope className="h-6 w-6" style={{ color: brandColor }} />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{surgeon?.firstName} {surgeon?.lastName}</h3>
                            <div className="text-sm text-muted-foreground">{surgeon?.specialization}</div>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 md:w-2/3 flex flex-col justify-center">
                        <div className="flex flex-wrap items-center gap-4 justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-muted-foreground">Consultation Fee</div>
                            <div className="text-xl font-bold">
                              {es.defaultFee ? formatCurrency(Number(es.defaultFee), agencyCurrency) : "TBC"}
                            </div>
                          </div>
                          
                          <div className="space-y-1 text-right md:text-left">
                            <div className="text-sm font-medium text-muted-foreground">Availability</div>
                            <Badge variant={bookedCount > 10 ? "secondary" : "default"}>
                              Slots Available
                            </Badge>
                          </div>

                          <Link href={getBookingHref(es.surgeonId)}>
                            <Button className="w-full md:w-auto" style={{ backgroundColor: brandColor, borderColor: brandColor }}>
                              Book Consultation
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
