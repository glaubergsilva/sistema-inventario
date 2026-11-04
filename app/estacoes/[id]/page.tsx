import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { first } from "@/lib/db";
import { escopoEmpresas, type EstacaoResumo } from "@/lib/consultas";
import { bytes, data, dataHora, numero } from "@/lib/formato";
import { BarraUso, SeloColeta } from "../../componentes";
import { excluirEstacao, moverEstacao, salvarObservacoes } from "../../actions";
import { ListaProgramas } from "./programas";

export const dynamic = "force-dynamic";

const json = (s: string | null | undefined, padrao: any = []) => { try { return s ? JSON.parse(s) ?? padrao : padrao; } catch { return padrao; } };

export default async function Estacao({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string }>;
}) {
  const { id } = await params;
  const { aba = "resumo" } = await searchParams;
  const u = await exigirUsuario();
  const { empresas, ids } = await escopoEmpresas(u);

  const s = await first<EstacaoResumo>(
    "SELECT s.*, e.nome AS empresa FROM estacoes s JOIN empresas e ON e.id = s.empresa_id WHERE s.id = ?", [Number(id)]);
  if (!s || !ids.includes(s.empresa_id)) notFound();
  const det = await first<Record<string, string>>("SELECT * FROM estacao_detalhes WHERE estacao_id = ?", [s.id]);
  const hw = json(det?.hardware_json, {});
  const discos: any[] = json(det?.discos_json);
  const rede: any[] = json(det?.rede_json);
  const programas: any[] = json(det?.programas_json);
  const desktop: any[] = json(det?.desktop_json);
  const erros: string[] = json(det?.erros_json);

  const abas = [["resumo", "Resumo"], ["programas", `Programas (${programas.length})`], ["area-de-trabalho", `Área de trabalho (${numero(s.desktop_arquivos)})`]];

  return (
    <>
      <p className="muted" style={{ margin: 0 }}><Link href="/estacoes">← Estações</Link></p>
      <h1>{s.hostname}</h1>
      <p className="sub">{s.empresa} · {s.usuario_logado || "nenhum usuário logado"} · última coleta {dataHora(s.ultima_coleta)} <SeloColeta quando={s.ultima_coleta} /></p>

      <nav className="abas">
        {abas.map(([k, t]) => <Link key={k} href={`?aba=${k}`} className={aba === k ? "ativa" : ""}>{t}</Link>)}
      </nav>

      {aba === "resumo" && (
        <>
          {erros.length > 0 && <div className="aviso">Avisos da coleta: {erros.join("; ")}</div>}
          <div className="colunas">
            <div className="cartao">
              <h2>Equipamento</h2>
              <dl className="chave-valor">
                <dt>Fabricante / modelo</dt><dd>{[s.fabricante, s.modelo].filter(Boolean).join(" ") || "—"}</dd>
                <dt>Nº de série</dt><dd>{s.numero_serie || "—"}</dd>
                <dt>BIOS</dt><dd>{hw.bios || "—"}</dd>
                <dt>Processador</dt><dd>{s.cpu || "—"}{hw.cpu_nucleos ? ` (${hw.cpu_nucleos} núcleos / ${hw.cpu_threads} threads)` : ""}</dd>
                <dt>Memória</dt><dd>{bytes(s.memoria_bytes)}</dd>
                <dt>Vídeo</dt><dd>{(hw.video ?? []).join(", ") || "—"}</dd>
              </dl>
            </div>
            <div className="cartao">
              <h2>Sistema</h2>
              <dl className="chave-valor">
                <dt>Sistema operacional</dt><dd>{s.so_nome || "—"}</dd>
                <dt>Versão</dt><dd>{s.so_versao || "—"} {hw.so?.arquitetura ? `· ${hw.so.arquitetura}` : ""}</dd>
                <dt>Instalado em</dt><dd>{data(hw.so?.data_instalacao)}</dd>
                <dt>Último boot</dt><dd>{dataHora(hw.so?.ultimo_boot)}</dd>
                <dt>Domínio</dt><dd>{s.dominio || "—"}</dd>
                <dt>Agente</dt><dd>v{s.versao_agente} · registrado em {data(s.primeira_coleta)}</dd>
              </dl>
            </div>
          </div>

          <div className="cartao">
            <h2>Discos</h2>
            <table>
              <thead><tr><th>Unidade</th><th>Rótulo</th><th>Sistema</th><th className="num">Tamanho</th><th className="num">Livre</th><th style={{ width: 220 }}>Uso</th></tr></thead>
              <tbody>{discos.map((d, i) => (
                <tr key={i}><td><b>{d.unidade}</b></td><td>{d.rotulo || "—"}</td><td>{d.sistema_arquivos}</td><td className="num">{bytes(d.tamanho_bytes)}</td><td className="num">{bytes(d.livre_bytes)}</td><td><BarraUso total={d.tamanho_bytes} livre={d.livre_bytes} /></td></tr>
              ))}</tbody>
            </table>
            {(hw.discos_fisicos ?? []).length > 0 && (
              <>
                <h2 style={{ marginTop: 16 }}>Discos físicos</h2>
                <table>
                  <thead><tr><th>Modelo</th><th>Tipo</th><th className="num">Tamanho</th><th>Nº de série</th></tr></thead>
                  <tbody>{hw.discos_fisicos.map((d: any, i: number) => (
                    <tr key={i}><td>{d.modelo}</td><td>{d.tipo}</td><td className="num">{bytes(d.tamanho_bytes)}</td><td>{d.numero_serie || "—"}</td></tr>
                  ))}</tbody>
                </table>
              </>
            )}
          </div>

          <div className="colunas">
            <div className="cartao">
              <h2>Memória ({(hw.modulos_memoria ?? []).length} módulo(s))</h2>
              <table>
                <thead><tr><th>Slot</th><th className="num">Capacidade</th><th className="num">Velocidade</th><th>Fabricante</th></tr></thead>
                <tbody>{(hw.modulos_memoria ?? []).map((m: any, i: number) => (
                  <tr key={i}><td>{m.slot}</td><td className="num">{bytes(m.bytes)}</td><td className="num">{m.velocidade_mhz ? `${m.velocidade_mhz} MHz` : "—"}</td><td>{m.fabricante || "—"}</td></tr>
                ))}</tbody>
              </table>
            </div>
            <div className="cartao">
              <h2>Rede</h2>
              <table>
                <thead><tr><th>Adaptador</th><th>MAC</th><th>IP</th></tr></thead>
                <tbody>{rede.map((r, i) => (
                  <tr key={i}><td>{r.descricao}</td><td><code>{r.mac}</code></td><td>{(r.ips ?? []).join(", ")}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>

          <div className="colunas">
            <div className="cartao">
              <h2>Observações</h2>
              <form action={salvarObservacoes}>
                <input type="hidden" name="id" value={s.id} />
                <textarea name="observacoes" defaultValue={s.observacoes ?? ""} placeholder="Patrimônio, localização, anotações..." />
                <div style={{ marginTop: 8 }}><button>Salvar</button></div>
              </form>
            </div>
            {!!u.admin && (
              <div className="cartao">
                <h2>Administração</h2>
                <form action={moverEstacao} className="acoes" style={{ marginBottom: 14 }}>
                  <input type="hidden" name="id" value={s.id} />
                  <select name="empresa_id" defaultValue={s.empresa_id}>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select>
                  <button className="sec">Mover para empresa</button>
                </form>
                <p className="muted" style={{ fontSize: 12 }}>Obs.: na próxima coleta a estação volta para a empresa do token instalado nela.</p>
                <form action={excluirEstacao}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="perigo">Excluir estação do inventário</button>
                </form>
              </div>
            )}
          </div>
        </>
      )}

      {aba === "programas" && <ListaProgramas programas={programas} />}

      {aba === "area-de-trabalho" && (
        <>
          {desktop.length === 0 && <div className="cartao muted">Nenhuma área de trabalho encontrada nesta estação.</div>}
          {desktop.map((d, i) => (
            <div className="cartao" key={i}>
              <div className="acoes" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <h2 style={{ margin: 0 }}>{d.usuario}</h2>
                  <div className="muted"><code>{d.caminho}</code></div>
                </div>
                <div className="acoes">
                  {d.redirecionada
                    ? <span className="selo ok">Redirecionada para a rede</span>
                    : <>
                        <span className="selo neutro">{numero(d.total_arquivos)} arquivos</span>
                        <span className="selo neutro">{numero(d.total_pastas)} pastas</span>
                        <span className="selo neutro">{bytes(d.total_bytes)}</span>
                      </>}
                </div>
              </div>
              {d.truncado && <div className="aviso">A lista foi limitada; os totais consideram todos os arquivos.</div>}
              {(d.itens ?? []).length > 0 ? (
                <table className="arvore">
                  <thead><tr><th>Nome</th><th className="num">Tamanho</th><th>Modificado em</th></tr></thead>
                  <tbody>{d.itens.map((it: any, j: number) => {
                    const partes = String(it.caminho).split("/");
                    return (
                      <tr key={j}>
                        <td style={{ paddingLeft: 10 + (partes.length - 1) * 22 }}>
                          <span className="ico">{it.pasta ? "📁" : "📄"}</span>{partes[partes.length - 1]}
                          {it.pasta && <span className="muted"> · {numero(it.arquivos)} arquivo(s)</span>}
                        </td>
                        <td className="num">{bytes(it.bytes)}</td>
                        <td>{dataHora(it.modificado_em)}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              ) : !d.redirecionada && <p className="muted">Área de trabalho vazia.</p>}
            </div>
          ))}
        </>
      )}
    </>
  );
}
