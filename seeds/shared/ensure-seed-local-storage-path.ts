/**
 * Debe importarse ANTES de cualquier módulo Nest/AppConfig.
 * El seed corre con cwd=`seeds/`; sin esto, LOCAL_STORAGE_PATH relativo
 * (`./public/uploads`) escribe en `seeds/public/uploads` y el backend
 * (cwd=`kai-core`) no encuentra los archivos.
 */
import * as path from 'path';

const uploadsAbs = path.resolve(__dirname, '../../kai-core/public/uploads');
process.env.LOCAL_STORAGE_PATH = uploadsAbs;
