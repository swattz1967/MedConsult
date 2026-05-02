import { useState } from "react";
import { useGetCurrentUser, useListAppointments } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isToday } from "date-fns";
import { Link } from "wouter";

export default function SurgeonAppointments() {
  const { data: user, isLoading: isUserLoading } = useGetCurrentUser();
  const surgeonId = user?.surgeonId ?? undefined;

  const { data: appointments, isLoading: isAppointmentsLoading } = useListAppointments(
    { surgeonId }
  );

  const [filter, setFilter] = useState("all");

  if (isUserLoading || (surgeonId && isAppointmentsLoading)) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!surgeonId) {
    return <div className="p-8 text-center text-muted-foreground">Not linked to a surgeon profile.</div>;
  }

  const filteredAppointments = appointments?.filter(apt => {
    if (filter === "all") return true;
    if (filter === "today") return isToday(new Date(apt.startTime));
    if (filter === "upcoming") return new Date(apt.startTime) > new Date() && !isToday(new Date(apt.startTime));
    if (filter === "completed") return apt.status === "completed";
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Appointments</h2>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          <div className="grid gap-4">
            {filteredAppointments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No appointments found for this filter.
                </CardContent>
              </Card>
            ) : (
              filteredAppointments.map(apt => (
                <Link key={apt.id} href={`/surgeon/appointments/${apt.id}`}>
                  <Card className="hover:border-primary cursor-pointer transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-semibold text-lg">{apt.customer?.firstName} {apt.customer?.lastName}</div>
                        <div className="text-muted-foreground">{apt.event?.name}</div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-medium">{format(new Date(apt.startTime), "MMM d, yyyy")}</div>
                        <div className="text-muted-foreground text-sm">{format(new Date(apt.startTime), "h:mm a")}</div>
                        <Badge variant={apt.status === "completed" ? "default" : "outline"}>{apt.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
