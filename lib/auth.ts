import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { first, query } from "./db";

export type Usuario = { id: number; nome: string; email: string; admin: number; ativo: number };
export type Empresa = { id: number; nome: string; cnpj: string | null; token: string; ativo: number };

const COOKIE = "inv_sessao";
const DURACAO_H = 12;

function segredo() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("Defina SESSION_SECRET");
  return s || "dev-segredo-local";
}

export function hashSenha(senha: string) {
  const sal = randomBytes(16).toString("hex");
  return `scrypt$${sal}$${scryptSync(senha, sal, 64).toString("hex")}`;
}

export function conferirSenha(senha: string, hash: string) {
  const [, sal, h] = hash.split("$");
  if (!sal || !h) return false;
  const calc = scryptSync(senha, sal, 64);
  const esperado = Buffer.from(h, "hex");
  return esperado.length === calc.length && timingSafeEqual(calc, esperado);
}

function assinar(dados: string) {
  return createHmac("sha256", segredo()).update(dados).digest("base64url");
}

export async function criarSessao(usuarioId: number) {
  const exp = Date.now() + DURACAO_H * 3600_000;
  const dados = Buffer.from(JSON.stringify({ u: usuarioId, e: exp })).toString("base64url");
  (await cookies()).set(COOKIE, `${dados}.${assinar(dados)}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DURACAO_H * 3600,
  });
}

export async function encerrarSessao() {
  (await cookies()).delete(COOKIE);
}

export async function usuarioAtual(): Promise<Usuario | null> {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return null;
  const [dados, sig] = v.split(".");
  if (!dados || !sig || assinar(dados) !== sig) return null;
  try {
    const { u, e } = JSON.parse(Buffer.from(dados, "base64url").toString());
    if (Date.now() > e) return null;
    return await first<Usuario>("SELECT id, nome, email, admin, ativo FROM usuarios WHERE id = ? AND ativo = 1", [u]);
  } catch {
    return null;
  }
}

export async function exigirUsuario() {
  const u = await usuarioAtual();
  if (!u) redirect("/login");
  return u;
}

export async function exigirAdmin() {
  const u = await exigirUsuario();
  if (!u.admin) redirect("/");
  return u;
}

/** Empresas que o usuário pode ver (admin vê todas). */
export async function empresasPermitidas(u: Usuario): Promise<Empresa[]> {
  if (u.admin) return query<Empresa>("SELECT * FROM empresas ORDER BY nome");
  return query<Empresa>(
    "SELECT e.* FROM empresas e JOIN usuario_empresas ue ON ue.empresa_id = e.id WHERE ue.usuario_id = ? ORDER BY e.nome",
    [u.id],
  );
}

export function novoToken() {
  return randomBytes(24).toString("base64url");
}
