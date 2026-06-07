import { useState } from "react";
import {
  useListSurgeons, useCreateSurgeon, useUpdateSurgeon, useDeleteSurgeon, getListSurgeonsQueryKey,
} from "@workspace/api-client-react";
import { useAgency } from "@/contexts/AgencyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

type SurgeonRow = { id: number; firstName: string; lastName: string; email: string; phone?: string | null; specialization?: string | null; bio?: string | null };

const surgeonSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional().or(z.literal("")),
  specialization: z.string().optional().or(z.literal("")),
  bio: z.string().optional().or(z.literal("")),
});

type SurgeonFormValues = z.infer<typeof surgeonSchema>;

function SurgeonFormDialog({
  open, onOpenChange, editing, onSubmit, isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: SurgeonRow | null;
  onSubmit: (values: SurgeonFormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<SurgeonFormValues>({
    resolver: zodResolver(surgeonSchema),
    values: editing ? {
      firstName: editing.firstName,
      lastName: editing.lastName,
      email: editing.email,
      phone: editing.phone ?? "",
      specialization: editing.specialization ?? "",
      bio: editing.bio ?? "",
    } : {
      firstName: "", lastName: "", email: "", phone: "", specialization: "", bio: "",
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) form.reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? `Edit — ${editing.firstName} ${editing.lastName}` : "Add Surgeon"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="specialization" render={({ field }) => (
                <FormItem><FormLabel>Specialization</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="bio" render={({ field }) => (
              <FormItem><FormLabel>Bio</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function SurgeonsList() {
  const { agencyId } = useAgency();
  const { data: surgeons, isLoading } = useListSurgeons();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingSurgeon, setEditingSurgeon] = useState<SurgeonRow | null>(null);

  const createSurgeon = useCreateSurgeon();
  const updateSurgeon = useUpdateSurgeon();
  const deleteSurgeon = useDeleteSurgeon();

  const handleCreate = (values: SurgeonFormValues) => {
    createSurgeon.mutate({ data: { ...values, agencyId } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSurgeonsQueryKey() });
        setCreateOpen(false);
        toast({ title: "Surgeon created" });
      },
      onError: () => toast({ title: "Failed to create surgeon", variant: "destructive" }),
    });
  };

  const handleEdit = (values: SurgeonFormValues) => {
    if (!editingSurgeon) return;
    updateSurgeon.mutate({ id: editingSurgeon.id, data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSurgeonsQueryKey() });
        setEditingSurgeon(null);
        toast({ title: "Surgeon updated" });
      },
      onError: () => toast({ title: "Failed to update surgeon", variant: "destructive" }),
    });
  };

  const handleDelete = (id: number, name: string) => {
    deleteSurgeon.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSurgeonsQueryKey() });
        toast({ title: `${name} deleted` });
      },
      onError: () => toast({ title: "Failed to delete surgeon", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Surgeons</h2>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Add Surgeon
        </Button>
      </div>

      <SurgeonFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        editing={null}
        onSubmit={handleCreate}
        isPending={createSurgeon.isPending}
      />
      <SurgeonFormDialog
        open={!!editingSurgeon}
        onOpenChange={(v) => { if (!v) setEditingSurgeon(null); }}
        editing={editingSurgeon}
        onSubmit={handleEdit}
        isPending={updateSurgeon.isPending}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : surgeons?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No surgeons found.</TableCell>
                </TableRow>
              ) : (
                surgeons?.map((surgeon) => {
                  const name = `${surgeon.firstName} ${surgeon.lastName}`;
                  return (
                    <TableRow key={surgeon.id}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>{surgeon.email}</TableCell>
                      <TableCell className="text-muted-foreground">{surgeon.specialization ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/surgeons/${surgeon.id}`} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-[var(--button-outline)] shadow-xs active:shadow-none min-h-8 px-3 py-1 hover:bg-accent">
                            View
                          </Link>
                          <Button variant="ghost" size="icon" title="Edit surgeon" onClick={() => setEditingSurgeon(surgeon as SurgeonRow)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Delete surgeon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete {name} and all their associated data. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(surgeon.id, name)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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
