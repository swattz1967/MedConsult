import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useGetCustomer, useUpdateCustomer, useUpdateAppointment, getGetCustomerQueryKey, useListAppointments, getListAppointmentsQueryKey, useSendDeclarationReminder, type Appointment } from "@workspace/api-client-react";
import { useAgency } from "@/contexts/AgencyContext";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, CheckCircle2, Clock, User, Ruler, Scale, Activity, ShieldCheck, Calendar, AlertTriangle, Mail, Plus, CalendarClock, XCircle, UserX, CheckCheck, StickyNote, Pencil, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { BookAppointmentDialog } from "@/components/admin/book-appointment-dialog";
import { RescheduleAppointmentDialog } from "@/components/admin/reschedule-appointment-dialog";
import { CancelAppointmentDialog } from "@/components/admin/cancel-appointment-dialog";
import { NoShowDialog } from "@/components/admin/no-show-dialog";
import { CompleteAppointmentDialog } from "@/components/admin/complete-appointment-dialog";

// ── Inline note editor ───────────────────────────────────────────────────────
function NotePopover({
  appointment,
  customerId,
}: {
  appointment: Appointment;
  customerId: number;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const update = useUpdateAppointment();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(appointment.notes ?? "");

  // Re-sync draft whenever the popover opens or notes change externally
  useEffect(() => {
    if (open) setDraft(appointment.notes ?? "");
  }, [open, appointment.notes]);

  const hasNote = Boolean(appointment.notes?.trim());
  const isDirty = draft.trim() !== (appointment.notes ?? "");

  function save() {
    update.mutate(
      { id: appointment.id, data: { notes: draft.trim() || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListAppointmentsQueryKey({ customerId }),
          });
          toast({ title: draft.trim() ? "Note saved" : "Note cleared" });
          setOpen(false);
        },
        onError: () => {
          toast({
            title: "Failed to save note",
            variant: "destructive",
          });
        },
      },
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "flex items-start gap-2 px-4 pb-2.5 group",
          !hasNote && "pt-0",
        )}
      >
        <StickyNote
          className={cn(
            "h-3.5 w-3.5 mt-0.5 shrink-0 transition-colors",
            hasNote ? "text-muted-foreground/60" : "text-muted-foreground/30",
          )}
        />
        {hasNote ? (
          <p
            className={cn(
              "text-xs leading-relaxed flex-1 min-w-0",
              appointment.status === "cancelled"
                ? "text-red-600/80"
                : appointment.status === "no_show"
                  ? "text-orange-600/80"
                  : "text-muted-foreground",
            )}
            title={appointment.notes ?? undefined}
          >
            {appointment.notes}
          </p>
        ) : (
          <span className="text-xs text-muted-foreground/40 italic flex-1">
            No note
          </span>
        )}

        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-foreground shrink-0"
            title={hasNote ? "Edit note" : "Add note"}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
      </div>

      <PopoverContent
        className="w-80 p-3 shadow-lg"
        side="bottom"
        align="end"
        sideOffset={4}
      >
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Appointment note
          </p>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a note about this appointment…"
            rows={4}
            className="text-sm resize-none focus-visible:ring-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
              if (e.key === "Escape") setOpen(false);
            }}
          />
          <div className="flex items-center justify-between gap-2">
            {hasNote && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-destructive/70 hover:text-destructive"
                onClick={() => setDraft("")}
                disabled={update.isPending}
              >
                Clear
              </Button>
            )}
            <div className="flex gap-1.5 ml-auto">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-3 text-xs"
                onClick={() => setOpen(false)}
                disabled={update.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 px-3 text-xs gap-1.5"
                onClick={save}
                disabled={!isDirty || update.isPending}
              >
                {update.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Save
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/50">
            ⌘ Enter to save · Esc to close
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

const CONSENT_CLAUSES = [
  "Accuracy of Information",
  "Use of Medical Records",
  "Scope of Consultation",
  "Communications",
  "Clinical Photography",
  "Terms & Cancellation Policy",
];

function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Underweight", color: "text-blue-600" };
  if (bmi < 25) return { label: "Healthy", color: "text-green-600" };
  if (bmi < 30) return { label: "Overweight", color: "text-amber-600" };
  return { label: "Obese", color: "text-red-600" };
}

export default function CustomerDetail() {
  const { formatCurrency } = useAgency();
  const { id } = useParams();
  const customerId = Number(id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [noShowTarget, setNoShowTarget] = useState<Appointment | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Appointment | null>(null);
  const now = new Date();

  const { data: customer, isLoading } = useGetCustomer(customerId);
  const { data: appointments } = useListAppointments({ customerId });
  const updateCustomer = useUpdateCustomer();
  const sendReminder = useSendDeclarationReminder();

  const handleSendReminder = () => {
    sendReminder.mutate(
      { id: customerId },
      {
        onSuccess: () => {
          toast({ title: "Reminder sent", description: `An email has been sent to ${customer?.email}` });
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof Error ? err.message : "Failed to send reminder email";
          toast({ title: "Could not send reminder", description: msg, variant: "destructive" });
        },
      },
    );
  };

  const handleMarkSigned = () => {
    updateCustomer.mutate(
      { id: customerId, data: { declarationSigned: true, declarationSignedAt: new Date().toISOString() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCustomerQueryKey(customerId) });
          toast({ title: "Declaration marked as signed" });
        },
        onError: () => {
          toast({ title: "Failed to update declaration", variant: "destructive" });
        },
      },
    );
  };

  const handleRevoke = () => {
    updateCustomer.mutate(
      { id: customerId, data: { declarationSigned: false, declarationSignedAt: null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCustomerQueryKey(customerId) });
          toast({ title: "Declaration revoked" });
        },
        onError: () => {
          toast({ title: "Failed to revoke declaration", variant: "destructive" });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!customer) return <div className="p-8 text-center text-muted-foreground">Customer not found</div>;

  const bmiValue =
    customer.heightCm && customer.weightKg
      ? customer.weightKg / Math.pow(customer.heightCm / 100, 2)
      : null;
  const bmiDisplay = bmiValue ? bmiValue.toFixed(1) : null;
  const bmiCat = bmiDisplay ? bmiCategory(parseFloat(bmiDisplay)) : null;

  const upcomingAppointments = appointments?.filter((a) =>
    a.status === "scheduled",
  ) ?? [];
  const hasUpcoming = upcomingAppointments.length > 0;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/customers">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold tracking-tight truncate">
            {customer.firstName} {customer.lastName}
          </h2>
          <p className="text-sm text-muted-foreground">Customer ID #{customer.id}</p>
        </div>
        {customer.declarationSigned ? (
          <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 shrink-0">
            <CheckCircle2 className="h-3 w-3" /> Declaration Signed
          </Badge>
        ) : (
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 gap-1 shrink-0">
            <Clock className="h-3 w-3" /> Unsigned
          </Badge>
        )}
        <Button
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => setBookDialogOpen(true)}
        >
          <Plus className="h-4 w-4" /> Book Appointment
        </Button>
      </div>

      <BookAppointmentDialog
        open={bookDialogOpen}
        onOpenChange={setBookDialogOpen}
        customerId={customerId}
        customerName={`${customer.firstName} ${customer.lastName}`}
        customerEmail={customer.email}
      />

      {/* Upcoming appointments warning if unsigned */}
      {!customer.declarationSigned && hasUpcoming && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50/50">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Declaration Required</p>
            <p className="text-xs text-amber-700 mt-0.5">
              This customer has {upcomingAppointments.length} upcoming appointment
              {upcomingAppointments.length > 1 ? "s" : ""} but has not signed their patient declaration.
            </p>
          </div>
        </div>
      )}

      {/* Profile details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-sm">
            {[
              { label: "Email", value: customer.email },
              { label: "Phone", value: customer.dialingCode && customer.phone ? `${customer.dialingCode} ${customer.phone}` : customer.phone },
              { label: "Nationality", value: customer.nationality },
              { label: "Address", value: customer.address },
              { label: "Postcode", value: customer.postcode },
              { label: "Language", value: customer.preferredLanguage },
              { label: "Medical Interest", value: customer.medicalServicesInterest },
              { label: "Joined", value: format(new Date(customer.createdAt), "d MMM yyyy") },
            ]
              .filter((f) => f.value)
              .map((field) => (
                <div key={field.label} className="space-y-0.5">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">{field.label}</div>
                  <div className="font-medium">{field.value}</div>
                </div>
              ))}
          </div>

          {/* BMI row */}
          {(customer.heightCm || customer.weightKg || bmiDisplay) && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-3 gap-4 text-sm">
                {customer.heightCm && (
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Ruler className="h-3 w-3" /> Height
                    </div>
                    <div className="font-medium">{customer.heightCm} cm</div>
                  </div>
                )}
                {customer.weightKg && (
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Scale className="h-3 w-3" /> Weight
                    </div>
                    <div className="font-medium">{customer.weightKg} kg</div>
                  </div>
                )}
                {bmiDisplay && bmiCat && (
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Activity className="h-3 w-3" /> BMI
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{bmiDisplay}</span>
                      <span className={cn("text-xs font-medium", bmiCat.color)}>{bmiCat.label}</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Declaration section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Patient Declaration
              </CardTitle>
              <CardDescription className="mt-1">Consent status and clause details</CardDescription>
            </div>

            <div className="flex gap-2 shrink-0 flex-wrap">
              {!customer.declarationSigned && customer.email && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendReminder}
                  disabled={sendReminder.isPending}
                  className="gap-1.5"
                >
                  {sendReminder.isPending ? (
                    "Sending…"
                  ) : (
                    <>
                      <Mail className="h-3.5 w-3.5" />
                      Send Reminder
                    </>
                  )}
                </Button>
              )}
              {customer.declarationSigned ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5">
                      Revoke
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke Declaration?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will clear the signed status for {customer.firstName} {customer.lastName}. They will need to sign again before their next consultation.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleRevoke}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Revoke
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" disabled={updateCustomer.isPending}>
                      Mark as Signed
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Mark Declaration as Signed?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This records that {customer.firstName} {customer.lastName} has provided verbal or written consent off-platform. Use this only when the patient has confirmed their agreement through another channel.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleMarkSigned}>
                        Confirm
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status card */}
          {customer.declarationSigned ? (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-green-200 bg-green-50/40">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">Declaration Signed</p>
                {customer.declarationSignedAt && (
                  <p className="text-xs text-green-700 mt-0.5">
                    Signed on {format(new Date(customer.declarationSignedAt), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/30">
              <Clock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Awaiting Signature</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Patient has not yet signed their declaration. You can send them a reminder or mark it manually above.
                </p>
              </div>
            </div>
          )}

          {/* Clause checklist */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Consent Clauses
            </div>
            <div className="rounded-lg border divide-y">
              {CONSENT_CLAUSES.map((clause, idx) => (
                <div key={clause} className="flex items-center gap-3 px-4 py-2.5">
                  {customer.declarationSigned ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                  )}
                  <span className="text-sm flex-1">{clause}</span>
                  <span className="text-xs text-muted-foreground">{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Appointments
              {appointments && appointments.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({appointments.length})
                </span>
              )}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-xs"
              onClick={() => setBookDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Book New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!appointments || appointments.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No appointments yet.
            </div>
          ) : (
            <div className="rounded-lg border divide-y">
              {appointments.map((appt) => {
                const canReschedule = appt.status === "scheduled";
                const isPast = new Date(appt.startTime) < now;
                const canMarkNoShow = canReschedule && isPast;
                return (
                  <div key={appt.id} className="text-sm">
                    {/* Main row */}
                    <div className="flex items-center justify-between px-4 py-3 gap-4">
                    {/* Left: date + event + surgeon */}
                    <div className="min-w-0 space-y-0.5 flex-1">
                      <div className="font-medium">
                        {format(new Date(appt.startTime), "d MMM yyyy")}
                        <span className="text-muted-foreground font-normal ml-1.5">
                          {format(new Date(appt.startTime), "h:mm a")}
                        </span>
                        {appt.slotMinutes && (
                          <span className="text-muted-foreground font-normal ml-1">
                            · {appt.slotMinutes} min
                          </span>
                        )}
                        {appt.fee != null && (
                          <span className="ml-1.5 text-xs font-medium text-foreground/70 bg-muted px-1.5 py-0.5 rounded">
                            {formatCurrency(Number(appt.fee))}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {appt.event?.name ?? "—"}
                        {appt.surgeon && (
                          <span className="ml-1.5">
                            · {appt.surgeon.firstName} {appt.surgeon.lastName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: status badge + action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize text-xs",
                          appt.status === "scheduled" &&
                            "text-green-700 border-green-300 bg-green-50",
                          appt.status === "cancelled" &&
                            "text-red-700 border-red-300 bg-red-50",
                          appt.status === "completed" &&
                            "text-blue-700 border-blue-300 bg-blue-50",
                          appt.status === "no_show" &&
                            "text-orange-700 border-orange-300 bg-orange-50",
                        )}
                      >
                        {appt.status.replace("_", " ")}
                      </Badge>
                      {canReschedule && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setRescheduleTarget(appt)}
                        >
                          <CalendarClock className="h-3.5 w-3.5" />
                          Reschedule
                        </Button>
                      )}
                      {canReschedule && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-destructive"
                          onClick={() => setCancelTarget(appt)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      )}
                      {canMarkNoShow && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-orange-600"
                          onClick={() => setNoShowTarget(appt)}
                        >
                          <UserX className="h-3.5 w-3.5" />
                          No Show
                        </Button>
                      )}
                      {canMarkNoShow && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-blue-600"
                          onClick={() => setCompleteTarget(appt)}
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          Complete
                        </Button>
                      )}
                    </div>
                    </div>{/* end main row */}

                    {/* Inline note editor */}
                    <NotePopover appointment={appt} customerId={customerId} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Fee summary footer */}
          {appointments && appointments.some((a) => a.fee != null) && (() => {
            const sum = (filter: (a: Appointment) => boolean) =>
              appointments
                .filter((a) => a.fee != null && filter(a))
                .reduce((acc, a) => acc + Number(a.fee), 0);
            const pending  = sum((a) => a.status === "scheduled");
            const earned   = sum((a) => a.status === "completed");
            const lost     = sum((a) => a.status === "cancelled" || a.status === "no_show");
            const total    = pending + earned;
            const hasPending = appointments.some((a) => a.fee != null && a.status === "scheduled");
            const hasEarned  = appointments.some((a) => a.fee != null && a.status === "completed");
            const hasLost    = appointments.some((a) => a.fee != null && (a.status === "cancelled" || a.status === "no_show"));
            return (
              <div className="mt-3 pt-3 border-t mx-4">
                <div className="flex items-center justify-between gap-4 flex-wrap text-xs">
                  <div className="flex items-center gap-4 flex-wrap">
                    {hasPending && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                        <span className="text-muted-foreground">Pending</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(pending)}
                        </span>
                      </div>
                    )}
                    {hasEarned && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                        <span className="text-muted-foreground">Earned</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(earned)}
                        </span>
                      </div>
                    )}
                    {hasLost && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                        <span className="text-muted-foreground">Lost</span>
                        <span className="font-medium text-muted-foreground line-through">
                          {formatCurrency(lost)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-bold text-sm text-foreground">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Reschedule dialog */}
      {rescheduleTarget && (
        <RescheduleAppointmentDialog
          open={!!rescheduleTarget}
          onOpenChange={(open) => { if (!open) setRescheduleTarget(null); }}
          appointment={rescheduleTarget}
          customerId={customerId}
          customerEmail={customer.email}
          customerName={`${customer.firstName} ${customer.lastName}`}
        />
      )}

      {/* Cancel dialog */}
      {cancelTarget && (
        <CancelAppointmentDialog
          open={!!cancelTarget}
          onOpenChange={(open) => { if (!open) setCancelTarget(null); }}
          appointment={cancelTarget}
          customerId={customerId}
          customerEmail={customer.email}
          customerName={`${customer.firstName} ${customer.lastName}`}
        />
      )}

      {/* No-show dialog */}
      {noShowTarget && (
        <NoShowDialog
          open={!!noShowTarget}
          onOpenChange={(open) => { if (!open) setNoShowTarget(null); }}
          appointment={noShowTarget}
          customerId={customerId}
          customerEmail={customer.email}
          customerName={`${customer.firstName} ${customer.lastName}`}
        />
      )}

      {/* Complete dialog */}
      {completeTarget && (
        <CompleteAppointmentDialog
          open={!!completeTarget}
          onOpenChange={(open) => { if (!open) setCompleteTarget(null); }}
          appointment={completeTarget}
          customerId={customerId}
          customerName={`${customer.firstName} ${customer.lastName}`}
        />
      )}
    </div>
  );
}
