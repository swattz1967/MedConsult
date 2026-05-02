import { useParams } from "wouter";
import { useGetConsultationRecord } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function ConsultationDetail() {
  const { id } = useParams();
  const recordId = Number(id);

  const { data: record, isLoading } = useGetConsultationRecord(recordId);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!record) return <div className="p-8 text-center">Consultation Record not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/consultations">
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">Consultation Record</h2>
          <Badge>{record.status}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap">{record.notes || "No notes"}</div>
        </CardContent>
      </Card>
    </div>
  );
}
