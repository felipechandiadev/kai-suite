import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResultCenter, ResultCenterType } from '../domain/result-center.entity';

@Injectable()
export class ResultCentersService {
  constructor(
    @InjectRepository(ResultCenter)
    private readonly resultCenterRepository: Repository<ResultCenter>,
  ) {}

  async getResultCenterById(id: string) {
    const resultCenter = await this.resultCenterRepository.findOne({
      where: { id },
      relations: ['company', 'branch', 'parent'],
    });

    if (!resultCenter) {
      return null;
    }

    return this.formatResultCenter(resultCenter);
  }

  async getAllResultCenters(params?: {
    includeInactive?: boolean;
    type?: ResultCenterType;
    branchId?: string;
    companyId?: string;
  }) {
    const query = this.resultCenterRepository.createQueryBuilder('rc');

    query.leftJoinAndSelect('rc.company', 'company');
    query.leftJoinAndSelect('rc.branch', 'branch');
    query.leftJoinAndSelect('rc.parent', 'parent');

    if (!params?.includeInactive) {
      query.andWhere('rc.isActive = :isActive', { isActive: true });
    }

    if (params?.type) {
      query.andWhere('rc.type = :type', { type: params.type });
    }

    if (params?.branchId) {
      query.andWhere('rc.branchId = :branchId', { branchId: params.branchId });
    }

    if (params?.companyId) {
      query.andWhere('rc.companyId = :companyId', {
        companyId: params.companyId,
      });
    }

    const resultCenters = await query.orderBy('rc.code', 'ASC').getMany();

    return resultCenters.map((rc) => this.formatResultCenter(rc));
  }

  async createResultCenter(data: {
    companyId: string;
    parentId?: string | null;
    branchId?: string | null;
    code: string;
    name: string;
    description?: string | null;
    type?: ResultCenterType | string;
    isActive?: boolean;
  }) {
    const createData = {
      ...data,
      description: data.description ?? undefined,
      type: (data.type as ResultCenterType) ?? ResultCenterType.OTHER,
    };

    const resultCenter = this.resultCenterRepository.create(
      createData as Partial<ResultCenter>,
    );
    await this.resultCenterRepository.save(resultCenter);

    return this.getResultCenterById(resultCenter.id);
  }

  async updateResultCenter(
    id: string,
    data: Partial<{
      parentId?: string | null;
      branchId?: string | null;
      code: string;
      name: string;
      description?: string | null;
      type?: ResultCenterType | string;
      isActive: boolean;
    }>,
  ) {
    const updateData = { ...data };
    if (updateData.type) {
      (updateData as any).type = updateData.type as ResultCenterType;
    }

    await this.resultCenterRepository.update(id, updateData as any);
    return this.getResultCenterById(id);
  }

  async deleteResultCenter(id: string) {
    await this.resultCenterRepository.delete(id);
    return { success: true };
  }

  private formatResultCenter(resultCenter: ResultCenter) {
    return {
      id: resultCenter.id,
      companyId: resultCenter.companyId,
      parentId: resultCenter.parentId ?? null,
      branchId: resultCenter.branchId ?? null,
      code: resultCenter.code,
      name: resultCenter.name,
      description: resultCenter.description ?? null,
      type: resultCenter.type,
      isActive: resultCenter.isActive,
      createdAt: resultCenter.createdAt,
      updatedAt: resultCenter.updatedAt,
      company: resultCenter.company
        ? { id: resultCenter.company.id, razonSocial: resultCenter.company.razonSocial }
        : null,
      branch: resultCenter.branch
        ? { id: resultCenter.branch.id, name: resultCenter.branch.name }
        : null,
      parent: resultCenter.parent
        ? {
            id: resultCenter.parent.id,
            name: resultCenter.parent.name,
            code: resultCenter.parent.code,
          }
        : null,
    };
  }
}
