import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import { useListAgencies } from "@workspace/api-client-react";
import type { Agency } from "@workspace/api-client-react";
import { formatCurrency as fmt } from "@/lib/currency";
import { hexToHslString, isLightColor, isValidHex } from "@/lib/color";

interface AgencyContextValue {
  agencies: Agency[];
  currentAgency: Agency | null;
  agencyId: number;
  setCurrentAgencyId: (id: number) => void;
  formatCurrency: (amount: number | null | undefined) => string;
  isLoading: boolean;
}

const AgencyContext = createContext<AgencyContextValue>({
  agencies: [],
  currentAgency: null,
  agencyId: 1,
  setCurrentAgencyId: () => {},
  formatCurrency: (n) => `£${(n ?? 0).toFixed(2)}`,
  isLoading: true,
});

const STORAGE_KEY = "medconsult_agency_id";
const STYLE_ID = "mc-brand-vars";

function applyBrandVars(primary?: string | null, secondary?: string | null) {
  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }

  const p = (primary ?? "").trim();
  const s = (secondary ?? "").trim();

  if (isValidHex(p)) {
    const hsl = hexToHslString(p);
    const fg = isLightColor(p) ? "0 0% 10%" : "0 0% 100%";
    const secHsl = isValidHex(s) ? hexToHslString(s) : hsl;
    styleEl.textContent = [
      `:root {`,
      `  --primary: ${hsl};`,
      `  --primary-foreground: ${fg};`,
      `  --sidebar-primary: ${hsl};`,
      `  --sidebar-primary-foreground: ${fg};`,
      `  --ring: ${hsl};`,
      `  --brand-primary: ${p};`,
      `  --brand-secondary: ${isValidHex(s) ? s : p};`,
      `  --brand-secondary-hsl: ${secHsl};`,
      `}`,
    ].join("\n");
  } else {
    styleEl.textContent = "";
  }
}

export function AgencyProvider({ children }: { children: ReactNode }) {
  const { data: agencies = [], isLoading } = useListAgencies();
  const [currentAgencyId, setCurrentAgencyIdState] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 1;
  });

  useEffect(() => {
    if (!isLoading && agencies.length > 0) {
      const exists = agencies.some((a) => a.id === currentAgencyId);
      if (!exists) {
        const firstId = agencies[0].id;
        setCurrentAgencyIdState(firstId);
        localStorage.setItem(STORAGE_KEY, String(firstId));
      }
    }
  }, [agencies, isLoading, currentAgencyId]);

  const setCurrentAgencyId = (id: number) => {
    setCurrentAgencyIdState(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  };

  const currentAgency = useMemo(
    () => agencies.find((a) => a.id === currentAgencyId) ?? agencies[0] ?? null,
    [agencies, currentAgencyId]
  );

  // Inject brand CSS variables whenever the active agency's colours change
  useEffect(() => {
    applyBrandVars(currentAgency?.primaryColor, currentAgency?.secondaryColor);
  }, [currentAgency?.primaryColor, currentAgency?.secondaryColor]);

  const formatCurrency = useMemo(
    () => (amount: number | null | undefined) =>
      fmt(amount, currentAgency?.currency ?? "GBP"),
    [currentAgency]
  );

  return (
    <AgencyContext.Provider
      value={{
        agencies,
        currentAgency,
        agencyId: currentAgency?.id ?? currentAgencyId,
        setCurrentAgencyId,
        formatCurrency,
        isLoading,
      }}
    >
      {children}
    </AgencyContext.Provider>
  );
}

export function useAgency() {
  return useContext(AgencyContext);
}
