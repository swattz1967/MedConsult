import { useState } from "react";
import { useParams } from "wouter";
import { useGetSurgeon, useUpdateSurgeon, getGetSurgeonQueryKey, useListProcedures, useCreateProcedure, useUpdateProcedure, useDeleteProcedure, getListProceduresQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Edit2 } from "lucide-react";
import { Link } from "wouter";

const surgeonSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email(),
  phone: z.string().optional().or(z.literal("")),
  specialization: z.string().optional().or(z.literal("")),
});

const procedureSchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional().or(z.literal("")),
  category: z.string().optional().or(z.literal("")),
});

export default function SurgeonDetail() {
  const { id } = useParams();
  const surgeonId = Number(id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: surgeon, isLoading: isLoadingSurgeon } = useGetSurgeon(surgeonId);
  const { data: procedures, isLoading: isLoadingProcedures } = useListProcedures(surgeonId);

  const updateSurgeon = useUpdateSurgeon();
  const createProcedure = useCreateProcedure();
  const updateProcedure = useUpdateProcedure();
  const deleteProcedure = useDeleteProcedure();

  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [procDialogOpen, setProcDialogOpen] = useState(false);
  const [editingProcId, setEditingProcId] = useState<number | null>(null);

  const surgeonForm = useForm<z.infer<typeof surgeonSchema>>({
    resolver: zodResolver(surgeonSchema),
    values: {
      firstName: surgeon?.firstName || "",
      lastName: surgeon?.lastName || "",
      email: surgeon?.email || "",
      phone: surgeon?.phone || "",
      specialization: surgeon?.specialization || ""
    }
  });

  const procForm = useForm<z.infer<typeof procedureSchema>>({
    resolver: zodResolver(procedureSchema),
    defaultValues: { name: "", description: "", category: "" }
  });

  const onUpdateSurgeon = (values: z.infer<typeof surgeonSchema>) => {
    updateSurgeon.mutate({ id: surgeonId, data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSurgeonQueryKey(surgeonId) });
        setEditSheetOpen(false);
        toast({ title: "Surgeon profile updated" });
      }
    });
  };

  const onSaveProcedure = (values: z.infer<typeof procedureSchema>) => {
    if (editingProcId) {
      updateProcedure.mutate({ surgeonId, id: editingProcId, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProceduresQueryKey(surgeonId) });
          setProcDialogOpen(false);
          toast({ title: "Procedure updated" });
        }
      });
    } else {
      createProcedure.mutate({ surgeonId, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProceduresQueryKey(surgeonId) });
          setProcDialogOpen(false);
          toast({ title: "Procedure created" });
        }
      });
    }
  };

  const openCreateProc = () => {
    setEditingProcId(null);
    procForm.reset({ name: "", description: "", category: "" });
    setProcDialogOpen(true);
  };

  const openEditProc = (proc: any) => {
    setEditingProcId(proc.id);
    procForm.reset({ name: proc.name, description: proc.description || "", category: proc.category || "" });
    setProcDialogOpen(true);
  };

  const handleDeleteProc = (procId: number) => {
    if (confirm("Are you sure you want to delete this procedure?")) {
      deleteProcedure.mutate({ surgeonId, id: procId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProceduresQueryKey(surgeonId) });
          toast({ title: "Procedure deleted" });
        }
      });
    }
  };

  if (isLoadingSurgeon) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!surgeon) return <div className="p-8 text-center text-muted-foreground">Surgeon not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/surgeons">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight">Surgeon Profile</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Details</CardTitle>
            <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">Edit</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Edit Surgeon</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <Form {...surgeonForm}>
                    <form onSubmit={surgeonForm.handleSubmit(onUpdateSurgeon)} className="space-y-4">
                      <FormField control={surgeonForm.control} name="firstName" render={({ field }) => (
                        <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={surgeonForm.control} name="lastName" render={({ field }) => (
                        <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={surgeonForm.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={surgeonForm.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={surgeonForm.control} name="specialization" render={({ field }) => (
                        <FormItem><FormLabel>Specialization</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <div className="pt-4 flex justify-end">
                        <Button type="submit" disabled={updateSurgeon.isPending}>Save Changes</Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </SheetContent>
            </Sheet>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Name</div>
              <div className="text-lg">{surgeon.firstName} {surgeon.lastName}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Specialization</div>
              <div>{surgeon.specialization || "N/A"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Contact</div>
              <div>{surgeon.email}</div>
              <div>{surgeon.phone}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Procedures</CardTitle>
            <Dialog open={procDialogOpen} onOpenChange={setProcDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openCreateProc}><Plus className="h-4 w-4 mr-2" /> Add Procedure</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingProcId ? "Edit Procedure" : "Add Procedure"}</DialogTitle>
                </DialogHeader>
                <Form {...procForm}>
                  <form onSubmit={procForm.handleSubmit(onSaveProcedure)} className="space-y-4">
                    <FormField control={procForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={procForm.control} name="category" render={({ field }) => (
                      <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={procForm.control} name="description" render={({ field }) => (
                      <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={createProcedure.isPending || updateProcedure.isPending}>Save</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoadingProcedures ? (
              <div className="space-y-2"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
            ) : procedures?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No procedures configured.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {procedures?.map(proc => (
                    <TableRow key={proc.id}>
                      <TableCell>
                        <div className="font-medium">{proc.name}</div>
                        <div className="text-xs text-muted-foreground">{proc.description}</div>
                      </TableCell>
                      <TableCell>{proc.category}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditProc(proc)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteProc(proc.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
