import { usuarioAtual } from "@/lib/auth";
import { first } from "@/lib/db";
import { urlPortal } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Gera o instalar-agente.bat já com o endereço do portal e o token da empresa (somente administradores). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await usuarioAtual();
  if (!u || !u.admin) return new Response("Acesso negado", { status: 403 });
  const { id } = await params;
  const e = await first<{ nome: string; token: string }>("SELECT nome, token FROM empresas WHERE id = ?", [Number(id)]);
  if (!e) return new Response("Empresa não encontrada", { status: 404 });

  const url = await urlPortal();
  const slug = e.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "empresa";
  const nomeAscii = e.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
  const bat = [
    "@echo off",
    `REM Instala o Agente de Inventario de TI - empresa: ${nomeAscii}`,
    "REM Deixe este arquivo na mesma pasta do agente-inventario.exe e execute como Administrador",
    `"%~dp0agente-inventario.exe" instalar -servidor ${url} -token ${e.token}`,
    "pause",
    "",
  ].join("\r\n");
  return new Response(bat, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="instalar-agente-${slug}.bat"`,
      "Cache-Control": "no-store",
    },
  });
}
