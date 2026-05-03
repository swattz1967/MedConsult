import { useState } from "react";
import { useListEmailLogs } from "@workspace/api-client-react";
import { useAgency } from "@/contexts/AgencyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { MailCheck, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

const TEMPLATE_LABELS: Record<string, string> = {
  registration_welcome:   "Registration Welcome",
  booking_confirmation:   "Booking Confirmation",
  new_booking_alert:      "New Booking Alert",
  reschedule_notification:"Reschedule Notification",
  declaration_reminder:   "Declaration Reminder",
  status_confirmed:       "Status: Confirmed",
  status_cancelled:       "Status: Cancelled",
  status_completed:       "Status: Completed",
  status_no_show:         "Status: No-show",
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

export default function AdminEmailLogs() {
  const { agencyId } = useAgency();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");

  const { data, isLoading } = useListEmailLogs({
    agencyId: agencyId ?? 0,
    page,
    limit: PAGE_SIZE,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(templateFilter ? { templateType: templateFilter } : {}),
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v === "all" ? "" : v);
    setPage(1);
  };

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

        <Select value={templateFilter || "all"} onValueChange={handleFilterChange(setTemplateFilter)}>
          <SelectTrigger className="w-56">
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

        <span className="text-sm text-muted-foreground ml-auto">
          {total.toLocaleString()} email{total !== 1 ? "s" : ""}
        </span>
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
                Emails will appear here once sent through any template
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
                        {log.status === "sent" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
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
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
