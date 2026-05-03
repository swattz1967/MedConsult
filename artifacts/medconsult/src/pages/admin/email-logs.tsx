import { useState, useMemo } from "react";
import { useListEmailLogs } from "@workspace/api-client-react";
import { useAgency } from "@/contexts/AgencyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MailCheck,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Download,
  CalendarRange,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;
const EXPORT_LIMIT = 10_000;

// ─── Label maps ───────────────────────────────────────────────────────────────

const TEMPLATE_LABELS: Record<string, string> = {
  registration_welcome:    "Registration Welcome",
  booking_confirmation:    "Booking Confirmation",
  new_booking_alert:       "New Booking Alert",
  reschedule_notification: "Reschedule Notification",
  declaration_reminder:    "Declaration Reminder",
  status_confirmed:        "Status: Confirmed",
  status_cancelled:        "Status: Cancelled",
  status_completed:        "Status: Completed",
  status_no_show:          "Status: No-show",
};

const RECIPIENT_LABELS: Record<string, string> = {
  customer: "Patient",
  surgeon:  "Surgeon",
  admin:    "Admin",
};

const TEMPLATE_OPTIONS = [
  { value: "", label: "All Templates" },
  ...Object.entries(TEMPLATE_LABELS).map(([value, label]) => ({ value, label })),
];

// ─── Date preset helpers ──────────────────────────────────────────────────────

type Preset = "all" | "today" | "7d" | "30d" | "90d" | "custom";

const PRESET_LABELS: Record<Preset, string> = {
  all:    "All time",
  today:  "Today",
  "7d":   "Last 7 days",
  "30d":  "Last 30 days",
  "90d":  "Last 90 days",
  custom: "Custom range",
};

function isoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function presetToDates(preset: Preset): { from: string; to: string } | null {
  const today = new Date();
  switch (preset) {
    case "today": return { from: isoDate(startOfDay(today)), to: isoDate(endOfDay(today)) };
    case "7d":    return { from: isoDate(subDays(today, 6)), to: isoDate(today) };
    case "30d":   return { from: isoDate(subDays(today, 29)), to: isoDate(today) };
    case "90d":   return { from: isoDate(subDays(today, 89)), to: isoDate(today) };
    default:      return null;
  }
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function csvEscape(value: string | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

interface EmailLogRow {
  id: number;
  sentAt: string;
  templateType: string;
  recipientEmail: string;
  recipientType: string;
  subject: string;
  status: string;
  errorMessage?: string | null;
  agencyId?: number | null;
  appointmentId?: number | null;
  customerId?: number | null;
}

function rowsToCsv(rows: EmailLogRow[]): string {
  const header = [
    "ID", "Date", "Time", "Template", "Recipient Email",
    "Recipient Type", "Subject", "Status", "Error",
    "Agency ID", "Appointment ID", "Customer ID",
  ].join(",");

  const lines = rows.map((r) => {
    const d = new Date(r.sentAt);
    return [
      r.id,
      csvEscape(format(d, "yyyy-MM-dd")),
      csvEscape(format(d, "HH:mm:ss")),
      csvEscape(TEMPLATE_LABELS[r.templateType] ?? r.templateType),
      csvEscape(r.recipientEmail),
      csvEscape(RECIPIENT_LABELS[r.recipientType] ?? r.recipientType),
      csvEscape(r.subject),
      csvEscape(r.status),
      csvEscape(r.errorMessage),
      r.agencyId ?? "",
      r.appointmentId ?? "",
      r.customerId ?? "",
    ].join(",");
  });

  return [header, ...lines].join("\r\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function AdminEmailLogs() {
  const { agencyId } = useAgency();

  const [page,           setPage]           = useState(1);
  const [statusFilter,   setStatusFilter]   = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const [preset,         setPreset]         = useState<Preset>("all");
  const [customFrom,     setCustomFrom]     = useState("");
  const [customTo,       setCustomTo]       = useState("");
  const [isExporting,    setIsExporting]    = useState(false);

  // Resolve active date range from preset or custom inputs
  const dateRange = useMemo<{ from: string; to: string } | null>(() => {
    if (preset === "custom") {
      if (customFrom || customTo) return { from: customFrom, to: customTo };
      return null;
    }
    return presetToDates(preset);
  }, [preset, customFrom, customTo]);

  const queryParams = {
    agencyId: agencyId ?? 0,
    page,
    limit: PAGE_SIZE,
    ...(statusFilter   ? { status: statusFilter }         : {}),
    ...(templateFilter ? { templateType: templateFilter } : {}),
    ...(dateRange?.from ? { dateFrom: dateRange.from }    : {}),
    ...(dateRange?.to   ? { dateTo:   dateRange.to }      : {}),
  };

  const { data, isLoading } = useListEmailLogs(queryParams);

  const logs       = data?.logs ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function resetPage() { setPage(1); }

  function handleFilterChange(setter: (v: string) => void) {
    return (v: string) => { setter(v === "all" ? "" : v); resetPage(); };
  }

  function handlePresetChange(v: string) {
    setPreset(v as Preset);
    if (v !== "custom") { setCustomFrom(""); setCustomTo(""); }
    resetPage();
  }

  async function handleExport() {
    if (!agencyId) return;
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        agencyId: String(agencyId),
        limit:    String(EXPORT_LIMIT),
        page:     "1",
      });
      if (statusFilter)    params.set("status",       statusFilter);
      if (templateFilter)  params.set("templateType", templateFilter);
      if (dateRange?.from) params.set("dateFrom",     dateRange.from);
      if (dateRange?.to)   params.set("dateTo",       dateRange.to);

      const res  = await fetch(`/api/email-logs?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { logs: EmailLogRow[] };
      const csv  = rowsToCsv(json.logs ?? []);

      const stamp = format(new Date(), "yyyy-MM-dd");
      const parts = ["email-log", stamp];
      if (preset !== "all") parts.push(preset === "custom" ? `${customFrom}-${customTo}` : preset);
      if (statusFilter)    parts.push(statusFilter);
      if (templateFilter)  parts.push(templateFilter.replace(/_/g, "-"));
      downloadCsv(csv, `${parts.join("_")}.csv`);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Email Activity Log</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Every email sent by the system — across all templates and recipients
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status */}
        <Select value={statusFilter || "all"} onValueChange={handleFilterChange(setStatusFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        {/* Template */}
        <Select value={templateFilter || "all"} onValueChange={handleFilterChange(setTemplateFilter)}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Template" />
          </SelectTrigger>
          <SelectContent>
            {TEMPLATE_OPTIONS.map((t) => (
              <SelectItem key={t.value || "all"} value={t.value || "all"}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date preset */}
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-40">
            <CalendarRange className="h-4 w-4 mr-1 text-muted-foreground shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
              <SelectItem key={p} value={p}>{PRESET_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom date inputs */}
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="h-9 w-36 text-sm"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => { setCustomFrom(e.target.value); resetPage(); }}
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              className="h-9 w-36 text-sm"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => { setCustomTo(e.target.value); resetPage(); }}
            />
          </div>
        )}

        <span className="text-sm text-muted-foreground">
          {total.toLocaleString()} email{total !== 1 ? "s" : ""}
        </span>

        <Button
          variant="outline"
          size="sm"
          className="ml-auto gap-1.5"
          disabled={isExporting || total === 0}
          onClick={handleExport}
        >
          <Download className="h-4 w-4" />
          {isExporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <MailCheck className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-sm">No emails logged yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                {preset !== "all"
                  ? "No emails match the selected date range"
                  : "Emails will appear here once sent through any template"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Date &amp; Time</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.sentAt), "d MMM yyyy, h:mm a")}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {TEMPLATE_LABELS[log.templateType] ?? log.templateType}
                      </span>
                      {log.errorMessage && (
                        <p className="text-xs text-destructive mt-0.5 truncate max-w-xs">
                          {log.errorMessage}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.recipientEmail}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal capitalize">
                        {RECIPIENT_LABELS[log.recipientType] ?? log.recipientType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5",
                          log.status === "sent"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700",
                        )}
                      >
                        {log.status === "sent"
                          ? <CheckCircle2 className="h-3 w-3" />
                          : <AlertCircle  className="h-3 w-3" />}
                        {log.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
