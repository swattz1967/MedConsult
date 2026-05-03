import { useState } from "react";
import { useListAgencies, useCreateAgency, useUpdateAgency, getListAgenciesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
    }
  });

  const onSubmit = (values: AgencyFormValues) => {
    if (editingId) {
      updateAgency.mutate({ id: editingId, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAgenciesQueryKey() });
          setOpen(false);
          toast({ title: "Agency updated" });
        }
      });
    } else {
      createAgency.mutate({ data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAgenciesQueryKey() });
          setOpen(false);
          toast({ title: "Agency created" });
        }
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
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Agency" : "Add Agency"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="website" render={({ field }) => (
                    <FormItem><FormLabel>Website</FormLabel><FormControl><Input {...field} type="url" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="primaryColor" render={({ field }) => (
                    <FormItem><FormLabel>Primary Color (Hex)</FormLabel><FormControl><Input {...field} placeholder="#1a6b5c" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="secondaryColor" render={({ field }) => (
                    <FormItem><FormLabel>Secondary Color (Hex)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
                    <FormItem><FormLabel>Logo URL</FormLabel><FormControl><Input {...field} type="url" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={createAgency.isPending || updateAgency.isPending}>Save</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Website</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
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
                        {agency.logoUrl && <img src={agency.logoUrl} alt={agency.name} className="w-6 h-6 rounded-full object-contain" />}
                        {agency.name}
                      </div>
                    </TableCell>
                    <TableCell>{agency.email}</TableCell>
                    <TableCell>{agency.phone}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {CURRENCY_OPTIONS.find((c) => c.value === agency.currency)?.symbol ?? "£"}{" "}
                        {agency.currency ?? "GBP"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {agency.website && (
                        <a href={agency.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {agency.website}
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openEdit(agency)}>Edit</Button>
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
