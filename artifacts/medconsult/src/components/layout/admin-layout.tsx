import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { UserButton } from "@clerk/react";
import { useTranslation } from "react-i18next";
import {
  Building2,
  CalendarDays,
  Users,
  FileText,
  Stethoscope,
  LayoutDashboard,
  ClipboardList,
  Menu,
  BarChart2,
  Settings,
  ChevronDown,
  ChevronRight,
  Globe,
  MailCheck,
  BookOpen,
  Code2,
  CheckSquare,
  Layers,
  FlaskConical,
  LibraryBig,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarProvider, SidebarTrigger, SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAgency } from "@/contexts/AgencyContext";
import i18n from "@/i18n";

const LANGUAGES = [
  { code: "en",    label: "English",        flag: "🇬🇧" },
  { code: "pt-BR", label: "Português (BR)", flag: "🇧🇷" },
  { code: "es",    label: "Español",        flag: "🇪🇸" },
  { code: "tr",    label: "Türkçe",         flag: "🇹🇷" },
];

const DOC_HREFS = [
  "/admin/technical-reference",
  "/admin/urs",
  "/admin/design-document",
  "/admin/test-plan",
];

const docItems = [
  { labelKey: "nav.technicalRef", href: "/admin/technical-reference", icon: Code2 },
  { labelKey: "nav.urs",          href: "/admin/urs",                 icon: CheckSquare },
  { labelKey: "nav.designDoc",    href: "/admin/design-document",     icon: Layers },
  { labelKey: "nav.testPlan",     href: "/admin/test-plan",           icon: FlaskConical },
];

const mainNavItems = [
  { labelKey: "nav.dashboard",      href: "/admin",                icon: LayoutDashboard },
  { labelKey: "nav.agencies",       href: "/admin/agencies",       icon: Building2 },
  { labelKey: "nav.surgeons",       href: "/admin/surgeons",       icon: Stethoscope },
  { labelKey: "nav.events",         href: "/admin/events",         icon: CalendarDays },
  { labelKey: "nav.customers",      href: "/admin/customers",      icon: Users },
  { labelKey: "nav.questionnaires", href: "/admin/questionnaires", icon: FileText },
  { labelKey: "nav.consultations",  href: "/admin/consultations",  icon: ClipboardList },
  { labelKey: "nav.reports",        href: "/admin/reports",        icon: BarChart2 },
  { labelKey: "nav.emailLogs",      href: "/admin/email-logs",     icon: MailCheck },
  { labelKey: "nav.settings",       href: "/admin/settings",       icon: Settings },
  { labelKey: "nav.userGuide",      href: "/guide",                icon: BookOpen },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { currentAgency, agencies, setCurrentAgencyId } = useAgency();
  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  const isDocPage = DOC_HREFS.some((h) => location === h || location.startsWith(`${h}/`));
  const [docsOpen, setDocsOpen] = useState(isDocPage);

  useEffect(() => {
    if (isDocPage) setDocsOpen(true);
  }, [isDocPage]);

  const NavItems = () => (
    <>
      {/* Main nav items */}
      {mainNavItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={location === item.href || location.startsWith(`${item.href}/`)}
            className="font-medium"
          >
            <Link href={item.href} className="flex items-center gap-3">
              <item.icon className="h-4 w-4" />
              <span>{t(item.labelKey)}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}

      {/* Documentation collapsible group */}
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => setDocsOpen((o) => !o)}
          isActive={isDocPage}
          className="font-medium cursor-pointer"
        >
          <LibraryBig className="h-4 w-4" />
          <span className="flex-1">{t("nav.documentation")}</span>
          {docsOpen
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform" />
          }
        </SidebarMenuButton>

        {docsOpen && (
          <div className="ml-4 mt-0.5 border-l border-sidebar-border pl-3 space-y-0.5">
            {docItems.map((item) => (
              <SidebarMenuButton
                key={item.href}
                asChild
                isActive={location === item.href}
                className="font-medium text-sm h-8"
              >
                <Link href={item.href} className="flex items-center gap-3">
                  <item.icon className="h-3.5 w-3.5" />
                  <span>{t(item.labelKey)}</span>
                </Link>
              </SidebarMenuButton>
            ))}
          </div>
        )}
      </SidebarMenuItem>
    </>
  );

  const Brand = () => (
    <div className="space-y-2">
      {currentAgency?.logoUrl ? (
        <div className="flex items-center gap-2">
          <img
            src={currentAgency.logoUrl}
            alt={currentAgency.name}
            className="h-8 w-8 rounded object-contain bg-muted"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <span className="font-bold text-base text-primary tracking-tight truncate max-w-[140px]">
            {currentAgency.name}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
          <div className="h-8 w-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0">
            {currentAgency?.name?.[0]?.toUpperCase() ?? "M"}
          </div>
          <span className="truncate max-w-[140px]">{currentAgency?.name ?? "MedConsult"}</span>
        </div>
      )}

      {agencies.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-muted/50 transition-colors">
              <span className="truncate">Switch agency</span>
              <ChevronDown className="h-3 w-3 shrink-0 ml-1" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Agencies</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {agencies.map((a) => (
              <DropdownMenuItem
                key={a.id}
                onClick={() => setCurrentAgencyId(a.id)}
                className={a.id === currentAgency?.id ? "bg-primary/10 font-medium" : ""}
              >
                {a.logoUrl && (
                  <img src={a.logoUrl} alt={a.name} className="h-4 w-4 rounded mr-2 object-contain" />
                )}
                {a.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-[100dvh] w-full bg-background text-foreground">
        <Sidebar className="hidden md:flex">
          <SidebarHeader className="border-b px-4 py-4">
            <Brand />
          </SidebarHeader>
          <SidebarContent className="px-2 py-4">
            <SidebarMenu>
              <NavItems />
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="flex flex-col flex-1 w-full overflow-hidden">
          <header className="flex h-14 items-center justify-between border-b px-4 md:px-6 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hidden md:flex" />
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <div className="border-b px-4 py-4">
                    <Brand />
                  </div>
                  <div className="py-4">
                    <SidebarMenu className="px-2">
                      <NavItems />
                    </SidebarMenu>
                  </div>
                </SheetContent>
              </Sheet>
              <h1 className="text-lg font-semibold tracking-tight hidden sm:block">
                {t("nav.adminPortal")}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-sm font-normal text-muted-foreground h-8 px-2">
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">{currentLang.flag} {currentLang.label}</span>
                    <span className="sm:hidden">{currentLang.flag}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Language</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => i18n.changeLanguage(lang.code)}
                      className={i18n.language === lang.code ? "bg-primary/10 font-medium" : ""}
                    >
                      {lang.flag} {lang.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <UserButton />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
