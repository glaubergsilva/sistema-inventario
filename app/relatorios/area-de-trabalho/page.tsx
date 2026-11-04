import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { escopoEmpresas } from "@/lib/consultas";
import { relatorioAreaTrabalho } from "@/lib/relatorio";
import { bytes, dataHora, numero } from "@/lib/formato";
import { FiltroEmpresa } from "../../componentes";

export const dynamic = "force-dynamic";

const LIMITE_TELA = 500;

export default async function RelatorioAreaTrabalho({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const u = await exigirUsuario();
  const { empresas, ids } = await escopoEmpresas(u, sp.empresa);
  const { resumo, arquivos } = await relatorioAreaTrabalho({ ids, ext: sp.ext, dias: sp.dias, minMb: sp.min_mb, q: sp.q });

  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();
  const totalBytes = arquivos.reduce((a, x) => a + x.bytes, 0);
  const usuariosComArquivos = resumo.filter((r) => r.encontrados > 0).length;
  const redirecionadas = resumo.filter((r) => r.redirecionada).length;

  return (
    <>
      <h1>Arquivos na área de trabalho</h1>
      <p className="sub">Arquivos salvos localmente na área de trabalho dos usuários, em vez da rede. Atalhos (.lnk/.url) são ignorados; apenas nome, tamanho e data são coletados.</p>

      <form className="filtros">
        <FiltroEmpresa empresas={empresas} valor={sp.empresa} />
        <label>Extensões<input name="ext" defaultValue={sp.ext} placeholder="xlsx, docx, pdf" style={{ width: 150 }} /></label>
        <label>Modificados nos últimos
          <select name="dias" defaultValue={sp.dias || ""}>
            <option value="">qualquer data</option><option value="1">1 dia</option><option value="7">7 dias</option>
            <option value="30">30 dias</option><option value="90">90 dias</option><option value="365">1 ano</option>
          </select>
        </label>
        <label>Tamanho mínimo (MB)<input name="min_mb" type="number" min="0" step="1" defaultValue={sp.min_mb} style={{ width: 110 }} /></label>
        <label>Nome contém<input name="q" defaultValue={sp.q} style={{ width: 160 }} /></label>
        <button>Filtrar</button>
        <a className="botao sec" href={`/api/relatorios/area-de-trabalho?${qs}`}>Exportar CSV (Excel)</a>
      </form>

      <div className="grade">
        <div className="indicador"><div className="rot">Arquivos encontrados</div><div className="val">{numero(arquivos.length)}</div><div className="det">{bytes(totalBytes)}</div></div>
        <div className="indicador"><div className="rot">Usuários com arquivos</div><div className="val">{numero(usuariosComArquivos)}</div><div className="det">de {numero(resumo.length)} perfis com conteúdo</div></div>
        <div className="indicador"><div className="rot">Áreas redirecionadas p/ rede</div><div className="val">{numero(redirecionadas)}</div><div className="det">via GPO (conforme)</div></div>
      </div>

      <h2>Por usuário</h2>
      <div className="tabela">
        <table>
          <thead><tr><th>Estação</th><th>Usuário</th><th>Empresa</th><th className="num">Arquivos (filtro)</th><th className="num">Volume (filtro)</th><th className="num">Total na área de trabalho</th><th>Modificação mais recente</th></tr></thead>
          <tbody>
            {resumo.map((r, i) => (
              <tr key={i}>
                <td><Link href={`/estacoes/${r.estacao_id}?aba=area-de-trabalho`}>{r.hostname}</Link></td>
                <td>{r.usuario}</td>
                <td>{r.empresa}</td>
                <td className="num">{r.redirecionada ? <span className="selo ok">na rede</span> : numero(r.encontrados)}</td>
                <td className="num">{bytes(r.bytesEncontrados)}</td>
                <td className="num">{numero(r.totalArquivos)} · {bytes(r.totalBytes)}</td>
                <td>{dataHora(r.maisRecente)}</td>
              </tr>
            ))}
            {!resumo.length && <tr><td colSpan={7} className="muted">Nenhum dado.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2>Arquivos {arquivos.length > LIMITE_TELA && <span className="muted">(mostrando os {LIMITE_TELA} mais recentes — exporte o CSV para ver todos)</span>}</h2>
      <div className="tabela">
        <table>
          <thead><tr><th>Arquivo</th><th>Estação / usuário</th><th className="num">Tamanho</th><th>Modificado em</th></tr></thead>
          <tbody>
            {arquivos.slice(0, LIMITE_TELA).map((a, i) => (
              <tr key={i}>
                <td>{a.caminho}</td>
                <td><Link href={`/estacoes/${a.estacao_id}?aba=area-de-trabalho`}>{a.hostname}</Link> · {a.usuario}</td>
                <td className="num">{bytes(a.bytes)}</td>
                <td>{dataHora(a.modificado_em)}</td>
              </tr>
            ))}
            {!arquivos.length && <tr><td colSpan={4} className="muted">Nenhum arquivo com esses filtros.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>A lista detalhada inclui até 3 níveis de subpastas; os totais consideram todo o conteúdo.</p>
    </>
  );
}
