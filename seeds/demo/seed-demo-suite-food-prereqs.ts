import type { DataSource, Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { Company } from '@modules/companies/domain/company.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { CashHub } from '@modules/cash-hubs/domain/cash-hub.entity';
import { Tax, TaxType } from '@modules/taxes/domain/tax.entity';
import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';
import { Person, PersonType, DocumentType } from '@modules/persons/domain/person.entity';
import { Supplier, SupplierType } from '@modules/suppliers/domain/supplier.entity';
import {
  Employee,
  EmployeeStatus,
  EmploymentType,
  WorkRegime,
} from '@modules/employees/domain/employee.entity';
import { EmploymentContract } from '@modules/employees/domain/employment-contract.entity';
import {
  EmploymentContractKind,
  EmploymentContractStatus,
  EmploymentLaborType,
  ExtraHoursMode,
  SalesCommissionType,
} from '@modules/employees/domain/employment-contract.enums';
import { OrganizationalUnit } from '@modules/organizational-units/domain/organizational-unit.entity';
import { IsNull } from 'typeorm';
import {
  SEED_CASH_HUBS,
  SEED_DEV_SHAREHOLDERS,
  buildSeedCompanyBankAccounts,
  buildSeedCompanyPaymentCatalog,
  buildSeedPosPaymentList,
} from './config';

const SEED_IVA_DESCRIPTION =
  'Impuesto al Valor Agregado (IVA) 19% — seed demo';

/** Proveedores mínimos para el plan de compras Food. */
const FOOD_SUPPLIER_SEEDS: readonly {
  documentNumber: string;
  businessName: string;
  alias: string;
  supplierType: SupplierType;
}[] = [
  {
    documentNumber: '76.123.456-0',
    businessName: 'Comercial Andes SpA',
    alias: 'Andes',
    supplierType: SupplierType.DISTRIBUTOR,
  },
  {
    documentNumber: '77.987.654-3',
    businessName: 'Mayorista Central SPA',
    alias: 'Mayorista Central',
    supplierType: SupplierType.WHOLESALER,
  },
];

const WAITER_DOCS = [
  '17.100.009-2',
  '17.100.010-6',
  '17.100.011-4',
] as const;

/**
 * Tesorería, proveedores, IVA y meseros tipsEligible en Kai Food
 * (prerrequisitos de recepciones + ventas salón con propina).
 */
export async function seedDemoSuiteFoodOperationalPrereqs(input: {
  dataSource: DataSource;
  companyFood: Company;
  branchId: string;
}): Promise<void> {
  const { dataSource, companyFood, branchId } = input;

  await TenantContext.run(
    { activeCompanyId: companyFood.id, userId: null, rol: null },
    async () => {
      const companyRepo = dataSource.getRepository(Company);
      const taxRepo = dataSource.getRepository(Tax);
      const cashHubRepo = dataSource.getRepository(CashHub);
      const posRepo = dataSource.getRepository(PointOfSale);
      const branchRepo = dataSource.getRepository(Branch);
      const shareholderRepo = dataSource.getRepository(Shareholder);
      const personRepo = dataSource.getRepository(Person);
      const supplierRepo = dataSource.getRepository(Supplier);
      const employeeRepo = dataSource.getRepository(Employee);
      const contractRepo = dataSource.getRepository(EmploymentContract);

      let company = await companyRepo.findOne({ where: { id: companyFood.id } });
      if (!company) {
        throw new Error(`Kai Food no encontrada: ${companyFood.id}`);
      }

      const seedBankRows = buildSeedCompanyBankAccounts(company.razonSocial);
      const byKey = new Map(
        (company.bankAccounts ?? []).map((a) => [
          a.accountKey ?? `${String(a.bankName)}_${a.accountNumber}`,
          a,
        ] as const),
      );
      for (const row of seedBankRows) {
        byKey.set(row.accountKey!, row);
      }
      company.bankAccounts = Array.from(byKey.values());

      const paymentCatalog = buildSeedCompanyPaymentCatalog();
      company.settings = {
        ...((company.settings as Record<string, unknown>) ?? {}),
        paymentMethods: paymentCatalog,
      };
      await companyRepo.save(company);
      console.log(
        `✅ Kai Food: cuentas bancarias + catálogo medios de pago (${seedBankRows.length})`,
      );

      let ivaTax = await taxRepo.findOne({
        where: {
          companyId: companyFood.id,
          name: 'IVA',
          taxType: TaxType.IVA,
        },
      });
      if (!ivaTax) {
        ivaTax = taxRepo.create({
          companyId: companyFood.id,
          name: 'IVA',
          rate: 19,
          taxType: TaxType.IVA,
          isActive: true,
          description: SEED_IVA_DESCRIPTION,
        });
      } else {
        ivaTax.rate = 19;
        ivaTax.description = SEED_IVA_DESCRIPTION;
        ivaTax.isActive = true;
      }
      await taxRepo.save(ivaTax);
      console.log(`✅ Kai Food: IVA 19% id=${ivaTax.id}`);

      const branch = await branchRepo.findOne({ where: { id: branchId } });
      const posList = await posRepo.find({
        where: { companyId: companyFood.id },
        order: { name: 'ASC' },
      });
      const posPaymentList = buildSeedPosPaymentList(paymentCatalog);
      for (const pos of posList) {
        pos.settings = {
          ...((pos.settings as Record<string, unknown>) ?? {}),
          paymentMethods: posPaymentList,
          kind: 'SALE',
        };
        await posRepo.save(pos);
      }

      for (let i = 0; i < SEED_CASH_HUBS.length; i++) {
        const hubDef = SEED_CASH_HUBS[i]!;
        let hub = await cashHubRepo.findOne({
          where: { companyId: companyFood.id, code: hubDef.code },
        });
        if (!hub) {
          hub = cashHubRepo.create({
            companyId: companyFood.id,
            name: hubDef.name,
            code: hubDef.code,
            isActive: true,
          });
          await cashHubRepo.save(hub);
        } else {
          hub.name = hubDef.name;
          await cashHubRepo.save(hub);
        }
        if (branch) {
          hub.branches = [branch];
        }
        const linkedPos = posList[i] ?? posList[0];
        if (linkedPos) {
          hub.pointsOfSale = [linkedPos];
          await cashHubRepo.save(hub);
          linkedPos.defaultCashHubId = hub.id;
          await posRepo.save(linkedPos);
        }
        console.log(
          `✅ Kai Food: hub «${hub.name}» (${hub.code}) → POS «${linkedPos?.name ?? '—'}»`,
        );
      }

      for (const sh of SEED_DEV_SHAREHOLDERS) {
        let person = await personRepo.findOne({
          where: {
            documentNumber: sh.documentNumber,
            deletedAt: null as never,
          },
        });
        if (!person) {
          person = personRepo.create({
            type: PersonType.NATURAL,
            firstName: sh.firstName,
            lastName: sh.lastName,
            documentType: sh.documentType,
            documentNumber: sh.documentNumber,
          });
          person = await personRepo.save(person);
        }
        let shRow = await shareholderRepo.findOne({
          where: {
            companyId: companyFood.id,
            personId: person.id,
            deletedAt: null as never,
          },
        });
        if (!shRow) {
          shRow = shareholderRepo.create({
            companyId: companyFood.id,
            personId: person.id,
            ownershipPercentage: sh.ownershipPercentage,
            partnerType: sh.partnerType,
            joinDate: sh.joinDate,
            isActive: true,
          });
        } else {
          shRow.ownershipPercentage = sh.ownershipPercentage;
          shRow.partnerType = sh.partnerType;
          shRow.joinDate = sh.joinDate;
          shRow.isActive = true;
        }
        await shareholderRepo.save(shRow);
      }
      console.log(`✅ Kai Food: socios seed (${SEED_DEV_SHAREHOLDERS.length})`);

      for (const item of FOOD_SUPPLIER_SEEDS) {
        let person = await personRepo.findOne({
          where: {
            documentNumber: item.documentNumber,
            deletedAt: null as never,
          },
        });
        if (!person) {
          person = personRepo.create({
            type: PersonType.COMPANY,
            firstName: item.businessName,
            businessName: item.businessName,
            documentType: DocumentType.RUT,
            documentNumber: item.documentNumber,
          });
          person = await personRepo.save(person);
        }

        let supplier = await supplierRepo.findOne({
          where: {
            companyId: companyFood.id,
            personId: person.id,
          },
          withDeleted: true,
        });
        if (!supplier) {
          supplier = supplierRepo.create({
            companyId: companyFood.id,
            personId: person.id,
            supplierType: item.supplierType,
            alias: item.alias,
            defaultPaymentTermDays: 30,
            isActive: true,
            notes: 'Proveedor seed Kai Food',
          });
        } else {
          if (supplier.deletedAt) {
            supplier = await supplierRepo.recover(supplier);
          }
          supplier.alias = item.alias;
          supplier.supplierType = item.supplierType;
          supplier.isActive = true;
          supplier.companyId = companyFood.id;
        }
        await supplierRepo.save(supplier);
        console.log(`✅ Kai Food: proveedor «${item.alias}» id=${supplier.id}`);
      }

      await ensureFoodWaiterEmployees({
        companyId: companyFood.id,
        branchId,
        personRepo,
        employeeRepo,
        contractRepo,
        laborUnitRepo: dataSource.getRepository(OrganizationalUnit),
      });
    },
  );
}

async function ensureFoodWaiterEmployees(ctx: {
  companyId: string;
  branchId: string;
  personRepo: Repository<Person>;
  employeeRepo: Repository<Employee>;
  contractRepo: Repository<EmploymentContract>;
  laborUnitRepo: Repository<OrganizationalUnit>;
}): Promise<void> {
  const {
    companyId,
    branchId,
    personRepo,
    employeeRepo,
    contractRepo,
    laborUnitRepo,
  } = ctx;

  let salonLu = await laborUnitRepo.findOne({
    where: { companyId, code: 'UL00002', deletedAt: IsNull() },
  });
  if (!salonLu) {
    salonLu = await laborUnitRepo.save(
      laborUnitRepo.create({
        companyId,
        code: 'UL00002',
        name: 'Salón restaurante',
        description: 'Unidad laboral Kai Food (meseros).',
        isActive: true,
      }),
    );
  }

  for (const documentNumber of WAITER_DOCS) {
    const person = await personRepo.findOne({
      where: { documentNumber, deletedAt: null as never },
    });
    if (!person) {
      console.warn(
        `⚠️ Kai Food: persona mesero ${documentNumber} no existe aún; se omite empleado`,
      );
      continue;
    }

    let employee = await employeeRepo.findOne({
      where: { companyId, personId: person.id, deletedAt: null as never },
      withDeleted: true,
    });
    if (!employee) {
      employee = employeeRepo.create({
        companyId,
        personId: person.id,
        branchId,
        laborUnitId: salonLu.id,
        employmentType: EmploymentType.FULL_TIME,
        status: EmployeeStatus.ACTIVE,
        hireDate: '2025-01-01',
        baseSalary: '550000',
        workRegime: WorkRegime.ORDINARY,
      });
    } else {
      if (employee.deletedAt) {
        employee = await employeeRepo.recover(employee);
      }
      employee.status = EmployeeStatus.ACTIVE;
      employee.laborUnitId = salonLu.id;
      employee.branchId = branchId;
    }
    employee = await employeeRepo.save(employee);

    let contract = await contractRepo.findOne({
      where: {
        companyId,
        employeeId: employee.id,
        status: EmploymentContractStatus.ACTIVE,
      },
    });
    if (!contract) {
      contract = contractRepo.create({
        companyId,
        employeeId: employee.id,
        branchId,
        status: EmploymentContractStatus.ACTIVE,
        startDate: '2025-01-01',
        kind: EmploymentContractKind.LABOR,
        laborType: EmploymentLaborType.INDEFINITE,
        workRegime: WorkRegime.ORDINARY,
        weeklyHours: '45',
        extraHoursMode: ExtraHoursMode.PAID_OVERTIME,
        mealAllowance: '0',
        transportAllowance: '0',
        tipsEligible: true,
        salesCommissionType: SalesCommissionType.NONE,
      });
    } else {
      contract.tipsEligible = true;
      contract.branchId = branchId;
      contract.status = EmploymentContractStatus.ACTIVE;
    }
    await contractRepo.save(contract);
    console.log(
      `✅ Kai Food: mesero empleado tipsEligible ${documentNumber} employeeId=${employee.id}`,
    );
  }
}
