import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WebPushClientApp,
  WebPushSubscription,
} from '../domain/web-push-subscription.entity';

@Injectable()
export class WebPushSubscriptionService {
  constructor(
    @InjectRepository(WebPushSubscription)
    private readonly repo: Repository<WebPushSubscription>,
  ) {}

  async upsert(params: {
    userId: string;
    companyId: string;
    clientApp: WebPushClientApp;
    endpoint: string;
    p256dh: string;
    auth: string;
    productionUnitId?: string | null;
  }): Promise<WebPushSubscription> {
    const endpoint = params.endpoint.trim();
    let row = await this.repo.findOne({ where: { endpoint } });
    if (row) {
      row.userId = params.userId;
      row.companyId = params.companyId;
      row.clientApp = params.clientApp;
      row.p256dh = params.p256dh;
      row.auth = params.auth;
      row.productionUnitId = params.productionUnitId?.trim() || null;
      return this.repo.save(row);
    }
    row = this.repo.create({
      userId: params.userId,
      companyId: params.companyId,
      clientApp: params.clientApp,
      endpoint,
      p256dh: params.p256dh,
      auth: params.auth,
      productionUnitId: params.productionUnitId?.trim() || null,
    });
    return this.repo.save(row);
  }

  async removeByEndpoint(endpoint: string, userId?: string): Promise<void> {
    const ep = endpoint.trim();
    if (!ep) return;
    if (userId) {
      await this.repo.delete({ endpoint: ep, userId });
      return;
    }
    await this.repo.delete({ endpoint: ep });
  }

  async listForUser(params: {
    userId: string;
    companyId: string;
    clientApp: WebPushClientApp;
  }): Promise<WebPushSubscription[]> {
    return this.repo.find({
      where: {
        userId: params.userId,
        companyId: params.companyId,
        clientApp: params.clientApp,
      },
    });
  }

  async listForCompanyClient(params: {
    companyId: string;
    clientApp: WebPushClientApp;
  }): Promise<WebPushSubscription[]> {
    return this.repo.find({
      where: {
        companyId: params.companyId,
        clientApp: params.clientApp,
      },
    });
  }
}
