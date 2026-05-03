import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  CalendarCheck,
  Stethoscope,
  UserRound,
  Globe,
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const { t, i18n } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <span className="font-semibold text-gray-900 truncate">MedConsult</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Select value={i18n.language} onValueChange={(lng) => i18n.changeLanguage(lng)}>
              <SelectTrigger className="h-8 w-40 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {t("guide.pageTitle")}
          </h1>
          <p className="mt-2 text-gray-500 text-base max-w-2xl">
            {t("guide.pageSubtitle")}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Tabs defaultValue="appOwner">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-8 bg-transparent p-0">
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

          {GUIDE.map(({ role, icon: Icon, color, sections }) => (
            <TabsContent key={role} value={role} className="mt-0">
              {/* Role intro card */}
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

              {/* Sections */}
              <div className="space-y-5">
                {sections.map(({ key, items }, sectionIdx) => (
                  <div key={key} className="bg-white rounded-xl border p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                        role === "appOwner"     ? "bg-emerald-600" :
                        role === "bookingAdmin" ? "bg-blue-600"    :
                        role === "surgeon"      ? "bg-violet-600"  :
                                                  "bg-rose-600"
                      }`}>
                        {sectionIdx + 1}
                      </span>
                      <h3 className="font-semibold text-gray-900 text-base">
                        {t(`guide.${role}.${key}Title`)}
                      </h3>
                    </div>
                    <ul className="space-y-2 pl-10">
                      {Array.from({ length: items }, (_, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                            role === "appOwner"     ? "bg-emerald-400" :
                            role === "bookingAdmin" ? "bg-blue-400"    :
                            role === "surgeon"      ? "bg-violet-400"  :
                                                      "bg-rose-400"
                          }`} />
                          {t(`guide.${role}.${key}i${i + 1}`)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
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
