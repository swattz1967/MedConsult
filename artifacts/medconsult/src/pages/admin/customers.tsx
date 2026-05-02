import { useState, useMemo, useCallback } from "react";
import { useListCustomers, sendDeclarationReminder } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  Mail,
  X,
  Loader2,
  AlertCircle,
  PoundSterling,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Filter = "all" | "signed" | "unsigned";
type SendState = "idle" | "sending" | "sent" | "error";

export default function CustomersList() {
  const { data: customers, isLoading } = useListCustomers();
  const { toast } = useToast();

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sendStates, setSendStates] = useState<Record<number, SendState>>({});
  const [isBulkSending, setIsBulkSending] = useState(false);

  const stats = useMemo(() => {
    if (!customers) return { total: 0, signed: 0, unsigned: 0, pct: 0, totalEarned: 0, totalPending: 0 };
    const signed = customers.filter((c) => c.declarationSigned).length;
    const totalEarned = customers.reduce((sum, c) => sum + (c.earnedFees ?? 0), 0);
    const totalPending = customers.reduce((sum, c) => sum + (c.pendingFees ?? 0), 0);
    return {
      total: customers.length,
      signed,
      unsigned: customers.length - signed,
      pct: customers.length > 0 ? Math.round((signed / customers.length) * 100) : 0,
      totalEarned,
      totalPending,
    };
  }, [customers]);

  const filtered = useMemo(() => {
    if (!customers) return [];
    return customers
      .filter((c) => {
        if (filter === "signed") return c.declarationSigned;
        if (filter === "unsigned") return !c.declarationSigned;
        return true;
      })
      .filter((c) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.nationality ?? "").toLowerCase().includes(q)
        );
      });
  }, [customers, filter, search]);

  // Customers in current filtered view that can receive a reminder
  const remindable = useMemo(
    () => filtered.filter((c) => !c.declarationSigned && !!c.email),
    [filtered],
  );

  const allRemindableSelected =
    remindable.length > 0 && remindable.every((c) => selected.has(c.id));

  const toggleRow = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allRemindableSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(remindable.map((c) => c.id)));
    }
  }, [allRemindableSelected, remindable]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const selectAllUnsigned = useCallback(() => {
    const allUnsignedWithEmail = (customers ?? []).filter(
      (c) => !c.declarationSigned && !!c.email,
    );
    setSelected(new Set(allUnsignedWithEmail.map((c) => c.id)));
  }, [customers]);

  const handleBulkSend = useCallback(async () => {
    if (selected.size === 0 || isBulkSending) return;

    const ids = Array.from(selected);
    const customerMap = new Map((customers ?? []).map((c) => [c.id, c]));

    setIsBulkSending(true);
    setSendStates((prev) => {
      const next = { ...prev };
      ids.forEach((id) => { next[id] = "sending"; });
      return next;
    });

    const results = await Promise.allSettled(
      ids.map((id) => sendDeclarationReminder(id)),
    );

    let succeeded = 0;
    let failed = 0;

    setSendStates((prev) => {
      const next = { ...prev };
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          next[ids[i]] = "sent";
          succeeded++;
        } else {
          next[ids[i]] = "error";
          failed++;
        }
      });
      return next;
    });

    setIsBulkSending(false);
    setSelected(new Set());

    const names = ids
      .slice(0, 3)
      .map((id) => customerMap.get(id)?.firstName ?? "")
      .filter(Boolean)
      .join(", ");

    if (failed === 0) {
      toast({
        title: `${succeeded} reminder${succeeded > 1 ? "s" : ""} sent`,
        description: `Emails sent to ${names}${succeeded > 3 ? ` and ${succeeded - 3} more` : ""}.`,
      });
    } else {
      toast({
        title: `${succeeded} sent, ${failed} failed`,
        description: "Some reminders could not be delivered. Check each customer's email address.",
        variant: "destructive",
      });
    }
  }, [selected, isBulkSending, customers, toast]);

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All Customers", count: stats.total },
    { key: "unsigned", label: "Unsigned", count: stats.unsigned },
    { key: "signed", label: "Signed", count: stats.signed },
  ];

  const selectedCount = selected.size;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-2xl font-bold leading-tight">
                {isLoading ? <Skeleton className="h-6 w-8" /> : stats.total}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Signed</div>
              <div className="text-2xl font-bold leading-tight text-green-700">
                {isLoading ? <Skeleton className="h-6 w-8" /> : stats.signed}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Unsigned</div>
              <div className="text-2xl font-bold leading-tight text-amber-700">
                {isLoading ? <Skeleton className="h-6 w-8" /> : stats.unsigned}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Compliance</div>
              <div className="text-2xl font-bold leading-tight text-primary">
                {isLoading ? <Skeleton className="h-6 w-8" /> : `${stats.pct}%`}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-4">
          <CardContent className="pt-4 pb-4 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <PoundSterling className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total Earned</div>
                <div className="text-2xl font-bold leading-tight text-emerald-700">
                  {isLoading ? <Skeleton className="h-6 w-16" /> : `£${stats.totalEarned.toFixed(2)}`}
                </div>
              </div>
            </div>
            <div className="h-10 w-px bg-border hidden sm:block" />
            <div>
              <div className="text-xs text-muted-foreground">Pending (scheduled)</div>
              <div className="text-xl font-semibold leading-tight text-muted-foreground">
                {isLoading ? <Skeleton className="h-5 w-14" /> : `£${stats.totalPending.toFixed(2)}`}
              </div>
            </div>
            <div className="h-10 w-px bg-border hidden sm:block" />
            <div>
              <div className="text-xs text-muted-foreground">Pipeline total</div>
              <div className="text-xl font-semibold leading-tight">
                {isLoading
                  ? <Skeleton className="h-5 w-16" />
                  : `£${(stats.totalEarned + stats.totalPending).toFixed(2)}`}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance bar */}
      {!isLoading && stats.total > 0 && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-700"
            style={{ width: `${stats.pct}%` }}
          />
        </div>
      )}

      {/* Filter tabs + search */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setSelected(new Set()); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                filter === f.key
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  filter === f.key ? "bg-primary/10 text-primary" : "bg-muted-foreground/20",
                )}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Bulk action toolbar — slides in when rows are selected */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg border border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center shrink-0">
              <Mail className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium">
              {selectedCount} customer{selectedCount > 1 ? "s" : ""} selected
            </span>
            {stats.unsigned > remindable.length + selectedCount && (
              <button
                onClick={selectAllUnsigned}
                className="text-xs text-primary underline underline-offset-2 hover:no-underline shrink-0"
              >
                Select all {stats.unsigned} unsigned
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={handleBulkSend}
              disabled={isBulkSending}
              className="gap-1.5"
            >
              {isBulkSending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Mail className="h-3.5 w-3.5" />
                  Send Reminder{selectedCount > 1 ? `s (${selectedCount})` : ""}
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={isBulkSending}
              className="gap-1"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 pl-4">
                  {remindable.length > 0 && (
                    <Checkbox
                      checked={allRemindableSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all unsigned with email"
                    />
                  )}
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Nationality</TableHead>
                <TableHead>Declaration</TableHead>
                <TableHead className="hidden xl:table-cell text-right">Revenue</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4"><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-[180px]" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-[90px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="hidden xl:table-cell text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {search ? "No customers match your search." : "No customers found."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((customer) => {
                  const canSelect = !customer.declarationSigned && !!customer.email;
                  const isSelected = selected.has(customer.id);
                  const sendState = sendStates[customer.id] ?? "idle";

                  return (
                    <TableRow
                      key={customer.id}
                      className={cn(
                        isSelected && "bg-primary/5",
                        sendState === "sent" && "bg-green-50/60",
                        sendState === "error" && "bg-red-50/60",
                      )}
                    >
                      <TableCell className="pl-4">
                        {canSelect ? (
                          sendState === "sending" ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : sendState === "sent" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : sendState === "error" ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleRow(customer.id)}
                              aria-label={`Select ${customer.firstName}`}
                            />
                          )
                        ) : null}
                      </TableCell>
                      <TableCell className="font-medium">
                        {customer.firstName} {customer.lastName}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {customer.email ?? "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {customer.dialingCode && customer.phone
                          ? `${customer.dialingCode} ${customer.phone}`
                          : customer.phone ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {customer.nationality ?? "—"}
                      </TableCell>
                      <TableCell>
                        {customer.declarationSigned ? (
                          <div className="space-y-0.5">
                            <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 text-xs">
                              <CheckCircle2 className="h-3 w-3" /> Signed
                            </Badge>
                            {customer.declarationSignedAt && (
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(customer.declarationSignedAt), "d MMM yyyy")}
                              </div>
                            )}
                          </div>
                        ) : sendState === "sent" ? (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1 text-xs">
                            <Mail className="h-3 w-3" /> Reminded
                          </Badge>
                        ) : sendState === "error" ? (
                          <Badge variant="outline" className="text-destructive border-destructive/30 gap-1 text-xs">
                            <AlertCircle className="h-3 w-3" /> Failed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 gap-1 text-xs">
                            <Clock className="h-3 w-3" /> Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-right">
                        {(customer.earnedFees ?? 0) > 0 || (customer.pendingFees ?? 0) > 0 ? (
                          <div className="space-y-0.5">
                            {(customer.earnedFees ?? 0) > 0 && (
                              <div className="text-sm font-semibold text-emerald-700">
                                £{(customer.earnedFees ?? 0).toFixed(2)}
                              </div>
                            )}
                            {(customer.pendingFees ?? 0) > 0 && (
                              <div className="text-xs text-muted-foreground">
                                +£{(customer.pendingFees ?? 0).toFixed(2)} pending
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/customers/${customer.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
