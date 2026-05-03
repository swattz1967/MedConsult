import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  CalendarCheck,
  Stethoscope,
  UserRound,
  Globe,
  Printer,
  Search,
  X,
} from "lucide-react";

// ─── Guide structure ──────────────────────────────────────────────────────────

type RoleKey = "appOwner" | "bookingAdmin" | "surgeon" | "customer";

interface SectionDef {
  key: string;
  items: number;
}

interface RoleDef {
  role: RoleKey;
  icon: React.ElementType;
  color: string;
  sections: SectionDef[];
}

const GUIDE: RoleDef[] = [
  {
    role: "appOwner",
    icon: Building2,
    color: "text-emerald-700",
    sections: [
      { key: "s1", items: 4 },
      { key: "s2", items: 3 },
      { key: "s3", items: 4 },
      { key: "s4", items: 3 },
      { key: "s5", items: 3 },
      { key: "s6", items: 3 },
      { key: "s7", items: 3 },
    ],
  },
  {
    role: "bookingAdmin",
    icon: CalendarCheck,
    color: "text-blue-700",
    sections: [
      { key: "s1", items: 4 },
      { key: "s2", items: 4 },
      { key: "s3", items: 4 },
      { key: "s4", items: 4 },
      { key: "s5", items: 3 },
    ],
  },
  {
    role: "surgeon",
    icon: Stethoscope,
    color: "text-violet-700",
    sections: [
      { key: "s1", items: 3 },
      { key: "s2", items: 3 },
      { key: "s3", items: 4 },
      { key: "s4", items: 3 },
    ],
  },
  {
    role: "customer",
    icon: UserRound,
    color: "text-rose-700",
    sections: [
      { key: "s1", items: 3 },
      { key: "s2", items: 3 },
      { key: "s3", items: 4 },
      { key: "s4", items: 4 },
      { key: "s5", items: 3 },
    ],
  },
];

const LANGUAGES = [
  { code: "en",    label: "English" },
  { code: "pt-BR", label: "Português (BR)" },
  { code: "es",    label: "Español" },
  { code: "tr",    label: "Türkçe" },
];

const ROLE_BG: Record<RoleKey, string> = {
  appOwner:    "bg-emerald-50 border-emerald-200",
  bookingAdmin:"bg-blue-50 border-blue-200",
  surgeon:     "bg-violet-50 border-violet-200",
  customer:    "bg-rose-50 border-rose-200",
};

const ROLE_BADGE: Record<RoleKey, string> = {
  appOwner:    "bg-emerald-100 text-emerald-800",
  bookingAdmin:"bg-blue-100 text-blue-800",
  surgeon:     "bg-violet-100 text-violet-800",
  customer:    "bg-rose-100 text-rose-800",
};

const ROLE_NUM_BG: Record<RoleKey, string> = {
  appOwner:    "bg-emerald-600",
  bookingAdmin:"bg-blue-600",
  surgeon:     "bg-violet-600",
  customer:    "bg-rose-600",
};

const ROLE_DOT: Record<RoleKey, string> = {
  appOwner:    "bg-emerald-400",
  bookingAdmin:"bg-blue-400",
  surgeon:     "bg-violet-400",
  customer:    "bg-rose-400",
};

const ROLE_BORDER_ACTIVE: Record<RoleKey, string> = {
  appOwner:    "border-l-emerald-500",
  bookingAdmin:"border-l-blue-500",
  surgeon:     "border-l-violet-500",
  customer:    "border-l-rose-500",
};

// ─── Print styles ─────────────────────────────────────────────────────────────

const PRINT_STYLES = `
@media print {
  .guide-no-print { display: none !important; }
  .guide-header { position: static !important; box-shadow: none !important; }
  [role="tabpanel"],
  [role="tabpanel"][hidden],
  [role="tabpanel"][data-state="inactive"] {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    height: auto !important;
    overflow: visible !important;
  }
  .guide-role-section + .guide-role-section {
    break-before: page;
    page-break-before: always;
  }
  .guide-section-card {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  body { background: white !important; }
  .guide-page { background: white !important; }
  .guide-role-section { margin-bottom: 1rem; }
  .guide-sidebar { display: none !important; }
}
`;

// ─── Scroll helper ────────────────────────────────────────────────────────────

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const headerOffset = 80;
  const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
  window.scrollTo({ top, behavior: "smooth" });
}

// ─── Active section tracker ───────────────────────────────────────────────────

function useActiveSection(ids: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0) { setActiveId(null); return; }
    const visible = new Map<string, boolean>();

    const pick = () => {
      const first = ids.find((id) => visible.get(id));
      setActiveId(first ?? ids[0]);
    };

    const observers: IntersectionObserver[] = [];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { visible.set(id, entry.isIntersecting); pick(); },
        { rootMargin: "-15% 0px -65% 0px", threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [ids]);

  return activeId;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  role: RoleKey;
  sections: SectionDef[];
  activeId: string | null;
}

