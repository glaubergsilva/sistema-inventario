import { diasDesde, dataHora } from "@/lib/formato";

export function SeloColeta({ quando }: { quando: string | null }) {
  const d = diasDesde(quando);
  const cls = d <= 1 ? "ok" : d <= 7 ? "alerta" : "perigo";
  const txt = d === 0 ? "hoje" : d === 1 ? "ontem" : d === Infinity ? "nunca" : `há ${d} dias`;
  return <span className={`selo ${cls}`} title={dataHora(quando)}>{txt}</span>;
}

export function BarraUso({ total, livre }: { total: number; livre: number }) {
  if (!total) return <span className="muted">—</span>;
  const pct = Math.round(((total - livre) / total) * 100);
  const cls = pct >= 90 ? "perigo" : pct >= 75 ? "alerta" : "";
  return (
    <div title={`${pct}% usado`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div className={`barra ${cls}`} style={{ flex: 1 }}><span style={{ width: `${pct}%` }} /></div>
      <span style={{ fontSize: 12, minWidth: 34, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

export function FiltroEmpresa({ empresas, valor }: { empresas: { id: number; nome: string }[]; valor?: string }) {
  return (
    <label>
      Empresa
      <select name="empresa" defaultValue={valor || ""}>
        <option value="">Todas</option>
        {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
      </select>
    </label>
  );
}
