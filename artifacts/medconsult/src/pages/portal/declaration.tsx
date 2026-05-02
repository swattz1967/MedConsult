import { useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import {
  useGetCurrentUser,
  useGetCustomer,
  useUpdateCustomer,
  getGetCustomerQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CheckCircle2,
  PenLine,
  ShieldCheck,
  AlertCircle,
  User,
  Ruler,
  Scale,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const CONSENT_CLAUSES = [
  {
    id: "accuracy",
    icon: ShieldCheck,
    title: "Accuracy of Information",
    text: "I declare that all medical history, personal information, and details I have provided to this agency are true, accurate, and complete to the best of my knowledge. I understand that withholding or falsifying information may adversely affect my safety and the quality of medical advice provided.",
  },
  {
    id: "records",
    icon: ShieldCheck,
    title: "Use of Medical Records",
    text: "I consent to my personal information and medical records being accessed, stored, and used by the medical agency and consulting surgeons for the sole purpose of evaluating my suitability for, and delivering, medical consultation services.",
  },
  {
    id: "limitation",
    icon: AlertCircle,
    title: "Scope of Consultation",
    text: "I understand that a surgical consultation is an advisory service only and does not constitute a diagnosis or replace ongoing care from my regular medical practitioner. I accept responsibility for following up with my own healthcare provider.",
  },
  {
    id: "communication",
    icon: ShieldCheck,
    title: "Communications",
    text: "I consent to being contacted by the medical agency via email and telephone for the purpose of appointment scheduling, reminders, and follow-up communications related to my consultations.",
  },
  {
    id: "photography",
    icon: ShieldCheck,
    title: "Clinical Photography",
    text: "I understand that clinical photographs or images may be taken during a consultation for medical assessment purposes only. These images will be stored securely and will not be shared publicly or used for any purpose other than my clinical care.",
  },
  {
    id: "terms",
    icon: ShieldCheck,
    title: "Terms & Cancellation Policy",
    text: "I have read and understood the agency's terms of service and cancellation policy. I acknowledge that failing to attend a booked appointment without adequate notice may result in a cancellation fee.",
  },
];

function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Underweight", color: "text-blue-600" };
  if (bmi < 25) return { label: "Healthy", color: "text-green-600" };
  if (bmi < 30) return { label: "Overweight", color: "text-amber-600" };
  return { label: "Obese", color: "text-red-600" };
}

export default function DeclarationPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, isLoading: isLoadingUser } = useGetCurrentUser();
  const customerId = user?.customerId ?? undefined;
  const { data: customer, isLoading: isLoadingCustomer } = useGetCustomer(customerId || 0);

  const updateCustomer = useUpdateCustomer();

  const [checkedClauses, setCheckedClauses] = useState<Record<string, boolean>>({});
  const [signatureName, setSignatureName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const today = format(new Date(), "MMMM d, yyyy");

  const allChecked = CONSENT_CLAUSES.every((c) => checkedClauses[c.id]);
  const signatureValid = signatureName.trim().length > 2;
  const canSubmit = allChecked && signatureValid;

  const toggleClause = (id: string) =>
    setCheckedClauses((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSign = () => {
    if (!customerId || !canSubmit) return;
    updateCustomer.mutate(
      {
        id: customerId,
        data: { declarationSigned: true, declarationSignedAt: new Date().toISOString() },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCustomerQueryKey(customerId) });
          setSubmitted(true);
          toast({ title: "Declaration signed successfully!" });
        },
        onError: () => {
          toast({ title: "Signature failed. Please try again.", variant: "destructive" });
        },
      },
    );
  };

  const isLoading = isLoadingUser || (!!customerId && isLoadingCustomer);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 text-muted-foreground">
        Customer profile not found.
      </div>
    );
  }

  const bmiValue =
    customer.heightCm && customer.weightKg
      ? customer.weightKg / Math.pow(customer.heightCm / 100, 2)
      : null;
  const bmiDisplay = bmiValue ? bmiValue.toFixed(1) : null;
  const bmiCat = bmiDisplay ? bmiCategory(parseFloat(bmiDisplay)) : null;

  const fullName = `${customer.firstName} ${customer.lastName}`;

  // ── Already signed ──────────────────────────────────────────────────────────
  if ((customer.declarationSigned && !submitted) || submitted) {
    const signedAt = customer.declarationSignedAt ?? new Date().toISOString();
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/portal">
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Patient Declaration</h2>
            <p className="text-sm text-muted-foreground">Consent &amp; agreement</p>
          </div>
        </div>

        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="pt-6 flex flex-col sm:flex-row items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800 text-lg mb-1">Declaration Signed</h3>
              <p className="text-sm text-green-700">
                Your consent declaration was signed on{" "}
                <span className="font-medium">
                  {format(new Date(signedAt), "MMMM d, yyyy 'at' h:mm a")}
                </span>
                .
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consented Clauses</CardTitle>
            <CardDescription>All {CONSENT_CLAUSES.length} clauses were accepted</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {CONSENT_CLAUSES.map((clause) => (
              <div key={clause.id} className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium">{clause.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{clause.text}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="text-xs text-muted-foreground mb-1">Digital Signature</div>
              <div
                className="text-2xl font-bold italic"
                style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive" }}
              >
                {fullName}
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>{format(new Date(signedAt), "MMM d, yyyy")}</div>
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" onClick={() => setLocation("/portal")}>
          Back to Portal
        </Button>
      </div>
    );
  }

  // ── Unsigned — show form ────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/portal">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Patient Declaration</h2>
          <p className="text-sm text-muted-foreground">Please read carefully and sign to proceed</p>
        </div>
      </div>

      {/* Patient info summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Patient Details
          </CardTitle>
          <CardDescription>Please confirm your details are correct before signing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-0.5">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Full Name</div>
              <div className="font-medium text-sm">{fullName}</div>
            </div>
            {customer.nationality && (
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Nationality</div>
                <div className="font-medium text-sm">{customer.nationality}</div>
              </div>
            )}
            {customer.heightCm && (
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Ruler className="h-3 w-3" /> Height
                </div>
                <div className="font-medium text-sm">{customer.heightCm} cm</div>
              </div>
            )}
            {customer.weightKg && (
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Scale className="h-3 w-3" /> Weight
                </div>
                <div className="font-medium text-sm">{customer.weightKg} kg</div>
              </div>
            )}
            {bmiDisplay && bmiCat && (
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Activity className="h-3 w-3" /> BMI
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm">{bmiDisplay}</span>
                  <span className={cn("text-xs font-medium", bmiCat.color)}>{bmiCat.label}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Consent clauses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PenLine className="h-4 w-4 text-primary" /> Consent Clauses
          </CardTitle>
          <CardDescription>
            You must read and accept all {CONSENT_CLAUSES.length} clauses before signing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {CONSENT_CLAUSES.map((clause, idx) => {
            const checked = !!checkedClauses[clause.id];
            return (
              <div
                key={clause.id}
                onClick={() => toggleClause(clause.id)}
                className={cn(
                  "flex gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all select-none",
                  checked
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-primary/40 hover:bg-muted/30",
                )}
              >
                <div
                  className={cn(
                    "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
                    checked
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40",
                  )}
                >
                  {checked && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-primary/60 uppercase tracking-wider">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold">{clause.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{clause.text}</p>
                </div>
              </div>
            );
          })}

          {/* Progress indicator */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>
              {Object.values(checkedClauses).filter(Boolean).length} of {CONSENT_CLAUSES.length} clauses accepted
            </span>
            {allChecked && (
              <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                <CheckCircle2 className="h-3 w-3" /> All accepted
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Digital signature */}
      <Card className={cn(!allChecked && "opacity-50 pointer-events-none")}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PenLine className="h-4 w-4 text-primary" /> Digital Signature
          </CardTitle>
          <CardDescription>
            Type your full legal name below to apply your digital signature
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Legal Name</label>
              <Input
                placeholder={`e.g. ${fullName}`}
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Must match your registered name
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <div className="h-11 px-3 flex items-center rounded-md border bg-muted/40 text-sm text-muted-foreground select-none">
                {today}
              </div>
              <p className="text-xs text-muted-foreground">Automatically set to today</p>
            </div>
          </div>

          {/* Signature preview */}
          {signatureName.trim().length > 0 && (
            <div className="border-2 border-dashed border-primary/30 rounded-lg px-6 py-4 bg-muted/20">
              <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Signature Preview</div>
              <div
                className="text-3xl text-primary"
                style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive" }}
              >
                {signatureName}
              </div>
            </div>
          )}

          <Separator />

          <div className="rounded-lg bg-muted/50 border px-4 py-3 text-xs text-muted-foreground leading-relaxed">
            By clicking <strong>Sign Declaration</strong> below, I confirm that I have read, 
            understood, and agree to all the above consent clauses, and that the signature above 
            represents my legal electronic signature. This declaration is binding as of {today}.
          </div>

          <Button
            className="w-full gap-2"
            size="lg"
            onClick={handleSign}
            disabled={!canSubmit || updateCustomer.isPending}
          >
            {updateCustomer.isPending ? (
              "Signing..."
            ) : (
              <>
                <PenLine className="h-4 w-4" />
                Sign Declaration
              </>
            )}
          </Button>

          {!canSubmit && (
            <p className="text-xs text-muted-foreground text-center">
              {!allChecked
                ? "Please accept all consent clauses above before signing"
                : "Please enter your full legal name to sign"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
