import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { 
  useCreateCustomer,
  useListNationalities,
  useListLanguages,
  useListMedicalServices,
  useGetEvent,
  useListAgencies,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  dialingCode: z.string().min(1, "Dialing code required"),
  phone: z.string().min(1, "Phone number required"),
  nationality: z.string().min(1, "Nationality required"),
  address: z.string().min(1, "Address required"),
  postcode: z.string().optional().or(z.literal("")),
  preferredLanguage: z.string().min(1, "Language required"),
  medicalServicesInterest: z.string().min(1, "Interest required"),
  heightValue: z.coerce.number().min(1, "Height required"),
  heightUnit: z.enum(["cm", "ft"]),
  weightValue: z.coerce.number().min(1, "Weight required"),
  weightUnit: z.enum(["kg", "lbs"]),
});

export default function Register() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);

  const params = new URLSearchParams(search);
  const eventIdParam = params.get("eventId");
  const eventId = eventIdParam ? Number(eventIdParam) : undefined;

  const { data: event } = useGetEvent(eventId!);
  const agencyId = event?.agencyId ?? 1;

  const { data: agencies } = useListAgencies();
  const agency = agencies?.find(a => a.id === agencyId);
  const brandColor = agency?.primaryColor ?? "#1a6b5c";

  const createCustomer = useCreateCustomer();
  const { data: nationalities } = useListNationalities();
  const { data: languages } = useListLanguages();
  const { data: services } = useListMedicalServices();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "", lastName: "", email: "", dialingCode: "+1", phone: "",
      nationality: "", address: "", postcode: "", preferredLanguage: "English",
      medicalServicesInterest: "", heightValue: 0, heightUnit: "cm", weightValue: 0, weightUnit: "kg"
    }
  });

  const onSubmit = (values: z.infer<typeof registerSchema>) => {
    const heightCm = values.heightUnit === "ft" ? values.heightValue * 30.48 : values.heightValue;
    const weightKg = values.weightUnit === "lbs" ? values.weightValue * 0.453592 : values.weightValue;

    const data = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: `${values.dialingCode}${values.phone}`,
      nationality: values.nationality,
      address: values.address,
      postcode: values.postcode,
      preferredLanguage: values.preferredLanguage,
      medicalServicesInterest: values.medicalServicesInterest,
      heightCm,
      weightKg
    };

    createCustomer.mutate({ data: { ...data, agencyId } }, {
      onSuccess: () => {
        setIsSuccess(true);
      },
      onError: (err) => {
        toast({ title: "Registration failed", description: err.message, variant: "destructive" });
      }
    });
  };

  if (isSuccess) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-green-200">
          <CardContent className="pt-12 pb-8 px-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Registration Complete</h2>
            <p className="text-muted-foreground">Your profile has been created successfully. You can now access your portal to book appointments and fill out necessary forms.</p>
            <Button className="w-full mt-4" onClick={() => setLocation("/portal")}>
              Go to Portal <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl mb-8">
        <Link href="/" className="flex justify-center items-center gap-2 font-bold text-2xl tracking-tight" style={{ color: brandColor }}>
          {agency?.logoUrl ? (
            <img
              src={agency.logoUrl}
              alt={agency.name}
              className="h-10 w-10 rounded object-contain bg-white border shadow-sm"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div
              className="h-10 w-10 rounded flex items-center justify-center font-bold text-white"
              style={{ backgroundColor: brandColor }}
            >
              {agency?.name?.[0]?.toUpperCase() ?? "M"}
            </div>
          )}
          {agency?.name ?? "MedConsult"}
        </Link>
      </div>

      <Card className="sm:mx-auto sm:w-full sm:max-w-2xl shadow-lg border-0">
        <CardHeader className="space-y-1 pb-8">
          <CardTitle className="text-2xl font-bold text-center">Patient Registration</CardTitle>
          <CardDescription className="text-center">Create your profile to book consultations</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem><FormLabel>First Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem><FormLabel>Last Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel>Email Address *</FormLabel><FormControl><Input {...field} type="email" /></FormControl><FormMessage /></FormItem>
                  )} />
                  
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Phone Number *</FormLabel>
                      <div className="flex gap-2">
                        <FormField control={form.control} name="dialingCode" render={({ field: dField }) => (
                          <Select onValueChange={dField.onChange} defaultValue={dField.value}>
                            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Code" /></SelectTrigger>
                            <SelectContent>
                              {["+1", "+44", "+61", "+33", "+49", "+39", "+34", "+86", "+81", "+91", "+55", "+27", "+234", "+971"].map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )} />
                        <FormControl><Input {...field} className="flex-1" placeholder="e.g. 555-0123" /></FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  <FormField control={form.control} name="nationality" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nationality *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {nationalities?.map(n => <SelectItem key={n.id} value={n.value}>{n.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  <FormField control={form.control} name="preferredLanguage" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Language *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {languages?.map(l => <SelectItem key={l.id} value={l.value}>{l.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Address & Medical</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel>Full Address *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="postcode" render={({ field }) => (
                    <FormItem><FormLabel>Postcode / ZIP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="medicalServicesInterest" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Service of Interest *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select service..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {services?.map(s => <SelectItem key={s.id} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Physical Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Height *</label>
                    <div className="flex gap-2">
                      <FormField control={form.control} name="heightValue" render={({ field }) => (
                        <FormItem className="flex-1"><FormControl><Input {...field} type="number" step="0.1" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="heightUnit" render={({ field }) => (
                        <FormItem className="w-[100px]">
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="cm">cm</SelectItem>
                              <SelectItem value="ft">ft</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Weight *</label>
                    <div className="flex gap-2">
                      <FormField control={form.control} name="weightValue" render={({ field }) => (
                        <FormItem className="flex-1"><FormControl><Input {...field} type="number" step="0.1" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="weightUnit" render={({ field }) => (
                        <FormItem className="w-[100px]">
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="lbs">lbs</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button type="submit" className="w-full" size="lg" disabled={createCustomer.isPending}
                  style={{ backgroundColor: brandColor, borderColor: brandColor }}>
                  {createCustomer.isPending ? "Registering..." : "Complete Registration"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
