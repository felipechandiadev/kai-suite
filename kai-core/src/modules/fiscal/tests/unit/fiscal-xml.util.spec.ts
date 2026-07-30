import {
  extractEstadoFromEnvioStatusResponse,
  extractSeedFromSemillaXml,
  extractSiiAuthToken,
  extractTokenFromResponseXml,
  extractTrackIdFromEnvioResponse,
  parseSiiResponseXml,
} from '../../infrastructure/fiscal-xml.util';

const PROD_SEMILLA = `<?xml version="1.0" encoding="UTF-8"?><SII:RESPUESTA xmlns:SII="http://www.sii.cl/XMLSchema"><SII:RESP_BODY><SEMILLA>163896290488</SEMILLA></SII:RESP_BODY><SII:RESP_HDR><ESTADO>00</ESTADO></SII:RESP_HDR></SII:RESPUESTA>`;

describe('fiscal-xml.util SII responses', () => {
  it('extracts SEMILLA from namespaced production XML (numeric value)', () => {
    expect(extractSeedFromSemillaXml(PROD_SEMILLA)).toBe('163896290488');
  });

  it('extracts TOKEN from namespaced response', () => {
    const xml = `<?xml version="1.0"?><SII:RESPUESTA xmlns:SII="http://www.sii.cl/XMLSchema"><SII:RESP_BODY><TOKEN>abc123xyz</TOKEN></SII:RESP_BODY></SII:RESPUESTA>`;
    expect(extractTokenFromResponseXml(xml)).toBe('abc123xyz');
  });

  it('extracts SEMILLA from legacy flat structure', () => {
    const xml = `<RESPUESTA><SEMILLA>999</SEMILLA></RESPUESTA>`;
    expect(extractSeedFromSemillaXml(xml)).toBe('999');
  });

  it('reports SII rejection when TOKEN is missing', () => {
    const xml = `<?xml version="1.0"?><SII:RESPUESTA xmlns:SII="http://www.sii.cl/XMLSchema"><SII:RESP_HDR><ESTADO>11</ESTADO></SII:RESP_HDR><SII:RESP_BODY><GLOSA>Firma Invalida</GLOSA></SII:RESP_BODY></SII:RESPUESTA>`;
    expect(() => extractTokenFromResponseXml(xml)).toThrow(
      'SII rechazó token (ESTADO 11: Firma Invalida)',
    );
  });

  it('parses production token success response', () => {
    const xml = `<?xml version="1.0"?><SII:RESPUESTA xmlns:SII="http://www.sii.cl/XMLSchema"><SII:RESP_HDR><ESTADO>00</ESTADO><GLOSA>Token Creado</GLOSA></SII:RESP_HDR><SII:RESP_BODY><TOKEN>XAuSbYXiNh9Ik</TOKEN></SII:RESP_BODY></SII:RESPUESTA>`;
    expect(parseSiiResponseXml(xml)).toEqual({
      estado: '00',
      glosa: 'Token Creado',
      token: 'XAuSbYXiNh9Ik',
      semilla: null,
    });
  });

  it('prefers TOKEN from Set-Cookie over XML body', () => {
    const xml = `<?xml version="1.0"?><SII:RESPUESTA xmlns:SII="http://www.sii.cl/XMLSchema"><SII:RESP_BODY><TOKEN>fromBody</TOKEN></SII:RESP_BODY></SII:RESPUESTA>`;
    const response = {
      headers: {
        getSetCookie: () => ['TOKEN=fromCookie; Path=/; Domain=.sii.cl'],
        get: () => null,
      },
    } as unknown as Pick<Response, 'headers'>;
    expect(extractSiiAuthToken(response, xml)).toBe('fromCookie');
  });

  it('extracts trackid from production JSON envio response', () => {
    const json = `{"rut_emisor":"78543570-2","rut_envia":"10708387-1","trackid":22668217996,"fecha_recepcion":"2026-06-29 18:08:17","estado":"REC","file":"envio.xml"}`;
    expect(extractTrackIdFromEnvioResponse(json)).toBe('22668217996');
    expect(extractEstadoFromEnvioStatusResponse(json)).toBe('REC');
  });

  it('extracts trackid from XML envio response', () => {
    const xml = '<RESPUESTA><TRACKID>1014</TRACKID></RESPUESTA>';
    expect(extractTrackIdFromEnvioResponse(xml)).toBe('1014');
  });
});
