import { Link, useLocation } from "wouter";
import { UserButton } from "@clerk/react";
import { 
  CalendarDays, 
  LayoutDashboard,
  Menu,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { label: "My Appointments", href: "/portal", icon: CalendarDays },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50/50 text-foreground">
      <header className="flex h-16 items-center justify-between border-b px-4 md:px-8 bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-xl text-primary tracking-tight">
          <div className="h-8 w-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold">
            M
          </div>
          MedConsult Portal
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map(item => (
              <Link 
                key={item.href} 
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${location === item.href ? "text-primary" : "text-muted-foreground"}`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/guide"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary ${location === "/guide" ? "text-primary" : "text-muted-foreground"}`}
            >
              <BookOpen className="h-4 w-4" />
              User Guide
            </Link>
          </nav>
          <UserButton />
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
