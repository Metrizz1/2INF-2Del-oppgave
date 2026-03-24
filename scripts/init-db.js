const fs = require("node:fs/promises");
const path = require("node:path");
const { pool } = require("../lib/db");

async function main() {
  const schemaPath = path.join(__dirname, "..", "sql", "schema.sql");
  const schemaSql = await fs.readFile(schemaPath, "utf8");
  await pool.query(schemaSql);
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
