const Database = require("better-sqlite3");

const db = new Database("data.sqlite");

try {
  db.prepare(`
    ALTER TABLE consultores
    ADD COLUMN role TEXT DEFAULT 'consultor'
  `).run();

  console.log("✔ Coluna role adicionada");
} catch (e) {
  console.log("ℹ Talvez já exista:", e.message);
}

const rows = db.prepare(`
  SELECT id, nome, email, role
  FROM consultores
`).all();

console.table(rows);