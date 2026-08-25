import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Point the database layer at a throwaway file.
 *
 * Must be called before anything imports database.js, because the connection
 * is a singleton created from DATABASE_PATH on first use.
 */
export function useTempDatabase(label: string): string {
  const dir = mkdtempSync(join(tmpdir(), `wwm-${label}-`));
  const path = join(dir, 'test.db');

  process.env.DATABASE_PATH = path;

  return path;
}

/**
 * Delete a temporary database and its WAL sidecars
 */
export function removeTempDatabase(path: string): void {
  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(`${path}${suffix}`, { force: true });
  }
}
