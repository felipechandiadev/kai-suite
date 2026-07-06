import { BadRequestException } from '@nestjs/common';
import { FiscalBoletaEmissionService } from '../../application/fiscal-boleta-emission.service';
import { FiscalDteEmissionStatus } from '../../domain/fiscal.enums';

describe('FiscalBoletaEmissionService — retryFromSale', () => {
  function buildService(overrides: {
    existing?: Record<string, unknown> | null;
    emitPrepare?: jest.Mock;
    emitSync?: jest.Mock;
    submit?: jest.Mock;
    save?: jest.Mock;
    findAfter?: Record<string, unknown>;
  }) {
    const emissionRepo = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(overrides.existing ?? null)
        .mockResolvedValueOnce(overrides.findAfter ?? overrides.existing),
      save: overrides.save ?? jest.fn().mockImplementation(async (e) => e),
      delete: jest.fn(),
    };
    const appConfig = {
      fiscalEmission: { boletaAsyncEmit: true, maxSubmitAttempts: 12, submitBackoffBaseMs: 5000, staleSendingMs: 120000, workerIntervalMs: 5000, workerBatchSize: 20 },
    };
    const eventEmitter = { emit: jest.fn() };
    const service = new FiscalBoletaEmissionService(
      { findOne: jest.fn() } as never,
      { findOne: jest.fn() } as never,
      { findOne: jest.fn() } as never,
      emissionRepo as never,
      { findOne: jest.fn() } as never,
      { findOne: jest.fn() } as never,
      { find: jest.fn() } as never,
      { findOne: jest.fn() } as never,
      {} as never,
      appConfig as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { reserveFolioInManager: jest.fn() } as never,
      eventEmitter as never,
    );
    if (overrides.submit) {
      service.submitPendingToSii = overrides.submit;
    }
    (service as unknown as { resultFromExisting: () => Promise<unknown> }).resultFromExisting =
      jest.fn().mockResolvedValue({
        status: 'PENDING',
        folio: 100,
        printPreview: undefined,
      });
    return { service, emissionRepo, eventEmitter };
  }

  it('does not delete FAILED emission when requeueing same folio', async () => {
    const existing = {
      id: 'em-1',
      companyId: 'co-1',
      transactionId: 'tx-1',
      folio: 100,
      envioStatus: FiscalDteEmissionStatus.FAILED,
      encryptedSignedEnvio: 'enc',
      signedEnvioIv: 'iv',
      tedXml: '<TED/>',
    };
    const submit = jest.fn().mockResolvedValue(undefined);
    const { service, emissionRepo, eventEmitter } = buildService({
      existing,
      submit,
      findAfter: { ...existing, envioStatus: FiscalDteEmissionStatus.PENDING },
    });

    await service.retryFromSale('co-1', 'tx-1', 'pos-1');

    expect(emissionRepo.delete).not.toHaveBeenCalled();
    expect(emissionRepo.save).toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalledWith('fiscal.emission.pending', {
      emissionId: 'em-1',
    });
    expect(submit).toHaveBeenCalledWith('em-1');
  });

  it('throws when FAILED emission lacks stored signed envio', async () => {
    const { service } = buildService({
      existing: {
        id: 'em-2',
        transactionId: 'tx-2',
        folio: 101,
        envioStatus: FiscalDteEmissionStatus.FAILED,
        encryptedSignedEnvio: null,
        signedEnvioIv: null,
      },
    });

    await expect(service.retryFromSale('co-1', 'tx-2')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
