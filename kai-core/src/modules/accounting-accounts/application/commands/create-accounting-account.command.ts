export class CreateAccountingAccountCommand {
  constructor(
    public readonly payload: {
      companyId: string;
      code: string;
      name: string;
      type: string;
      parentId?: string | null;
      isActive?: boolean;
    },
  ) {}
}

