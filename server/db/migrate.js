import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Run database migrations.
 * - If schema_version table doesn't exist, applies full schema.sql (version 1).
 * - If it exists, applies incremental migration_NNN.sql files.
 * - Supports --reset-db CLI flag to drop all tables and re-create.
 */
export function runMigrations(db) {
  const resetFlag = process.argv.includes('--reset-db');

  if (resetFlag) {
    console.log('[migrate] --reset-db flag detected, dropping all tables...');
    dropAllTables(db);
  }

  const hasVersionTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'")
    .get();

  if (!hasVersionTable) {
    console.log('[migrate] No schema found, applying full schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    db.exec(schemaSql);
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(1);
    console.log('[migrate] Schema version set to 1.');
  } else {
    const currentVersion = db.prepare('SELECT version FROM schema_version').get()?.version ?? 0;
    console.log(`[migrate] Current schema version: ${currentVersion}`);
    applyIncrementalMigrations(db, currentVersion);
  }
}

/**
 * Apply migration files named migration_NNN.sql where NNN > currentVersion.
 */
function applyIncrementalMigrations(db, currentVersion) {
  const files = fs.readdirSync(__dirname)
    .filter(f => /^migration_(\d+)\.sql$/.test(f))
    .map(f => ({ file: f, version: parseInt(f.match(/^migration_(\d+)\.sql$/)[1], 10) }))
    .filter(({ version }) => version > currentVersion)
    .sort((a, b) => a.version - b.version);

  if (files.length === 0) {
    console.log('[migrate] Schema is up to date.');
    return;
  }

  for (const { file, version } of files) {
    console.log(`[migrate] Applying ${file}...`);
    const sql = fs.readFileSync(path.join(__dirname, file), 'utf-8');
    db.exec(sql);
    db.prepare('UPDATE schema_version SET version = ?').run(version);
    console.log(`[migrate] Schema version set to ${version}.`);
  }
}

/**
 * Drop all user tables (for --reset-db).
 */
function dropAllTables(db) {
  // Disable FK checks while dropping
  db.pragma('foreign_keys = OFF');

  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map(r => r.name);

  for (const table of tables) {
    db.exec(`DROP TABLE IF EXISTS "${table}"`);
  }

  // Re-enable FK checks
  db.pragma('foreign_keys = ON');
  console.log('[migrate] All tables dropped.');
}
