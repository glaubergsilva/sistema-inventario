export function bytes(n: number | null | undefined) {
  if (!n || n <= 0) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toLocaleString("pt-BR", { maximumFractionDigits: i >= 3 ? 1 : 0 })} ${u[i]}`;
}

/** Datas do SQLite vêm como "YYYY-MM-DD HH:MM:SS" em UTC. */
export function paraDate(s: string | null | undefined) {
  if (!s) return null;
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s) ? s.replace(" ", "T") + "Z" : s;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function dataHora(s: string | null | undefined) {
  const d = paraDate(s);
  return d ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "—";
}

export function data(s: string | null | undefined) {
  const d = paraDate(s);
  return d ? d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";
}

export function diasDesde(s: string | null | undefined) {
  const d = paraDate(s);
  return d ? Math.floor((Date.now() - d.getTime()) / 86400_000) : Infinity;
}

export function numero(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("pt-BR");
}
