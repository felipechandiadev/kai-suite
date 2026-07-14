import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EShopCartService } from '../application/eshop-cart.service';
import { EShopCartPublisher } from './eshop-cart.publisher';
import type { EShopCartUpdatedPayload } from '../application/types/eshop-cart.types';

@WebSocketGateway({
  namespace: '/e-shop/cart',
  cors: { origin: true, credentials: true },
})
export class EShopCartWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EShopCartWebSocketGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly cartService: EShopCartService,
    private readonly cartPublisher: EShopCartPublisher,
  ) {}

  afterInit() {
    this.cartPublisher.attachServer(this.server);
  }

  async handleConnection(client: Socket): Promise<void> {
    const rawToken =
      (client.handshake.auth?.cartToken as string | undefined) ??
      (client.handshake.query?.cartToken as string | undefined);
    const cartToken = typeof rawToken === 'string' ? rawToken.trim() : '';
    const companyId =
      (client.handshake.auth?.companyId as string | undefined)?.trim() ?? '';

    if (!cartToken || !companyId) {
      client.disconnect(true);
      return;
    }

    const cart = await this.cartService.findByCartToken(companyId, cartToken);
    if (!cart) {
      client.disconnect(true);
      return;
    }

    await client.join(`cart:${cart.id}`);

    const payload: EShopCartUpdatedPayload = {
      cart: {
        id: cart.id,
        cartToken: cart.cartToken,
        companyId,
        items: [],
        subtotal: 0,
        itemCount: 0,
        version: cart.version,
        expiresAt: cart.expiresAt.toISOString(),
        status: cart.status,
        lockedAt: cart.lockedAt?.toISOString() ?? null,
        lockedReason: cart.lockedReason,
      },
      issues: [],
    };
    client.emit('cart.updated', payload);
  }

  handleDisconnect(client: Socket): void {
    void client;
    this.logger.debug('Cart WS disconnected');
  }
}
