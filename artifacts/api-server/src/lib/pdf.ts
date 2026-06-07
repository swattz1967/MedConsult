import { promises as dnsPromises } from "dns";

const LOGO_MAX_BYTES = 2 * 1024 * 1024;

function ipv4ToNumber(ip: string): number {
  const p = ip.split(".").map(Number);
  return p[0] * 16777216 + p[1] * 65536 + p[2] * 256 + p[3];
}

const BLOCKED_IPV4: Array<[number, number]> = [
  [ipv4ToNumber("0.0.0.0"),      ipv4ToNumber("0.255.255.255")],
  [ipv4ToNumber("10.0.0.0"),     ipv4ToNumber("10.255.255.255")],
  [ipv4ToNumber("100.64.0.0"),   ipv4ToNumber("100.127.255.255")],
  [ipv4ToNumber("127.0.0.0"),    ipv4ToNumber("127.255.255.255")],
  [ipv4ToNumber("169.254.0.0"),  ipv4ToNumber("169.254.255.255")],
  [ipv4ToNumber("172.16.0.0"),   ipv4ToNumber("172.31.255.255")],
  [ipv4ToNumber("192.0.0.0"),    ipv4ToNumber("192.0.0.255")],
  [ipv4ToNumber("192.168.0.0"),  ipv4ToNumber("192.168.255.255")],
  [ipv4ToNumber("198.18.0.0"),   ipv4ToNumber("198.19.255.255")],
  [ipv4ToNumber("198.51.100.0"), ipv4ToNumber("198.51.100.255")],
  [ipv4ToNumber("203.0.113.0"),  ipv4ToNumber("203.0.113.255")],
  [ipv4ToNumber("240.0.0.0"),    ipv4ToNumber("255.255.255.255")],
];

function isBlockedIPv4(ip: string): boolean {
  const n = ipv4ToNumber(ip);
  return BLOCKED_IPV4.some(([lo, hi]) => n >= lo && n <= hi);
}

function isBlockedIPv6(ip: string): boolean {
  const addr = ip.toLowerCase();
  if (addr === "::1" || addr === "::" || addr === "0:0:0:0:0:0:0:0" || addr === "0:0:0:0:0:0:0:1") return true;
  if (/^fc|^fd/i.test(addr)) return true;
  if (/^fe[89ab]/i.test(addr)) return true;
  if (/^::ffff:/i.test(addr)) {
    const mapped = addr.slice(7);
    if (/^\d+\.\d+\.\d+\.\d+$/.test(mapped)) return isBlockedIPv4(mapped);
    return true;
  }
  return false;
}

export async function isSafeLogoUrl(rawUrl: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;

  const rawHost = url.hostname;
  const isIPv4Literal = /^\d+\.\d+\.\d+\.\d+$/.test(rawHost);
  const isIPv6Literal = rawHost.startsWith("[") || rawHost.includes(":");

  if (isIPv4Literal) return !isBlockedIPv4(rawHost);
  if (isIPv6Literal) {
    const bare = rawHost.replace(/^\[|\]$/g, "");
    return !isBlockedIPv6(bare);
  }

  try {
    const [v4, v6] = await Promise.all([
      dnsPromises.resolve4(rawHost).catch(() => [] as string[]),
      dnsPromises.resolve6(rawHost).catch(() => [] as string[]),
    ]);
    const all = [...v4, ...v6];
    if (all.length === 0) return false;
    for (const ip of v4) { if (isBlockedIPv4(ip)) return false; }
    for (const ip of v6) { if (isBlockedIPv6(ip)) return false; }
    return true;
  } catch {
    return false;
  }
}

export async function fetchLogoBuffer(logoUrl: string): Promise<Buffer | null> {
  if (!(await isSafeLogoUrl(logoUrl))) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(logoUrl, { signal: controller.signal, redirect: "error" });
      if (!res.ok) return null;
      const contentType = res.headers.get("content-type") ?? "";
      const contentLength = parseInt(res.headers.get("content-length") ?? "0", 10);
      if (!contentType.startsWith("image/")) return null;
      if (contentLength > LOGO_MAX_BYTES) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return buf.length <= LOGO_MAX_BYTES ? buf : null;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return null;
  }
}
