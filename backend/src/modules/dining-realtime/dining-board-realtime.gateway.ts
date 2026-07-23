import { Inject, Logger, forwardRef } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DiningBoardService } from '@modules/dining/application/dining-board.service';
import { boardBranchRoom } from './dining-realtime.types';
import { DiningRealtimePublisher } from './dining-realtime.publisher';

type SubscribeAck = { ok?: boolean; error?: string; joined?: string };

/**
 * Namespace público Kai Board — auth solo con display token (sin user UUID).
 */
@WebSocketGateway({
  namespace: '/realtime/dining-board',
  cors: { origin: true, credentials: true },
})
export class DiningBoardRealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(DiningBoardRealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(forwardRef(() => DiningBoardService))
    private readonly boardService: DiningBoardService,
    private readonly publisher: DiningRealtimePublisher,
  ) {}

  afterInit() {
    this.publisher.attachBoardServer(this.server);
  }

  async handleConnection(client: Socket): Promise<void> {
    const rawToken =
      (client.handshake.auth?.displayToken as string | undefined)?.trim() ||
      (client.handshake.auth?.token as string | undefined)?.trim() ||
      (typeof client.handshake.query?.token === 'string'
        ? client.handshake.query.token.trim()
        : '');

    if (!rawToken) {
      try {
        client.emit('auth_error', {
          reason: 'unauthorized',
          message: 'Token de pantalla requerido',
        });
      } catch {
        // ignore
      }
      client.disconnect(true);
      return;
    }

    const display = await this.boardService.findActiveByRawToken(rawToken);
    if (!display) {
      try {
        client.emit('auth_error', {
          reason: 'unauthorized',
          message: 'Token inválido o revocado',
        });
      } catch {
        // ignore
      }
      client.disconnect(true);
      return;
    }

    client.data.boardDisplay = display;
    const room = boardBranchRoom({
      companyId: display.companyId,
      branchId: display.branchId,
    });
    await client.join(room);
    void this.boardService.touchLastSeen(display.id);

    const snapshot = await this.boardService.getSnapshotForDisplay(display);
    client.emit('dining.board.ready', {
      companyId: display.companyId,
      branchId: display.branchId,
      displayId: display.id,
    });
    client.emit('dining.board.snapshot', snapshot);
  }

  handleDisconnect(client: Socket): void {
    // Evitar ruido en Strict Mode / remounts del cliente (disconnect intencional).
    if (client.disconnected && !client.data?.boardDisplay) {
      return;
    }
    this.logger.debug(
      `Board WS disconnected display=${client.data?.boardDisplay?.id ?? "n/a"}`,
    );
  }

  @SubscribeMessage('subscribeBoard')
  async subscribeBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() _body: unknown,
  ): Promise<SubscribeAck> {
    const display = client.data.boardDisplay;
    if (!display) {
      return { ok: false, error: 'unauthorized' };
    }
    const room = boardBranchRoom({
      companyId: display.companyId,
      branchId: display.branchId,
    });
    await client.join(room);
    const snapshot = await this.boardService.getSnapshotForDisplay(display);
    client.emit('dining.board.snapshot', snapshot);
    return { ok: true, joined: room };
  }
}
