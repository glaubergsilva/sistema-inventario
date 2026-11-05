// Camada de banco: Cloudflare D1 via API HTTP (produção/Vercel) ou SQLite local (desenvolvimento).
// Se as variáveis CF_ACCOUNT_ID, CF_D1_DATABASE_ID e CF_API_TOKEN estiverem definidas, usa o D1.
import { readFileSync } from "node:fs";
import path from "node:path";

type Param = string | number | null;
export type Row = Record<string, any>;

const usarD1 = !!(process.env.CF_ACCOUNT_ID && process.env.CF_D1_DATABASE_ID && process.env.CF_API_TOKEN);

async function d1(sql: string, params: Param[]) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/d1/database/${process.env.CF_D1_DATABASE_ID}/query`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CF_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql, params }),
    cache: "no-store",
  });
  const j: any = await r.json();
  if (!j.success) throw new Error("D1: " + JSON.stringify(j.errors ?? j));
  const res = j.result?.[0] ?? {};
  return { rows: (res.results ?? []) as Row[], changes: res.meta?.changes ?? 0, lastId: res.meta?.last_row_id ?? 0 };
}

let local: any = null;
async function sqlite() {
  if (!local) {
    const { DatabaseSync } = await import("node:sqlite");
    const arquivo = process.env.SQLITE_PATH || path.join(process.cwd(), "dados-local.sqlite");
    local = new DatabaseSync(arquivo);
    local.exec("PRAGMA foreign_keys = ON;");
  }
  return local;
}

async function executar(sql: string, params: Param[] = []) {
  if (usarD1) return d1(sql, params);
  const db = await sqlite();
  const st = db.prepare(sql);
  if (/^\s*(select|with|pragma)/i.test(sql) || /\breturning\b/i.test(sql)) {
    // node:sqlite devolve objetos sem protótipo; converte para objetos comuns
    return { rows: (st.all(...params) as Row[]).map((r) => ({ ...r })), changes: 0, lastId: 0 };
  }
  const r = st.run(...params);
  return { rows: [] as Row[], changes: Number(r.changes), lastId: Number(r.lastInsertRowid) };
}

const MIGRACOES = [
  "ALTER TABLE estacoes ADD COLUMN documentos_arquivos INTEGER",
  "ALTER TABLE estacoes ADD COLUMN documentos_bytes INTEGER",
  "ALTER TABLE estacoes ADD COLUMN documentos_coleta TEXT",
];

let esquemaPronto: Promise<void> | null = null;
function garantirEsquema() {
  if (!esquemaPronto) {
    esquemaPronto = (async () => {
      const sql = readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8")
        .split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
      for (const st of sql.split(";").map((s) => s.trim()).filter(Boolean)) {
        await executar(st);
      }
      // migrações de bancos criados em versões anteriores (erro = coluna já existe)
      for (const m of MIGRACOES) {
        try { await executar(m); } catch { /* já aplicada */ }
      }
    })().catch((e) => { esquemaPronto = null; throw e; });
  }
  return esquemaPronto;
}

export async function query<T = Row>(sql: string, params: Param[] = []): Promise<T[]> {
  await garantirEsquema();
  return (await executar(sql, params)).rows as T[];
}

export async function first<T = Row>(sql: string, params: Param[] = []): Promise<T | null> {
  return (await query<T>(sql, params))[0] ?? null;
}

export async function run(sql: string, params: Param[] = []) {
  await garantirEsquema();
  const r = await executar(sql, params);
  return { changes: r.changes, lastId: r.lastId };
}
