import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="cartao">
      <h1>Não encontrado</h1>
      <p>A página ou estação não existe, ou você não tem acesso a ela. <Link href="/">Voltar ao painel</Link></p>
    </div>
  );
}
