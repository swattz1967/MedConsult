import { useMemo, useState } from "react";
import { useListAppointments, useListSurgeons, useListEvents } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import { Download, TrendingUp, DollarSign, CalendarCheck, XCircle } from "lucide-react";
import { format, startOfWeek, startOfMonth, parseISO, isAfter } from "date-fns";

type Range = "all" | "month" | "week";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#145c4b",
  completed: "#22c55e",
  cancelled: "#ef4444",
  no_show: "#f59e0b",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const CHART_COLORS = ["#145c4b", "#22c55e", "#0ea5e9", "#a855f7", "#f59e0b", "#ec4899"];

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function AdminReports() {
  const [range, setRange] = useState<Range>("all");

  const { data: allAppointments = [], isLoading } = useListAppointments({});
  const { data: surgeons = [] } = useListSurgeons();
  const { data: events = [] } = useListEvents();

  // ── Filter by date range ────────────────────────────────────────────────────
  const appointments = useMemo(() => {
    if (range === "all") return allAppointments;
    const cutoff = range === "week" ? startOfWeek(new Date()) : startOfMonth(new Date());
    return allAppointments.filter((a) => isAfter(parseISO(a.startTime), cutoff));
  }, [allAppointments, range]);

  // ── KPI metrics ────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = appointments.length;
    const cancelled = appointments.filter((a) => a.status === "cancelled").length;
    const completed = appointments.filter((a) => a.status === "completed").length;
    const revenue = appointments
      .filter((a) => a.status !== "cancelled")
      .reduce((sum, a) => sum + (a.fee ?? 0), 0);
    const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0;
    const uniqueSurgeons = new Set(appointments.map((a) => a.surgeonId)).size;
    const avgPerSurgeon = uniqueSurgeons > 0 ? total / uniqueSurgeons : 0;
    return { total, cancelled, completed, revenue, cancellationRate, uniqueSurgeons, avgPerSurgeon };
  }, [appointments]);

  // ── Appointments by status (donut) ─────────────────────────────────────────
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach((a) => { counts[a.status] = (counts[a.status] ?? 0) + 1; });
    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_LABELS[status] ?? status,
      value,
      status,
    }));
  }, [appointments]);

  // ── Appointments by surgeon (bar) ──────────────────────────────────────────
  const surgeonBookingsData = useMemo(() => {
    const map: Record<number, { bookings: number; revenue: number }> = {};
    appointments.forEach((a) => {
      if (!map[a.surgeonId]) map[a.surgeonId] = { bookings: 0, revenue: 0 };
      map[a.surgeonId].bookings++;
      if (a.status !== "cancelled") map[a.surgeonId].revenue += a.fee ?? 0;
    });
    return surgeons
      .map((s) => ({
        name: `${s.firstName} ${s.lastName}`.replace(/^Dr\. /, "Dr. "),
        bookings: map[s.id]?.bookings ?? 0,
        revenue: map[s.id]?.revenue ?? 0,
      }))
      .filter((d) => d.bookings > 0)
      .sort((a, b) => b.bookings - a.bookings);
  }, [appointments, surgeons]);

  // ── Appointments over time (area chart, by date) ───────────────────────────
  const timelineData = useMemo(() => {
    const map: Record<string, { date: string; booked: number; completed: number; cancelled: number }> = {};
    appointments.forEach((a) => {
      const day = format(parseISO(a.startTime), "MMM d");
      if (!map[day]) map[day] = { date: day, booked: 0, completed: 0, cancelled: 0 };
      map[day].booked++;
      if (a.status === "completed") map[day].completed++;
      if (a.status === "cancelled") map[day].cancelled++;
    });
    return Object.values(map).sort((a, b) => {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const [am, ad] = a.date.split(" ");
      const [bm, bd] = b.date.split(" ");
      const mi = months.indexOf(am), mj = months.indexOf(bm);
      return mi !== mj ? mi - mj : parseInt(ad) - parseInt(bd);
    });
  }, [appointments]);

  // ── Event breakdown ────────────────────────────────────────────────────────
  const eventData = useMemo(() => {
    const map: Record<number, number> = {};
    appointments.forEach((a) => { map[a.eventId] = (map[a.eventId] ?? 0) + 1; });
    return events
      .map((e) => ({ name: e.name, bookings: map[e.id] ?? 0 }))
      .filter((d) => d.bookings > 0)
      .sort((a, b) => b.bookings - a.bookings);
  }, [appointments, events]);

  // ── CSV export ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["ID", "Patient", "Surgeon", "Event", "Date", "Time", "Status", "Fee"];
    const rows = appointments.map((a) => [
      a.id,
      a.customer ? `${a.customer.firstName} ${a.customer.lastName}` : a.customerId,
      a.surgeon ? `${a.surgeon.firstName} ${a.surgeon.lastName}` : a.surgeonId,
      a.event?.name ?? a.eventId,
      format(parseISO(a.startTime), "yyyy-MM-dd"),
      format(parseISO(a.startTime), "HH:mm"),
      a.status,
      a.fee ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medconsult-appointments-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportRevCSV = () => {
    const headers = ["Surgeon", "Bookings", "Revenue ($)"];
    const rows = surgeonBookingsData.map((r) => [r.name, r.bookings, r.revenue]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medconsult-revenue-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-sm text-muted-foreground">Appointment statistics, revenue &amp; surgeon utilisation</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Export Appointments
          </Button>
          <Button variant="outline" size="sm" onClick={exportRevCSV} className="gap-2">
            <Download className="h-4 w-4" /> Export Revenue
          </Button>
        </div>
      </div>

      {/* Date range filter */}
      <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
        <TabsList>
          <TabsTrigger value="all">All Time</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{fmt(kpis.total)}</div>
            <div className="text-xs text-muted-foreground mt-1">{fmt(kpis.completed)} completed</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${fmt(kpis.revenue)}</div>
            <div className="text-xs text-muted-foreground mt-1">Excl. cancelled appointments</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cancellation Rate</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{fmt(kpis.cancellationRate, 1)}%</div>
            <div className="text-xs text-muted-foreground mt-1">{fmt(kpis.cancelled)} cancelled</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg per Surgeon</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{fmt(kpis.avgPerSurgeon, 1)}</div>
            <div className="text-xs text-muted-foreground mt-1">Across {kpis.uniqueSurgeons} active surgeons</div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Donut + Timeline */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointments by Status</CardTitle>
            <CardDescription>{appointments.length} total</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val, name) => [`${val} appts`, name]} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(val) => <span className="text-xs">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointments Over Time</CardTitle>
            <CardDescription>Daily booking volume</CardDescription>
          </CardHeader>
          <CardContent>
            {timelineData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={timelineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradBooked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#145c4b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#145c4b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="booked" name="Booked" stroke="#145c4b" fill="url(#gradBooked)" strokeWidth={2} />
                  <Area type="monotone" dataKey="completed" name="Completed" stroke="#22c55e" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Surgeon bookings + Revenue */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bookings by Surgeon</CardTitle>
            <CardDescription>Total appointments booked per surgeon</CardDescription>
          </CardHeader>
          <CardContent>
            {surgeonBookingsData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={surgeonBookingsData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="bookings" name="Bookings" fill="#145c4b" radius={[0, 4, 4, 0]}>
                    {surgeonBookingsData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Surgeon</CardTitle>
            <CardDescription>Total fees collected (excl. cancellations)</CardDescription>
          </CardHeader>
          <CardContent>
            {surgeonBookingsData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={surgeonBookingsData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} tickLine={false} />
                  <Tooltip formatter={(v) => [`$${fmt(Number(v))}`, "Revenue"]} />
                  <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[0, 4, 4, 0]}>
                    {surgeonBookingsData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity={0.75} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Bookings by Event */}
      {eventData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bookings by Event</CardTitle>
            <CardDescription>Appointment volume per event</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={eventData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="bookings" name="Bookings" fill="#145c4b" radius={[4, 4, 0, 0]} maxBarSize={64} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Detail table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appointment Detail</CardTitle>
          <CardDescription>{appointments.length} records{range !== "all" ? ` · ${range === "week" ? "this week" : "this month"}` : ""}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Patient</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Surgeon</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Event</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Fee</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No appointments for this period</td>
                  </tr>
                ) : (
                  appointments
                    .slice()
                    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                    .map((a) => (
                      <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          {a.customer ? `${a.customer.firstName} ${a.customer.lastName}` : `#${a.customerId}`}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {a.surgeon ? `${a.surgeon.firstName} ${a.surgeon.lastName}` : `#${a.surgeonId}`}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-[180px]">
                          {a.event?.name ?? `Event #${a.eventId}`}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {format(parseISO(a.startTime), "MMM d, yyyy h:mm a")}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="secondary"
                            style={{
                              backgroundColor: `${STATUS_COLORS[a.status]}18`,
                              color: STATUS_COLORS[a.status],
                              borderColor: `${STATUS_COLORS[a.status]}40`,
                            }}
                            className="border text-xs font-medium"
                          >
                            {STATUS_LABELS[a.status] ?? a.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {a.fee ? `$${a.fee}` : <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
