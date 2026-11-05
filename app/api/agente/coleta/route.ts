import { gunzipSync } from "node:zlib";
import { first, run } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const s = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : v == null ? null : String(v).slice(0, max));
const n = (v: unknown) => (typeof v === "number" && isFinite(v) ? Math.round(v) : 0);

/** D1 limita cada linha a ~2 MB: reduz as listas de itens se necessário (os totais continuam completos). */
function jsonLimitado(pastas: any[]) {
  let json = JSON.stringify(pastas);
  while (json.length > 1_400_000) {
    for (const d of pastas) {
      if (Array.isArray(d.itens) && d.itens.length > 50) {
        d.itens = d.itens.slice(0, Math.floor(d.itens.length * 0.7));
        d.truncado = true;
      }
    }
    const novo = JSON.stringify(pastas);
    if (novo.length === json.length) break;
    json = novo;
  }
  return json;
}

export async function POST(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return Response.json({ erro: "token ausente" }, { status: 401 });

  const empresa = await first<{ id: number; ativo: number }>("SELECT id, ativo FROM empresas WHERE token = ?", [token]);
  if (!empresa || !empresa.ativo) return Response.json({ erro: "token inválido ou empresa inativa" }, { status: 403 });

  let c: any;
  try {
    let buf = Buffer.from(await req.arrayBuffer());
    if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf); // gzip
    c = JSON.parse(buf.toString("utf8"));
  } catch {
    return Response.json({ erro: "JSON inválido" }, { status: 400 });
  }
  const machineId = s(c?.machine_id, 100);
  if (!machineId) return Response.json({ erro: "machine_id ausente" }, { status: 400 });

  const discos: any[] = Array.isArray(c.discos) ? c.discos : [];
  const rede: any[] = Array.isArray(c.rede) ? c.rede : [];
  const programas: any[] = Array.isArray(c.programas) ? c.programas : [];
  const desktop: any[] = Array.isArray(c.area_trabalho) ? c.area_trabalho : [];
  const hw = c.hardware ?? {};
  const so = c.so ?? {};

  const ip = rede.flatMap((r) => (Array.isArray(r.ips) ? r.ips : []))[0] ?? null;
  const discoTotal = discos.reduce((a, d) => a + n(d.tamanho_bytes), 0);
  const discoLivre = discos.reduce((a, d) => a + n(d.livre_bytes), 0);
  const dArq = desktop.reduce((a, d) => a + n(d.total_arquivos), 0);
  const dBytes = desktop.reduce((a, d) => a + n(d.total_bytes), 0);

  const campos = [
    s(c.hostname, 100), s(c.dominio, 100), s(c.usuario_logado, 150), s(so.nome, 150),
    [s(so.versao, 50), so.build ? `build ${s(so.build, 20)}` : null].filter(Boolean).join(" ") || null,
    s(hw.fabricante, 100), s(hw.modelo, 150), s(hw.numero_serie, 100), s(hw.cpu, 200), n(hw.memoria_bytes),
    discoTotal, discoLivre, s(ip, 50), programas.length, dArq, dBytes, s(c.versao_agente, 20),
  ];

  const existente = await first<{ id: number }>("SELECT id FROM estacoes WHERE machine_id = ?", [machineId]);
  let id: number;
  if (existente) {
    id = existente.id;
    await run(
      `UPDATE estacoes SET empresa_id=?, hostname=?, dominio=?, usuario_logado=?, so_nome=?, so_versao=?, fabricante=?, modelo=?,
        numero_serie=?, cpu=?, memoria_bytes=?, disco_total_bytes=?, disco_livre_bytes=?, ip=?, programas_qtd=?,
        desktop_arquivos=?, desktop_bytes=?, versao_agente=?, ultima_coleta=datetime('now') WHERE id=?`,
      [empresa.id, ...campos, id],
    );
  } else {
    const r = await run(
      `INSERT INTO estacoes (empresa_id, machine_id, hostname, dominio, usuario_logado, so_nome, so_versao, fabricante, modelo,
        numero_serie, cpu, memoria_bytes, disco_total_bytes, disco_livre_bytes, ip, programas_qtd, desktop_arquivos,
        desktop_bytes, versao_agente) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [empresa.id, machineId, ...campos],
    );
    id = r.lastId;
  }

  const desktopJson = jsonLimitado(desktop);

  const hardware = { ...hw, so, discos_fisicos: c.discos_fisicos ?? [], hostname: c.hostname, dominio: c.dominio, coletado_em: c.coletado_em };
  await run(
    `INSERT INTO estacao_detalhes (estacao_id, hardware_json, discos_json, rede_json, programas_json, desktop_json, erros_json)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(estacao_id) DO UPDATE SET hardware_json=excluded.hardware_json, discos_json=excluded.discos_json,
       rede_json=excluded.rede_json, programas_json=excluded.programas_json, desktop_json=excluded.desktop_json,
       erros_json=excluded.erros_json`,
    [id, JSON.stringify(hardware), JSON.stringify(discos), JSON.stringify(rede), JSON.stringify(programas),
      desktopJson, JSON.stringify(c.erros ?? [])],
  );

  // Documentos: o agente só envia quando varreu neste ciclo (padrão 1x/dia); senão mantém a última
  if (Array.isArray(c.documentos)) {
    const docs: any[] = c.documentos;
    await run(
      `INSERT INTO estacao_documentos (estacao_id, documentos_json) VALUES (?,?)
       ON CONFLICT(estacao_id) DO UPDATE SET documentos_json=excluded.documentos_json`,
      [id, jsonLimitado(docs)],
    );
    await run(
      "UPDATE estacoes SET documentos_arquivos=?, documentos_bytes=?, documentos_coleta=datetime('now') WHERE id=?",
      [docs.reduce((a, d) => a + n(d.total_arquivos), 0), docs.reduce((a, d) => a + n(d.total_bytes), 0), id],
    );
  }

  return Response.json({ ok: true, estacao_id: id });
}
