import { useState, useMemo } from "react";
import { useGetCurrentUser, useListAppointments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format, isToday, isTomorrow } from "date-fns";
import { Link } from "wouter";
import {
  CheckCircle2,
  Clock,
  CalendarDays,
  Search,
  AlertTriangle,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Filter = "all" | "today" | "upcoming" | "completed" | "unsigned";

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE, MMM d");
}

export default function SurgeonAppointments() {
  const { data: user, isLoading: isUserLoading } = useGetCurrentUser();
  const surgeonId = user?.surgeonId ?? undefined;

  const { data: appointments, isLoading: isAppointmentsLoading } = useListAppointments(
    { surgeonId },
  );

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const now = useMemo(() => new Date(), []);

  const stats = useMemo(() => {
    if (!appointments) return { total: 0, upcoming: 0, unsignedUpcoming: 0, todayUnsigned: 0 };
    const upcoming = appointments.filter(
      (a) => new Date(a.startTime) >= now && a.status !== "completed" && a.status !== "cancelled",
    );
    return {
      total: appointments.length,
      upcoming: upcoming.length,
      unsignedUpcoming: upcoming.filter((a) => !a.customer?.declarationSigned).length,
      todayUnsigned: appointments.filter(
        (a) => isToday(new Date(a.startTime)) && !a.customer?.declarationSigned,
      ).length,
    };
  }, [appointments, now]);

  const filtered = useMemo(() => {
    if (!appointments) return [];
    return appointments
      .filter((a) => {
        const start = new Date(a.startTime);
        if (filter === "today") return isToday(start);
        if (filter === "upcoming") return start > now && !isToday(start);
        if (filter === "completed") return a.status === "completed";
        if (filter === "unsigned")
          return (
            !a.customer?.declarationSigned &&
            start >= now &&
            a.status !== "completed" &&
            a.status !== "cancelled"
          );
        return true;
      })
      .filter((a) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          `${a.customer?.firstName ?? ""} ${a.customer?.lastName ?? ""}`.toLowerCase().includes(q) ||
          (a.event?.name ?? "").toLowerCase().includes(q)
        );
      });
  }, [appointments, filter, search, now]);

  const countFor = (f: Filter) => {
    if (!appointments) return 0;
    if (f === "today") return appointments.filter((a) => isToday(new Date(a.startTime))).length;
    if (f === "upcoming") return appointments.filter((a) => new Date(a.startTime) > now && !isToday(new Date(a.startTime))).length;
    if (f === "completed") return appointments.filter((a) => a.status === "completed").length;
    if (f === "unsigned") return stats.unsignedUpcoming;
    return appointments.length;
  };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Completed" },
    { key: "unsigned", label: "Unsigned" },
  ];

  if (isUserLoading || (surgeonId && isAppointmentsLoading)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!surgeonId) {
    return <div className="p-8 text-center text-muted-foreground">Not linked to a surgeon profile.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Appointments</h2>
      </div>

      {/* Compliance summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-xl font-bold leading-tight">{stats.total}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Upcoming</div>
              <div className="text-xl font-bold leading-tight">{stats.upcoming}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
              stats.unsignedUpcoming > 0 ? "bg-amber-100" : "bg-green-100",
            )}>
              {stats.unsignedUpcoming > 0
                ? <AlertTriangle className="h-4 w-4 text-amber-600" />
                : <ShieldCheck className="h-4 w-4 text-green-600" />
              }
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Unsigned</div>
              <div className={cn(
                "text-xl font-bold leading-tight",
                stats.unsignedUpcoming > 0 ? "text-amber-600" : "text-green-600",
              )}>
                {stats.unsignedUpcoming}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
              stats.todayUnsigned > 0 ? "bg-red-100" : "bg-green-100",
            )}>
              {stats.todayUnsigned > 0
                ? <AlertTriangle className="h-4 w-4 text-red-600" />
                : <CheckCircle2 className="h-4 w-4 text-green-600" />
              }
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Today Unsigned</div>
              <div className={cn(
                "text-xl font-bold leading-tight",
                stats.todayUnsigned > 0 ? "text-red-600" : "text-green-600",
              )}>
                {stats.todayUnsigned}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Urgent banner */}
      {stats.todayUnsigned > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50/50">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {stats.todayUnsigned} patient{stats.todayUnsigned > 1 ? "s" : ""} today {stats.todayUnsigned > 1 ? "have" : "has"} not signed their declaration
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              Please ensure patients complete their declaration before the consultation begins.
            </p>
          </div>
        </div>
      )}

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 p-1 bg-muted rounded-lg w-fit">
          {FILTERS.map((f) => {
            const count = countFor(f.key);
            const isUnsigned = f.key === "unsigned";
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  filter === f.key
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full",
                      filter === f.key
                        ? isUnsigned && count > 0
                          ? "bg-amber-100 text-amber-700"
                          : "bg-primary/10 text-primary"
                        : isUnsigned && count > 0
                          ? "bg-amber-100 text-amber-700"
                          : "bg-muted-foreground/20",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patient or event…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Appointment cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {search ? "No appointments match your search." : "No appointments found for this filter."}
            </CardContent>
          </Card>
        ) : (
          filtered.map((apt) => {
            const signed = apt.customer?.declarationSigned ?? true;
            const isFuture = new Date(apt.startTime) >= now;
            const showWarning = !signed && isFuture && apt.status !== "completed" && apt.status !== "cancelled";

            return (
              <Link key={apt.id} href={`/surgeon/appointments/${apt.id}`}>
                <Card
                  className={cn(
                    "hover:border-primary cursor-pointer transition-all",
                    showWarning && "border-amber-200 bg-amber-50/30 hover:border-amber-400",
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: patient + event */}
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Declaration indicator dot */}
                        <div className={cn(
                          "h-2.5 w-2.5 rounded-full shrink-0 mt-2",
                          showWarning ? "bg-amber-500" : signed ? "bg-green-500" : "bg-muted-foreground/30",
                        )} />
                        <div className="min-w-0">
                          <div className="font-semibold text-base truncate">
                            {apt.customer?.firstName} {apt.customer?.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">{apt.event?.name}</div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {dayLabel(apt.startTime)} · {format(new Date(apt.startTime), "h:mm a")}
                              {apt.slotMinutes ? ` · ${apt.slotMinutes} min` : ""}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: badges */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize text-xs",
                            apt.status === "completed" && "text-blue-700 border-blue-300 bg-blue-50",
                            apt.status === "scheduled" && "text-green-700 border-green-300 bg-green-50",
                            apt.status === "cancelled" && "text-red-700 border-red-300 bg-red-50",
                            apt.status === "no_show" && "text-orange-700 border-orange-300 bg-orange-50",
                          )}
                        >
                          {apt.status.replace("_", " ")}
                        </Badge>

                        {showWarning ? (
                          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 gap-1 text-xs">
                            <Clock className="h-3 w-3" /> Unsigned
                          </Badge>
                        ) : signed ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3" /> Signed
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
