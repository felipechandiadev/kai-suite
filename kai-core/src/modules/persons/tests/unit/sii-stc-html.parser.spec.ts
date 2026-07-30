import { parseSiiStcHtml } from '@modules/persons/infrastructure/sii-stc-html.parser';
import { isValidChileRut, parseChileRut } from '@modules/persons/infrastructure/chile-rut.util';

const SAMPLE_HTML = `
<html><body>
<div></div><div></div><div></div>
<div><font>INFOSEC SERVICIOS DE SEGURIDAD SPA</font></div>
<span>Contribuyente presenta Inicio de Actividades: SI</span>
<span>Fecha de Inicio de Actividades: 08-07-2016</span>
<table class="tabla">
<tr><td><font>Giro</font></td><td><font>Código</font></td><td><font>Categoría</font></td><td><font>Afecta</font></td></tr>
<tr>
  <td><font>FABRICACION DE COMPUTADORES</font></td>
  <td><font>262000</font></td>
  <td><font>Primera</font></td>
  <td><font>Si</font></td>
</tr>
<tr>
  <td><font>CONSULTORIA DE INFORMATICA</font></td>
  <td><font>620200</font></td>
  <td><font>Primera</font></td>
  <td><font>Si</font></td>
</tr>
</table>
</body></html>
`;

describe('sii-stc-html.parser', () => {
  it('parses legal name, inicio actividades and ACTECO rows', () => {
    const result = parseSiiStcHtml(SAMPLE_HTML);
    expect(result.legalName).toContain('INFOSEC');
    expect(result.activityStarted).toBe(true);
    expect(result.activityStartDate).toBe('08-07-2016');
    expect(result.activities).toHaveLength(2);
    expect(result.activities[0].code).toBe('262000');
    expect(result.activities[1].code).toBe('620200');
    expect(result.activities[0].ivaAffected).toBe(true);
  });

  it('throws when rut is not registered', () => {
    expect(() =>
      parseSiiStcHtml('<html>RUT no registrado en las bases del SII</html>'),
    ).toThrow(/no registrado/i);
  });

  it('ignores CSS in style blocks when extracting razón social', () => {
    const html = `
      <html><body>
        <div><style>/* layout */ .x{}</style></div>
        <div></div><div></div><div></div>
        <div><font>COMERCIAL EJEMPLO LTDA</font></div>
      </body></html>`;
    const result = parseSiiStcHtml(html);
    expect(result.legalName).toBe('COMERCIAL EJEMPLO LTDA');
  });
});

describe('chile-rut.util', () => {
  it('validates known RUT', () => {
    expect(isValidChileRut('76.632.059-7')).toBe(true);
    expect(parseChileRut('76632059-7')?.formatted).toBe('76.632.059-7');
  });

  it('rejects invalid DV', () => {
    expect(isValidChileRut('76.632.059-0')).toBe(false);
  });
});
