/* eslint-disable @typescript-eslint/no-require-imports */
const postgres = require("postgres");

async function main() {
  const connectionString = process.argv[2];
  if (!connectionString) {
    console.error("Connection string kerak");
    process.exit(1);
  }

  const sql = postgres(connectionString, {
    prepare: false,
    connect_timeout: 10,
    max: 1,
  });

  try {
    const rows = await sql.unsafe("select current_user, current_database()");
    process.stdout.write(JSON.stringify(rows));
    await sql.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(message);
    try {
      await sql.end({ timeout: 1 });
    } catch {}
    process.exit(1);
  }
}

main();
