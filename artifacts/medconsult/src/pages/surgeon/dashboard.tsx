import { useMemo } from "react";
import { useGetCurrentUser, useListAppointments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Users } from "lucide-react";
import { format, isToday } from "date-fns";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export default function SurgeonDashboard() {
  const { data: user, isLoading: isUserLoading } = useGetCurrentUser();
  const surgeonId = user?.surgeonId ?? undefined;

  const { data: appointments, isLoading: isAppointmentsLoading } = useListAppointments({ surgeonId });

  const now = useMemo(() => new Date(), []);

  const { todayApts, upcomingApts, stats } = useMemo(() => {
    const all = appointments ?? [];
    const todayApts = all.filter((a) => isToday(new Date(a.startTime)));
    const upcomingApts = all.filter(
      (a) => new Date(a.startTime) > now && !isToday(new Date(a.startTime)),
    );
    const completedToday = todayApts.filter((a) => a.status === "completed").length;
    const pendingToday = todayApts.filter(
      (a) => a.status !== "completed" && a.status !== "cancelled",
    ).length;
    const todayUnsigned = todayApts.filter(
      (a) => !a.customer?.declarationSigned && a.status !== "completed" && a.status !== "cancelled",
    ).length;
    const upcomingUnsigned = upcomingApts.filter(
      (a) => !a.customer?.declarationSigned && a.status !== "cancelled",
    ).length;
    return { todayApts, upcomingApts, stats: { completedToday, pendingToday, todayUnsigned, upcomingUnsigned } };
  }, [appointments, now]);

  if (isUserLoading || (surgeonId && isAppointmentsLoading)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!surgeonId) {
    return <div className="p-8 text-center text-muted-foreground">Not linked to a surgeon profile.</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointments?.length ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingToday}</div>
          </CardContent>
        </Card>

        <Card className={cn(stats.todayUnsigned > 0 && "border-amber-200 bg-amber-50/40")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stats.todayUnsigned > 0 ? "Unsigned Today" : "Declaration"}
            </CardTitle>
            {stats.todayUnsigned > 0
              ? <AlertTriangle className="h-4 w-4 text-amber-500" />
              : <ShieldCheck className="h-4 w-4 text-green-500" />
            }
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              stats.todayUnsigned > 0 ? "text-amber-600" : "text-green-600",
            )}>
              {stats.todayUnsigned > 0 ? stats.todayUnsigned : "All signed"}
            </div>
            {stats.todayUnsigned > 0 && (
              <p className="text-xs text-amber-700 mt-0.5">patient{stats.todayUnsigned > 1 ? "s" : ""} today</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Compliance alert banners */}
      {stats.todayUnsigned > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-red-200 bg-red-50/50">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {stats.todayUnsigned} of today's patient{stats.todayUnsigned > 1 ? "s have" : " has"} not signed their declaration
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              Confirm declaration status before beginning each consultation.{" "}
              <Link href="/surgeon/appointments" className="underline underline-offset-2 font-medium">
                View appointments →
              </Link>
            </p>
          </div>
        </div>
      )}

      {stats.todayUnsigned === 0 && stats.upcomingUnsigned > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50/40">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {stats.upcomingUnsigned} upcoming patient{stats.upcomingUnsigned > 1 ? "s have" : " has"} not signed their declaration
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              No action needed today, but these patients should sign before their appointment.{" "}
              <Link href="/surgeon/appointments?filter=unsigned" className="underline underline-offset-2 font-medium">
                View unsigned →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Schedule grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Today's schedule */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Today's Schedule
              {todayApts.length > 0 && (
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {todayApts.length} appointment{todayApts.length > 1 ? "s" : ""}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayApts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No appointments today.</p>
            ) : (
              <div className="space-y-2">
                {todayApts.map((apt) => {
                  const signed = apt.customer?.declarationSigned ?? true;
                  const showWarning = !signed && apt.status !== "completed" && apt.status !== "cancelled";
                  return (
                    <Link key={apt.id} href={`/surgeon/appointments/${apt.id}`}>
                      <div className={cn(
                        "flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors",
                        showWarning && "border-amber-200 bg-amber-50/40 hover:bg-amber-50",
                      )}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            showWarning ? "bg-amber-500" : apt.status === "completed" ? "bg-green-500" : "bg-primary",
                          )} />
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">
                              {apt.customer?.firstName} {apt.customer?.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(apt.startTime), "h:mm a")} · {apt.event?.name}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                          <Badge
                            variant={apt.status === "completed" ? "default" : "outline"}
                            className="text-xs capitalize"
                          >
                            {apt.status}
                          </Badge>
                          {showWarning && (
                            <span className="text-xs text-amber-600 font-medium flex items-center gap-0.5">
                              <Clock className="h-3 w-3" /> Unsigned
                            </span>
                          )}
                          {!showWarning && signed && (
                            <span className="text-xs text-green-600 flex items-center gap-0.5">
                              <CheckCircle2 className="h-3 w-3" /> Signed
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Upcoming
              {stats.upcomingUnsigned > 0 && (
                <Badge variant="outline" className="ml-auto text-amber-600 border-amber-300 bg-amber-50 gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.upcomingUnsigned} unsigned
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingApts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No upcoming appointments.</p>
            ) : (
              <div className="space-y-2">
                {upcomingApts.slice(0, 6).map((apt) => {
                  const signed = apt.customer?.declarationSigned ?? true;
                  const showWarning = !signed && apt.status !== "cancelled";
                  return (
                    <Link key={apt.id} href={`/surgeon/appointments/${apt.id}`}>
                      <div className={cn(
                        "flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors",
                        showWarning && "border-amber-200 bg-amber-50/30 hover:bg-amber-50",
                      )}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            showWarning ? "bg-amber-500" : "bg-green-500",
                          )} />
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">
                              {apt.customer?.firstName} {apt.customer?.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(apt.startTime), "MMM d, h:mm a")}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 ml-2">
                          {showWarning ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 gap-1 text-xs">
                              <Clock className="h-3 w-3" /> Unsigned
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 text-xs">
                              <CheckCircle2 className="h-3 w-3" /> Signed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {upcomingApts.length > 6 && (
                  <Link href="/surgeon/appointments">
                    <p className="text-xs text-center text-primary underline underline-offset-2 pt-1 cursor-pointer">
                      View all {upcomingApts.length} upcoming appointments
                    </p>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
