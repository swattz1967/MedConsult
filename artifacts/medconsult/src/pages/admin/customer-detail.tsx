import { useState } from "react";
import { useParams } from "wouter";
import { useGetCustomer, useUpdateCustomer, getGetCustomerQueryKey, useListAppointments, useSendDeclarationReminder, type Appointment } from "@workspace/api-client-react";
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
import { ArrowLeft, CheckCircle2, Clock, User, Ruler, Scale, Activity, ShieldCheck, Calendar, AlertTriangle, Mail, Plus, CalendarClock } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BookAppointmentDialog } from "@/components/admin/book-appointment-dialog";
import { RescheduleAppointmentDialog } from "@/components/admin/reschedule-appointment-dialog";

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
  const { id } = useParams();
  const customerId = Number(id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);

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
                return (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between px-4 py-3 text-sm gap-4"
                  >
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

                    {/* Right: status badge + reschedule button */}
                    <div className="flex items-center gap-2 shrink-0">
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
    </div>
  );
}
