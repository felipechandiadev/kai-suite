import { PosSyncController } from '../../presentation/pos-sync.controller';

describe('PosSyncController: el usuario sale del token', () => {
  const user = { id: 'u1', userName: 'cajero-real', rol: 'USER', companyId: 'c1' };

  it('sobrescribe el userName del body en un comando', async () => {
    const service = { syncCommand: jest.fn().mockResolvedValue({ success: true }) };
    const controller = new PosSyncController(service as any);
    await controller.syncCommand({ commandType: 'SALE', userName: 'otro-usuario' }, user);
    expect(service.syncCommand).toHaveBeenCalledWith({
      commandType: 'SALE',
      userName: 'cajero-real',
    });
  });

  it('sobrescribe el userName en cada comando del lote', async () => {
    const service = { syncCommandBatch: jest.fn().mockResolvedValue({ success: true, results: [] }) };
    const controller = new PosSyncController(service as any);
    await controller.syncCommandsBatch(
      { commands: [{ userName: 'a' }, { userName: 'b' }] },
      user,
    );
    expect(service.syncCommandBatch).toHaveBeenCalledWith([
      { userName: 'cajero-real' },
      { userName: 'cajero-real' },
    ]);
  });
});
