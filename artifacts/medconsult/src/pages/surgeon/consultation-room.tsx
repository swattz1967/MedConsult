import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { 
  useGetAppointment, 
  useListQuestionnaireResponses, 
  useListConsultationRecords,
  useCreateConsultationRecord,
  useUpdateConsultationRecord,
  useCompleteConsultationRecord,
  useListConsultationMedia,
  useRequestUploadUrl,
  useAddConsultationMedia,
  getGetConsultationRecordQueryKey,
  getListConsultationMediaQueryKey,
  getListConsultationRecordsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, File as FileIcon } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function ConsultationRoom() {
  const { id } = useParams();
  const appointmentId = Number(id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: appointment, isLoading: isLoadingApt } = useGetAppointment(appointmentId);
  const { data: responses, isLoading: isLoadingResponses } = useListQuestionnaireResponses({ appointmentId });
  
  const { data: records, isLoading: isLoadingRecords } = useListConsultationRecords({ appointmentId });
  const record = records?.[0];

  const createRecord = useCreateConsultationRecord();
  const updateRecord = useUpdateConsultationRecord();
  const completeRecord = useCompleteConsultationRecord();
  const requestUpload = useRequestUploadUrl();
  const addMedia = useAddConsultationMedia();

  const { data: mediaList } = useListConsultationMedia(record?.id || 0);

  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (record?.notes && !notes) {
      setNotes(record.notes);
    }
  }, [record]);

  useEffect(() => {
    if (appointment && !isLoadingRecords && !record && !createRecord.isPending) {
      createRecord.mutate({
        data: {
          appointmentId,
          surgeonId: appointment.surgeonId,
          customerId: appointment.customerId,
        }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListConsultationRecordsQueryKey({ appointmentId })
          });
        }
      });
    }
  }, [appointment, isLoadingRecords, record]);

  const handleSaveNotes = () => {
    if (!record) return;
    updateRecord.mutate({ id: record.id, data: { notes } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetConsultationRecordQueryKey(record.id) });
        toast({ title: "Notes saved successfully" });
      }
    });
  };

  const handleComplete = () => {
    if (!record) return;
    completeRecord.mutate({ id: record.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetConsultationRecordQueryKey(record.id) });
        toast({ title: "Consultation marked as completed" });
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !record) return;

    setUploading(true);
    try {
      const { uploadUrl, objectKey } = await requestUpload.mutateAsync({ 
        data: { fileName: file.name, contentType: file.type } 
      });

      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file
      });

      const mediaType = file.type.startsWith("image/") ? "photo" : "document";

      await addMedia.mutateAsync({
        recordId: record.id,
        data: {
          fileName: file.name,
          mediaType,
          objectKey
        }
      });

      queryClient.invalidateQueries({ queryKey: getListConsultationMediaQueryKey(record.id) });
      toast({ title: "File uploaded successfully" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  if (isLoadingApt) return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  if (!appointment) return <div className="p-8 text-center text-muted-foreground">Appointment not found.</div>;

  const customer = appointment.customer;
  const bmi = customer?.heightCm && customer?.weightKg 
    ? (customer.weightKg / Math.pow(customer.heightCm / 100, 2)).toFixed(1)
    : "N/A";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/surgeon/appointments">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight">Consultation Room</h2>
        <Badge variant={record?.status === "completed" ? "default" : "outline"}>{record?.status || "Loading..."}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6 md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Customer Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="font-semibold text-lg">{customer?.firstName} {customer?.lastName}</div>
              <div><span className="font-medium text-muted-foreground">Date:</span> {format(new Date(appointment.startTime), "MMM d, yyyy h:mm a")}</div>
              <div><span className="font-medium text-muted-foreground">Email:</span> {customer?.email}</div>
              <div><span className="font-medium text-muted-foreground">Phone:</span> {customer?.phone || "N/A"}</div>
              <div><span className="font-medium text-muted-foreground">Nationality:</span> {customer?.nationality || "N/A"}</div>
              <div className="pt-2 border-t mt-2">
                <span className="font-medium text-muted-foreground">BMI:</span> <Badge variant="secondary">{bmi}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pre-consultation Forms</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingResponses ? (
                <Skeleton className="h-24 w-full" />
              ) : !responses?.length ? (
                <div className="text-muted-foreground text-sm">No forms submitted.</div>
              ) : (
                <div className="space-y-4">
                  {responses.map(resp => (
                    <div key={resp.id} className="text-sm border rounded-md p-3 bg-muted/50">
                      <div className="font-medium mb-2">Questionnaire #{resp.questionnaireId}</div>
                      {resp.answers && typeof resp.answers === 'object' && Object.entries(resp.answers as Record<string, unknown>).map(([qId, ans]) => (
                        <div key={qId} className="mb-1">
                          <span className="text-muted-foreground">Q{qId}:</span> {String(ans)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 md:col-span-2">
          <Card className="flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle>Consultation Notes</CardTitle>
              {record?.status !== "completed" && (
                <Button size="sm" onClick={handleSaveNotes} disabled={updateRecord.isPending}>Save Notes</Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <Textarea 
                placeholder="Enter consultation notes here..."
                className="flex-1 min-h-[300px] resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                readOnly={record?.status === "completed"}
              />

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm">Attachments</h3>
                  {record?.status !== "completed" && (
                    <div className="relative">
                      <input 
                        type="file" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      <Button size="sm" variant="outline" disabled={uploading}>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? "Uploading..." : "Upload File"}
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {mediaList?.map(media => (
                    <div key={media.id} className="flex items-center p-2 border rounded-md text-sm gap-2 bg-muted/30">
                      <FileIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate flex-1" title={media.fileName}>{media.fileName}</span>
                    </div>
                  ))}
                  {!mediaList?.length && <div className="text-sm text-muted-foreground col-span-full">No files attached.</div>}
                </div>
              </div>

              {record?.status !== "completed" && (
                <div className="border-t pt-4 flex justify-end">
                  <Button onClick={handleComplete} disabled={completeRecord.isPending || !record}>
                    Complete Consultation
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
