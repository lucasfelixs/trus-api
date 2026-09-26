import { PrismaService } from './prisma.service';

function buildService(): PrismaService {
  return Object.create(PrismaService.prototype) as PrismaService;
}

describe('PrismaService', () => {
  it('connects to the database on module init', async () => {
    const service = buildService();
    const connectSpy = jest
      .spyOn(service, '$connect')
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('disconnects from the database on module destroy', async () => {
    const service = buildService();
    const disconnectSpy = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
