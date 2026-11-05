import { headers } from "next/headers";

/** URL pública do portal (PORTAL_URL ou deduzida da requisição). */
export async function urlPortal() {
  if (process.env.PORTAL_URL) return process.env.PORTAL_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
