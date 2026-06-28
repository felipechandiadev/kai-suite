import { Controller, Get } from '@nestjs/common';

@Controller('')
export class AppController {
  @Get()
  getRoot() {
    return {
      name: 'Kai Platform API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: 'GET /api/health',
        auth: {
          login: 'POST /api/auth/login',
        },
        pointsOfSale: {
          list: 'GET /api/points-of-sale',
        },
        cashSessions: {
          list: 'GET /api/cash-sessions',
          getById: 'GET /api/cash-sessions/:id',
          open: 'POST /api/cash-sessions',
        },
        treasuryAccounts: {
          list: 'GET /api/treasury-accounts',
        },
        customers: {
          create: 'POST /api/customers',
          search: 'GET /api/customers/search',
        },
        products: {
          search: 'GET /api/products/search',
        },
      },
    };
  }
}
