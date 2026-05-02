import { useGetDashboardSummary, useGetUpcomingAppointments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CalendarDays, ClipboardList, Activity } from "lucide-react";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: upcoming, isLoading: isLoadingUpcoming } = useGetUpcomingAppointments();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Surgeons</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold">{summary?.totalSurgeons ?? 0}</div>}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold">{summary?.totalCustomers ?? 0}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments Today</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold">{summary?.appointmentsToday ?? 0}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Consultations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold">{summary?.pendingConsultations ?? 0}</div>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingUpcoming ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : upcoming?.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No upcoming appointments</div>
            ) : (
              <div className="space-y-4">
                {upcoming?.map(apt => (
                  <div key={apt.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium">{apt.customer?.firstName} {apt.customer?.lastName}</div>
                      <div className="text-sm text-muted-foreground">{apt.surgeon?.firstName} {apt.surgeon?.lastName} - {apt.event?.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{format(new Date(apt.startTime), "MMM d, yyyy")}</div>
                      <div className="text-sm text-muted-foreground">{format(new Date(apt.startTime), "h:mm a")}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
