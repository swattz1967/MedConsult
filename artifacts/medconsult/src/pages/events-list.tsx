import { useListEvents, useListAgencies } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function EventsList() {
  const { data: allEvents, isLoading } = useListEvents();
  const { data: agencies } = useListAgencies();
  const events = allEvents?.filter(e => e.status === "published");

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary tracking-tight">
            <div className="h-8 w-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold text-sm">MC</div>
            MedConsult
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-12 space-y-8">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight">Upcoming Consultation Events</h1>
          <p className="text-lg text-muted-foreground">Book a private consultation with our world-class specialist surgeons at a city near you.</p>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
        ) : events?.length === 0 ? (
          <Card className="mt-8">
            <CardContent className="p-12 text-center text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">No upcoming events</h3>
              <p>Please check back later for newly scheduled consultation events.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {events?.map(event => {
              const agency = agencies?.find(a => a.id === event.agencyId);
              const brandColor = agency?.primaryColor ?? "#1a6b5c";
              return (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <Card className="h-full hover:border-primary transition-colors cursor-pointer group">
                    <CardHeader>
                      <CardTitle className="group-hover:text-primary transition-colors">{event.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center text-muted-foreground gap-2">
                        <CalendarDays className="h-4 w-4" />
                        <span>{format(new Date(event.startDate), "MMM d")} - {format(new Date(event.endDate), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center text-muted-foreground gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{event.venue}</span>
                      </div>
                      {event.description && (
                        <p className="text-sm line-clamp-2 pt-2">{event.description}</p>
                      )}
                      <div className="pt-4 border-t flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Surgeons attending
                          </Badge>
                          {agency && (
                            <div className="flex items-center gap-1.5">
                              {agency.logoUrl ? (
                                <img src={agency.logoUrl} alt={agency.name} className="h-4 w-4 object-contain rounded" />
                              ) : (
                                <div
                                  className="h-4 w-4 rounded text-[9px] flex items-center justify-center text-white font-bold"
                                  style={{ backgroundColor: brandColor }}
                                >
                                  {agency.name?.[0]?.toUpperCase()}
                                </div>
                              )}
                              <span className="text-xs text-muted-foreground">{agency.name}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-medium text-primary">View details &rarr;</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
