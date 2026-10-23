import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to export analytics.");
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
  `loqelo-analytics-${timestamp}.csv`,
);

try {
  await client.connect();
  const { rows } = await client.query(`
    SELECT
      to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
      country_code,
      COUNT(DISTINCT anonymous_id) FILTER (WHERE event_type = 'page_view')::int AS unique_visitors,
      COUNT(*) FILTER (
        WHERE event_type = 'waitlist_signup' AND audience = 'customer'
      )::int AS customer_signups,
      COUNT(*) FILTER (
        WHERE event_type = 'waitlist_signup' AND audience = 'provider'
      )::int AS provider_signups,
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE event_type = 'waitlist_signup')
        / NULLIF(COUNT(DISTINCT anonymous_id) FILTER (WHERE event_type = 'page_view'), 0),
        2
      ) AS conversion_percent
    FROM analytics_events
    GROUP BY 1, 2
    ORDER BY 1 DESC, 2 ASC
  `);

  const columns = [
    "day",
    "country_code",
    "unique_visitors",
    "customer_signups",
    "provider_signups",
    "conversion_percent",
  ];
  const content = [
    columns.map(csvCell).join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ].join("\r\n");

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${content}\r\n`, { mode: 0o600 });
  process.stdout.write(`Exported ${rows.length} daily country groups to ${outputPath}\n`);
} finally {
  await client.end();
}
