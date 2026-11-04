import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { excluirUsuario } from "../../actions";
import { FormUsuario } from "./form";

export const dynamic = "force-dynamic";

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ editar?: string; novo?: string }> }) {
  const sp = await searchParams;
  const eu = await exigirAdmin();
  const empresas = await query<{ id: number; nome: string }>("SELECT id, nome FROM empresas ORDER BY nome");
  const usuarios = await query<{ id: number; nome: string; email: string; admin: number; ativo: number }>(
    "SELECT id, nome, email, admin, ativo FROM usuarios ORDER BY nome");
  const vinculos = await query<{ usuario_id: number; empresa_id: number }>("SELECT usuario_id, empresa_id FROM usuario_empresas");
  const empresasDe = (uid: number) => vinculos.filter((v) => v.usuario_id === uid).map((v) => v.empresa_id);

  const editando = sp.editar ? usuarios.find((u) => u.id === Number(sp.editar)) : null;

  return (
    <>
      <h1>Usuários</h1>
      <p className="sub">Defina quais empresas cada usuário pode visualizar. Administradores veem todas e gerenciam o cadastro.</p>

      {(editando || sp.novo) ? (
        <div className="cartao">
          <h2>{editando ? `Editar ${editando.nome}` : "Novo usuário"}</h2>
          <FormUsuario empresas={empresas} usuario={editando ? { ...editando, empresas: empresasDe(editando.id) } : null} />
        </div>
      ) : (
        <p><Link className="botao" href="?novo=1">Novo usuário</Link></p>
      )}

      <div className="tabela">
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Empresas</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td><b>{u.nome}</b></td>
                <td>{u.email}</td>
                <td>{u.admin ? <span className="selo ok">Administrador</span> : <span className="selo neutro">Usuário</span>}</td>
                <td>{u.admin ? <span className="muted">todas</span> : empresas.filter((e) => empresasDe(u.id).includes(e.id)).map((e) => e.nome).join(", ") || <span className="muted">nenhuma</span>}</td>
                <td>{u.ativo ? "Ativo" : <span className="selo perigo">Inativo</span>}</td>
                <td className="acoes">
                  <Link href={`?editar=${u.id}`}>Editar</Link>
                  {u.id !== eu.id && (
                    <form action={excluirUsuario} className="inline"><input type="hidden" name="id" value={u.id} /><button className="link" style={{ color: "var(--perigo)" }}>Excluir</button></form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
