"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { first, run } from "@/lib/db";
import {
  conferirSenha, criarSessao, encerrarSessao, exigirAdmin, exigirUsuario, empresasPermitidas, hashSenha, novoToken,
} from "@/lib/auth";

const txt = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// ---------- Sessão ----------

export async function entrar(_: unknown, f: FormData) {
  const email = txt(f, "email").toLowerCase();
  const senha = String(f.get("senha") ?? "");
  const u = await first<{ id: number; senha_hash: string; ativo: number }>(
    "SELECT id, senha_hash, ativo FROM usuarios WHERE email = ?", [email]);
  if (!u || !u.ativo || !conferirSenha(senha, u.senha_hash)) return { erro: "E-mail ou senha inválidos." };
  await criarSessao(u.id);
  redirect("/");
}

export async function criarPrimeiroAdmin(_: unknown, f: FormData) {
  const total = await first<{ n: number }>("SELECT COUNT(*) AS n FROM usuarios");
  if (total && total.n > 0) return { erro: "O administrador já foi criado." };
  const nome = txt(f, "nome"), email = txt(f, "email").toLowerCase(), senha = String(f.get("senha") ?? "");
  if (!nome || !email || senha.length < 8) return { erro: "Preencha nome, e-mail e uma senha com pelo menos 8 caracteres." };
  const r = await run("INSERT INTO usuarios (nome, email, senha_hash, admin) VALUES (?,?,?,1)", [nome, email, hashSenha(senha)]);
  await criarSessao(r.lastId);
  redirect("/admin/empresas");
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}

export async function trocarMinhaSenha(_: unknown, f: FormData) {
  const u = await exigirUsuario();
  const atual = String(f.get("atual") ?? ""), nova = String(f.get("nova") ?? "");
  const reg = await first<{ senha_hash: string }>("SELECT senha_hash FROM usuarios WHERE id = ?", [u.id]);
  if (!reg || !conferirSenha(atual, reg.senha_hash)) return { erro: "Senha atual incorreta." };
  if (nova.length < 8) return { erro: "A nova senha precisa ter pelo menos 8 caracteres." };
  await run("UPDATE usuarios SET senha_hash = ? WHERE id = ?", [hashSenha(nova), u.id]);
  return { ok: "Senha alterada." };
}

// ---------- Empresas ----------

export async function salvarEmpresa(f: FormData) {
  await exigirAdmin();
  const id = Number(f.get("id") || 0);
  const nome = txt(f, "nome"), cnpj = txt(f, "cnpj") || null;
  const ativo = f.get("ativo") ? 1 : 0;
  if (!nome) return;
  if (id) await run("UPDATE empresas SET nome=?, cnpj=?, ativo=? WHERE id=?", [nome, cnpj, ativo, id]);
  else await run("INSERT INTO empresas (nome, cnpj, token, ativo) VALUES (?,?,?,1)", [nome, cnpj, novoToken()]);
  revalidatePath("/admin/empresas");
}

export async function regenerarToken(f: FormData) {
  await exigirAdmin();
  await run("UPDATE empresas SET token = ? WHERE id = ?", [novoToken(), Number(f.get("id"))]);
  revalidatePath("/admin/empresas");
}

export async function excluirEmpresa(f: FormData) {
  await exigirAdmin();
  const id = Number(f.get("id"));
  const c = await first<{ n: number }>("SELECT COUNT(*) AS n FROM estacoes WHERE empresa_id = ?", [id]);
  if (c && c.n > 0) return; // não exclui empresa com estações vinculadas (inative-a)
  await run("DELETE FROM usuario_empresas WHERE empresa_id = ?", [id]);
  await run("DELETE FROM empresas WHERE id = ?", [id]);
  revalidatePath("/admin/empresas");
}

// ---------- Usuários ----------

export async function salvarUsuario(_: unknown, f: FormData) {
  const eu = await exigirAdmin();
  const id = Number(f.get("id") || 0);
  const nome = txt(f, "nome"), email = txt(f, "email").toLowerCase(), senha = String(f.get("senha") ?? "");
  const admin = f.get("admin") ? 1 : 0, ativo = f.get("ativo") ? 1 : 0;
  const empresas = f.getAll("empresas").map(Number).filter(Boolean);
  if (!nome || !email) return { erro: "Informe nome e e-mail." };
  if (!id && senha.length < 8) return { erro: "Senha inicial com pelo menos 8 caracteres." };
  if (senha && senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  if (id === eu.id && (!admin || !ativo)) return { erro: "Você não pode remover seu próprio acesso de administrador." };
  const dup = await first<{ id: number }>("SELECT id FROM usuarios WHERE email = ? AND id <> ?", [email, id]);
  if (dup) return { erro: "Já existe um usuário com esse e-mail." };

  let uid = id;
  if (id) {
    await run("UPDATE usuarios SET nome=?, email=?, admin=?, ativo=? WHERE id=?", [nome, email, admin, ativo, id]);
    if (senha) await run("UPDATE usuarios SET senha_hash=? WHERE id=?", [hashSenha(senha), id]);
  } else {
    uid = (await run("INSERT INTO usuarios (nome, email, senha_hash, admin, ativo) VALUES (?,?,?,?,?)",
      [nome, email, hashSenha(senha), admin, ativo])).lastId;
  }
  await run("DELETE FROM usuario_empresas WHERE usuario_id = ?", [uid]);
  for (const e of empresas) await run("INSERT OR IGNORE INTO usuario_empresas (usuario_id, empresa_id) VALUES (?,?)", [uid, e]);
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}

export async function excluirUsuario(f: FormData) {
  const eu = await exigirAdmin();
  const id = Number(f.get("id"));
  if (id === eu.id) return;
  await run("DELETE FROM usuario_empresas WHERE usuario_id = ?", [id]);
  await run("DELETE FROM usuarios WHERE id = ?", [id]);
  revalidatePath("/admin/usuarios");
}

// ---------- Estações ----------

async function podeEditarEstacao(estacaoId: number) {
  const u = await exigirUsuario();
  const est = await first<{ empresa_id: number }>("SELECT empresa_id FROM estacoes WHERE id = ?", [estacaoId]);
  if (!est) return null;
  const permitidas = await empresasPermitidas(u);
  return permitidas.some((e) => e.id === est.empresa_id) ? u : null;
}

export async function salvarObservacoes(f: FormData) {
  const id = Number(f.get("id"));
  if (!(await podeEditarEstacao(id))) return;
  await run("UPDATE estacoes SET observacoes = ? WHERE id = ?", [txt(f, "observacoes") || null, id]);
  revalidatePath(`/estacoes/${id}`);
}

export async function moverEstacao(f: FormData) {
  await exigirAdmin();
  const id = Number(f.get("id")), empresa = Number(f.get("empresa_id"));
  await run("UPDATE estacoes SET empresa_id = ? WHERE id = ?", [empresa, id]);
  revalidatePath(`/estacoes/${id}`);
}

export async function excluirEstacao(f: FormData) {
  await exigirAdmin();
  const id = Number(f.get("id"));
  await run("DELETE FROM estacao_detalhes WHERE estacao_id = ?", [id]);
  await run("DELETE FROM estacoes WHERE id = ?", [id]);
  redirect("/estacoes");
}
