import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to export the waitlist.");
}

function csvCell(value) {
  const text = value == null ? "" : value instanceof Date ? value.toISOString() : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

const client = new Client({ connectionString });
const timestamp = new Date().toISOString().replaceAll(":", "").replace(/\.\d+Z$/, "Z");
const outputPath = resolve(
  process.cwd(),
  "../generated-artifacts",
  `loqelo-waitlist-${timestamp}.csv`,
);

try {
  await client.connect();
  const { rows } = await client.query(`
    SELECT email, audience, country_code, account_type, locale,
           consented_at, consent_version, created_at
    FROM waitlist_signups
    ORDER BY created_at DESC
  `);

  const columns = [
    "email",
    "audience",
    "country_code",
    "account_type",
    "locale",
    "consented_at",
    "consent_version",
    "created_at",
  ];
  const content = [
    columns.map(csvCell).join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ].join("\r\n");

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${content}\r\n`, { mode: 0o600 });
  process.stdout.write(`Exported ${rows.length} contacts to ${outputPath}\n`);
} finally {
  await client.end();
}
