"use client";

import { useActionState } from "react";
import { criarPrimeiroAdmin, entrar } from "../actions";

export function FormLogin() {
  const [estado, acao, pendente] = useActionState(entrar, null);
  return (
    <form action={acao}>
      {estado?.erro && <div className="erro">{estado.erro}</div>}
      <label className="campo">E-mail<input name="email" type="email" required autoFocus /></label>
      <label className="campo">Senha<input name="senha" type="password" required /></label>
      <button disabled={pendente}>{pendente ? "Entrando..." : "Entrar"}</button>
    </form>
  );
}

export function FormPrimeiroAdmin() {
  const [estado, acao, pendente] = useActionState(criarPrimeiroAdmin, null);
  return (
    <form action={acao}>
      {estado?.erro && <div className="erro">{estado.erro}</div>}
      <label className="campo">Nome<input name="nome" required autoFocus /></label>
      <label className="campo">E-mail<input name="email" type="email" required /></label>
      <label className="campo">Senha (mín. 8 caracteres)<input name="senha" type="password" minLength={8} required /></label>
      <button disabled={pendente}>Criar administrador</button>
    </form>
  );
}
