const fs = require("node:fs/promises");
const path = require("node:path");
const { pool } = require("./lib/db");

function splitStatements(sql) {
  return sql
    .split(/;\s*$/m)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function main() {
  const schemaPath = path.join(__dirname, "sql", "schema.sql");
  const schemaSql = await fs.readFile(schemaPath, "utf8");
  const statements = splitStatements(schemaSql);

  for (const statement of statements) {
    await pool.execute(statement);
  }

  console.log("Database schema applied.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
