import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { escopoEmpresas, listarEstacoes } from "@/lib/consultas";
import { bytes, diasDesde, numero } from "@/lib/formato";
import { SeloColeta } from "./componentes";
import { AGENTE_VERSAO } from "@/lib/versao";

export const dynamic = "force-dynamic";

export default async function Painel() {
  const u = await exigirUsuario();
  const { empresas, ids } = await escopoEmpresas(u);
  const estacoes = await listarEstacoes(ids);

  if (!empresas.length) {
    return (
      <div className="cartao">
        <h1>Bem-vindo</h1>
        <p>{u.admin ? <>Comece <Link href="/admin/empresas">cadastrando uma empresa</Link> para gerar o token de instalação do agente.</> : "Nenhuma empresa foi liberada para o seu usuário. Fale com o administrador."}</p>
      </div>
    );
  }

  const porEmpresa = empresas.map((e) => {
    const lista = estacoes.filter((s) => s.empresa_id === e.id);
    return {
      ...e,
      total: lista.length,
      desatualizadas: lista.filter((s) => diasDesde(s.ultima_coleta) > 7).length,
      discoCritico: lista.filter((s) => s.disco_total_bytes && (s.disco_livre_bytes / s.disco_total_bytes) < 0.1).length,
      desktopArq: lista.reduce((a, s) => a + (s.desktop_arquivos || 0), 0),
      desktopBytes: lista.reduce((a, s) => a + (s.desktop_bytes || 0), 0),
      docsArq: lista.reduce((a, s) => a + (s.documentos_arquivos || 0), 0),
      docsBytes: lista.reduce((a, s) => a + (s.documentos_bytes || 0), 0),
    };
  });
  const topDesktop = [...estacoes].sort((a, b) => (b.desktop_arquivos || 0) - (a.desktop_arquivos || 0)).filter((s) => s.desktop_arquivos > 0).slice(0, 10);
  const semColeta = estacoes.filter((s) => diasDesde(s.ultima_coleta) > 7).sort((a, b) => a.ultima_coleta.localeCompare(b.ultima_coleta)).slice(0, 10);

  return (
    <>
      <div className="acoes" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>Painel</h1>
          <p className="sub">{numero(estacoes.length)} estações em {empresas.length} empresa(s)</p>
        </div>
        <div className="cartao" style={{ padding: "12px 16px", marginBottom: 18 }}>
          <div className="rot muted" style={{ fontSize: 12, marginBottom: 8 }}>AGENTE DE INVENTÁRIO · versão {AGENTE_VERSAO}</div>
          <div className="acoes">
            <a className="botao" href="/downloads/agente-inventario.exe" download>Baixar agente (.exe)</a>
            <a className="botao sec" href="/downloads/coletar-agora.bat" download>coletar-agora.bat</a>
            {!!u.admin && <a className="botao sec" href="/admin/empresas">Instaladores por empresa</a>}
          </div>
        </div>
      </div>

      <div className="tabela">
        <table>
          <thead><tr><th>Empresa</th><th className="num">Estações</th><th className="num">Sem coleta &gt; 7 dias</th><th className="num">Disco &gt; 90%</th><th className="num">Área de trabalho</th><th className="num">Documentos</th></tr></thead>
          <tbody>
            {porEmpresa.map((e) => (
              <tr key={e.id}>
                <td><Link href={`/estacoes?empresa=${e.id}`}>{e.nome}</Link> {!e.ativo && <span className="selo neutro">inativa</span>}</td>
                <td className="num">{numero(e.total)}</td>
                <td className="num">{e.desatualizadas ? <span className="selo alerta">{e.desatualizadas}</span> : 0}</td>
                <td className="num">{e.discoCritico ? <span className="selo perigo">{e.discoCritico}</span> : 0}</td>
                <td className="num"><Link href={`/relatorios/area-de-trabalho?empresa=${e.id}`}>{numero(e.desktopArq)} arq.</Link> · {bytes(e.desktopBytes)}</td>
                <td className="num"><Link href={`/relatorios/area-de-trabalho?pasta=documentos&empresa=${e.id}`}>{numero(e.docsArq)} arq.</Link> · {bytes(e.docsBytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="colunas">
        <div className="cartao">
          <h2>Mais arquivos na área de trabalho</h2>
          {topDesktop.length ? (
            <table>
              <thead><tr><th>Estação</th><th>Usuário</th><th className="num">Arquivos</th><th className="num">Volume</th></tr></thead>
              <tbody>{topDesktop.map((s) => (
                <tr key={s.id}><td><Link href={`/estacoes/${s.id}?aba=area-de-trabalho`}>{s.hostname}</Link><div className="muted">{s.empresa}</div></td><td>{s.usuario_logado || "—"}</td><td className="num">{numero(s.desktop_arquivos)}</td><td className="num">{bytes(s.desktop_bytes)}</td></tr>
              ))}</tbody>
            </table>
          ) : <p className="muted">Nenhum arquivo encontrado nas áreas de trabalho.</p>}
        </div>
        <div className="cartao">
          <h2>Sem coleta há mais de 7 dias</h2>
          {semColeta.length ? (
            <table>
              <thead><tr><th>Estação</th><th>Empresa</th><th>Última coleta</th></tr></thead>
              <tbody>{semColeta.map((s) => (
                <tr key={s.id}><td><Link href={`/estacoes/${s.id}`}>{s.hostname}</Link></td><td>{s.empresa}</td><td><SeloColeta quando={s.ultima_coleta} /></td></tr>
              ))}</tbody>
            </table>
          ) : <p className="muted">Todas as estações estão reportando normalmente.</p>}
        </div>
      </div>
    </>
  );
}