function GuideSidebar({ role, sections, activeId }: SidebarProps) {
  const { t } = useTranslation();
  const roleDef = GUIDE.find((g) => g.role === role)!;
  const Icon = roleDef.icon;

  return (
    <nav className="guide-sidebar guide-no-print hidden lg:block">
      <div className="sticky top-24">
        {/* Role label */}
        <div className="mb-3 flex items-center gap-1.5 px-2">
          <Icon className={`h-3.5 w-3.5 shrink-0 ${roleDef.color}`} />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider truncate">
            {t(`guide.tabs.${role}`)}
          </span>
        </div>

        {/* Section list */}
        <ol className="space-y-0.5">
          {sections.map(({ key }, idx) => {
            const id = `${role}-${key}`;
            const isActive = activeId === id;
            return (
              <li key={key}>
                <button
                  onClick={() => scrollToSection(id)}
                  className={`w-full flex items-center gap-2.5 text-left rounded-lg px-2 py-2 text-sm transition-all group ${
                    isActive
                      ? `font-medium bg-white shadow-sm border-l-2 ${ROLE_BORDER_ACTIVE[role]} pl-[6px] text-gray-900`
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-100 border-l-2 border-l-transparent pl-[6px]"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                      isActive ? `text-white ${ROLE_NUM_BG[role]}` : "bg-gray-200 text-gray-500 group-hover:bg-gray-300"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="truncate leading-snug">
                    {t(`guide.${role}.${key}Title`)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

// ─── Search types ─────────────────────────────────────────────────────────────

interface IndexEntry {
  role: RoleKey;
  sectionIdx: number;
  sectionKey: string;
  title: string;
  items: string[];
}

interface SearchHit {
  role: RoleKey;
  sectionIdx: number;
  sectionKey: string;
  title: string;
  titleMatch: boolean;
  matchingItems: string[];
  allItems: string[];
}

// ─── Highlight helper ─────────────────────────────────────────────────────────

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-200 text-amber-900 rounded-sm px-0.5 font-medium not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Role content ─────────────────────────────────────────────────────────────

function RoleContent({ role, icon: Icon, sections }: RoleDef) {
  const { t } = useTranslation();
  return (
    <div className="guide-role-section">
      <div className={`rounded-xl border p-5 mb-6 ${ROLE_BG[role]}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_BADGE[role]}`}>
            <Icon className="h-3.5 w-3.5" />
            {t(`guide.tabs.${role}`)}
          </span>
        </div>
        <p className="text-gray-700 text-sm leading-relaxed">
          {t(`guide.${role}.intro`)}
        </p>
      </div>
      <div className="space-y-5">
        {sections.map(({ key, items }, sectionIdx) => (
          <div
            id={`${role}-${key}`}
            key={key}
            className="guide-section-card bg-white rounded-xl border p-5 shadow-sm scroll-mt-24"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${ROLE_NUM_BG[role]}`}>
                {sectionIdx + 1}
              </span>
              <h3 className="font-semibold text-gray-900 text-base">
                {t(`guide.${role}.${key}Title`)}
              </h3>
            </div>
            <ul className="space-y-2 pl-10">
              {Array.from({ length: items }, (_, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${ROLE_DOT[role]}`} />
                  {t(`guide.${role}.${key}i${i + 1}`)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Search results ───────────────────────────────────────────────────────────

function SearchResults({ hits, query }: { hits: SearchHit[]; query: string }) {
  const { t } = useTranslation();

  if (hits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Search className="h-10 w-10 text-gray-300 mb-4" />
        <p className="text-gray-500 text-base font-medium">
          {t("guide.searchNoResults")} &ldquo;{query}&rdquo;
        </p>
        <p className="text-gray-400 text-sm mt-1">{t("guide.searchTryAnother")}</p>
      </div>
    );
  }

  const totalItems = hits.reduce(
    (acc, h) => acc + h.matchingItems.length + (h.titleMatch ? 1 : 0),
    0,
  );
  const roleCount = new Set(hits.map((h) => h.role)).size;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-5">
        {totalItems} {totalItems === 1 ? t("guide.searchResult") : t("guide.searchResults")}{" "}
        &ldquo;<span className="font-medium text-gray-700">{query}</span>&rdquo;
        {" "}&mdash;{" "}
        {roleCount} {roleCount === 1 ? t("guide.searchRole") : t("guide.searchRoles")}
      </p>
      <div className="space-y-4">
        {hits.map((hit) => {
          const roleDef = GUIDE.find((g) => g.role === hit.role)!;
          const Icon = roleDef.icon;
          return (
            <div
              key={`${hit.role}-${hit.sectionKey}`}
              className="guide-section-card bg-white rounded-xl border p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[hit.role]}`}>
                  <Icon className="h-3 w-3" />
                  {t(`guide.tabs.${hit.role}`)}
                </span>
                <span className="text-gray-300 text-xs">›</span>
                <span className="text-xs text-gray-400">
                  {t("guide.searchSection")} {hit.sectionIdx + 1}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 text-base mb-3 flex items-center gap-2">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${ROLE_NUM_BG[hit.role]}`}>
                  {hit.sectionIdx + 1}
                </span>
                <HighlightText text={hit.title} query={hit.titleMatch ? query : ""} />
              </h3>
              <ul className="space-y-2 pl-8">
                {hit.allItems.map((item, i) => {
                  const isMatch = hit.matchingItems.includes(item);
                  return (
                    <li
                      key={i}
                      className={`flex items-start gap-2 text-sm transition-opacity ${
                        isMatch ? "text-gray-700" : "text-gray-300"
                      }`}
                    >
                      <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${isMatch ? ROLE_DOT[hit.role] : "bg-gray-200"}`} />
                      {isMatch ? <HighlightText text={item} query={query} /> : item}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<RoleKey>("appOwner");

  const handleTabChange = useCallback((val: string) => {
    setActiveTab(val as RoleKey);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Active tab's section IDs for the observer
  const sectionIds = useMemo(
    () =>
      GUIDE.find((g) => g.role === activeTab)!.sections.map(
        (s) => `${activeTab}-${s.key}`,
      ),
    [activeTab],
  );
  const activeSection = useActiveSection(sectionIds);

  // Search index — rebuilt when language changes
  const index = useMemo<IndexEntry[]>(
    () =>
      GUIDE.flatMap(({ role, sections }) =>
        sections.map(({ key, items }, sectionIdx) => ({
          role,
          sectionIdx,
          sectionKey: key,
          title: t(`guide.${role}.${key}Title`),
          items: Array.from({ length: items }, (_, i) =>
            t(`guide.${role}.${key}i${i + 1}`),
          ),
        })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, i18n.language],
  );

  const searchHits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return index
      .map((entry) => {
        const titleMatch = entry.title.toLowerCase().includes(q);
        const matchingItems = entry.items.filter((item) =>
          item.toLowerCase().includes(q),
        );
        return {
          role: entry.role,
          sectionIdx: entry.sectionIdx,
          sectionKey: entry.sectionKey,
          title: entry.title,
          titleMatch,
          matchingItems,
          allItems: entry.items,
        };
      })
      .filter((h) => h.titleMatch || h.matchingItems.length > 0);
  }, [index, query]);

  const isSearching = query.trim().length > 0;

  const activeSections = GUIDE.find((g) => g.role === activeTab)!.sections;

  return (
    <div className="guide-page min-h-screen bg-gray-50">
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      {/* Header */}
      <header className="guide-header bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <span className="font-semibold text-gray-900 truncate">MedConsult</span>
          </div>

          <div className="guide-no-print flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Select
                value={i18n.language}
                onValueChange={(lng) => i18n.changeLanguage(lng)}
              >
                <SelectTrigger className="h-8 w-40 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-sm"
              onClick={() => window.print()}
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print / Save PDF</span>
              <span className="sm:hidden">Print</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero + search */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {t("guide.pageTitle")}
          </h1>
          <p className="mt-2 text-gray-500 text-base max-w-2xl">
            {t("guide.pageSubtitle")}
          </p>

          <div className="guide-no-print relative mt-6 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("guide.searchPlaceholder")}
              className="pl-9 pr-9 h-10 text-sm bg-gray-50 border-gray-200 focus:bg-white"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {isSearching ? (
          <SearchResults hits={searchHits} query={query.trim()} />
        ) : (
          <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-8 lg:items-start">
            {/* Sidebar — desktop only */}
            <GuideSidebar
              role={activeTab}
              sections={activeSections}
              activeId={activeSection}
            />

            {/* Tabs */}
            <div className="min-w-0">
              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
              >
                <TabsList className="guide-no-print flex flex-wrap h-auto gap-1 mb-8 bg-transparent p-0">
                  {GUIDE.map(({ role, icon: Icon, color }) => (
                    <TabsTrigger
                      key={role}
                      value={role}
                      className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-gray-300 text-gray-600 data-[state=active]:text-gray-900 transition-all"
                    >
                      <Icon className={`h-4 w-4 ${color}`} />
                      {t(`guide.tabs.${role}`)}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {GUIDE.map((roleDef) => (
                  <TabsContent
                    key={roleDef.role}
                    value={roleDef.role}
                    className="mt-0"
                  >
                    <RoleContent {...roleDef} />
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 text-center text-xs text-gray-400">
          MedConsult &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
