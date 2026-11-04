import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { escopoEmpresas, listarEstacoes } from "@/lib/consultas";
import { bytes, numero } from "@/lib/formato";
import { BarraUso, FiltroEmpresa, SeloColeta } from "../componentes";

export const dynamic = "force-dynamic";

export default async function Estacoes({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const u = await exigirUsuario();
  const { empresas, ids } = await escopoEmpresas(u, sp.empresa);
  const lista = await listarEstacoes(ids, sp.q?.trim());

  return (
    <>
      <h1>Estações</h1>
      <p className="sub">{numero(lista.length)} estação(ões)</p>
      <form className="filtros">
        <FiltroEmpresa empresas={empresas} valor={sp.empresa} />
        <label>Buscar<input name="q" defaultValue={sp.q} placeholder="nome, usuário, nº de série, IP..." style={{ width: 280 }} /></label>
        <button>Filtrar</button>
        {(sp.q || sp.empresa) && <Link href="/estacoes" className="botao sec">Limpar</Link>}
      </form>

      <div className="tabela">
        <table>
          <thead>
            <tr>
              <th>Estação</th><th>Empresa</th><th>Usuário</th><th>Sistema</th><th>Processador</th>
              <th className="num">Memória</th><th style={{ minWidth: 150 }}>Disco</th><th className="num">Área de trabalho</th><th>Última coleta</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((s) => (
              <tr key={s.id}>
                <td><Link href={`/estacoes/${s.id}`}><b>{s.hostname}</b></Link><div className="muted">{[s.fabricante, s.modelo].filter(Boolean).join(" ")}</div></td>
                <td>{s.empresa}</td>
                <td>{s.usuario_logado || <span className="muted">—</span>}</td>
                <td>{s.so_nome?.replace("Microsoft ", "")}</td>
                <td style={{ maxWidth: 220 }}>{s.cpu}</td>
                <td className="num">{bytes(s.memoria_bytes)}</td>
                <td><BarraUso total={s.disco_total_bytes} livre={s.disco_livre_bytes} /><div className="muted" style={{ fontSize: 12 }}>{bytes(s.disco_livre_bytes)} livres de {bytes(s.disco_total_bytes)}</div></td>
                <td className="num">
                  <Link href={`/estacoes/${s.id}?aba=area-de-trabalho`}>{numero(s.desktop_arquivos)} arq.</Link>
                  <div className="muted" style={{ fontSize: 12 }}>{bytes(s.desktop_bytes)}</div>
                </td>
                <td><SeloColeta quando={s.ultima_coleta} /></td>
              </tr>
            ))}
            {!lista.length && <tr><td colSpan={9} className="muted">Nenhuma estação encontrada. Instale o agente nas máquinas usando o token da empresa.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
