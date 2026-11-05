import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import { usuarioAtual } from "@/lib/auth";
import { sair } from "./actions";

export const metadata: Metadata = { title: "Inventário de TI", description: "Portal de inventário das estações" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const u = await usuarioAtual();
  return (
    <html lang="pt-BR">
      <body>
        {u && (
          <header className="topo">
            <div className="topo-in">
              <Link href="/" className="marca">Inventário de TI</Link>
              <nav>
                <Link href="/">Painel</Link>
                <Link href="/estacoes">Estações</Link>
                <Link href="/relatorios/area-de-trabalho">Arquivos locais</Link>
                {!!u.admin && <Link href="/admin/empresas">Empresas</Link>}
                {!!u.admin && <Link href="/admin/usuarios">Usuários</Link>}
              </nav>
              <div className="quem">
                <Link href="/conta">{u.nome}</Link>
                <form action={sair}><button className="link">Sair</button></form>
              </div>
            </div>
          </header>
        )}
        <main className="conteudo">{children}</main>
        <footer className="rodape">criado por Glauber G. Silva</footer>
      </body>
    </html>
  );
}
