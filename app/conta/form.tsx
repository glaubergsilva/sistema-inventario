"use client";

import { useActionState } from "react";
import { trocarMinhaSenha } from "../actions";

export function FormSenha() {
  const [estado, acao, pendente] = useActionState(trocarMinhaSenha, null);
  return (
    <form action={acao} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320 }}>
      {estado?.erro && <div className="erro">{estado.erro}</div>}
      {estado?.ok && <div className="sucesso">{estado.ok}</div>}
      <label className="campo">Senha atual<input name="atual" type="password" required /></label>
      <label className="campo">Nova senha<input name="nova" type="password" minLength={8} required /></label>
      <button disabled={pendente}>Salvar</button>
    </form>
  );
}
