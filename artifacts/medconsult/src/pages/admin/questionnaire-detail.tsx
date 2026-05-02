import { useState } from "react";
import { useParams } from "wouter";
import { useGetQuestionnaire, useCreateQuestion, useUpdateQuestion, useDeleteQuestion, getGetQuestionnaireQueryKey, Question } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Edit2, ChevronUp, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const questionSchema = z.object({
  text: z.string().min(1, "Question text is required"),
  type: z.enum(["text", "multiple_choice", "dropdown", "yes_no"]),
  options: z.string().optional().or(z.literal("")),
  isRequired: z.boolean().default(false),
  sortOrder: z.coerce.number().default(0),
});

const typeLabels: Record<string, string> = {
  text: "Text",
  multiple_choice: "Multiple Choice",
  dropdown: "Dropdown",
  yes_no: "Yes / No",
};

export default function QuestionnaireDetail() {
  const { id } = useParams();
  const questionnaireId = Number(id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: qData, isLoading } = useGetQuestionnaire(questionnaireId);

  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<z.infer<typeof questionSchema>>({
    resolver: zodResolver(questionSchema),
    defaultValues: { text: "", type: "text", options: "", isRequired: false, sortOrder: 0 },
  });

  const selectedType = form.watch("type");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetQuestionnaireQueryKey(questionnaireId) });

  const openCreate = () => {
    setEditingId(null);
    const nextOrder = (qData?.questions?.length || 0) + 1;
    form.reset({ text: "", type: "text", options: "", isRequired: false, sortOrder: nextOrder });
    setDialogOpen(true);
  };

  const openEdit = (q: Question) => {
    setEditingId(q.id);
    form.reset({
      text: q.text,
      type: q.type as "text" | "multiple_choice" | "dropdown" | "yes_no",
      options: q.options || "",
      isRequired: q.isRequired,
      sortOrder: q.sortOrder,
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof questionSchema>) => {
    const payload = { ...values };
    if (editingId) {
      updateQuestion.mutate({ questionnaireId, id: editingId, data: payload }, {
        onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: "Question updated" }); },
      });
    } else {
      createQuestion.mutate({ questionnaireId, data: payload }, {
        onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: "Question added" }); },
      });
    }
  };

  const handleDelete = (qId: number) => {
    if (confirm("Delete this question?")) {
      deleteQuestion.mutate({ questionnaireId, id: qId }, {
        onSuccess: () => { invalidate(); toast({ title: "Question deleted" }); },
      });
    }
  };

  const handleMove = (qId: number, currentOrder: number, direction: "up" | "down") => {
    const newOrder = direction === "up" ? currentOrder - 1 : currentOrder + 1;
    updateQuestion.mutate({ questionnaireId, id: qId, data: { sortOrder: newOrder } }, {
      onSuccess: () => invalidate(),
    });
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!qData) return <div className="p-8 text-center">Questionnaire not found</div>;

  const sortedQuestions = [...(qData.questions || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/questionnaires">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{qData.name}</h2>
          <div className="flex gap-2 mt-1">
            <Badge variant="secondary">{qData.type.replace(/_/g, " ")}</Badge>
            {qData.isDefault && <Badge variant="default">Default</Badge>}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Questions ({sortedQuestions.length})</CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </CardHeader>
        <CardContent>
          {sortedQuestions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No questions yet. Click "Add Question" to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedQuestions.map((q, idx) => (
                <div key={q.id} className="flex items-start gap-3 p-4 border rounded-lg bg-card">
                  <div className="flex flex-col gap-1 pt-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0}
                      onClick={() => handleMove(q.id, q.sortOrder, "up")}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === sortedQuestions.length - 1}
                      onClick={() => handleMove(q.id, q.sortOrder, "down")}>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-muted-foreground">#{q.sortOrder}</span>
                      <p className="font-medium">{q.text}</p>
                      {q.isRequired && <span className="text-red-500 text-xs font-semibold">Required</span>}
                    </div>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{typeLabels[q.type] || q.type}</Badge>
                      {q.options && <span className="text-xs text-muted-foreground">Options: {q.options}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(q)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(q.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Question" : "Add Question"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="text" render={({ field }) => (
                <FormItem>
                  <FormLabel>Question Text</FormLabel>
                  <FormControl><Textarea {...field} rows={3} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="dropdown">Dropdown</SelectItem>
                        <SelectItem value="yes_no">Yes / No</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sortOrder" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order</FormLabel>
                    <FormControl><Input {...field} type="number" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              {(selectedType === "multiple_choice" || selectedType === "dropdown") && (
                <FormField control={form.control} name="options" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Options (comma-separated)</FormLabel>
                    <FormControl><Input {...field} placeholder="Option A, Option B, Option C" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              <FormField control={form.control} name="isRequired" render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <input type="checkbox" checked={field.value} onChange={field.onChange} className="h-4 w-4" />
                  </FormControl>
                  <FormLabel className="cursor-pointer">Required</FormLabel>
                </FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createQuestion.isPending || updateQuestion.isPending}>
                  {editingId ? "Save Changes" : "Add Question"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
