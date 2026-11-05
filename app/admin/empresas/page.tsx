import { urlPortal } from "@/lib/url";
import { AGENTE_VERSAO } from "@/lib/versao";
import { exigirAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { data, numero } from "@/lib/formato";
import { excluirEmpresa, regenerarToken, salvarEmpresa } from "../../actions";

export const dynamic = "force-dynamic";

function comandoInstalacao(url: string, token: string) {
  return [
    `[Net.ServicePointManager]::SecurityProtocol = 'Tls12'`,
    `$f = "$env:TEMP\\agente-inventario.exe"`,
    `Invoke-WebRequest '${url}/downloads/agente-inventario.exe' -OutFile $f -UseBasicParsing`,
    `& $f instalar -servidor '${url}' -token '${token}'`,
  ].join("\n");
}

export default async function Empresas() {
  await exigirAdmin();
  const url = await urlPortal();
  const empresas = await query<{ id: number; nome: string; cnpj: string | null; token: string; ativo: number; criado_em: string; estacoes: number; usuarios: number }>(
    `SELECT e.*, (SELECT COUNT(*) FROM estacoes s WHERE s.empresa_id = e.id) AS estacoes,
            (SELECT COUNT(*) FROM usuario_empresas ue WHERE ue.empresa_id = e.id) AS usuarios
     FROM empresas e ORDER BY e.nome`);

  return (
    <>
      <h1>Empresas</h1>
      <p className="sub">Cada empresa tem um token de instalação. Os computadores que instalarem o agente com esse token ficam vinculados a ela.</p>

      <div className="cartao">
        <h2>Nova empresa</h2>
        <form action={salvarEmpresa} className="filtros" style={{ marginBottom: 0 }}>
          <label>Nome<input name="nome" required style={{ width: 260 }} /></label>
          <label>CNPJ<input name="cnpj" style={{ width: 180 }} /></label>
          <button>Cadastrar</button>
        </form>
      </div>

      {empresas.map((e) => (
        <div className="cartao" key={e.id}>
          <form action={salvarEmpresa} className="filtros">
            <input type="hidden" name="id" value={e.id} />
            <label>Nome<input name="nome" defaultValue={e.nome} required style={{ width: 260 }} /></label>
            <label>CNPJ<input name="cnpj" defaultValue={e.cnpj ?? ""} style={{ width: 180 }} /></label>
            <label style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingBottom: 8 }}>
              <input type="checkbox" name="ativo" defaultChecked={!!e.ativo} /> Ativa
            </label>
            <button className="sec">Salvar</button>
            <span className="muted" style={{ paddingBottom: 8 }}>{numero(e.estacoes)} estação(ões) · {numero(e.usuarios)} usuário(s) · desde {data(e.criado_em)}</span>
          </form>

          <details>
            <summary>Token e comando de instalação do agente</summary>
            <div style={{ marginTop: 10 }}>
              <div className="acoes" style={{ marginBottom: 14 }}>
                <a className="botao" href={`/api/empresas/${e.id}/instalador`}>Baixar instalar-agente.bat ({e.nome})</a>
                <a className="botao sec" href="/downloads/agente-inventario.exe" download>Baixar agente {AGENTE_VERSAO} (.exe)</a>
                <span className="muted" style={{ fontSize: 12 }}>Coloque os dois na mesma pasta da estação e execute o .bat como administrador.</span>
              </div>
              <div className="campo" style={{ marginBottom: 10 }}>Token<code style={{ fontSize: 13 }}>{e.token}</code></div>
              <div className="campo">Execute no PowerShell como Administrador na estação:</div>
              <pre>{comandoInstalacao(url, e.token)}</pre>
              <div className="campo" style={{ marginTop: 6 }}>Ou, com o executável em mãos (ex.: via GPO/pasta de rede):</div>
              <pre>{`agente-inventario.exe instalar -servidor ${url} -token ${e.token}`}</pre>
              <div className="acoes" style={{ marginTop: 10 }}>
                <form action={regenerarToken}><input type="hidden" name="id" value={e.id} /><button className="sec">Gerar novo token</button></form>
                <span className="muted" style={{ fontSize: 12 }}>Ao gerar um novo token, as estações já instaladas deixam de enviar dados até serem reinstaladas.</span>
              </div>
            </div>
          </details>

          {e.estacoes === 0 && (
            <form action={excluirEmpresa} style={{ marginTop: 10 }}>
              <input type="hidden" name="id" value={e.id} />
              <button className="perigo">Excluir empresa</button>
            </form>
          )}
        </div>
      ))}
    </>
  );
}
