const fs = require('fs');
const path = require('path');
const pool = require('../../config/db');

async function migrate() {
  const client = await pool.connect();

  try {
    /*
     * Keep track of successfully applied migrations.
     */
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const migrationDir = __dirname;

    const files = fs
      .readdirSync(migrationDir)
      .filter(
        (file) =>
          file.endsWith('.sql') &&
          /^\d+_.*\.sql$/.test(file)
      )
      .sort();

    for (const file of files) {
      const existing =
        await client.query(
          `
            SELECT 1
            FROM schema_migrations
            WHERE filename = $1
          `,
          [file]
        );

      if (existing.rowCount > 0) {
        console.log(
          `Skipping migration: ${file}`
        );
        continue;
      }

      const filePath =
        path.join(
          migrationDir,
          file
        );

      const sql =
        fs.readFileSync(
          filePath,
          'utf8'
        );

      console.log(
        `Running migration: ${file}`
      );

      await client.query(
        'BEGIN'
      );

      try {
        await client.query(sql);

        await client.query(
          `
            INSERT INTO schema_migrations (
              filename
            )
            VALUES ($1)
          `,
          [file]
        );

        await client.query(
          'COMMIT'
        );

        console.log(
          `Migration completed: ${file}`
        );
      } catch (error) {
        await client.query(
          'ROLLBACK'
        );

        throw error;
      }
    }

    console.log(
      'Migrations complete.'
    );
  } finally {
    client.release();

    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(
    'Migration failed:',
    err
  );

  process.exit(1);
});