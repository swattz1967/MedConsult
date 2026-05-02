import { useParams } from "wouter";
import {
  useGetConsultationRecord,
  useGetAppointment,
  useListConsultationMedia,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, File as FileIcon, User, Stethoscope, Calendar } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function ConsultationDetail() {
  const { id } = useParams();
  const recordId = Number(id);

  const { data: record, isLoading } = useGetConsultationRecord(recordId);
  const { data: appointment, isLoading: isLoadingApt } = useGetAppointment(record?.appointmentId ?? 0);
  const { data: mediaList } = useListConsultationMedia(recordId);

  const handleDownloadPdf = () => {
    window.open(`/api/consultation-records/${recordId}/pdf`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!record) return <div className="p-8 text-center text-muted-foreground">Consultation Record not found</div>;

  const customer = appointment?.customer;
  const surgeon = appointment?.surgeon;
  const event = appointment?.event;
  const bmi = customer?.heightCm && customer?.weightKg
    ? (customer.weightKg / Math.pow(customer.heightCm / 100, 2)).toFixed(1)
    : null;

  let surgeonAnswers: Record<string, unknown> | null = null;
  if (record.surgeonAnswers) {
    try { surgeonAnswers = JSON.parse(record.surgeonAnswers); } catch { /* raw */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/consultations">
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Consultation Record #{record.id}</h2>
            <p className="text-sm text-muted-foreground">
              {record.completedAt
                ? `Completed ${format(new Date(record.completedAt), "MMM d, yyyy")}`
                : `Created ${format(new Date(record.createdAt), "MMM d, yyyy")}`}
            </p>
          </div>
          <Badge variant={record.status === "completed" ? "default" : "outline"}>{record.status}</Badge>
        </div>
        <Button onClick={handleDownloadPdf} className="gap-2">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-4 md:col-span-1">
          {/* Patient card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {isLoadingApt ? (
                <Skeleton className="h-20 w-full" />
              ) : customer ? (
                <>
                  <div className="font-semibold text-base">{customer.firstName} {customer.lastName}</div>
                  <div className="text-muted-foreground">{customer.email}</div>
                  {customer.phone && <div className="text-muted-foreground">{customer.dialingCode} {customer.phone}</div>}
                  {customer.nationality && (
                    <div><span className="font-medium">Nationality:</span> {customer.nationality}</div>
                  )}
                  {customer.preferredLanguage && (
                    <div><span className="font-medium">Language:</span> {customer.preferredLanguage}</div>
                  )}
                  {customer.address && (
                    <div><span className="font-medium">Address:</span> {customer.address}{customer.postcode ? `, ${customer.postcode}` : ""}</div>
                  )}
                  {(customer.heightCm || customer.weightKg) && (
                    <div className="pt-2 border-t mt-2 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold text-primary">{customer.heightCm ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">Height (cm)</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-primary">{customer.weightKg ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">Weight (kg)</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-primary">{bmi ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">BMI</div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground">Patient data unavailable</div>
              )}
            </CardContent>
          </Card>

          {/* Surgeon card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Stethoscope className="h-4 w-4 text-primary" />
                Surgeon
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {isLoadingApt ? (
                <Skeleton className="h-12 w-full" />
              ) : surgeon ? (
                <>
                  <div className="font-semibold">{surgeon.firstName} {surgeon.lastName}</div>
                  {surgeon.specialization && <div className="text-muted-foreground">{surgeon.specialization}</div>}
                  {surgeon.email && <div className="text-muted-foreground">{surgeon.email}</div>}
                </>
              ) : (
                <div className="text-muted-foreground">Surgeon data unavailable</div>
              )}
            </CardContent>
          </Card>

          {/* Appointment card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-primary" />
                Appointment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {isLoadingApt ? (
                <Skeleton className="h-12 w-full" />
              ) : appointment ? (
                <>
                  {event && <div className="font-semibold">{event.name}</div>}
                  {event?.venue && <div className="text-muted-foreground">{event.venue}</div>}
                  <div>{format(new Date(appointment.startTime), "EEEE, MMM d, yyyy")}</div>
                  <div className="text-muted-foreground">
                    {format(new Date(appointment.startTime), "h:mm a")} – {format(new Date(appointment.endTime), "h:mm a")}
                  </div>
                  {appointment.fee && (
                    <div className="font-medium">Fee: ${appointment.fee}</div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground">Appointment data unavailable</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4 md:col-span-2">
          <Card>
            <CardHeader><CardTitle>Consultation Notes</CardTitle></CardHeader>
            <CardContent>
              {record.notes ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{record.notes}</div>
              ) : (
                <div className="text-muted-foreground text-sm">No notes recorded.</div>
              )}
            </CardContent>
          </Card>

          {surgeonAnswers && Object.keys(surgeonAnswers).length > 0 && (
            <Card>
              <CardHeader><CardTitle>Surgeon Observations</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(surgeonAnswers).map(([q, a]) => (
                  <div key={q} className="text-sm">
                    <div className="font-medium text-muted-foreground">Q: {q}</div>
                    <div className="ml-2">A: {String(a)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {record.surgeonAnswers && !surgeonAnswers && (
            <Card>
              <CardHeader><CardTitle>Surgeon Observations</CardTitle></CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm">{record.surgeonAnswers}</div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Attachments & Media</CardTitle></CardHeader>
            <CardContent>
              {!mediaList?.length ? (
                <div className="text-sm text-muted-foreground">No files attached.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {mediaList.map(m => (
                    <div key={m.id} className="flex items-center p-3 border rounded-md gap-3 bg-muted/30">
                      <FileIcon className="h-5 w-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{m.fileName}</div>
                        <div className="text-xs text-muted-foreground capitalize">{m.mediaType.replace("_", " ")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
