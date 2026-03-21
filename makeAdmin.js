const Database = require("better-sqlite3");

const db = new Database("data.sqlite");

const email = "raquel@sacraluna.com";

db.prepare(`
  UPDATE users
  SET role = 'admin'
  WHERE email = ?
`).run(email);

console.log("✔️ Utilizador atualizado para admin");