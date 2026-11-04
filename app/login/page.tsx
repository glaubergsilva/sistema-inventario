import { redirect } from "next/navigation";
import { first } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";
import { FormLogin, FormPrimeiroAdmin } from "./forms";

export const dynamic = "force-dynamic";

export default async function Login() {
  if (await usuarioAtual()) redirect("/");
  const total = (await first<{ n: number }>("SELECT COUNT(*) AS n FROM usuarios"))?.n ?? 0;
  return (
    <div className="login cartao">
      <h1>Inventário de TI</h1>
      {total === 0 ? (
        <>
          <p className="sub">Primeiro acesso: crie o usuário administrador.</p>
          <FormPrimeiroAdmin />
        </>
      ) : (
        <>
          <p className="sub">Entre com seu e-mail e senha.</p>
          <FormLogin />
        </>
      )}
    </div>
  );
}
