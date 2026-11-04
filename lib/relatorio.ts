import { query } from "./db";

export type FiltrosAT = { ids: number[]; ext?: string; dias?: string; minMb?: string; q?: string };

export type ArquivoAT = {
  estacao_id: number; hostname: string; empresa: string; usuario: string; caminhoBase: string;
  caminho: string; extensao: string; bytes: number; modificado_em: string;
};

export type ResumoAT = {
  estacao_id: number; hostname: string; empresa: string; usuario: string; redirecionada: boolean;
  totalArquivos: number; totalBytes: number; encontrados: number; bytesEncontrados: number; maisRecente: string | null;
};

export async function relatorioAreaTrabalho(f: FiltrosAT) {
  if (!f.ids.length) return { resumo: [] as ResumoAT[], arquivos: [] as ArquivoAT[] };
  const linhas = await query<{ id: number; hostname: string; empresa: string; desktop_json: string }>(
    `SELECT s.id, s.hostname, e.nome AS empresa, d.desktop_json FROM estacoes s
     JOIN empresas e ON e.id = s.empresa_id JOIN estacao_detalhes d ON d.estacao_id = s.id
     WHERE s.empresa_id IN (${f.ids.map(() => "?").join(",")})`, f.ids);

  const exts = (f.ext || "").split(/[,;\s]+/).map((e) => e.trim().replace(/^\./, "").toLowerCase()).filter(Boolean);
  const dias = Number(f.dias || 0);
  const limiteData = dias > 0 ? Date.now() - dias * 86400_000 : 0;
  const minBytes = Number(f.minMb || 0) * 1024 * 1024;
  const q = (f.q || "").toLowerCase().trim();

  const resumo: ResumoAT[] = [];
  const arquivos: ArquivoAT[] = [];

  for (const l of linhas) {
    let areas: any[] = [];
    try { areas = JSON.parse(l.desktop_json || "[]") || []; } catch { /* ignora */ }
    for (const a of areas) {
      const r: ResumoAT = {
        estacao_id: l.id, hostname: l.hostname, empresa: l.empresa, usuario: a.usuario, redirecionada: !!a.redirecionada,
        totalArquivos: a.total_arquivos || 0, totalBytes: a.total_bytes || 0, encontrados: 0, bytesEncontrados: 0, maisRecente: null,
      };
      for (const it of a.itens ?? []) {
        if (it.pasta) continue;
        if (exts.length && !exts.includes(String(it.extensao || "").toLowerCase())) continue;
        if (limiteData && new Date(it.modificado_em).getTime() < limiteData) continue;
        if (minBytes && (it.bytes || 0) < minBytes) continue;
        if (q && !String(it.caminho).toLowerCase().includes(q)) continue;
        r.encontrados++;
        r.bytesEncontrados += it.bytes || 0;
        if (!r.maisRecente || it.modificado_em > r.maisRecente) r.maisRecente = it.modificado_em;
        arquivos.push({
          estacao_id: l.id, hostname: l.hostname, empresa: l.empresa, usuario: a.usuario, caminhoBase: a.caminho,
          caminho: it.caminho, extensao: it.extensao || "", bytes: it.bytes || 0, modificado_em: it.modificado_em,
        });
      }
      if (r.totalArquivos > 0 || r.redirecionada) resumo.push(r);
    }
  }
  resumo.sort((a, b) => b.encontrados - a.encontrados || b.totalBytes - a.totalBytes);
  arquivos.sort((a, b) => (b.modificado_em || "").localeCompare(a.modificado_em || ""));
  return { resumo, arquivos };
}
