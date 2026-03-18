import "./globals.css";
import Banner from "../components/Banner";
import Navbar from "../components/Navbar";

export const metadata = {
  title: "SacraLuna",
  description: "Consultas espirituais em tempo real",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <Banner />
        <Navbar />

        <main>{children}</main>

        <footer
          style={{
            marginTop: "40px",
            padding: "20px 16px",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            textAlign: "center",
            fontSize: "14px",
            color: "white",
            background: "rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <a
              href="/termos"
              style={{
                color: "#f4d78b",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Termos e Condições
            </a>

            <a
              href="/privacidade"
              style={{
                color: "#f4d78b",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Política de Privacidade
            </a>

            <a
              href="https://www.livroreclamacoes.pt/inicio"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#f4d78b",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Livro de Reclamações
            </a>

            <a
              href="https://www.consumidor.gov.pt"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#f4d78b",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Resolução de Litígios
            </a>
          </div>

          <div
            style={{
              marginTop: "10px",
              opacity: 0.8,
              fontSize: "12px",
            }}
          >
            © {new Date().getFullYear()} SacraLuna
          </div>
        </footer>
      </body>
    </html>
  );
}