import Link from "next/link";

export default function Page() {
  return (
    <div>

      <h1>Como se consultar</h1>

      <p>
        Na SacraLuna podes falar com consultores espirituais em tempo real
        através de chat ou chamada de voz.
      </p>

      <ol>
        <li>Escolhe um consultor disponível</li>
        <li>Clica em iniciar consulta</li>
        <li>A consulta começa imediatamente</li>
        <li>O valor é cobrado por minuto</li>
      </ol>

      <br />

      <Link href="/">← Voltar ao início</Link>

    </div>
  );
}