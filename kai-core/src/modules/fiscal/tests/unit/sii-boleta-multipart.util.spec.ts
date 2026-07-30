import {
  buildEnvioBoletaMultipart,
  createMultipartBoundary,
  extractArchivoFromMultipart,
} from '../../infrastructure/sii-boleta-multipart.util';

const SAMPLE_XML = `<?xml version="1.0" encoding="ISO-8859-1"?>
<EnvioBOLETA xmlns="http://www.sii.cl/SiiDte" version="1.0">
<SetDTE ID="SetDoc"><Caratula version="1.0"><RutEmisor>78543570-2</RutEmisor></Caratula></SetDTE>
</EnvioBOLETA>`;

describe('sii-boleta-multipart.util', () => {
  it('round-trips archivo bytes identical to signed XML (latin1)', () => {
    const boundary = createMultipartBoundary(SAMPLE_XML);
    const buffer = buildEnvioBoletaMultipart(
      boundary,
      SAMPLE_XML,
      '78.543.570-2',
      '78.543.570-2',
    );
    const extracted = extractArchivoFromMultipart(buffer, boundary);
    expect(extracted).toBe(SAMPLE_XML);
    expect(Buffer.from(extracted, 'latin1').equals(Buffer.from(SAMPLE_XML, 'latin1'))).toBe(
      true,
    );
  });

  it('uses application/octet-stream for archivo part', () => {
    const boundary = createMultipartBoundary(SAMPLE_XML);
    const buffer = buildEnvioBoletaMultipart(boundary, SAMPLE_XML, '78543570-2');
    const text = buffer.toString('latin1');
    expect(text).toContain('Content-Type: application/octet-stream');
    expect(text).not.toContain('Content-Type: application/xml');
  });

  it('preserves non-ASCII bytes in ISO-8859-1 payload', () => {
    const xmlWithAccent = SAMPLE_XML.replace(
      '</EnvioBOLETA>',
      '<Observaciones>Ñoño</Observaciones></EnvioBOLETA>',
    );
    const boundary = createMultipartBoundary(xmlWithAccent);
    const buffer = buildEnvioBoletaMultipart(boundary, xmlWithAccent, '78543570-2');
    const extracted = extractArchivoFromMultipart(buffer, boundary);
    expect(extracted).toContain('Ñoño');
  });
});
