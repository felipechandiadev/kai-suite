import { Injectable, Logger } from '@nestjs/common';
import { Worker, type ConnectionOptions } from 'bullmq';
import * as fs from 'node:fs';
import * as path from 'node:path';
import Handlebars from 'handlebars';
import nodemailer from 'nodemailer';
import type { SendMailDto } from './mail.service';

@Injectable()
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);
  private worker: Worker | null = null;
  private readonly templateCache = new Map<string, Handlebars.TemplateDelegate>();

  startWorker(connection: ConnectionOptions) {
    this.worker = new Worker(
      'mail-send',
      async (job) => {
        await this.send(job.data as SendMailDto);
      },
      { connection },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`);
    });
  }

  async stopWorker() {
    await this.worker?.close();
    this.worker = null;
  }

  private async send(dto: SendMailDto) {
    const html = this.render(dto.template, dto.variables ?? {});
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: Number(process.env.SMTP_PORT) || 1025,
      secure: false,
      ignoreTLS: true,
    });
    const from = process.env.MAIL_FROM || 'noreply@kaistore.local';
    await transport.sendMail({
      from,
      to: dto.to,
      replyTo: dto.replyTo,
      subject: this.subjectForTemplate(dto.template, dto.variables ?? {}),
      html,
    });
    this.logger.log(`Sent ${dto.template} → ${dto.to}`);
  }

  private subjectForTemplate(template: string, vars: Record<string, string>) {
    const order = vars.orderNumber ?? '';
    const map: Record<string, string> = {
      'order.received': `Pedido recibido ${order}`.trim(),
      'order.confirmed': `Pedido confirmado ${order}`.trim(),
      'order.preparing': `Pedido en preparación ${order}`.trim(),
      'order.ready_pickup': `Pedido listo para retiro ${order}`.trim(),
      'order.shipped': `Pedido despachado ${order}`.trim(),
      'order.completed': `Pedido entregado ${order}`.trim(),
      'order.cancelled': `Pedido cancelado ${order}`.trim(),
      'customer.verify_email': 'Verifica tu correo — Mi cuenta',
    };
    return map[template] ?? `Notificación ${template}`;
  }

  private render(template: string, variables: Record<string, string>) {
    const compiled = this.loadTemplate(template);
    return compiled(variables);
  }

  private loadTemplate(template: string) {
    const cached = this.templateCache.get(template);
    if (cached) return cached;
    const file = path.join(__dirname, 'templates', `${template}.hbs`);
    const fallback = path.join(__dirname, 'templates', 'default.hbs');
    const source = fs.existsSync(file)
      ? fs.readFileSync(file, 'utf8')
      : fs.readFileSync(fallback, 'utf8');
    const compiled = Handlebars.compile(source);
    this.templateCache.set(template, compiled);
    return compiled;
  }
}
