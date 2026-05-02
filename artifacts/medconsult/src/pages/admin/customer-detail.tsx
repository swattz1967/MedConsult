import { useParams } from "wouter";
import { useGetCustomer, useUpdateCustomer, getGetCustomerQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function CustomerDetail() {
  const { id } = useParams();
  const customerId = Number(id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: customer, isLoading } = useGetCustomer(customerId);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!customer) return <div className="p-8 text-center">Customer not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/customers">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight">{customer.firstName} {customer.lastName}</h2>
      </div>

      <Card>
        <CardHeader><CardTitle>Profile Details</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><span className="font-medium">Email:</span> {customer.email}</div>
          <div><span className="font-medium">Phone:</span> {customer.phone}</div>
          <div><span className="font-medium">Nationality:</span> {customer.nationality}</div>
          <div><span className="font-medium">Address:</span> {customer.address}</div>
        </CardContent>
      </Card>
    </div>
  );
}
