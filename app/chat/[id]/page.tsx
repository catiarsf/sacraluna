<div style={styles.chatBox}>
        {msgs.length === 0 ? (
          <div style={styles.emptyBox}>
            Ainda não existem mensagens.
          </div>
        ) : (
          msgs.map((m, i) => {
            const mine =
              m.senderRole === role;

            return (
              <div
                key={`${m.at}-${i}`}
                style={{
                  ...styles.msgRow,
                  justifyContent:
                    mine
                      ? "flex-end"
                      : "flex-start",
                }}
              >
                <div
                  style={{
                    ...styles.msgBubble,
                    ...(mine
                      ? styles.msgMine
                      : styles.msgOther),
                  }}
                >
                  <div
                    style={
                      styles.msgRole
                    }
                  >
                    {m.senderRole ===
                    "consultor"
                      ? "Consultor"
                      : "Cliente"}
                  </div>

                  <div
                    style={
                      styles.msgText
                    }
                  >
                    {m.text}
                  </div>

                  <div
                    style={
                      styles.msgTime
                    }
                  >
                    {new Date(
                      m.at
                    ).toLocaleTimeString(
                      "pt-PT",
                      {
                        hour: "2-digit",
                        minute:
                          "2-digit",
                      }
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={bottomRef} />
      </div>

      <div style={styles.inputBar}>
        <input
          value={text}
          onChange={(e) =>
            setText(
              e.target.value
            )
          }
          onKeyDown={(e) => {
            if (
              e.key === "Enter"
            ) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Escreve a tua mensagem..."
          style={styles.input}
        />

        <button
          onClick={send}
          style={styles.sendBtn}
        >
          Enviar
        </button>
      </div>
    </main>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(to bottom, #050816, #0b1026)",
    color: "white",
    padding: 20,
    display: "flex",
    flexDirection: "column",
  },

  topBar: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 12,
    marginBottom: 18,
    flexWrap: "wrap",
  },

  navBtn: {
    border: "none",
    borderRadius: 12,
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: 800,
    background:
      "rgba(255,255,255,0.12)",
    color: "white",
  },

  endBtn: {
    border: "none",
    borderRadius: 12,
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: 900,
    background:
      "linear-gradient(135deg,#ff4d6d,#b00020)",
    color: "white",
  },

  h1: {
    fontSize: 34,
    fontWeight: 900,
    marginBottom: 18,
  },

  infoCard: {
    background:
      "rgba(255,255,255,0.06)",
    border:
      "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    backdropFilter: "blur(10px)",
  },

  infoRow: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 12,
    marginBottom: 10,
    flexWrap: "wrap",
  },

  infoLabel: {
    opacity: 0.8,
    fontWeight: 700,
  },

  infoValue: {
    fontWeight: 900,
    color: "#f4d78b",
  },

  chatBox: {
    flex: 1,
    overflowY: "auto",
    padding: 14,
    borderRadius: 20,
    background:
      "rgba(0,0,0,0.25)",
    border:
      "1px solid rgba(255,255,255,0.08)",
  },

  emptyBox: {
    opacity: 0.7,
    textAlign: "center",
    marginTop: 40,
  },

  msgRow: {
    display: "flex",
    marginBottom: 14,
  },

  msgBubble: {
    maxWidth: "78%",
    borderRadius: 18,
    padding: 14,
  },

  msgMine: {
    background:
      "linear-gradient(135deg,#d4af37,#f4d78b)",
    color: "#111",
  },

  msgOther: {
    background:
      "rgba(255,255,255,0.1)",
    color: "white",
  },

  msgRole: {
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 6,
    opacity: 0.8,
    textTransform:
      "uppercase",
  },

  msgText: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    lineHeight: 1.45,
  },

  msgTime: {
    marginTop: 8,
    fontSize: 11,
    opacity: 0.7,
    textAlign: "right",
  },

  inputBar: {
    marginTop: 16,
    display: "flex",
    gap: 10,
  },

  input: {
    flex: 1,
    borderRadius: 14,
    border:
      "1px solid rgba(255,255,255,0.1)",
    background:
      "rgba(255,255,255,0.08)",
    color: "white",
    padding: "14px 16px",
    outline: "none",
    fontSize: 15,
  },

  sendBtn: {
    border: "none",
    borderRadius: 14,
    padding: "0 20px",
    cursor: "pointer",
    fontWeight: 900,
    background:
      "linear-gradient(135deg,#d4af37,#f4d78b)",
    color: "#111",
  },

  card: {
    background:
      "rgba(255,255,255,0.06)",
    padding: 24,
    borderRadius: 20,
  },

  errBox: {
    background:
      "rgba(255,0,0,0.12)",
    border:
      "1px solid rgba(255,0,0,0.25)",
    padding: 20,
    borderRadius: 16,
    color: "#ffb3b3",
    fontWeight: 700,
  },
};