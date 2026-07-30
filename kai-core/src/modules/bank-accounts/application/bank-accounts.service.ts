import { Injectable } from '@nestjs/common';

@Injectable()
export class BankAccountsService {
  async getCashBalance() {
    return { balance: 0 };
  }

  async list() {
    return [];
  }

  async findOne() {
    return null;
  }

  async create() {
    return { success: true };
  }

  async update() {
    return { success: true };
  }

  async remove() {
    return { success: true };
  }
}
