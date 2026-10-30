import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// .env de kai-core; en un git worktree puede no existir y se usa el del checkout principal.
function loadEnv(): void {
  const local = path.resolve(__dirname, '../../../.env');
  if (fs.existsSync(local)) {
    dotenv.config({ path: local });
    return;
  }
  try {
    const common = execFileSync('git', ['rev-parse', '--git-common-dir'], {
      cwd: path.dirname(local),
      encoding: 'utf8',
    }).trim();
    const main = path.resolve(
      path.dirname(local),
      common,
      '..',
      'kai-core',
      '.env',
    );
    if (fs.existsSync(main)) dotenv.config({ path: main });
  } catch {
    // sin git: se usan las variables del entorno
  }
}
loadEnv();

/**
 * Base de datos temporal clonada desde una BD demo local.
 *
 * Variables (todas opcionales):
 * - REAL_DB_SOURCE: BD origen a clonar (default `DB_DATABASE` del .env).
 * - REAL_DB_ADMIN_USER: rol con permiso CREATEDB para crear/eliminar la copia (default: usuario del SO).
 * - REAL_DB_KEEP=1: no eliminar la copia al terminar (para inspeccionarla).
 */
export interface ScratchDb {
  name: string;
  source: string;
  drop(): void;
}

const HOST = process.env.DB_HOST || 'localhost';
const PORT = process.env.DB_PORT || '5432';

function psql(db: string, sql: string): string {
  return execFileSync(
    'psql',
    ['-h', HOST, '-p', PORT, '-U', adminUser(), '-d', db, '-Atc', sql],
    { encoding: 'utf8' },
  ).trim();
}

function adminUser(): string {
  return process.env.REAL_DB_ADMIN_USER || process.env.USER || 'postgres';
}

export function createScratchDb(prefix = 'kai_realdb'): ScratchDb {
  const source = process.env.REAL_DB_SOURCE || process.env.DB_DATABASE || '';
  if (!source) throw new Error('Define REAL_DB_SOURCE o DB_DATABASE');
  if (!/^[a-zA-Z0-9_-]+$/.test(source))
    throw new Error('Nombre de BD inválido');

  const name = `${prefix}_${Date.now()}`;
  const owner = process.env.DB_USERNAME || 'postgres';

  // Rápido: clon por plantilla (requiere que nadie esté conectado al origen).
  // Respaldo: pg_dump | psql.
  try {
    psql(
      'postgres',
      `CREATE DATABASE "${name}" TEMPLATE "${source}" OWNER "${owner}"`,
    );
  } catch {
    psql('postgres', `CREATE DATABASE "${name}" OWNER "${owner}"`);
    const dump = execFileSync(
      'pg_dump',
      [
        '-h',
        HOST,
        '-p',
        PORT,
        '-U',
        adminUser(),
        '-d',
        source,
        '--no-privileges',
      ],
      { maxBuffer: 1024 * 1024 * 1024 },
    );
    execFileSync(
      'psql',
      [
        '-h',
        HOST,
        '-p',
        PORT,
        '-U',
        adminUser(),
        '-d',
        name,
        '-q',
        '-v',
        'ON_ERROR_STOP=0',
      ],
      {
        input: dump,
        stdio: ['pipe', 'ignore', 'ignore'],
        maxBuffer: 1024 * 1024 * 1024,
      },
    );
  }

  return {
    name,
    source,
    drop() {
      if (process.env.REAL_DB_KEEP === '1') {
        // eslint-disable-next-line no-console
        console.log(`[real-db] BD conservada: ${name}`);
        return;
      }
      psql('postgres', `DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    },
  };
}
