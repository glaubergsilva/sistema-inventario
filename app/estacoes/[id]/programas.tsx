"use client";

import { useState } from "react";

type Programa = { nome: string; versao: string; editor: string; data_instalacao: string };

export function ListaProgramas({ programas }: { programas: Programa[] }) {
  const [q, setQ] = useState("");
  const t = q.toLowerCase();
  const lista = t ? programas.filter((p) => `${p.nome} ${p.editor} ${p.versao}`.toLowerCase().includes(t)) : programas;
  return (
    <>
      <div className="filtros">
        <label>Filtrar programas<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="nome, editor ou versão" style={{ width: 300 }} /></label>
        <span className="muted">{lista.length} de {programas.length}</span>
      </div>
      <div className="tabela">
        <table>
          <thead><tr><th>Programa</th><th>Versão</th><th>Editor</th><th>Instalado em</th></tr></thead>
          <tbody>
            {lista.map((p, i) => (
              <tr key={i}><td>{p.nome}</td><td>{p.versao || "—"}</td><td>{p.editor || "—"}</td><td>{p.data_instalacao ? p.data_instalacao.split("-").reverse().join("/") : "—"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
