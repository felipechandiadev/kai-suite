import { FiscalDteEmissionStatus } from '../../domain/fiscal.enums';
import {
  mapSiiEstadoToEnvioStatus,
  pollEnvioStatus,
  resolveSiiEnvioStatus,
} from '../../application/sii-envio-status.util';

const RSC_RAW = JSON.stringify({
  rut_emisor: '78543570-2',
  trackid: '22699393195',
  estado: 'RSC',
  detalle_rep_rech: [
    {
      estado: 'RCH',
      descripcion: 'DTE Rechazado',
      error: [
        {
          seccion: 'ENV',
          descripcion: 'Error en Schema',
          detalle: '[0] LPX-00007: unexpected end-of-file encountered',
        },
      ],
    },
  ],
});

describe('sii-envio-status.util', () => {
  describe('mapSiiEstadoToEnvioStatus', () => {
    it('maps EPR and RCH', () => {
      expect(mapSiiEstadoToEnvioStatus('EPR')).toBe(FiscalDteEmissionStatus.EPR);
      expect(mapSiiEstadoToEnvioStatus('RCH')).toBe(FiscalDteEmissionStatus.RCH);
    });

    it('maps RSC and other reject codes to RCH', () => {
      expect(mapSiiEstadoToEnvioStatus('RSC')).toBe(FiscalDteEmissionStatus.RCH);
      expect(mapSiiEstadoToEnvioStatus('RFR')).toBe(FiscalDteEmissionStatus.RCH);
    });

    it('returns null for REC (still processing)', () => {
      expect(mapSiiEstadoToEnvioStatus('REC')).toBeNull();
    });
  });

  describe('resolveSiiEnvioStatus', () => {
    it('maps RSC with schema detail to RCH and message', () => {
      const resolved = resolveSiiEnvioStatus(RSC_RAW);
      expect(resolved.envioStatus).toBe(FiscalDteEmissionStatus.RCH);
      expect(resolved.rejectionMessage).toContain('Error en Schema');
    });
  });

  describe('pollEnvioStatus', () => {
    it('returns EPR when SII responds processed', async () => {
      const fetchStatus = jest
        .fn()
        .mockResolvedValueOnce({ estado: 'REC', raw: '{"estado":"REC"}' })
        .mockResolvedValueOnce({ estado: 'EPR', raw: '{"estado":"EPR"}' });

      const result = await pollEnvioStatus(fetchStatus, {
        maxAttempts: 3,
        delayMs: 0,
        initialDelayMs: 0,
      });

      expect(result.envioStatus).toBe(FiscalDteEmissionStatus.EPR);
      expect(fetchStatus).toHaveBeenCalledTimes(2);
    });

    it('returns RCH immediately on RSC', async () => {
      const fetchStatus = jest.fn().mockResolvedValue({ estado: 'RSC', raw: RSC_RAW });

      const result = await pollEnvioStatus(fetchStatus, { maxAttempts: 3, delayMs: 0 });

      expect(result.envioStatus).toBe(FiscalDteEmissionStatus.RCH);
      expect(result.rejectionMessage).toContain('Error en Schema');
      expect(fetchStatus).toHaveBeenCalledTimes(1);
    });

    it('keeps SENT on timeout while still REC', async () => {
      const fetchStatus = jest
        .fn()
        .mockResolvedValue({ estado: 'REC', raw: '{"estado":"REC"}' });

      const result = await pollEnvioStatus(fetchStatus, {
        maxAttempts: 2,
        delayMs: 0,
      });

      expect(result.envioStatus).toBe(FiscalDteEmissionStatus.SENT);
      expect(fetchStatus).toHaveBeenCalledTimes(2);
    });
    it('respects initialDelayMs from X-Retry-After', async () => {
      const fetchStatus = jest.fn().mockResolvedValue({ estado: 'EPR', raw: '{"estado":"EPR"}' });
      const started = Date.now();
      await pollEnvioStatus(fetchStatus, { maxAttempts: 1, initialDelayMs: 50, delayMs: 0 });
      expect(Date.now() - started).toBeGreaterThanOrEqual(45);
      expect(fetchStatus).toHaveBeenCalledTimes(1);
    });
  });
});
