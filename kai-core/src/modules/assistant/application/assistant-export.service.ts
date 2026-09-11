import { Injectable } from '@nestjs/common';
import { samiCivilDate } from './prompts/sami-clock';
import type { AssistantBlock } from '../domain/assistant-block.types';

// CommonJS (Nest): default import de exceljs/pdfkit llega undefined en Jest.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ExcelJS = require('exceljs') as typeof import('exceljs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

export const SAMI_EXPORT_MAX_ROWS = 1000;
export type SamiExportFormat = 'xlsx' | 'pdf';

export type SamiExportFile = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

function cellText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return String(v);
}

export function hasExportableBlocks(blocks: AssistantBlock[]): boolean {
  return blocks.some(
    (b) => b.type === 'kpi' || b.type === 'table' || b.type === 'chart',
  );
}

function exportTitle(blocks: AssistantBlock[], fallback: string): string {
  const table = blocks.find((b) => b.type === 'table');
  if (table && table.type === 'table' && table.title?.trim()) return table.title.trim();
  return fallback;
}

function slugTitle(title: string): string {
  const s = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .toLowerCase();
  return s || 'informe';
}

@Injectable()
export class AssistantExportService {
  async export(input: {
    blocks: AssistantBlock[];
    format: SamiExportFormat;
    title: string;
  }): Promise<SamiExportFile> {
    const title = exportTitle(input.blocks, input.title);
    const day = samiCivilDate();
    const base = `sami-${slugTitle(title)}-${day}`;
    if (input.format === 'xlsx') {
      const buffer = await this.toXlsx(input.blocks, title, day);
      return {
        buffer,
        filename: `${base}.xlsx`,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }
    const buffer = await this.toPdf(input.blocks, title, day);
    return {
      buffer,
      filename: `${base}.pdf`,
      contentType: 'application/pdf',
    };
  }

  private async toXlsx(
    blocks: AssistantBlock[],
    title: string,
    day: string,
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'SaMI';
    const resumen = wb.addWorksheet('Resumen');
    resumen.addRow(['SaMI']);
    resumen.addRow(['Título', title]);
    resumen.addRow(['Fecha', day]);
    resumen.addRow([]);
    resumen.addRow(['Indicadores']);
    for (const b of blocks) {
      if (b.type !== 'kpi') continue;
      for (const item of b.items) {
        resumen.addRow([item.label, item.value, item.hint ?? '']);
      }
    }
    let sheetIdx = 1;
    for (const b of blocks) {
      if (b.type !== 'table') continue;
      const name = (b.title ?? `Datos ${sheetIdx}`).slice(0, 28) || `Datos ${sheetIdx}`;
      const ws = wb.addWorksheet(name);
      ws.addRow(b.columns.map((c) => c.label));
      for (const row of b.rows.slice(0, SAMI_EXPORT_MAX_ROWS)) {
        ws.addRow(b.columns.map((c) => cellText(row[c.key])));
      }
      sheetIdx += 1;
    }
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  private toPdf(
    blocks: AssistantBlock[],
    title: string,
    day: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 48, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.fontSize(18).text('SaMI', { align: 'left' });
      doc.moveDown(0.3);
      doc.fontSize(14).text(title);
      doc.fontSize(10).fillColor('#444444').text(`Generado ${day} (America/Santiago)`);
      doc.fillColor('#000000').moveDown();
      for (const b of blocks) {
        if (b.type === 'kpi') {
          doc.fontSize(12).text('Indicadores');
          doc.moveDown(0.2);
          for (const item of b.items) {
            doc.fontSize(10).text(`${item.label}: ${cellText(item.value)}`);
          }
          doc.moveDown();
        }
        if (b.type === 'table') {
          doc.fontSize(12).text(b.title ?? 'Datos');
          doc.moveDown(0.2);
          const headers = b.columns.map((c) => c.label).join(' | ');
          doc.fontSize(8).text(headers);
          for (const row of b.rows.slice(0, SAMI_EXPORT_MAX_ROWS)) {
            const line = b.columns.map((c) => cellText(row[c.key])).join(' | ');
            doc.text(line.slice(0, 180));
          }
          doc.moveDown();
        }
      }
      doc.end();
    });
  }
}
