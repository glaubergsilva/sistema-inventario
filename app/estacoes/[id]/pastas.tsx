import { bytes, dataHora, numero } from "@/lib/formato";

/** Lista as pastas de perfil coletadas (Área de trabalho ou Documentos) em forma de árvore. */
export function ListaPastas({ pastas, nome }: { pastas: any[]; nome: string }) {
  if (!pastas.length) return <div className="cartao muted">Nenhuma pasta "{nome}" encontrada nesta estação.</div>;
  return (
    <>
      {pastas.map((d, i) => (
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
          {d.tempo_esgotado
            ? <div className="aviso">A varredura foi interrompida pelo limite de tempo (pasta muito grande): lista e totais são parciais.</div>
            : d.truncado && <div className="aviso">A lista foi limitada; os totais consideram todos os arquivos.</div>}
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
          ) : !d.redirecionada && <p className="muted">Pasta vazia.</p>}
        </div>
      ))}
    </>
  );
}
