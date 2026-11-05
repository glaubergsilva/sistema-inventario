import { query } from "./db";
import { empresasPermitidas, type Usuario } from "./auth";

export type EstacaoResumo = {
  id: number; empresa_id: number; empresa: string; machine_id: string; hostname: string | null; dominio: string | null;
  usuario_logado: string | null; so_nome: string | null; so_versao: string | null; fabricante: string | null;
  modelo: string | null; numero_serie: string | null; cpu: string | null; memoria_bytes: number;
  disco_total_bytes: number; disco_livre_bytes: number; ip: string | null; programas_qtd: number;
  desktop_arquivos: number; desktop_bytes: number; documentos_arquivos: number | null; documentos_bytes: number | null;
  documentos_coleta: string | null; versao_agente: string | null; primeira_coleta: string;
  ultima_coleta: string; observacoes: string | null;
};

/** IDs de empresa que o usuário pode ver, já filtrados pela empresa escolhida (se houver). */
export async function escopoEmpresas(u: Usuario, empresaFiltro?: string | number | null) {
  const empresas = await empresasPermitidas(u);
  let ids = empresas.map((e) => e.id);
  const f = Number(empresaFiltro || 0);
  if (f) ids = ids.filter((id) => id === f);
  return { empresas, ids };
}

export async function listarEstacoes(ids: number[], busca?: string) {
  if (!ids.length) return [];
  const params: (string | number)[] = [...ids];
  let filtro = "";
  if (busca) {
    filtro = ` AND (s.hostname LIKE ? OR s.usuario_logado LIKE ? OR s.numero_serie LIKE ? OR s.ip LIKE ? OR s.modelo LIKE ?)`;
    const b = `%${busca}%`;
    params.push(b, b, b, b, b);
  }
  return query<EstacaoResumo>(
    `SELECT s.*, e.nome AS empresa FROM estacoes s JOIN empresas e ON e.id = s.empresa_id
     WHERE s.empresa_id IN (${ids.map(() => "?").join(",")})${filtro} ORDER BY s.hostname COLLATE NOCASE`,
    params,
  );
}
