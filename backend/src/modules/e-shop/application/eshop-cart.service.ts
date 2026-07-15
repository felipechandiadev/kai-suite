import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { EShopCart } from '../domain/e-shop-cart.entity';
import { EShopCartItem } from '../domain/e-shop-cart-item.entity';
import type { EShopStoreContext } from './eshop-store.context';
import { EShopPricingStockService } from './eshop-pricing-stock.service';
import { EShopCartPublisher } from '../presentation/eshop-cart.publisher';
import type {
  CartIssue,
  EShopCartContext,
  EShopCartDto,
  EShopCartItemDto,
} from './types/eshop-cart.types';

const CART_TTL_DAYS = 30;

@Injectable()
export class EShopCartService {
  private readonly logger = new Logger(EShopCartService.name);

  constructor(
    @InjectRepository(EShopCart)
    private readonly cartRepo: Repository<EShopCart>,
    @InjectRepository(EShopCartItem)
    private readonly cartItemRepo: Repository<EShopCartItem>,
    private readonly pricingStock: EShopPricingStockService,
    private readonly cartPublisher: EShopCartPublisher,
  ) {}

  private buildExpiresAt(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CART_TTL_DAYS);
    return expiresAt;
  }

  async findByCartToken(
    companyId: string,
    cartToken: string,
  ): Promise<EShopCart | null> {
    const now = new Date();
    return this.cartRepo.findOne({
      where: { companyId, cartToken, expiresAt: MoreThan(now) },
      relations: { items: true },
    });
  }

  private async loadCartWithItems(cartId: string): Promise<EShopCart> {
    const cart = await this.cartRepo.findOne({
      where: { id: cartId },
      relations: { items: true },
    });
    if (!cart) {
      throw new NotFoundException('Carrito no encontrado');
    }
    return cart;
  }

  private assertCartMutable(cart: EShopCart) {
    if (cart.status === 'checkout_locked') {
      throw new BadRequestException(
        'El carrito está bloqueado durante el checkout',
      );
    }
    if (cart.status === 'converted') {
      throw new BadRequestException('El carrito ya fue convertido en pedido');
    }
  }

  private toItemDto(
    item: EShopCartItem,
    availableStock: number | null,
    trackInventory: boolean,
  ): EShopCartItemDto {
    const unitPrice = Number(item.unitPriceSnapshot) || 0;
    const quantity = Number(item.quantity) || 0;
    return {
      id: item.id,
      productId: item.productId,
      productVariantId: item.productVariantId,
      quantity,
      unitPrice,
      lineTotal: Math.round(unitPrice * quantity),
      productName: item.productNameSnapshot,
      variantName: item.variantNameSnapshot,
      imageUrl: item.imageUrlSnapshot,
      availableStock,
      trackInventory,
    };
  }

  private async toDto(
    store: EShopStoreContext,
    cart: EShopCart,
    issues: CartIssue[] = [],
  ): Promise<EShopCartDto> {
    const variantIds = (cart.items ?? []).map((i) => i.productVariantId);
    const operational = await this.pricingStock.resolveOperationalContext(store);
    const stockMap = await this.pricingStock.loadStockMap(
      store.companyId,
      variantIds,
      operational.storageId,
    );
    const variantsById = await this.pricingStock.loadActiveVariants(
      store.companyId,
      variantIds,
    );

    const items = (cart.items ?? []).map((item) => {
      const variant = variantsById.get(item.productVariantId);
      const trackInventory = variant?.trackInventory === true;
      const availableStock = trackInventory
        ? (stockMap.get(item.productVariantId) ?? 0)
        : null;
      return this.toItemDto(item, availableStock, trackInventory);
    });

    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

    return {
      id: cart.id,
      cartToken: cart.cartToken,
      companyId: store.companyId,
      items,
      subtotal,
      itemCount,
      issues: issues.length > 0 ? issues : undefined,
      version: cart.version,
      expiresAt: cart.expiresAt.toISOString(),
      status: cart.status,
      lockedAt: cart.lockedAt?.toISOString() ?? null,
      lockedReason: cart.lockedReason,
    };
  }

  private async emitUpdated(
    store: EShopStoreContext,
    cart: EShopCart,
    issues: CartIssue[] = [],
  ) {
    const dto = await this.toDto(store, cart, issues);
    this.cartPublisher.emitCartUpdated(cart.id, { cart: dto, issues });
    return dto;
  }

  private async touchCart(cart: EShopCart) {
    cart.expiresAt = this.buildExpiresAt();
    cart.version += 1;
    // No usar save(cart) porque arrastra la relación `items` y puede dejar
    // `cart_id` en null al re-persistir hijos. Solo actualizamos columnas escalares.
    await this.cartRepo.update(
      { id: cart.id },
      {
        expiresAt: cart.expiresAt,
        version: cart.version,
        status: cart.status,
        lockedAt: cart.lockedAt,
        lockedReason: cart.lockedReason,
        customerId: cart.customerId,
        checkoutAttemptId: cart.checkoutAttemptId,
      },
    );
    return cart;
  }

  async getOrCreateCart(
    store: EShopStoreContext,
    context: EShopCartContext,
  ): Promise<{ cart: EShopCartDto; cartToken: string; created: boolean }> {
    const now = new Date();
    let cart: EShopCart | null = null;
    let created = false;

    if (context.customerId) {
      cart = await this.cartRepo.findOne({
        where: {
          companyId: store.companyId,
          customerId: context.customerId,
          status: 'active',
          expiresAt: MoreThan(now),
        },
        relations: { items: true },
        order: { updatedAt: 'DESC' },
      });
    }

    if (!cart && context.cartToken) {
      cart = await this.findByCartToken(store.companyId, context.cartToken);
      // Tras un pedido online el token cookie puede seguir apuntando a un carrito
      // `converted`. Ignorar y crear uno nuevo en lugar de fallar en muteable ops.
      if (cart && cart.status === 'converted') {
        cart = null;
      } else if (cart && context.customerId && !cart.customerId) {
        cart.customerId = context.customerId;
      }
    }

    if (!cart) {
      cart = this.cartRepo.create({
        companyId: store.companyId,
        customerId: context.customerId ?? null,
        cartToken: randomUUID(),
        status: 'active',
        expiresAt: this.buildExpiresAt(),
        version: 1,
        items: [],
      });
      cart = await this.cartRepo.save(cart);
      created = true;
    } else {
      cart = await this.touchCart(cart);
    }

    const dto = await this.toDto(store, cart);
    return { cart: dto, cartToken: cart.cartToken, created };
  }

  async revalidate(
    store: EShopStoreContext,
    context: EShopCartContext,
  ): Promise<{ cart: EShopCartDto; cartToken: string }> {
    const { cartToken } = await this.getOrCreateCart(store, context);
    let cart = await this.loadCartWithItems(
      (await this.findByCartToken(store.companyId, cartToken))!.id,
    );

    const previousPrices = new Map(
      (cart.items ?? []).map((i) => [
        i.productVariantId,
        Number(i.unitPriceSnapshot) || 0,
      ]),
    );

    const { pricedLines, issues } = await this.pricingStock.resolvePricedLines(
      store,
      {
        lines: (cart.items ?? []).map((i) => ({
          productVariantId: i.productVariantId,
          quantity: Number(i.quantity) || 1,
        })),
        previousPrices,
      },
    );

    const pricedByVariant = new Map(
      pricedLines.map((l) => [l.productVariantId, l]),
    );
    const nextItems: EShopCartItem[] = [];

    for (const item of cart.items ?? []) {
      const priced = pricedByVariant.get(item.productVariantId);
      if (!priced) {
        continue;
      }
      item.cartId = cart.id;
      item.cart = { id: cart.id } as EShopCart;
      item.quantity = priced.quantity;
      item.unitPriceSnapshot = priced.unitPrice;
      item.productNameSnapshot = priced.productName;
      item.variantNameSnapshot = priced.variantName;
      if (!item.imageUrlSnapshot && priced.imageUrl) {
        item.imageUrlSnapshot = priced.imageUrl;
      }
      nextItems.push(item);
    }

    cart.items = nextItems;
    cart = await this.touchCart(cart);
    await this.cartItemRepo.save(nextItems);

    const removed = (await this.loadCartWithItems(cart.id)).items ?? [];
    const keptIds = new Set(nextItems.map((i) => i.id));
    const toDelete = removed.filter((i) => !keptIds.has(i.id));
    if (toDelete.length > 0) {
      await this.cartItemRepo.remove(toDelete);
    }

    cart = await this.loadCartWithItems(cart.id);
    const dto = await this.emitUpdated(store, cart, issues);
    return { cart: dto, cartToken: cart.cartToken };
  }

  async addItem(
    store: EShopStoreContext,
    context: EShopCartContext,
    input: { productVariantId: string; quantity: number; imageUrl?: string | null },
  ): Promise<{ cart: EShopCartDto; cartToken: string }> {
    const { cartToken } = await this.getOrCreateCart(store, context);
    let cart = await this.loadCartWithItems(
      (await this.findByCartToken(store.companyId, cartToken))!.id,
    );
    this.assertCartMutable(cart);

    const existing = (cart.items ?? []).find(
      (i) => i.productVariantId === input.productVariantId,
    );
    const currentQty = existing ? Number(existing.quantity) || 0 : 0;
    const targetQty = currentQty + Math.max(1, Math.floor(input.quantity));

    const { pricedLines, issues } = await this.pricingStock.resolvePricedLines(
      store,
      {
        lines: [{ productVariantId: input.productVariantId, quantity: targetQty }],
      },
    );
    const priced = pricedLines[0];
    if (!priced) {
      const blocking = issues.find(
        (i) => i.productVariantId === input.productVariantId,
      );
      throw new BadRequestException(
        blocking?.message ?? 'No se pudo agregar el producto al carrito',
      );
    }

    if (existing) {
      existing.cartId = cart.id;
      existing.cart = { id: cart.id } as EShopCart;
      existing.quantity = priced.quantity;
      existing.unitPriceSnapshot = priced.unitPrice;
      existing.productNameSnapshot = priced.productName;
      existing.variantNameSnapshot = priced.variantName;
      if (input.imageUrl) existing.imageUrlSnapshot = input.imageUrl;
      await this.cartItemRepo.save(existing);
    } else {
      const item = this.cartItemRepo.create({
        cartId: cart.id,
        cart: { id: cart.id } as EShopCart,
        productId: priced.productId,
        productVariantId: priced.productVariantId,
        quantity: priced.quantity,
        unitPriceSnapshot: priced.unitPrice,
        productNameSnapshot: priced.productName,
        variantNameSnapshot: priced.variantName,
        imageUrlSnapshot: input.imageUrl ?? priced.imageUrl,
      });
      await this.cartItemRepo.save(item);
    }

    cart = await this.touchCart(cart);
    cart = await this.loadCartWithItems(cart.id);
    const dto = await this.emitUpdated(store, cart, issues);
    return { cart: dto, cartToken: cart.cartToken };
  }

  async updateQty(
    store: EShopStoreContext,
    context: EShopCartContext,
    productVariantId: string,
    quantity: number,
  ): Promise<{ cart: EShopCartDto; cartToken: string }> {
    const { cartToken } = await this.getOrCreateCart(store, context);
    let cart = await this.loadCartWithItems(
      (await this.findByCartToken(store.companyId, cartToken))!.id,
    );
    this.assertCartMutable(cart);

    const item = (cart.items ?? []).find(
      (i) => i.productVariantId === productVariantId,
    );
    if (!item) {
      throw new NotFoundException('Línea no encontrada en el carrito');
    }

    if (quantity <= 0) {
      await this.cartItemRepo.remove(item);
      cart = await this.touchCart(cart);
      cart = await this.loadCartWithItems(cart.id);
      const dto = await this.emitUpdated(store, cart);
      return { cart: dto, cartToken: cart.cartToken };
    }

    const { pricedLines, issues } = await this.pricingStock.resolvePricedLines(
      store,
      {
        lines: [{ productVariantId, quantity }],
        previousPrices: new Map([
          [productVariantId, Number(item.unitPriceSnapshot) || 0],
        ]),
      },
    );
    const priced = pricedLines[0];
    if (!priced) {
      const blocking = issues.find((i) => i.productVariantId === productVariantId);
      throw new BadRequestException(
        blocking?.message ?? 'No se pudo actualizar la cantidad',
      );
    }

    item.cartId = cart.id;
    item.cart = { id: cart.id } as EShopCart;
    item.quantity = priced.quantity;
    item.unitPriceSnapshot = priced.unitPrice;
    await this.cartItemRepo.save(item);
    cart = await this.touchCart(cart);
    cart = await this.loadCartWithItems(cart.id);
    const dto = await this.emitUpdated(store, cart, issues);
    return { cart: dto, cartToken: cart.cartToken };
  }

  async removeItem(
    store: EShopStoreContext,
    context: EShopCartContext,
    productVariantId: string,
  ): Promise<{ cart: EShopCartDto; cartToken: string }> {
    const { cartToken } = await this.getOrCreateCart(store, context);
    let cart = await this.loadCartWithItems(
      (await this.findByCartToken(store.companyId, cartToken))!.id,
    );
    this.assertCartMutable(cart);

    const item = (cart.items ?? []).find(
      (i) => i.productVariantId === productVariantId,
    );
    if (item) {
      await this.cartItemRepo.remove(item);
    }

    cart = await this.touchCart(cart);
    cart = await this.loadCartWithItems(cart.id);
    const dto = await this.emitUpdated(store, cart);
    return { cart: dto, cartToken: cart.cartToken };
  }

  async clearCart(
    store: EShopStoreContext,
    context: EShopCartContext,
  ): Promise<{ cart: EShopCartDto; cartToken: string }> {
    const { cartToken } = await this.getOrCreateCart(store, context);
    let cart = await this.loadCartWithItems(
      (await this.findByCartToken(store.companyId, cartToken))!.id,
    );
    this.assertCartMutable(cart);

    if (cart.items?.length) {
      await this.cartItemRepo.remove(cart.items);
    }

    cart = await this.touchCart(cart);
    cart = await this.loadCartWithItems(cart.id);
    const dto = await this.emitUpdated(store, cart);
    return { cart: dto, cartToken: cart.cartToken };
  }

  async mergeGuestCart(
    store: EShopStoreContext,
    guestCartToken: string,
    customerId: string,
  ): Promise<{ cart: EShopCartDto; cartToken: string }> {
    const guest = await this.findByCartToken(store.companyId, guestCartToken);
    const { cartToken } = await this.getOrCreateCart(store, { customerId });
    const userCart = await this.loadCartWithItems(
      (await this.findByCartToken(store.companyId, cartToken))!.id,
    );

    if (!guest || guest.id === userCart.id) {
      const dto = await this.toDto(store, userCart);
      return { cart: dto, cartToken: userCart.cartToken };
    }

    for (const guestItem of guest.items ?? []) {
      const existing = (userCart.items ?? []).find(
        (i) => i.productVariantId === guestItem.productVariantId,
      );
      const qty =
        (existing ? Number(existing.quantity) : 0) +
        (Number(guestItem.quantity) || 0);

      const { pricedLines } = await this.pricingStock.resolvePricedLines(store, {
        lines: [{ productVariantId: guestItem.productVariantId, quantity: qty }],
      });
      const priced = pricedLines[0];
      if (!priced) continue;

      if (existing) {
        existing.cartId = userCart.id;
        existing.cart = { id: userCart.id } as EShopCart;
        existing.quantity = priced.quantity;
        existing.unitPriceSnapshot = priced.unitPrice;
        await this.cartItemRepo.save(existing);
      } else {
        await this.cartItemRepo.save(
          this.cartItemRepo.create({
            cartId: userCart.id,
            cart: { id: userCart.id } as EShopCart,
            productId: priced.productId,
            productVariantId: priced.productVariantId,
            quantity: priced.quantity,
            unitPriceSnapshot: priced.unitPrice,
            productNameSnapshot: priced.productName,
            variantNameSnapshot: priced.variantName,
            imageUrlSnapshot: guestItem.imageUrlSnapshot,
          }),
        );
      }
    }

    guest.status = 'abandoned';
    await this.cartRepo.save(guest);

    const merged = await this.touchCart(await this.loadCartWithItems(userCart.id));
    const dto = await this.emitUpdated(store, merged);
    return { cart: dto, cartToken: merged.cartToken };
  }

  async lockForCheckout(
    store: EShopStoreContext,
    context: EShopCartContext,
    reason = 'checkout',
  ): Promise<{ cart: EShopCartDto; cartToken: string }> {
    const { cartToken } = await this.getOrCreateCart(store, context);
    let cart = await this.loadCartWithItems(
      (await this.findByCartToken(store.companyId, cartToken))!.id,
    );
    cart.status = 'checkout_locked';
    cart.lockedAt = new Date();
    cart.lockedReason = reason;
    cart = await this.touchCart(cart);
    const dto = await this.emitUpdated(store, cart);
    return { cart: dto, cartToken: cart.cartToken };
  }

  async unlock(
    store: EShopStoreContext,
    context: EShopCartContext,
  ): Promise<{ cart: EShopCartDto; cartToken: string }> {
    const { cartToken } = await this.getOrCreateCart(store, context);
    let cart = await this.loadCartWithItems(
      (await this.findByCartToken(store.companyId, cartToken))!.id,
    );
    cart.status = 'active';
    cart.lockedAt = null;
    cart.lockedReason = null;
    cart = await this.touchCart(cart);
    const dto = await this.emitUpdated(store, cart);
    return { cart: dto, cartToken: cart.cartToken };
  }

  async resolveCheckoutLines(
    store: EShopStoreContext,
    context: EShopCartContext,
  ): Promise<{
    cart: EShopCart;
    pricedLines: Awaited<
      ReturnType<EShopPricingStockService['resolvePricedLines']>
    >['pricedLines'];
    stockLines: Awaited<
      ReturnType<EShopPricingStockService['resolvePricedLines']>
    >['stockLines'];
    issues: CartIssue[];
  }> {
    const cartToken = context.cartToken?.trim();
    if (!cartToken) {
      throw new BadRequestException('cartToken requerido');
    }
    const cart = await this.findByCartToken(store.companyId, cartToken);
    if (!cart) {
      throw new BadRequestException('Carrito no encontrado o expirado');
    }
    if (!cart.items?.length) {
      throw new BadRequestException('El carrito está vacío');
    }

    const previousPrices = new Map(
      cart.items.map((i) => [
        i.productVariantId,
        Number(i.unitPriceSnapshot) || 0,
      ]),
    );
    const result = await this.pricingStock.resolvePricedLines(store, {
      lines: cart.items.map((i) => ({
        productVariantId: i.productVariantId,
        quantity: Number(i.quantity) || 1,
      })),
      previousPrices,
    });

    return { cart, ...result };
  }

  async markConverted(cartId: string, checkoutAttemptId?: string) {
    const cart = await this.cartRepo.findOne({ where: { id: cartId } });
    if (!cart) return;
    await this.cartItemRepo.delete({ cartId });
    await this.cartRepo.update(
      { id: cartId },
      {
        status: 'converted',
        checkoutAttemptId: checkoutAttemptId ?? cart.checkoutAttemptId,
      },
    );
    this.logger.log(`Cart ${cartId} marked converted`);
  }

  async setCheckoutAttemptId(cartId: string, attemptId: string) {
    await this.cartRepo.update({ id: cartId }, { checkoutAttemptId: attemptId });
  }
}
