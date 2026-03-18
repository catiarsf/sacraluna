export default function TermosPage() {
  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <h1 style={styles.h1}>Termos e Condições</h1>

        <p style={styles.p}>
          Bem-vindo ao SacraLuna. Ao utilizar esta plataforma, o utilizador aceita os presentes
          Termos e Condições. Caso não concorde com os mesmos, não deverá utilizar o site nem os
          seus serviços.
        </p>

        <h2 style={styles.h2}>1. Identificação do serviço</h2>
        <p style={styles.p}>
          O SacraLuna é uma plataforma digital de prestação de serviços de consultas espirituais e
          aconselhamento online, disponibilizados por consultores independentes registados na
          plataforma.
        </p>

        <h2 style={styles.h2}>2. Utilização da plataforma</h2>
        <p style={styles.p}>
          O utilizador compromete-se a usar o site de forma lícita, respeitosa e conforme a lei
          aplicável, abstendo-se de utilizar a plataforma para fins abusivos, fraudulentos,
          ofensivos ou contrários à ordem pública.
        </p>

        <h2 style={styles.h2}>3. Registo e conta de utilizador</h2>
        <p style={styles.p}>
          Para aceder a determinadas funcionalidades, pode ser necessário criar conta. O utilizador
          é responsável pela veracidade dos dados fornecidos e pela confidencialidade dos seus dados
          de acesso.
        </p>

        <h2 style={styles.h2}>4. Créditos, pagamentos e consultas</h2>
        <p style={styles.p}>
          A utilização de determinados serviços pode depender do carregamento prévio de saldo na
          carteira digital da plataforma. Os valores aplicáveis são apresentados antes da compra e
          antes do início da consulta.
        </p>
        <p style={styles.p}>
          O débito de saldo ocorre de acordo com o tipo de serviço utilizado e com o valor por
          minuto ou preço indicado no momento da contratação.
        </p>

        <h2 style={styles.h2}>5. Natureza dos serviços</h2>
        <p style={styles.p}>
          Os serviços disponibilizados no SacraLuna têm caráter de aconselhamento pessoal,
          espiritual e de entretenimento. Não substituem aconselhamento médico, psicológico,
          jurídico, financeiro ou qualquer outro aconselhamento técnico ou profissional regulado.
        </p>

        <h2 style={styles.h2}>6. Responsabilidade</h2>
        <p style={styles.p}>
          O SacraLuna envida esforços razoáveis para manter a plataforma disponível e funcional, mas
          não garante funcionamento ininterrupto, livre de erros ou indisponibilidades técnicas.
        </p>
        <p style={styles.p}>
          O utilizador reconhece que as consultas e conteúdos fornecidos pelos consultores são da
          responsabilidade dos respetivos prestadores, dentro dos limites legais aplicáveis.
        </p>

        <h2 style={styles.h2}>7. Suspensão ou encerramento de contas</h2>
        <p style={styles.p}>
          O SacraLuna pode suspender, limitar ou encerrar contas de utilizadores ou consultores em
          caso de violação destes termos, utilização indevida da plataforma, fraude, comportamento
          abusivo ou incumprimento legal.
        </p>

        <h2 style={styles.h2}>8. Livro de Reclamações</h2>
        <p style={styles.p}>
          Nos termos legais aplicáveis, o utilizador pode apresentar reclamação através do Livro de
          Reclamações Eletrónico, disponível em{" "}
          <a
            href="https://www.livroreclamacoes.pt/inicio"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.link}
          >
            www.livroreclamacoes.pt
          </a>
          .
        </p>

        <h2 style={styles.h2}>9. Resolução alternativa de litígios de consumo</h2>
        <p style={styles.p}>
          Em caso de litígio de consumo, o consumidor pode recorrer a uma entidade de Resolução
          Alternativa de Litígios de Consumo. Mais informações disponíveis em{" "}
          <a
            href="https://www.consumidor.gov.pt"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.link}
          >
            www.consumidor.gov.pt
          </a>
          .
        </p>

        <h2 style={styles.h2}>10. Alterações aos termos</h2>
        <p style={styles.p}>
          O SacraLuna pode atualizar estes Termos e Condições sempre que necessário. A versão em
          vigor será sempre a publicada nesta página.
        </p>

        <h2 style={styles.h2}>11. Contacto</h2>
        <p style={styles.p}>
          Para questões relacionadas com o funcionamento do site, o utilizador poderá contactar o
          SacraLuna através dos meios de contacto disponibilizados na plataforma.
        </p>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "24px 16px 40px",
    color: "white",
  },
  wrap: {
    maxWidth: 900,
    margin: "0 auto",
    background: "rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 24,
  },
  h1: {
    fontSize: 34,
    marginBottom: 18,
  },
  h2: {
    fontSize: 22,
    marginTop: 24,
    marginBottom: 10,
    color: "#f4d78b",
  },
  p: {
    lineHeight: 1.7,
    opacity: 0.95,
    margin: "0 0 12px",
  },
  link: {
    color: "#f4d78b",
    fontWeight: 700,
  },
};