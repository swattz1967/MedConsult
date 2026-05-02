import { useState, useMemo } from "react";
import { useListCustomers } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import {
  Users,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Filter = "all" | "signed" | "unsigned";

export default function CustomersList() {
  const { data: customers, isLoading } = useListCustomers();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const stats = useMemo(() => {
    if (!customers) return { total: 0, signed: 0, unsigned: 0, pct: 0 };
    const signed = customers.filter((c) => c.declarationSigned).length;
    return {
      total: customers.length,
      signed,
      unsigned: customers.length - signed,
      pct: customers.length > 0 ? Math.round((signed / customers.length) * 100) : 0,
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

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All Customers", count: stats.total },
    { key: "unsigned", label: "Unsigned", count: stats.unsigned },
    { key: "signed", label: "Signed", count: stats.signed },
  ];

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
              onClick={() => setFilter(f.key)}
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Nationality</TableHead>
                <TableHead>Declaration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-[180px]" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-[90px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {search ? "No customers match your search." : "No customers found."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((customer) => (
                  <TableRow key={customer.id}>
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
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 gap-1 text-xs">
                          <Clock className="h-3 w-3" /> Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/customers/${customer.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
