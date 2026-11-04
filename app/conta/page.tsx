import { exigirUsuario, empresasPermitidas } from "@/lib/auth";
import { FormSenha } from "./form";

export const dynamic = "force-dynamic";

export default async function Conta() {
  const u = await exigirUsuario();
  const empresas = await empresasPermitidas(u);
  return (
    <>
      <h1>Minha conta</h1>
      <p className="sub">{u.nome} · {u.email} {u.admin ? "· Administrador" : ""}</p>
      <div className="colunas">
        <div className="cartao">
          <h2>Empresas com acesso</h2>
          {empresas.length ? <ul>{empresas.map((e) => <li key={e.id}>{e.nome}</li>)}</ul> : <p className="muted">Nenhuma empresa liberada.</p>}
        </div>
        <div className="cartao">
          <h2>Trocar senha</h2>
          <FormSenha />
        </div>
      </div>
    </>
  );
}
