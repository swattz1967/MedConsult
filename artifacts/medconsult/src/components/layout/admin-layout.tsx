import { Link, useLocation } from "wouter";
import { UserButton } from "@clerk/react";
import { 
  Building2, 
  CalendarDays, 
  Users, 
  FileText, 
  Stethoscope,
  LayoutDashboard,
  ClipboardList,
  Menu
} from "lucide-react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Agencies", href: "/admin/agencies", icon: Building2 },
    { label: "Surgeons", href: "/admin/surgeons", icon: Stethoscope },
    { label: "Events", href: "/admin/events", icon: CalendarDays },
    { label: "Customers", href: "/admin/customers", icon: Users },
    { label: "Questionnaires", href: "/admin/questionnaires", icon: FileText },
    { label: "Consultations", href: "/admin/consultations", icon: ClipboardList },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-[100dvh] w-full bg-background text-foreground">
        <Sidebar className="hidden md:flex">
          <SidebarHeader className="border-b px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
              <div className="h-8 w-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold text-xl">
                M
              </div>
              MedConsult
            </div>
          </SidebarHeader>
          <SidebarContent className="px-2 py-4">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.href || location.startsWith(`${item.href}/`)}
                    className="font-medium"
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
                  <div className="border-b px-4 py-4 flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
                    <div className="h-8 w-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold text-xl">
                      M
                    </div>
                    MedConsult
                  </div>
                  <div className="py-4">
                    <SidebarMenu className="px-2">
                      {navItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton 
                            asChild 
                            isActive={location === item.href || location.startsWith(`${item.href}/`)}
                          >
                            <Link href={item.href} className="flex items-center gap-3">
                              <item.icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </div>
                </SheetContent>
              </Sheet>
              <h1 className="text-lg font-semibold tracking-tight hidden sm:block">Admin Portal</h1>
            </div>
            <div className="flex items-center gap-4">
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
