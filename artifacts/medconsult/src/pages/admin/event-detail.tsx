import { useState, useEffect } from "react";
import { useParams } from "wouter";
import {
  useGetEvent, useUpdateEvent, getGetEventQueryKey,
  useListEventSurgeons, useAddEventSurgeon, useUpdateEventSurgeon, useRemoveEventSurgeon, getListEventSurgeonsQueryKey,
  useListEventCustomers, useAddEventCustomer, useRemoveEventCustomer, getListEventCustomersQueryKey,
  useListAppointments, useCreateAppointment, useDeleteAppointment, getListAppointmentsQueryKey,
  useListSurgeons, useListCustomers,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAgency } from "@/contexts/AgencyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Pencil, Trash2, UserMinus } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const addSurgeonSchema = z.object({
  surgeonId: z.string().min(1, "Please select a surgeon"),
  defaultFee: z.string().optional().or(z.literal("")),
  defaultSlotMinutes: z.string().optional().or(z.literal("")),
});

const editSurgeonSchema = z.object({
  defaultFee: z.string().optional().or(z.literal("")),
  defaultSlotMinutes: z.string().optional().or(z.literal("")),
});

const addCustomerSchema = z.object({
  customerId: z.string().min(1, "Please select a customer"),
});

const addAppointmentSchema = z.object({
  surgeonId: z.string().min(1, "Please select a surgeon"),
  customerId: z.string().min(1, "Please select a customer"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  fee: z.string().optional().or(z.literal("")),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).default("scheduled"),
  notes: z.string().optional().or(z.literal("")),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLocalDatetimeInput(isoStr?: string | null): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localDatetimeToISO(value: string): string {
  return new Date(value).toISOString();
}

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "scheduled": return "default";
    case "completed": return "secondary";
    case "cancelled": return "destructive";
    case "no_show": return "outline";
    default: return "outline";
  }
}

function statusLabel(status: string): string {
  return status === "no_show" ? "No Show" : status.charAt(0).toUpperCase() + status.slice(1);
}

// ─── Add Surgeon Dialog ────────────────────────────────────────────────────────

