import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PresaleTicket } from '../domain/presale-ticket.entity';

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 18;
const MAX_RETRIES = 12;

@Injectable()
export class PresaleTicketCodeService {
  constructor(
    @InjectRepository(PresaleTicket)
    private readonly ticketRepository: Repository<PresaleTicket>,
  ) {}

  generateCandidate(): string {
    let out = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      const idx = Math.floor(Math.random() * CODE_ALPHABET.length);
      out += CODE_ALPHABET[idx];
    }
    return out;
  }

  async generateUniqueCode(companyId: string): Promise<string> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const code = this.generateCandidate();
      const exists = await this.ticketRepository.exist({
        where: { companyId, code },
      });
      if (!exists) return code;
    }
    throw new Error('No se pudo generar un código único de ticket de preventa');
  }
}
