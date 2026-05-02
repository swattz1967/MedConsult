import { useEffect, useRef } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSyncCurrentUser } from "@workspace/api-client-react";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";

// Layouts
import { AdminLayout } from "@/components/layout/admin-layout";
import { SurgeonLayout } from "@/components/layout/surgeon-layout";
import { CustomerLayout } from "@/components/layout/customer-layout";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AgenciesList from "@/pages/admin/agencies";
import SurgeonsList from "@/pages/admin/surgeons";
import EventsList from "@/pages/admin/events";
import CustomersList from "@/pages/admin/customers";
import QuestionnairesList from "@/pages/admin/questionnaires";
import ConsultationsList from "@/pages/admin/consultations";

import SurgeonDetail from "@/pages/admin/surgeon-detail";
import EventDetail from "@/pages/admin/event-detail";
import CustomerDetail from "@/pages/admin/customer-detail";
import QuestionnaireDetail from "@/pages/admin/questionnaire-detail";
import ConsultationDetail from "@/pages/admin/consultation-detail";

import AdminReports from "@/pages/admin/reports";
import AdminSettings from "@/pages/admin/settings";
import SurgeonDashboard from "@/pages/surgeon/dashboard";
import SurgeonAppointments from "@/pages/surgeon/appointments";
import ConsultationRoom from "@/pages/surgeon/consultation-room";

import EventsPublicList from "@/pages/events-list";
import EventPublic from "@/pages/event-public";
import Register from "@/pages/register";
import CustomerPortal from "@/pages/portal/index";
import QuestionnaireFormPage from "@/pages/portal/questionnaire";
import DeclarationPage from "@/pages/portal/declaration";
import BookingPage from "@/pages/booking";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "hsl(170 60% 25%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(0 0% 100%)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  elements: {
    cardBox: "bg-white w-[440px] max-w-full overflow-hidden border border-border shadow-lg",
  }
};

function SignInPage() {
  const params = new URLSearchParams(window.location.search);
  const redirectUrl = params.get("redirect_url") ?? undefined;
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        forceRedirectUrl={redirectUrl}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function SyncUserAndRedirect() {
  const { user, isLoaded } = useUser();
  const syncMutation = useSyncCurrentUser();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (isLoaded && user && !hasSynced.current) {
      hasSynced.current = true;
      syncMutation.mutate(
        {
          data: {
            clerkId: user.id,
            email: user.primaryEmailAddress?.emailAddress || "",
            firstName: user.firstName,
            lastName: user.lastName,
          },
        },
        {
          onSuccess: (profile) => {
            if (profile.role === "admin" || profile.role === "app_owner") {
              window.location.href = `${basePath}/admin`;
            } else if (profile.role === "surgeon") {
              window.location.href = `${basePath}/surgeon`;
            } else {
              window.location.href = `${basePath}/portal`;
            }
          },
        }
      );
    }
  }, [isLoaded, user, syncMutation]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <SyncUserAndRedirect />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function AdminRouter() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/agencies" component={AgenciesList} />
        <Route path="/admin/surgeons/:id" component={SurgeonDetail} />
        <Route path="/admin/surgeons" component={SurgeonsList} />
        <Route path="/admin/events/:id" component={EventDetail} />
        <Route path="/admin/events" component={EventsList} />
        <Route path="/admin/customers/:id" component={CustomerDetail} />
        <Route path="/admin/customers" component={CustomersList} />
        <Route path="/admin/questionnaires/:id" component={QuestionnaireDetail} />
        <Route path="/admin/questionnaires" component={QuestionnairesList} />
        <Route path="/admin/consultations/:id" component={ConsultationDetail} />
        <Route path="/admin/consultations" component={ConsultationsList} />
        <Route path="/admin/reports" component={AdminReports} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function SurgeonRouter() {
  return (
    <SurgeonLayout>
      <Switch>
        <Route path="/surgeon" component={SurgeonDashboard} />
        <Route path="/surgeon/appointments/:id" component={ConsultationRoom} />
        <Route path="/surgeon/appointments" component={SurgeonAppointments} />
        <Route component={NotFound} />
      </Switch>
    </SurgeonLayout>
  );
}

function PortalRouter() {
  return (
    <CustomerLayout>
      <Switch>
        <Route path="/portal/questionnaire/:appointmentId" component={QuestionnaireFormPage} />
        <Route path="/portal/declaration" component={DeclarationPage} />
        <Route path="/portal" component={CustomerPortal} />
        <Route component={NotFound} />
      </Switch>
    </CustomerLayout>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/events" component={EventsPublicList} />
          <Route path="/events/:id/book/:surgeonId" component={BookingPage} />
          <Route path="/events/:id" component={EventPublic} />
          <Route path="/register" component={Register} />
          <Route path="/admin/*" component={AdminRouter} />
          <Route path="/admin" component={AdminRouter} />
          <Route path="/surgeon/*" component={SurgeonRouter} />
          <Route path="/surgeon" component={SurgeonRouter} />
          <Route path="/portal" component={PortalRouter} />
          <Route path="/portal/*" component={PortalRouter} />
          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
