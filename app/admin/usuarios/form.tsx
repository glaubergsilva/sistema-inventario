"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { salvarUsuario } from "../../actions";

type U = { id: number; nome: string; email: string; admin: number; ativo: number; empresas: number[] };

export function FormUsuario({ empresas, usuario }: { empresas: { id: number; nome: string }[]; usuario: U | null }) {
  const [estado, acao, pendente] = useActionState(salvarUsuario, null);
  const [admin, setAdmin] = useState(!!usuario?.admin);
  return (
    <form action={acao}>
      {estado?.erro && <div className="erro">{estado.erro}</div>}
      <input type="hidden" name="id" value={usuario?.id ?? ""} />
      <div className="form-grade" style={{ marginBottom: 14 }}>
        <label className="campo">Nome<input name="nome" defaultValue={usuario?.nome} required /></label>
        <label className="campo">E-mail<input name="email" type="email" defaultValue={usuario?.email} required /></label>
        <label className="campo">{usuario ? "Nova senha (deixe em branco para manter)" : "Senha inicial (mín. 8)"}
          <input name="senha" type="password" minLength={8} required={!usuario} />
        </label>
      </div>
      <div className="checks" style={{ marginBottom: 14 }}>
        <label><input type="checkbox" name="admin" checked={admin} onChange={(e) => setAdmin(e.target.checked)} /> Administrador</label>
        <label><input type="checkbox" name="ativo" defaultChecked={usuario ? !!usuario.ativo : true} /> Ativo</label>
      </div>
      <div className="campo" style={{ marginBottom: 6 }}>Empresas que pode acessar {admin && "(administradores acessam todas)"}</div>
      <div className="checks" style={{ marginBottom: 16, opacity: admin ? 0.5 : 1 }}>
        {empresas.map((e) => (
          <label key={e.id}><input type="checkbox" name="empresas" value={e.id} defaultChecked={usuario?.empresas.includes(e.id)} disabled={admin} /> {e.nome}</label>
        ))}
        {!empresas.length && <span className="muted">Cadastre empresas primeiro.</span>}
      </div>
      <div className="acoes">
        <button disabled={pendente}>Salvar</button>
        <Link href="/admin/usuarios" className="botao sec">Cancelar</Link>
      </div>
    </form>
  );
}
