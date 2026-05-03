import { useMemo, useState } from "react";
import { useListAppointments, useListSurgeons, useListEvents } from "@workspace/api-client-react";
import { useAgency } from "@/contexts/AgencyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import { Download, TrendingUp, PoundSterling, CalendarCheck, XCircle, TrendingDown, ArrowUpRight } from "lucide-react";
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
  return n.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

interface SurgeonRevRow {
  id: number;
  name: string;
  earned: number;
  pending: number;
  lost: number;
  total: number;
  appointments: number;
}

export default function AdminReports() {
  const { formatCurrency } = useAgency();
  const [range, setRange] = useState<Range>("all");
  const [revSort, setRevSort] = useState<keyof SurgeonRevRow>("earned");

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
    const earned = appointments
      .filter((a) => a.status === "completed")
      .reduce((sum, a) => sum + (a.fee ?? 0), 0);
    const pending = appointments
      .filter((a) => a.status === "scheduled")
      .reduce((sum, a) => sum + (a.fee ?? 0), 0);
    const lost = appointments
      .filter((a) => a.status === "cancelled" || a.status === "no_show")
      .reduce((sum, a) => sum + (a.fee ?? 0), 0);
    const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0;
    const uniqueSurgeons = new Set(appointments.map((a) => a.surgeonId)).size;
    const avgPerSurgeon = uniqueSurgeons > 0 ? total / uniqueSurgeons : 0;
    return { total, cancelled, completed, earned, pending, lost, cancellationRate, uniqueSurgeons, avgPerSurgeon };
  }, [appointments]);

  // ── Surgeon revenue breakdown ───────────────────────────────────────────────
  const surgeonRevenueData = useMemo((): SurgeonRevRow[] => {
    const map: Record<number, SurgeonRevRow> = {};
    appointments.forEach((a) => {
      if (!map[a.surgeonId]) {
        const s = surgeons.find((s) => s.id === a.surgeonId);
        map[a.surgeonId] = {
          id: a.surgeonId,
          name: s ? `${s.firstName} ${s.lastName}` : `Surgeon #${a.surgeonId}`,
          earned: 0, pending: 0, lost: 0, total: 0, appointments: 0,
        };
      }
      const row = map[a.surgeonId];
      row.appointments++;
      const fee = a.fee ?? 0;
      if (a.status === "completed") { row.earned += fee; row.total += fee; }
      else if (a.status === "scheduled") { row.pending += fee; row.total += fee; }
      else { row.lost += fee; }
    });
    return Object.values(map).sort((a, b) => (b[revSort] as number) - (a[revSort] as number));
  }, [appointments, surgeons, revSort]);

  // Chart data sorted by earned desc (independent of table sort)
  const surgeonChartData = useMemo(() =>
    [...surgeonRevenueData].sort((a, b) => b.earned - a.earned),
    [surgeonRevenueData]
  );

  // Revenue totals row
  const revTotals = useMemo(() => ({
    earned: surgeonRevenueData.reduce((s, r) => s + r.earned, 0),
    pending: surgeonRevenueData.reduce((s, r) => s + r.pending, 0),
    lost: surgeonRevenueData.reduce((s, r) => s + r.lost, 0),
    total: surgeonRevenueData.reduce((s, r) => s + r.total, 0),
    appointments: surgeonRevenueData.reduce((s, r) => s + r.appointments, 0),
  }), [surgeonRevenueData]);

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

  // ── Appointments over time (area chart) ───────────────────────────────────
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

  // ── CSV exports ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["ID", "Patient", "Surgeon", "Event", "Date", "Time", "Status", "Fee (£)"];
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
    download(
      [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n"),
      `medconsult-appointments-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
  };

  const exportRevCSV = () => {
    const headers = ["Surgeon", "Appointments", "Earned (£)", "Pending (£)", "Lost (£)", "Pipeline (£)"];
    const rows = surgeonRevenueData.map((r) => [
      r.name, r.appointments,
      r.earned.toFixed(2), r.pending.toFixed(2), r.lost.toFixed(2), r.total.toFixed(2),
    ]);
    const totals = [
      "TOTAL", revTotals.appointments,
      revTotals.earned.toFixed(2), revTotals.pending.toFixed(2), revTotals.lost.toFixed(2), revTotals.total.toFixed(2),
    ];
    download(
      [headers, ...rows, totals].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n"),
      `medconsult-revenue-by-surgeon-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
  };

  function download(csv: string, filename: string) {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

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
        <Skeleton className="h-96" />
      </div>
    );
  }

  const sortCols: { key: keyof SurgeonRevRow; label: string }[] = [
    { key: "earned", label: "Earned" },
    { key: "pending", label: "Pending" },
    { key: "lost", label: "Lost" },
    { key: "total", label: "Pipeline" },
    { key: "appointments", label: "Appointments" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-sm text-muted-foreground">Appointment statistics, revenue &amp; surgeon performance</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Appointments CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportRevCSV} className="gap-2">
            <Download className="h-4 w-4" /> Revenue CSV
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
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Earned Revenue</CardTitle>
            <PoundSterling className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{formatCurrency(kpis.earned)}</div>
            <div className="text-xs text-muted-foreground mt-1">From completed appointments</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{formatCurrency(kpis.pending)}</div>
            <div className="text-xs text-muted-foreground mt-1">Scheduled appointments</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lost Revenue</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">{formatCurrency(kpis.lost)}</div>
            <div className="text-xs text-muted-foreground mt-1">Cancelled &amp; no-shows</div>
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
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={3} dataKey="value"
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val, name) => [`${val} appts`, name]} />
                  <Legend iconType="circle" iconSize={8} formatter={(val) => <span className="text-xs">{val}</span>} />
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

      {/* ── Revenue by Surgeon — main section ─────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <PoundSterling className="h-4 w-4 text-emerald-600" />
              Revenue by Surgeon
            </CardTitle>
            <CardDescription>Earned · Pending · Lost breakdown per surgeon</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <span className="text-xs text-muted-foreground">Sort by:</span>
            {sortCols.map((col) => (
              <button
                key={col.key}
                onClick={() => setRevSort(col.key)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  revSort === col.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {col.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {surgeonChartData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, surgeonChartData.length * 52)}>
              <BarChart data={surgeonChartData} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis
                  type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => formatCurrency(Number(v))}
                />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} tickLine={false} />
                <Tooltip
                  formatter={(v, name) => [formatCurrency(Number(v)), name]}
                  labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                />
                <Legend iconType="square" iconSize={10} formatter={(val) => <span className="text-xs">{val}</span>} />
                <Bar dataKey="earned"  name="Earned"  fill="#22c55e" radius={[0, 0, 0, 0]} maxBarSize={18} stackId="a" />
                <Bar dataKey="pending" name="Pending" fill="#0ea5e9" radius={[0, 0, 0, 0]} maxBarSize={18} stackId="a" />
                <Bar dataKey="lost"    name="Lost"    fill="#ef4444" radius={[0, 4, 4, 0]} maxBarSize={18} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Summary table */}
          {surgeonRevenueData.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Surgeon</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Appts</th>
                    <th className="px-4 py-2.5 text-right font-medium text-emerald-700">Earned</th>
                    <th className="px-4 py-2.5 text-right font-medium text-blue-700">Pending</th>
                    <th className="px-4 py-2.5 text-right font-medium text-red-700">Lost</th>
                    <th className="px-4 py-2.5 text-right font-medium text-foreground">Pipeline</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground hidden sm:table-cell">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {surgeonRevenueData.map((row) => {
                    const winRate = row.appointments > 0
                      ? (row.earned / (row.earned + row.lost + row.pending || 1)) * 100
                      : 0;
                    return (
                      <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{row.name}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{row.appointments}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                          {row.earned > 0 ? formatCurrency(row.earned) : <span className="text-muted-foreground font-normal">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-700">
                          {row.pending > 0 ? formatCurrency(row.pending) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-red-700">
                          {row.lost > 0 ? formatCurrency(row.lost) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(row.total)}
                        </td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(winRate, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-9 text-right">
                              {fmt(winRate, 0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/30">
                    <td className="px-4 py-3 font-semibold">Total</td>
                    <td className="px-4 py-3 text-right font-semibold">{revTotals.appointments}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatCurrency(revTotals.earned)}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700">{formatCurrency(revTotals.pending)}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-700">{formatCurrency(revTotals.lost)}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatCurrency(revTotals.total)}</td>
                    <td className="hidden sm:table-cell" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row: Bookings by surgeon + by event */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bookings by Surgeon</CardTitle>
            <CardDescription>Total appointments booked per surgeon</CardDescription>
          </CardHeader>
          <CardContent>
            {surgeonChartData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={surgeonChartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="appointments" name="Bookings" radius={[0, 4, 4, 0]}>
                    {surgeonChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {eventData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bookings by Event</CardTitle>
              <CardDescription>Appointment volume per event</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
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
      </div>

      {/* Detail table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appointment Detail</CardTitle>
          <CardDescription>
            {appointments.length} records{range !== "all" ? ` · ${range === "week" ? "this week" : "this month"}` : ""}
          </CardDescription>
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
                          {a.fee != null ? formatCurrency(a.fee) : <span className="text-muted-foreground">—</span>}
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
