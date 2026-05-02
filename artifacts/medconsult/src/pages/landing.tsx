import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="px-6 py-4 flex items-center justify-between border-b bg-white">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold text-xl">
            M
          </div>
          <span className="font-semibold text-xl tracking-tight text-foreground">MedConsult</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
            Sign In
          </Link>
          <Link href="/sign-up" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            Sign Up
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="px-6 py-24 md:py-32 max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
            Clinical-Grade Operations Platform
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Coordinate surgeons, patients, and consultation events with precision and care. MedConsult provides a sophisticated management system for premium private medical clinics.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/sign-up" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
              Get Started
            </Link>
            <Link href="/events" className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
              Browse Events
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 px-6 text-center text-sm text-muted-foreground bg-white">
        <p>© {new Date().getFullYear()} MedConsult. All rights reserved.</p>
      </footer>
    </div>
  );
}
