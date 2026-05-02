import { useGetCurrentUser, useListAppointments, useGetCustomer, useUpdateCustomer, useListQuestionnaireResponses, useListConsultationRecords, getGetCustomerQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { FileText, Calendar, PenTool, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function CustomerPortal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, isLoading: isLoadingUser } = useGetCurrentUser();
  const customerId = user?.customerId ?? undefined;

  const { data: customer, isLoading: isLoadingCustomer } = useGetCustomer(customerId || 0);
  const { data: appointments } = useListAppointments({ customerId });
  const { data: responses } = useListQuestionnaireResponses({ customerId });
  const { data: records } = useListConsultationRecords({ customerId });

  const updateCustomer = useUpdateCustomer();

  const handleSignDeclaration = () => {
    if (!customerId) return;
    updateCustomer.mutate({ id: customerId, data: { declarationSigned: true, declarationSignedAt: new Date().toISOString() } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCustomerQueryKey(customerId) });
        toast({ title: "Declaration signed successfully" });
      }
    });
  };

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

  const bmi = customer.heightCm && customer.weightKg 
    ? (customer.weightKg / Math.pow(customer.heightCm / 100, 2)).toFixed(1)
    : "N/A";

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
              <CardDescription>Forms required before your consultation</CardDescription>
            </CardHeader>
            <CardContent>
              {appointments?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No forms required at this time.</div>
              ) : (
                <div className="space-y-4">
                  {appointments?.map(apt => {
                    const hasResponse = responses?.some(r => r.appointmentId === apt.id);
                    return (
                      <div key={apt.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">Medical History Form</div>
                          <div className="text-sm text-muted-foreground">For: {apt.event?.name}</div>
                        </div>
                        {hasResponse ? (
                          <Badge variant="secondary" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Submitted</Badge>
                        ) : (
                          <Button size="sm">Fill in Form</Button>
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
              <CardDescription>Required consent for consultations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Height</div>
                  <div className="font-medium">{customer.heightCm} cm</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Weight</div>
                  <div className="font-medium">{customer.weightKg} kg</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">BMI</div>
                  <div className="font-medium"><Badge variant="outline">{bmi}</Badge></div>
                </div>
              </div>

              {customer.declarationSigned ? (
                <div className="flex flex-col items-center justify-center p-8 border border-green-200 bg-green-50/50 rounded-lg text-green-800 space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                  <h3 className="font-semibold text-lg">Declaration Signed</h3>
                  <p className="text-sm text-center">You signed the medical declaration on {format(new Date(customer.declarationSignedAt!), "MMMM d, yyyy")}.</p>
                </div>
              ) : (
                <div className="space-y-4 border p-6 rounded-lg">
                  <h3 className="font-semibold">Patient Declaration and Consent</h3>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>I declare that the medical history and personal information I have provided are true and complete to the best of my knowledge.</p>
                    <p>I understand that providing false or misleading information may affect my safety during medical procedures.</p>
                    <p>I consent to the use of my medical records for the purpose of evaluation by consulting surgeons.</p>
                  </div>
                  <Button 
                    className="w-full sm:w-auto mt-4" 
                    onClick={handleSignDeclaration}
                    disabled={updateCustomer.isPending}
                  >
                    {updateCustomer.isPending ? "Signing..." : "I Confirm and Sign"}
                  </Button>
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
