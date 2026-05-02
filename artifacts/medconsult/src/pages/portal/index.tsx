import { useGetCurrentUser, useListAppointments, useGetCustomer, useListQuestionnaireResponses, useListConsultationRecords } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { FileText, Calendar, PenTool, CheckCircle2, ClipboardList } from "lucide-react";
import { Link } from "wouter";

export default function CustomerPortal() {
  const { data: user, isLoading: isLoadingUser } = useGetCurrentUser();
  const customerId = user?.customerId ?? undefined;

  const { data: customer, isLoading: isLoadingCustomer } = useGetCustomer(customerId || 0);
  const { data: appointments } = useListAppointments({ customerId });
  const { data: responses } = useListQuestionnaireResponses({ customerId });
  const { data: records } = useListConsultationRecords({ customerId });

  if (isLoadingUser || (customerId && isLoadingCustomer)) {
    return <div className="space-y-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!customerId || !customer) {
    return (
      <Card className="max-w-md mx-auto mt-12 border-dashed">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <PenTool className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">Profile Not Linked</h3>
          <p className="text-sm text-muted-foreground">Your account needs to be registered as a patient to access the portal.</p>
          <Link href="/register"><Button className="w-full">Register Now</Button></Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome, {customer.firstName}</h2>
          <p className="text-muted-foreground text-sm">Manage your consultations and medical records</p>
        </div>
      </div>

      <Tabs defaultValue="appointments">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="appointments"><Calendar className="h-4 w-4 mr-2" /> Appointments</TabsTrigger>
          <TabsTrigger value="forms"><FileText className="h-4 w-4 mr-2" /> Pre-consultation Forms</TabsTrigger>
          <TabsTrigger value="declaration"><PenTool className="h-4 w-4 mr-2" /> Declaration</TabsTrigger>
          <TabsTrigger value="records"><FileText className="h-4 w-4 mr-2" /> Medical Records</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>My Appointments</CardTitle>
              <CardDescription>Your upcoming and past consultation bookings</CardDescription>
            </CardHeader>
            <CardContent>
              {appointments?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">You have no appointments.</div>
              ) : (
                <div className="space-y-4">
                  {appointments?.map(apt => (
                    <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                      <div>
                        <div className="font-semibold">{apt.event?.name}</div>
                        <div className="text-sm text-muted-foreground">{apt.surgeon?.firstName} {apt.surgeon?.lastName}</div>
                      </div>
                      <div className="flex flex-col sm:items-end gap-2">
                        <div className="text-sm font-medium">{format(new Date(apt.startTime), "MMM d, yyyy h:mm a")}</div>
                        <Badge variant={apt.status === "completed" ? "default" : "outline"}>{apt.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pre-consultation Forms</CardTitle>
              <CardDescription>Complete these forms before your consultation appointment</CardDescription>
            </CardHeader>
            <CardContent>
              {!appointments?.length ? (
                <div className="text-center py-8 text-muted-foreground">No forms required at this time.</div>
              ) : (
                <div className="space-y-3">
                  {appointments.map(apt => {
                    const hasResponse = responses?.some(r => r.appointmentId === apt.id);
                    return (
                      <div key={apt.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <ClipboardList className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">Pre-consultation Medical History</div>
                            <div className="text-sm text-muted-foreground">
                              {apt.event?.name} · {format(new Date(apt.startTime), "MMM d, yyyy")}
                            </div>
                          </div>
                        </div>
                        {hasResponse ? (
                          <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="h-3 w-3" /> Submitted
                          </Badge>
                        ) : (
                          <Link href={`/portal/questionnaire/${apt.id}`}>
                            <Button size="sm" className="shrink-0">Fill in Form</Button>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="declaration" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Medical Declaration</CardTitle>
              <CardDescription>Patient consent &amp; agreement required before consultation</CardDescription>
            </CardHeader>
            <CardContent>
              {customer.declarationSigned ? (
                <div className="flex flex-col sm:flex-row items-start gap-4 p-5 border border-green-200 bg-green-50/40 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-green-800 mb-0.5">Declaration Signed</h3>
                    <p className="text-sm text-green-700">
                      Signed on {format(new Date(customer.declarationSignedAt!), "MMMM d, yyyy")}. All 6 consent clauses were accepted.
                    </p>
                  </div>
                  <Link href="/portal/declaration">
                    <Button variant="outline" size="sm" className="shrink-0">View</Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start gap-4 p-5 border-2 border-dashed border-amber-300 bg-amber-50/40 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <PenTool className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-amber-800 mb-0.5">Signature Required</h3>
                    <p className="text-sm text-amber-700">
                      You must read and sign the patient declaration before your consultation. It covers 6 consent clauses including data use, scope of care, and cancellation policy.
                    </p>
                  </div>
                  <Link href="/portal/declaration">
                    <Button size="sm" className="shrink-0 bg-amber-600 hover:bg-amber-700">Sign Now</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Consultation Records</CardTitle>
              <CardDescription>Post-consultation notes and documents</CardDescription>
            </CardHeader>
            <CardContent>
              {records?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No records available yet.</div>
              ) : (
                <div className="space-y-4">
                  {records?.map(record => (
                    <div key={record.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">Consultation Record</div>
                        <Badge variant={record.status === "completed" ? "default" : "outline"}>{record.status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-4">
                        Appointment #{record.appointmentId} • Surgeon #{record.surgeonId}
                      </div>
                      <Button variant="outline" size="sm" disabled={record.status !== "completed"}>
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
