import { usuarioAtual } from "@/lib/auth";
import { escopoEmpresas } from "@/lib/consultas";
import { pastaDoParametro, relatorioAreaTrabalho } from "@/lib/relatorio";
import { dataHora } from "@/lib/formato";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cel = (v: unknown) => {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const u = await usuarioAtual();
  if (!u) return new Response("Não autenticado", { status: 401 });
  const sp = new URL(req.url).searchParams;
  const { ids } = await escopoEmpresas(u, sp.get("empresa"));
  const pasta = pastaDoParametro(sp.get("pasta"));
  const { arquivos } = await relatorioAreaTrabalho({
    ids, pasta, ext: sp.get("ext") ?? "", dias: sp.get("dias") ?? "", minMb: sp.get("min_mb") ?? "", q: sp.get("q") ?? "",
  });

  const linhas = [
    ["Empresa", "Estação", "Usuário", "Arquivo", "Extensão", "Tamanho (MB)", "Modificado em", "Caminho completo"].join(";"),
    ...arquivos.map((a) => [
      a.empresa, a.hostname, a.usuario, a.caminho, a.extensao,
      (a.bytes / 1048576).toFixed(2).replace(".", ","), dataHora(a.modificado_em),
      `${a.caminhoBase}\\${a.caminho.replace(/\//g, "\\")}`,
    ].map(cel).join(";")),
  ];
  const nome = `${pasta === "documentos" ? "documentos" : "area-de-trabalho"}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response("﻿" + linhas.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${nome}"` },
  });
}