function AddSurgeonDialog({ eventId, assignedSurgeonIds }: { eventId: number; assignedSurgeonIds: number[] }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { formatCurrency } = useAgency();
  const { data: allSurgeons = [] } = useListSurgeons();
  const addEventSurgeon = useAddEventSurgeon();

  const availableSurgeons = allSurgeons.filter((s) => !assignedSurgeonIds.includes(s.id));

  const form = useForm<z.infer<typeof addSurgeonSchema>>({
    resolver: zodResolver(addSurgeonSchema),
    defaultValues: { surgeonId: "", defaultFee: "", defaultSlotMinutes: "" },
  });

  const onSubmit = (values: z.infer<typeof addSurgeonSchema>) => {
    addEventSurgeon.mutate({
      eventId,
      data: {
        surgeonId: Number(values.surgeonId),
        defaultFee: values.defaultFee ? Number(values.defaultFee) : null,
        defaultSlotMinutes: values.defaultSlotMinutes ? Number(values.defaultSlotMinutes) : null,
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEventSurgeonsQueryKey(eventId) });
        toast({ title: "Surgeon added to event" });
        setOpen(false);
        form.reset();
      },
      onError: () => toast({ title: "Failed to add surgeon", variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Surgeon</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Surgeon to Event</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="surgeonId" render={({ field }) => (
              <FormItem>
                <FormLabel>Surgeon</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select a surgeon" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableSurgeons.length === 0
                      ? <SelectItem value="-" disabled>All surgeons already assigned</SelectItem>
                      : availableSurgeons.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.firstName} {s.lastName}{s.specialization ? ` — ${s.specialization}` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="defaultFee" render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Fee (optional)</FormLabel>
                  <FormControl><Input type="number" min="0" step="0.01" placeholder="e.g. 150" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="defaultSlotMinutes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Slot Duration (mins)</FormLabel>
                  <FormControl><Input type="number" min="1" placeholder="e.g. 30" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addEventSurgeon.isPending}>
                {addEventSurgeon.isPending ? "Adding…" : "Add Surgeon"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Surgeon Dialog ───────────────────────────────────────────────────────

function EditSurgeonDialog({
  eventId, entryId, surgeonName, defaultFee, defaultSlotMinutes,
}: {
  eventId: number; entryId: number; surgeonName: string;
  defaultFee?: number | null; defaultSlotMinutes?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateEventSurgeon = useUpdateEventSurgeon();

  const form = useForm<z.infer<typeof editSurgeonSchema>>({
    resolver: zodResolver(editSurgeonSchema),
    defaultValues: {
      defaultFee: defaultFee != null ? String(defaultFee) : "",
      defaultSlotMinutes: defaultSlotMinutes != null ? String(defaultSlotMinutes) : "",
    },
  });

  const onSubmit = (values: z.infer<typeof editSurgeonSchema>) => {
    updateEventSurgeon.mutate({
      eventId,
      id: entryId,
      data: {
        defaultFee: values.defaultFee ? Number(values.defaultFee) : null,
        defaultSlotMinutes: values.defaultSlotMinutes ? Number(values.defaultSlotMinutes) : null,
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEventSurgeonsQueryKey(eventId) });
        toast({ title: "Surgeon settings updated" });
        setOpen(false);
      },
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Edit settings"><Pencil className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit — {surgeonName}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="defaultFee" render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Fee</FormLabel>
                  <FormControl><Input type="number" min="0" step="0.01" placeholder="e.g. 150" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="defaultSlotMinutes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Slot Duration (mins)</FormLabel>
                  <FormControl><Input type="number" min="1" placeholder="e.g. 30" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateEventSurgeon.isPending}>
                {updateEventSurgeon.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Surgeons Tab ──────────────────────────────────────────────────────────────

function SurgeonsTab({ eventId }: { eventId: number }) {
  const { formatCurrency } = useAgency();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: eventSurgeons = [], isLoading } = useListEventSurgeons(eventId);
  const { data: allSurgeons = [] } = useListSurgeons();
  const removeEventSurgeon = useRemoveEventSurgeon();

  const surgeonMap = new Map(allSurgeons.map((s) => [s.id, s]));
  const assignedSurgeonIds = eventSurgeons.map((es) => es.surgeonId);

  const handleRemove = (entryId: number, surgeonName: string) => {
    removeEventSurgeon.mutate({ eventId, id: entryId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEventSurgeonsQueryKey(eventId) });
        toast({ title: `${surgeonName} removed from event` });
      },
      onError: () => toast({ title: "Failed to remove surgeon", variant: "destructive" }),
    });
  };

  if (isLoading) return <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Event Surgeons</CardTitle>
        <AddSurgeonDialog eventId={eventId} assignedSurgeonIds={assignedSurgeonIds} />
      </CardHeader>
      <CardContent>
        {eventSurgeons.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">No surgeons assigned yet. Add a surgeon to get started.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Surgeon</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Default Fee</TableHead>
                <TableHead>Slot Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventSurgeons.map((es) => {
                const surgeon = surgeonMap.get(es.surgeonId);
                const name = surgeon ? `${surgeon.firstName} ${surgeon.lastName}` : `Surgeon #${es.surgeonId}`;
                return (
                  <TableRow key={es.id}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="text-muted-foreground">{surgeon?.specialization ?? "—"}</TableCell>
                    <TableCell>{es.defaultFee != null ? formatCurrency(es.defaultFee) : "—"}</TableCell>
                    <TableCell>{es.defaultSlotMinutes != null ? `${es.defaultSlotMinutes} min` : "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <EditSurgeonDialog
                          eventId={eventId}
                          entryId={es.id}
                          surgeonName={name}
                          defaultFee={es.defaultFee}
                          defaultSlotMinutes={es.defaultSlotMinutes}
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Remove from event">
                              <UserMinus className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove {name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove {name} from this event. Existing appointments will not be affected.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemove(es.id, name)}>Remove</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Add Customer Dialog ───────────────────────────────────────────────────────

function AddCustomerDialog({ eventId, assignedCustomerIds }: { eventId: number; assignedCustomerIds: number[] }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: allCustomers = [] } = useListCustomers();
  const addEventCustomer = useAddEventCustomer();

  const availableCustomers = allCustomers
    .filter((c) => !assignedCustomerIds.includes(c.id))
    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));

  const form = useForm<z.infer<typeof addCustomerSchema>>({
    resolver: zodResolver(addCustomerSchema),
    defaultValues: { customerId: "" },
  });

  const onSubmit = (values: z.infer<typeof addCustomerSchema>) => {
    addEventCustomer.mutate({ eventId, data: { customerId: Number(values.customerId) } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEventCustomersQueryKey(eventId) });
        toast({ title: "Customer added to event" });
        setOpen(false);
        form.reset();
      },
      onError: () => toast({ title: "Failed to add customer", variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Customer</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Customer to Event</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="customerId" render={({ field }) => (
              <FormItem>
                <FormLabel>Customer</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableCustomers.length === 0
                      ? <SelectItem value="-" disabled>All customers already added</SelectItem>
                      : availableCustomers.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.firstName} {c.lastName}{c.email ? ` — ${c.email}` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addEventCustomer.isPending}>
                {addEventCustomer.isPending ? "Adding…" : "Add Customer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Customers Tab ─────────────────────────────────────────────────────────────

function CustomersTab({ eventId }: { eventId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: eventCustomers = [], isLoading } = useListEventCustomers(eventId);
  const removeEventCustomer = useRemoveEventCustomer();

  const assignedCustomerIds = eventCustomers.map((ec) => ec.customerId);

  const handleRemove = (entryId: number, customerName: string) => {
    removeEventCustomer.mutate({ eventId, id: entryId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEventCustomersQueryKey(eventId) });
        toast({ title: `${customerName} removed from event` });
      },
      onError: () => toast({ title: "Failed to remove customer", variant: "destructive" }),
    });
  };

  if (isLoading) return <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Event Customers</CardTitle>
        <AddCustomerDialog eventId={eventId} assignedCustomerIds={assignedCustomerIds} />
      </CardHeader>
      <CardContent>
        {eventCustomers.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">No customers added yet. Add a customer to get started.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventCustomers.map((ec) => {
                const c = ec.customer;
                const name = `${c.firstName} ${c.lastName}`;
                return (
                  <TableRow key={ec.id}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Remove from event">
                            <UserMinus className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove {name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove {name} from this event. Existing appointments will not be affected.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemove(ec.id, name)}>Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Add Appointment Dialog ────────────────────────────────────────────────────

function AddAppointmentDialog({ eventId, eventStartDate, eventSurgeons, allSurgeons, customers }: {
  eventId: number;
  eventStartDate: string;
  eventSurgeons: Array<{ id: number; surgeonId: number; defaultFee?: number | null; defaultSlotMinutes?: number | null }>;
  allSurgeons: Array<{ id: number; firstName: string; lastName: string }>;
  customers: Array<{ id: number; firstName: string; lastName: string; email?: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createAppointment = useCreateAppointment();
  const surgeonMap = new Map(allSurgeons.map((s) => [s.id, s]));

  const defaultStartTime = `${eventStartDate.slice(0, 10)}T09:00`;

  const form = useForm<z.infer<typeof addAppointmentSchema>>({
    resolver: zodResolver(addAppointmentSchema),
    defaultValues: {
      surgeonId: "", customerId: "", startTime: defaultStartTime, endTime: "",
      fee: "", status: "scheduled", notes: "",
    },
  });

  const selectedSurgeonId = form.watch("surgeonId");
  const watchedStartTime = form.watch("startTime");
  const selectedEventSurgeon = eventSurgeons.find((es) => String(es.surgeonId) === selectedSurgeonId);
  const slotMinutes = selectedEventSurgeon?.defaultSlotMinutes ?? 30;

  useEffect(() => {
    if (!watchedStartTime) return;
    const start = new Date(watchedStartTime);
    if (isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + slotMinutes * 60_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    form.setValue(
      "endTime",
      `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`,
    );
  }, [watchedStartTime, slotMinutes]);

  const onSubmit = (values: z.infer<typeof addAppointmentSchema>) => {
    createAppointment.mutate({
      data: {
        eventId,
        surgeonId: Number(values.surgeonId),
        customerId: Number(values.customerId),
        startTime: localDatetimeToISO(values.startTime),
        endTime: localDatetimeToISO(values.endTime),
        fee: values.fee ? Number(values.fee) : (selectedEventSurgeon?.defaultFee ?? null),
        slotMinutes: selectedEventSurgeon?.defaultSlotMinutes ?? null,
        status: values.status,
        notes: values.notes || null,
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey({ eventId }) });
        toast({ title: "Appointment booked" });
        setOpen(false);
        form.reset();
      },
      onError: () => toast({ title: "Failed to book appointment", variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Book Appointment</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Book Appointment</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="surgeonId" render={({ field }) => (
              <FormItem>
                <FormLabel>Surgeon</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select a surgeon" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {eventSurgeons.length === 0
                      ? <SelectItem value="-" disabled>No surgeons assigned to this event</SelectItem>
                      : eventSurgeons.map((es) => {
                        const s = surgeonMap.get(es.surgeonId);
                        return s ? (
                          <SelectItem key={es.surgeonId} value={String(es.surgeonId)}>
                            {s.firstName} {s.lastName}
                          </SelectItem>
                        ) : null;
                      })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="customerId" render={({ field }) => (
              <FormItem>
                <FormLabel>Customer</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.firstName} {c.lastName}{c.email ? ` — ${c.email}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="startTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="endTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>End</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="fee" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Fee{selectedEventSurgeon?.defaultFee != null ? ` (default: ${selectedEventSurgeon.defaultFee})` : ""}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number" min="0" step="0.01"
                      placeholder={selectedEventSurgeon?.defaultFee != null ? String(selectedEventSurgeon.defaultFee) : "e.g. 150"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl><Textarea placeholder="Any notes for this appointment…" rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createAppointment.isPending}>
                {createAppointment.isPending ? "Booking…" : "Book Appointment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Appointments Tab ──────────────────────────────────────────────────────────

function AppointmentsTab({ eventId, eventStartDate }: { eventId: number; eventStartDate: string }) {
  const { formatCurrency } = useAgency();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: appointments = [], isLoading } = useListAppointments({ eventId });
  const { data: eventSurgeons = [] } = useListEventSurgeons(eventId);
  const { data: allSurgeons = [] } = useListSurgeons();
  const { data: customersRaw = [] } = useListCustomers();
  const customers = [...customersRaw].sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
  );
  const deleteAppointment = useDeleteAppointment();

  const handleDelete = (id: number) => {
    deleteAppointment.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey({ eventId }) });
        toast({ title: "Appointment deleted" });
      },
      onError: () => toast({ title: "Failed to delete appointment", variant: "destructive" }),
    });
  };

  if (isLoading) return <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Appointments</CardTitle>
        <AddAppointmentDialog
          eventId={eventId}
          eventStartDate={eventStartDate}
          eventSurgeons={eventSurgeons}
          allSurgeons={allSurgeons}
          customers={customers}
        />
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">No appointments yet. Book the first one above.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date &amp; Time</TableHead>
                <TableHead>Surgeon</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appt) => {
                const start = new Date(appt.startTime);
                const end = new Date(appt.endTime);
                return (
                  <TableRow key={appt.id}>
                    <TableCell>
                      <div className="font-medium">{start.toLocaleDateString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {appt.surgeon.firstName} {appt.surgeon.lastName}
                    </TableCell>
                    <TableCell>
                      <div>{appt.customer.firstName} {appt.customer.lastName}</div>
                      {appt.customer.email && <div className="text-xs text-muted-foreground">{appt.customer.email}</div>}
                    </TableCell>
                    <TableCell>{appt.fee != null ? formatCurrency(appt.fee) : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(appt.status)}>{statusLabel(appt.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Delete appointment">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete appointment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the appointment for{" "}
                              {appt.customer.firstName} {appt.customer.lastName} with{" "}
                              {appt.surgeon.firstName} {appt.surgeon.lastName} on{" "}
                              {start.toLocaleDateString()}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(appt.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function EventDetail() {
  const { id } = useParams();
  const eventId = Number(id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: event, isLoading: isLoadingEvent } = useGetEvent(eventId);
  const updateEvent = useUpdateEvent();

  const handleStatusChange = (status: "draft" | "published" | "closed") => {
    updateEvent.mutate({ id: eventId, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(eventId) });
        toast({ title: `Event status updated to ${status}` });
      },
    });
  };

  if (isLoadingEvent) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!event) return <div className="p-8 text-center">Event not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/events">
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">{event.name}</h2>
          <Badge variant={event.status === "published" ? "default" : event.status === "draft" ? "secondary" : "outline"}>
            {event.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          {event.status === "draft" && <Button onClick={() => handleStatusChange("published")}>Publish Event</Button>}
          {event.status === "published" && <Button variant="destructive" onClick={() => handleStatusChange("closed")}>Close Event</Button>}
          {event.status === "closed" && <Button variant="outline" onClick={() => handleStatusChange("draft")}>Revert to Draft</Button>}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="surgeons">Surgeons</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div><span className="font-medium">Venue:</span> {event.venue}</div>
              <div><span className="font-medium">Start:</span> {new Date(event.startDate).toLocaleDateString()}</div>
              <div><span className="font-medium">End:</span> {new Date(event.endDate).toLocaleDateString()}</div>
              {event.description && <div><span className="font-medium">Description:</span> {event.description}</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="surgeons" className="mt-4">
          <SurgeonsTab eventId={eventId} />
        </TabsContent>

        <TabsContent value="customers" className="mt-4">
          <CustomersTab eventId={eventId} />
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          <AppointmentsTab eventId={eventId} eventStartDate={event.startDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
