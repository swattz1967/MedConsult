import { useState, useEffect } from "react";
import { useGetReminderSettings, useUpsertReminderSettings } from "@workspace/api-client-react";
import { useAgency } from "@/contexts/AgencyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  Clock,
  Mail,
  CheckCircle2,
  Settings2,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const DAY_OPTIONS = [1, 2, 3, 5, 7, 14] as const;

export default function AdminSettings() {
  const { toast } = useToast();
  const { agencyId, isLoading: isLoadingAgencies } = useAgency();

  const {
    data: settings,
    isLoading: isLoadingSettings,
    error: settingsError,
  } = useGetReminderSettings({ agencyId: agencyId ?? 0 });

  const upsert = useUpsertReminderSettings();

  const [enabled, setEnabled] = useState(false);
  const [days, setDays] = useState(3);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setDays(settings.daysBeforeAppointment);
      setDirty(false);
    }
  }, [settings]);

  const handleToggle = (val: boolean) => {
    setEnabled(val);
    setDirty(true);
  };

  const handleDaysChange = (val: number) => {
    setDays(val);
    setDirty(true);
  };

  const handleSave = () => {
    if (!agencyId) return;
    upsert.mutate(
      { data: { agencyId, enabled, daysBeforeAppointment: days } },
      {
        onSuccess: () => {
          setDirty(false);
          toast({ title: "Settings saved", description: "Reminder configuration updated." });
        },
        onError: () => {
          toast({ title: "Save failed", description: "Could not update settings.", variant: "destructive" });
        },
      },
    );
  };

  const isLoading = isLoadingAgencies || isLoadingSettings;
  const notConfigured = !isLoading && !!agencyId && !!settingsError;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configure automated notifications and system behaviour
        </p>
      </div>

      {/* Declaration auto-reminder card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Automated Declaration Reminders</CardTitle>
                <CardDescription className="mt-1">
                  Automatically email unsigned patients a reminder to sign their declaration
                  before their upcoming appointment. Runs every hour.
                </CardDescription>
              </div>
            </div>
            {!isLoading && (
              <Badge
                className={cn(
                  "shrink-0 mt-1",
                  enabled
                    ? "bg-green-100 text-green-700 border-green-200"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {enabled ? "Active" : "Inactive"}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              {/* Enable toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Enable auto-reminders</Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, the system checks every hour for patients needing a reminder
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={handleToggle}
                />
              </div>

              {/* Days-before selector */}
              <div className={cn("space-y-3", !enabled && "opacity-50 pointer-events-none")}>
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Send reminder when appointment is within…
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Patients will only be reminded once per 20 hours to avoid spam
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => handleDaysChange(d)}
                      className={cn(
                        "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                        days === d
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:border-primary/50",
                      )}
                    >
                      {d} day{d > 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
              </div>

              {/* How it works explainer */}
              <div className="rounded-lg border bg-blue-50/40 border-blue-100 p-4 space-y-2">
                <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                  How it works
                </div>
                <div className="space-y-1.5 text-xs text-blue-800">
                  <div className="flex items-start gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>The scheduler runs every hour automatically</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      Finds all patients with appointments in the next{" "}
                      <strong>{days} day{days > 1 ? "s" : ""}</strong> who have not signed their declaration
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      Sends each eligible patient a direct link to{" "}
                      <strong>/portal/declaration</strong> — once per 20-hour window
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats from last run */}
              {settings && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4 space-y-1">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" /> Last run
                    </div>
                    <div className="font-semibold text-sm">
                      {settings.lastRunAt
                        ? format(new Date(settings.lastRunAt), "d MMM yyyy, h:mm a")
                        : "Never"}
                    </div>
                  </div>
                  <div className="rounded-lg border p-4 space-y-1">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Total sent
                    </div>
                    <div className="font-semibold text-sm">
                      {settings.remindersSentTotal.toLocaleString()} reminder
                      {settings.remindersSentTotal !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              )}

              {notConfigured && (
                <p className="text-xs text-muted-foreground italic">
                  No configuration saved yet. Set your preference and click Save.
                </p>
              )}

              {/* Save button */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">
                  {dirty ? "You have unsaved changes" : "Settings are up to date"}
                </p>
                <Button
                  onClick={handleSave}
                  disabled={!dirty || upsert.isPending || !agencyId}
                  className="gap-2"
                >
                  <Settings2 className="h-4 w-4" />
                  {upsert.isPending ? "Saving…" : "Save Settings"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
