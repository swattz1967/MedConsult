import { useState } from "react";
import { useParams } from "wouter";
import { 
  useGetEvent, useUpdateEvent, getGetEventQueryKey, 
  useListEventSurgeons, useAddEventSurgeon, useUpdateEventSurgeon, useRemoveEventSurgeon, getListEventSurgeonsQueryKey,
  useListAppointments, useCreateAppointment, useDeleteAppointment, getListAppointmentsQueryKey,
  useListSurgeons, useListCustomers
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function EventDetail() {
  const { id } = useParams();
  const eventId = Number(id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: event, isLoading: isLoadingEvent } = useGetEvent(eventId);
  const updateEvent = useUpdateEvent();

  const handleStatusChange = (status: "draft" | "published" | "closed") => {
    updateEvent.mutate({ id: eventId, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(eventId) });
        toast({ title: `Event status updated to ${status}` });
      }
    });
  };

  if (isLoadingEvent) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!event) return <div className="p-8 text-center">Event not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/events">
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">{event.name}</h2>
          <Badge variant={event.status === "published" ? "default" : event.status === "draft" ? "secondary" : "outline"}>
            {event.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          {event.status === "draft" && <Button onClick={() => handleStatusChange("published")}>Publish Event</Button>}
          {event.status === "published" && <Button variant="destructive" onClick={() => handleStatusChange("closed")}>Close Event</Button>}
          {event.status === "closed" && <Button variant="outline" onClick={() => handleStatusChange("draft")}>Revert to Draft</Button>}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="surgeons">Surgeons</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div><span className="font-medium">Venue:</span> {event.venue}</div>
              <div><span className="font-medium">Start:</span> {new Date(event.startDate).toLocaleDateString()}</div>
              <div><span className="font-medium">End:</span> {new Date(event.endDate).toLocaleDateString()}</div>
              <div><span className="font-medium">Description:</span> {event.description}</div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="surgeons" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Event Surgeons</CardTitle></CardHeader>
            <CardContent>
              {/* Surgeons list would go here */}
              <p className="text-muted-foreground text-sm">Surgeons management coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="appointments" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Appointments</CardTitle></CardHeader>
            <CardContent>
              {/* Appointments list would go here */}
              <p className="text-muted-foreground text-sm">Appointments management coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
