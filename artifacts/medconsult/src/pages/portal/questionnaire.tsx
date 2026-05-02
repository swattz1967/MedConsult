import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetAppointment,
  useListQuestionnaires,
  useGetQuestionnaire,
  useListQuestionnaireResponses,
  useSubmitQuestionnaireResponse,
  getListQuestionnaireResponsesQueryKey,
  useGetCurrentUser,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function QuestionnaireFormPage() {
  const { appointmentId: aptParam } = useParams<{ appointmentId: string }>();
  const appointmentId = Number(aptParam);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user } = useGetCurrentUser();
  const customerId = user?.customerId ?? undefined;

  const { data: appointment, isLoading: isLoadingApt } = useGetAppointment(appointmentId);

  // Find the default pre-consultation questionnaire
  const { data: questionnaires, isLoading: isLoadingQ } = useListQuestionnaires();
  const preConsultQ = questionnaires?.find(
    (q) => q.type === "pre_consultation" && q.isDefault,
  ) ?? questionnaires?.find((q) => q.type === "pre_consultation");

  const { data: questionnaire, isLoading: isLoadingQWQ } = useGetQuestionnaire(
    preConsultQ?.id ?? 0,
  );

  const { data: existingResponses } = useListQuestionnaireResponses({ appointmentId });
  const existingResponse = existingResponses?.find(
    (r) => r.questionnaireId === preConsultQ?.id,
  );

  const submitResponse = useSubmitQuestionnaireResponse();

  // Form state: { [questionId]: answerString }
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const QUESTIONS_PER_PAGE = 3;

  const questions = [...(questionnaire?.questions ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
  const pageQuestions = questions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE,
  );

  const setAnswer = (qId: number, val: string) =>
    setAnswers((prev) => ({ ...prev, [String(qId)]: val }));

  const isPageValid = pageQuestions
    .filter((q) => q.isRequired)
    .every((q) => (answers[String(q.id)] ?? "").trim().length > 0);

  const handleSubmit = () => {
    if (!customerId || !preConsultQ) return;

    const missingRequired = questions
      .filter((q) => q.isRequired)
      .filter((q) => !(answers[String(q.id)] ?? "").trim());

    if (missingRequired.length > 0) {
      toast({
        title: "Please answer all required questions",
        variant: "destructive",
      });
      return;
    }

    submitResponse.mutate(
      {
        data: {
          questionnaireId: preConsultQ.id,
          appointmentId,
          customerId,
          answers: JSON.stringify(answers),
          submittedAt: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListQuestionnaireResponsesQueryKey({ appointmentId }),
          });
          setSubmitted(true);
          toast({ title: "Form submitted successfully!" });
        },
        onError: () => {
          toast({ title: "Submission failed. Please try again.", variant: "destructive" });
        },
      },
    );
  };

  const isLoading = isLoadingApt || isLoadingQ || isLoadingQWQ;

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="text-center py-12 text-muted-foreground">Appointment not found.</div>
    );
  }

  if (!questionnaire || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/portal">
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">Pre-consultation Form</h2>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No pre-consultation form is available at this time.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already submitted
  if (existingResponse && !submitted) {
    const savedAnswers: Record<string, string> = (() => {
      try {
        return JSON.parse(existingResponse.answers);
      } catch {
        return {};
      }
    })();

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/portal">
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">Pre-consultation Form</h2>
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Submitted
          </Badge>
        </div>

        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div>
                <div className="font-semibold text-green-800">Form already submitted</div>
                {existingResponse.submittedAt && (
                  <div className="text-sm text-green-700">
                    Submitted on {format(new Date(existingResponse.submittedAt), "MMMM d, yyyy 'at' h:mm a")}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Responses</CardTitle>
            <CardDescription>For: {appointment.event?.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((q) => (
              <div key={q.id} className="space-y-1">
                <div className="text-sm font-medium">
                  {q.text}
                  {q.isRequired && <span className="text-destructive ml-1">*</span>}
                </div>
                <div className="text-sm text-muted-foreground bg-muted/40 px-3 py-2 rounded-md">
                  {savedAnswers[String(q.id)] || <span className="italic">No answer</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setLocation("/portal")}>
            Back to Portal
          </Button>
        </div>
      </div>
    );
  }

  // Submitted in this session — success screen
  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-green-200">
          <CardContent className="py-12 flex flex-col items-center text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Form Submitted!</h2>
            <p className="text-muted-foreground max-w-sm">
              Your pre-consultation form has been submitted successfully. Your surgeon will
              review your responses before your appointment.
            </p>
            <div className="text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-md">
              {appointment.event?.name} — {format(new Date(appointment.startTime), "MMM d, yyyy h:mm a")}
            </div>
            <Button onClick={() => setLocation("/portal")} className="mt-2">
              Back to My Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPct = Math.round(
    (Object.keys(answers).filter((k) => answers[k]).length / questions.length) * 100,
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/portal">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold tracking-tight">Pre-consultation Form</h2>
          <p className="text-sm text-muted-foreground truncate">
            {appointment.event?.name} — {format(new Date(appointment.startTime), "MMM d, yyyy")}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Page {currentPage + 1} of {totalPages}
          </span>
          <span>{progressPct}% answered</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{questionnaire.name}</CardTitle>
          <CardDescription>
            Questions {currentPage * QUESTIONS_PER_PAGE + 1}–
            {Math.min((currentPage + 1) * QUESTIONS_PER_PAGE, questions.length)} of{" "}
            {questions.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {pageQuestions.map((q, idx) => {
            const globalIdx = currentPage * QUESTIONS_PER_PAGE + idx + 1;
            const val = answers[String(q.id)] ?? "";
            const options = q.options ? q.options.split(",").map((o) => o.trim()) : [];

            return (
              <div key={q.id} className="space-y-3">
                <div className="flex gap-2">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {globalIdx}
                  </span>
                  <label className="text-sm font-medium leading-normal">
                    {q.text}
                    {q.isRequired && <span className="text-destructive ml-1">*</span>}
                  </label>
                </div>

                {/* text */}
                {q.type === "text" && (
                  <Textarea
                    placeholder="Type your answer here..."
                    value={val}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    className="min-h-[80px] resize-none ml-8"
                  />
                )}

                {/* yes_no */}
                {q.type === "yes_no" && (
                  <div className="flex gap-3 ml-8">
                    {["Yes", "No"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswer(q.id, opt)}
                        className={cn(
                          "flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all",
                          val === opt
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-background hover:border-primary/50 hover:bg-muted/50",
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* multiple_choice */}
                {q.type === "multiple_choice" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-8">
                    {options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswer(q.id, opt)}
                        className={cn(
                          "py-2.5 px-4 rounded-lg border-2 text-sm font-medium text-left transition-all",
                          val === opt
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background hover:border-primary/40 hover:bg-muted/40",
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* dropdown */}
                {q.type === "dropdown" && (
                  <select
                    value={val}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    className="ml-8 flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select an option...</option>
                    {options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentPage((p) => p - 1)}
          disabled={currentPage === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>

        <div className="flex gap-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === currentPage ? "w-6 bg-primary" : "w-2 bg-muted hover:bg-muted-foreground/30",
              )}
            />
          ))}
        </div>

        {currentPage < totalPages - 1 ? (
          <Button
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={!isPageValid}
            className="gap-2"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitResponse.isPending || !isPageValid}
            className="gap-2"
          >
            {submitResponse.isPending ? "Submitting..." : "Submit Form"}
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
