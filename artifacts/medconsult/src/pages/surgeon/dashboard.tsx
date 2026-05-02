import { useGetCurrentUser, useListAppointments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CheckCircle2, Clock } from "lucide-react";
import { format, isToday } from "date-fns";
import { Link } from "wouter";

export default function SurgeonDashboard() {
  const { data: user, isLoading: isUserLoading } = useGetCurrentUser();
  const surgeonId = user?.surgeonId ?? undefined;

  const { data: appointments, isLoading: isAppointmentsLoading } = useListAppointments(
    { surgeonId }
  );

  if (isUserLoading || (surgeonId && isAppointmentsLoading)) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!surgeonId) {
    return <div className="p-8 text-center text-muted-foreground">Not linked to a surgeon profile.</div>;
  }

  const todayAppointments = appointments?.filter(a => isToday(new Date(a.startTime))) || [];
  const upcomingAppointments = appointments?.filter(a => new Date(a.startTime) > new Date() && !isToday(new Date(a.startTime))) || [];
  
  const completedToday = todayAppointments.filter(a => a.status === "completed").length;
  const pendingToday = todayAppointments.filter(a => a.status !== "completed").length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointments?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingToday}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments today.</p>
            ) : (
              <div className="space-y-4">
                {todayAppointments.map(apt => (
                  <Link key={apt.id} href={`/surgeon/appointments/${apt.id}`}>
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                      <div>
                        <div className="font-medium">{apt.customer?.firstName} {apt.customer?.lastName}</div>
                        <div className="text-sm text-muted-foreground">{format(new Date(apt.startTime), "h:mm a")} - {apt.event?.name}</div>
                      </div>
                      <Badge variant={apt.status === "completed" ? "default" : "outline"}>{apt.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.slice(0, 5).map(apt => (
                  <Link key={apt.id} href={`/surgeon/appointments/${apt.id}`}>
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                      <div>
                        <div className="font-medium">{apt.customer?.firstName} {apt.customer?.lastName}</div>
                        <div className="text-sm text-muted-foreground">{format(new Date(apt.startTime), "MMM d, h:mm a")} - {apt.event?.name}</div>
                      </div>
                      <Badge variant="outline">{apt.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
