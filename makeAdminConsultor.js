const Database = require("better-sqlite3");

const db = new Database("data.sqlite");

const email = "tarotemagia8@gmail.com";

const result = db.prepare(`
  UPDATE consultores
  SET role = 'admin'
  WHERE lower(email) = lower(?)
`).run(email);

console.log("linhas alteradas:", result.changes);

const row = db.prepare(`
  SELECT id, nome, email, role
  FROM consultores
  WHERE lower(email) = lower(?)
`).get(email);

console.log(row);