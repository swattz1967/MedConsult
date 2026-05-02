import { useMemo } from "react";
import {
  useGetCurrentUser,
  useListAppointments,
  useGetCustomer,
  useListQuestionnaireResponses,
  useListConsultationRecords,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import {
  Calendar,
  PenTool,
  CheckCircle2,
  ClipboardList,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Clock,
  ChevronRight,
  Stethoscope,
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE, MMM d, yyyy");
}

function ActionItem({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  href,
  cta,
  ctaVariant = "default",
  ctaClass,
  done,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  ctaVariant?: "default" | "outline";
  ctaClass?: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-background">
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
      {done ? (
        <Badge className="shrink-0 bg-green-100 text-green-700 border-green-200 gap-1 self-center">
          <CheckCircle2 className="h-3 w-3" /> Done
        </Badge>
      ) : (
        <Link href={href}>
          <Button size="sm" variant={ctaVariant} className={cn("shrink-0 self-center", ctaClass)}>
            {cta}
          </Button>
        </Link>
      )}
    </div>
  );
}

export default function CustomerPortal() {
  const { data: user, isLoading: isLoadingUser } = useGetCurrentUser();
  const customerId = user?.customerId ?? undefined;

  const { data: customer, isLoading: isLoadingCustomer } = useGetCustomer(customerId || 0);
  const { data: appointments, isLoading: isLoadingAppointments } = useListAppointments({ customerId });
  const { data: responses } = useListQuestionnaireResponses({ customerId });
  const { data: records } = useListConsultationRecords({ customerId });

  const now = useMemo(() => new Date(), []);

  const { upcoming, past, nextApt } = useMemo(() => {
    const all = appointments ?? [];
    const upcoming = all
      .filter((a) => !isPast(new Date(a.startTime)) || isToday(new Date(a.startTime)))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const past = all
      .filter((a) => isPast(new Date(a.startTime)) && !isToday(new Date(a.startTime)))
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    return { upcoming, past, nextApt: upcoming[0] ?? null };
  }, [appointments]);

  const declarationSigned = customer?.declarationSigned ?? false;

  const pendingForms = useMemo(
    () => upcoming.filter((a) => !responses?.some((r) => r.appointmentId === a.id)),
    [upcoming, responses],
  );

  const allActionsComplete = declarationSigned && pendingForms.length === 0;

  if (isLoadingUser || (customerId && isLoadingCustomer)) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!customerId || !customer) {
    return (
      <Card className="max-w-md mx-auto mt-12 border-dashed">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <PenTool className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">Profile Not Linked</h3>
          <p className="text-sm text-muted-foreground">
            Your account needs to be registered as a patient to access the portal.
          </p>
          <Link href="/register">
            <Button className="w-full">Register Now</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Welcome header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome, {customer.firstName}</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Here's your consultation overview. Complete any outstanding actions before your appointment.
        </p>
      </div>

      {/* Status banner */}
      {upcoming.length > 0 && (
        allActionsComplete ? (
          <div className="flex items-start gap-4 p-4 rounded-xl border border-green-200 bg-green-50/60">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-green-800">You're all set for your appointment</p>
              <p className="text-sm text-green-700 mt-0.5">
                Declaration signed and all pre-consultation forms completed. Nothing more to do.
              </p>
            </div>
            {nextApt && (
              <div className="text-right shrink-0 hidden sm:block">
                <div className="text-xs text-green-700 font-medium">Next appointment</div>
                <div className="text-sm font-bold text-green-800">{dayLabel(nextApt.startTime)}</div>
                <div className="text-xs text-green-700">{format(new Date(nextApt.startTime), "h:mm a")}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
            <div className="flex items-start gap-4 p-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900">
                  {[!declarationSigned && "declaration", pendingForms.length > 0 && `${pendingForms.length} form${pendingForms.length > 1 ? "s" : ""}`]
                    .filter(Boolean)
                    .join(" and ")
                    .replace(/^\w/, (c) => c.toUpperCase())}{" "}
                  required before your appointment
                </p>
                {nextApt && (
                  <p className="text-xs text-amber-700 mt-0.5">
                    Next appointment: <span className="font-medium">{dayLabel(nextApt.startTime)} at {format(new Date(nextApt.startTime), "h:mm a")}</span>
                  </p>
                )}
              </div>
            </div>
            <Separator className="bg-amber-200/60" />
            <div className="p-4 space-y-2">
              {!declarationSigned && (
                <ActionItem
                  icon={PenTool}
                  iconBg="bg-amber-100"
                  iconColor="text-amber-600"
                  title="Sign Patient Declaration"
                  description="Read and accept the 6 consent clauses to confirm your agreement."
                  href="/portal/declaration"
                  cta="Sign Now"
                  ctaClass="bg-amber-600 hover:bg-amber-700 text-white"
                />
              )}
              {pendingForms.map((apt) => (
                <ActionItem
                  key={apt.id}
                  icon={ClipboardList}
                  iconBg="bg-blue-100"
                  iconColor="text-blue-600"
                  title={`Pre-consultation Form — ${apt.event?.name ?? "Appointment"}`}
                  description={`Due before ${dayLabel(apt.startTime)} at ${format(new Date(apt.startTime), "h:mm a")}`}
                  href={`/portal/questionnaire/${apt.id}`}
                  cta="Fill in Form"
                  ctaVariant="outline"
                />
              ))}
            </div>
          </div>
        )
      )}

      {/* Upcoming appointments */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Upcoming Appointments
          </h3>
          {isLoadingAppointments && <Skeleton className="h-4 w-16" />}
        </div>

        {upcoming.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-muted-foreground space-y-2">
              <Calendar className="h-8 w-8 mx-auto opacity-30" />
              <p className="text-sm">No upcoming appointments.</p>
              <Link href="/events">
                <Button variant="outline" size="sm" className="mt-2">Browse Events</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((apt) => {
              const formDone = responses?.some((r) => r.appointmentId === apt.id);
              const readyForApt = declarationSigned && formDone;
              const today = isToday(new Date(apt.startTime));

              return (
                <Card
                  key={apt.id}
                  className={cn(
                    "transition-all",
                    today && !readyForApt && "border-red-200 bg-red-50/30",
                    !today && !declarationSigned && "border-amber-200 bg-amber-50/20",
                    readyForApt && "border-green-200 bg-green-50/20",
                  )}
                >
                  <CardContent className="p-0">
                    {/* Card header row */}
                    <div className="flex items-start gap-4 p-4">
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex flex-col items-center justify-center shrink-0 text-center",
                        today ? "bg-primary text-primary-foreground" : "bg-muted",
                      )}>
                        <span className="text-xs font-medium leading-none">
                          {format(new Date(apt.startTime), "MMM")}
                        </span>
                        <span className="text-xl font-bold leading-tight">
                          {format(new Date(apt.startTime), "d")}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{apt.event?.name ?? "Consultation"}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">
                                {apt.surgeon?.firstName} {apt.surgeon?.lastName}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {today ? <span className="font-semibold text-primary">Today</span> : dayLabel(apt.startTime)}
                              {" · "}{format(new Date(apt.startTime), "h:mm a")}
                              {apt.slotMinutes ? ` · ${apt.slotMinutes} min` : ""}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 capitalize text-xs",
                              apt.status === "completed" && "text-blue-700 border-blue-200 bg-blue-50",
                              apt.status === "scheduled" && "text-green-700 border-green-200 bg-green-50",
                              apt.status === "cancelled" && "text-red-700 border-red-200 bg-red-50",
                            )}
                          >
                            {apt.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Pre-appointment checklist */}
                    {apt.status !== "cancelled" && (
                      <>
                        <Separator />
                        <div className="px-4 py-3 flex flex-wrap gap-2 items-center">
                          {/* Declaration chip */}
                          {declarationSigned ? (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Declaration signed
                            </span>
                          ) : (
                            <Link href="/portal/declaration">
                              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium cursor-pointer hover:bg-amber-200 transition-colors">
                                <Clock className="h-3.5 w-3.5" /> Sign declaration
                                <ChevronRight className="h-3 w-3" />
                              </span>
                            </Link>
                          )}

                          {/* Form chip */}
                          {formDone ? (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Form submitted
                            </span>
                          ) : (
                            <Link href={`/portal/questionnaire/${apt.id}`}>
                              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium cursor-pointer hover:bg-blue-200 transition-colors">
                                <ClipboardList className="h-3.5 w-3.5" /> Fill in form
                                <ChevronRight className="h-3 w-3" />
                              </span>
                            </Link>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Past appointments */}
      {past.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold text-base flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            Past Appointments
          </h3>
          <div className="space-y-2">
            {past.slice(0, 5).map((apt) => {
              const record = records?.find((r) => r.appointmentId === apt.id);
              return (
                <div
                  key={apt.id}
                  className="flex items-center gap-4 p-3 border rounded-lg bg-background hover:bg-muted/30 transition-colors"
                >
                  <div className="h-10 w-10 rounded-lg bg-muted flex flex-col items-center justify-center shrink-0 text-center">
                    <span className="text-[10px] font-medium text-muted-foreground leading-none">
                      {format(new Date(apt.startTime), "MMM")}
                    </span>
                    <span className="text-base font-bold leading-tight text-muted-foreground">
                      {format(new Date(apt.startTime), "d")}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{apt.event?.name ?? "Consultation"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {apt.surgeon?.firstName} {apt.surgeon?.lastName} · {format(new Date(apt.startTime), "MMM d, yyyy")}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {record?.status === "completed" && (
                      <Link href={`/portal/records/${record.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                          <FileText className="h-3.5 w-3.5" /> Record
                        </Button>
                      </Link>
                    )}
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize text-xs",
                        apt.status === "completed" && "text-blue-700 border-blue-200 bg-blue-50",
                        apt.status === "no_show" && "text-orange-700 border-orange-200 bg-orange-50",
                        apt.status === "cancelled" && "text-red-700 border-red-200 bg-red-50",
                      )}
                    >
                      {apt.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              );
            })}
            {past.length > 5 && (
              <p className="text-xs text-center text-muted-foreground pt-1">
                + {past.length - 5} more past appointments
              </p>
            )}
          </div>
        </section>
      )}

      {/* Declaration status card (standalone, when no upcoming appointments) */}
      {upcoming.length === 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Declaration Status
          </h3>
          {declarationSigned ? (
            <div className="flex items-center gap-4 p-4 rounded-xl border border-green-200 bg-green-50/60">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-800">Declaration Signed</p>
                <p className="text-sm text-green-700">
                  Signed on {format(new Date(customer.declarationSignedAt!), "MMMM d, yyyy")}.
                </p>
              </div>
              <Link href="/portal/declaration">
                <Button variant="outline" size="sm" className="shrink-0">View</Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-start gap-4 p-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/40">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <PenTool className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900">Signature Required</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Sign your patient declaration before your first consultation. It only takes a minute.
                </p>
              </div>
              <Link href="/portal/declaration">
                <Button size="sm" className="shrink-0 bg-amber-600 hover:bg-amber-700">Sign Now</Button>
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
