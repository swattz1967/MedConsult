import { useRef, useState } from "react";
import { useListAgencies, useCreateAgency, useUpdateAgency, getListAgenciesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { CURRENCY_OPTIONS } from "@/lib/currency";
import { isValidHex, isLightColor, getContrastRatio, getWcagLevel } from "@/lib/color";

// ─── Preset colour palette ────────────────────────────────────────────────────

const COLOUR_PRESETS = [
  { hex: "#1a6b5c", label: "Teal" },
  { hex: "#2563eb", label: "Blue" },
  { hex: "#7c3aed", label: "Violet" },
  { hex: "#dc2626", label: "Red" },
  { hex: "#ea580c", label: "Orange" },
  { hex: "#ca8a04", label: "Amber" },
  { hex: "#16a34a", label: "Green" },
  { hex: "#0891b2", label: "Cyan" },
  { hex: "#db2777", label: "Pink" },
  { hex: "#374151", label: "Slate" },
];

// ─── Contrast badge ───────────────────────────────────────────────────────────

function ContrastBadge({ hex }: { hex: string }) {
  if (!isValidHex(hex)) return null;

  const vsWhite = getContrastRatio(hex, "#ffffff");
  const vsBlack = getContrastRatio(hex, "#000000");
  const bestRatio = Math.max(vsWhite, vsBlack);
  const bestFg = vsWhite > vsBlack ? "#ffffff" : "#000000";
  const level = getWcagLevel(bestRatio);

  const passes   = level === "AAA" || level === "AA";
  const partial  = level === "AA Large";

  const badge = passes
    ? { icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 border-emerald-200", tip: "Good contrast" }
    : partial
    ? { icon: AlertTriangle, cls: "bg-amber-50 text-amber-700 border-amber-200",   tip: "OK for large text / UI only" }
    : { icon: XCircle,       cls: "bg-red-50 text-red-700 border-red-200",         tip: "Insufficient contrast — consider a darker or lighter colour" };

  const Icon = badge.icon;

  return (
    <div className="flex items-center gap-2 mt-1.5">
      {/* Mini live text-on-colour preview */}
      <div
        className="px-2 py-0.5 rounded text-xs font-bold select-none shrink-0"
        style={{ backgroundColor: hex, color: bestFg }}
        title="How text looks on this colour"
      >
        Aa
      </div>

      {/* WCAG badge */}
      <div
        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${badge.cls}`}
        title={badge.tip}
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span>WCAG {level}</span>
        <span className="opacity-60">· {bestRatio.toFixed(1)}:1</span>
      </div>

      {/* Supplementary hint for failures */}
      {level === "Fail" && (
        <span className="text-xs text-red-600">Low contrast</span>
      )}
    </div>
  );
}

// ─── Colour picker input ──────────────────────────────────────────────────────

interface ColorPickerInputProps {
  value: string;
  onChange: (v: string) => void;
  label: string;
  presets?: boolean;
}

function ColorPickerInput({ value, onChange, label, presets = false }: ColorPickerInputProps) {
  const colorRef = useRef<HTMLInputElement>(null);
  const clean = (value ?? "").trim();
  const valid = isValidHex(clean);
  const swatchBg = valid ? clean : "#e5e7eb";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {/* Colour swatch — triggers native picker */}
        <button
          type="button"
          onClick={() => colorRef.current?.click()}
          title={`Choose ${label}`}
          className="h-9 w-9 shrink-0 rounded-md border-2 border-input cursor-pointer transition-all hover:scale-110 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          style={{ backgroundColor: swatchBg }}
          aria-label={`Pick ${label}`}
        />
        {/* Hidden native colour input */}
        <input
          ref={colorRef}
          type="color"
          value={valid ? clean : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
        />
        {/* Hex text input */}
        <Input
          value={clean}
          onChange={(e) => {
            const v = e.target.value.trim();
            onChange(v.startsWith("#") || v === "" ? v : `#${v}`);
          }}
          placeholder="#000000"
          className="font-mono text-sm"
          maxLength={7}
        />
      </div>

      {/* Quick preset swatches */}
      {presets && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {COLOUR_PRESETS.map((p) => (
            <button
              key={p.hex}
              type="button"
              title={p.label}
              onClick={() => onChange(p.hex)}
              className={`h-5 w-5 rounded-full border-2 transition-all hover:scale-125 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
                clean.toLowerCase() === p.hex ? "border-foreground shadow-sm scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: p.hex }}
              aria-label={p.label}
            />
          ))}
        </div>
      )}

      {/* Accessibility contrast check */}
      <ContrastBadge hex={clean} />
    </div>
  );
}

// ─── Brand preview card ───────────────────────────────────────────────────────

function BrandPreview({ name, primary, secondary }: { name: string; primary: string; secondary: string }) {
  const validP = isValidHex(primary);
  const validS = isValidHex(secondary);
  if (!validP && !validS) return null;

  const bgP = validP ? primary : "#e5e7eb";
  const fgP = validP ? (isLightColor(primary) ? "#111827" : "#ffffff") : "#374151";
  const initial = (name || "A")[0]?.toUpperCase() ?? "A";

  return (
    <div className="col-span-2 rounded-xl border overflow-hidden">
      <div className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50 border-b">
        Brand Preview
      </div>
      <div className="p-4 flex items-center gap-4">
        {/* Avatar */}
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center text-base font-bold shrink-0 shadow-sm"
          style={{ backgroundColor: bgP, color: fgP }}
        >
          {initial}
        </div>

        {/* Agency name */}
        <span className="font-semibold text-sm truncate flex-1" style={validP ? { color: primary } : {}}>
          {name || "Agency Name"}
        </span>

        {/* Colour chips */}
        <div className="flex items-center gap-3 shrink-0">
          {validP && (
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded-full border shadow-sm" style={{ backgroundColor: primary }} />
              <span className="text-xs text-muted-foreground font-mono">{primary}</span>
              <span className="text-xs text-muted-foreground">Primary</span>
            </div>
          )}
          {validS && (
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded-full border shadow-sm" style={{ backgroundColor: secondary }} />
              <span className="text-xs text-muted-foreground font-mono">{secondary}</span>
              <span className="text-xs text-muted-foreground">Secondary</span>
            </div>
          )}
        </div>
      </div>

      {/* Colour bar */}
      <div className="flex h-2">
        <div className="flex-1" style={{ backgroundColor: validP ? primary : "transparent" }} />
        <div className="flex-1" style={{ backgroundColor: validS ? secondary : "transparent" }} />
      </div>
    </div>
  );
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const agencySchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  primaryColor: z.string().optional().or(z.literal("")),
  secondaryColor: z.string().optional().or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  currency: z.enum(["GBP", "EUR", "TRY"]).default("GBP"),
});

type AgencyFormValues = z.infer<typeof agencySchema>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgenciesList() {
  const { data: agencies, isLoading } = useListAgencies();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createAgency = useCreateAgency();
  const updateAgency = useUpdateAgency();

  const form = useForm<AgencyFormValues>({
    resolver: zodResolver(agencySchema),
    defaultValues: {
      name: "", email: "", phone: "", website: "",
      primaryColor: "", secondaryColor: "", logoUrl: "", address: "",
      currency: "GBP",
    },
  });

  const watchName    = form.watch("name");
  const watchPrimary = form.watch("primaryColor") ?? "";
  const watchSecondary = form.watch("secondaryColor") ?? "";

  const onSubmit = (values: AgencyFormValues) => {
    if (editingId) {
      updateAgency.mutate({ id: editingId, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAgenciesQueryKey() });
          setOpen(false);
          toast({ title: "Agency updated" });
        },
      });
    } else {
      createAgency.mutate({ data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAgenciesQueryKey() });
          setOpen(false);
          toast({ title: "Agency created" });
        },
      });
    }
  };

  const openEdit = (agency: any) => {
    setEditingId(agency.id);
    form.reset({
      name: agency.name || "",
      email: agency.email || "",
      phone: agency.phone || "",
      website: agency.website || "",
      primaryColor: agency.primaryColor || "",
      secondaryColor: agency.secondaryColor || "",
      logoUrl: agency.logoUrl || "",
      address: agency.address || "",
      currency: agency.currency || "GBP",
    });
    setOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    form.reset({
      name: "", email: "", phone: "", website: "",
      primaryColor: "", secondaryColor: "", logoUrl: "", address: "",
      currency: "GBP",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Agencies</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Agency
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Agency" : "Add Agency"}</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* ── Basic info ── */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Basic Information
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input {...field} type="email" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="website" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl><Input {...field} type="url" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="currency" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CURRENCY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.symbol} {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="logoUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo URL</FormLabel>
                        <FormControl><Input {...field} type="url" placeholder="https://…" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* ── Brand colours ── */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Brand Colours
                  </p>
                  <div className="grid grid-cols-2 gap-6">
                    <FormField control={form.control} name="primaryColor" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Colour</FormLabel>
                        <FormControl>
                          <ColorPickerInput
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            label="primary colour"
                            presets
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="secondaryColor" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Colour</FormLabel>
                        <FormControl>
                          <ColorPickerInput
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            label="secondary colour"
                            presets
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Live preview */}
                    <BrandPreview
                      name={watchName}
                      primary={watchPrimary}
                      secondary={watchSecondary}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={createAgency.isPending || updateAgency.isPending}
                  >
                    {createAgency.isPending || updateAgency.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Table ── */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Colours</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : agencies?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No agencies found.
                  </TableCell>
                </TableRow>
              ) : (
                agencies?.map((agency) => (
                  <TableRow key={agency.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {agency.logoUrl ? (
                          <img
                            src={agency.logoUrl}
                            alt={agency.name}
                            className="w-6 h-6 rounded object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : agency.primaryColor && isValidHex(agency.primaryColor) ? (
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{
                              backgroundColor: agency.primaryColor,
                              color: isLightColor(agency.primaryColor) ? "#111" : "#fff",
                            }}
                          >
                            {agency.name[0]?.toUpperCase()}
                          </div>
                        ) : null}
                        {agency.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{agency.email}</TableCell>
                    <TableCell className="text-muted-foreground">{agency.phone}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {CURRENCY_OPTIONS.find((c) => c.value === agency.currency)?.symbol ?? "£"}{" "}
                        {agency.currency ?? "GBP"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {agency.primaryColor && isValidHex(agency.primaryColor) ? (
                          <div
                            className="h-5 w-5 rounded-full border shadow-sm"
                            style={{ backgroundColor: agency.primaryColor }}
                            title={`Primary: ${agency.primaryColor}`}
                          />
                        ) : (
                          <div className="h-5 w-5 rounded-full border border-dashed bg-muted" title="No primary colour" />
                        )}
                        {agency.secondaryColor && isValidHex(agency.secondaryColor) ? (
                          <div
                            className="h-5 w-5 rounded-full border shadow-sm"
                            style={{ backgroundColor: agency.secondaryColor }}
                            title={`Secondary: ${agency.secondaryColor}`}
                          />
                        ) : (
                          <div className="h-5 w-5 rounded-full border border-dashed bg-muted" title="No secondary colour" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openEdit(agency)}>
                        Edit
                      </Button>
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
