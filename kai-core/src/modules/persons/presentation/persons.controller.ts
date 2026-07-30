import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { PersonsService } from '../application/persons.service';
import { SiiTaxStatusService } from '../application/sii-tax-status.service';
import { ListPersonsDto } from '../application/dto/list-persons.dto';
import { FindPersonDto } from '../application/dto/find-person.dto';
import { CreatePersonDto } from '../application/dto/create-person.dto';
import { UpdatePersonDto } from '../application/dto/update-person.dto';
import { PersonBankAccountDto } from '../application/dto/person-bank-account.dto';
import { LookupSiiTaxStatusDto } from '../application/dto/lookup-sii-tax-status.dto';
import { LookupPersonByDocumentDto } from '../application/dto/lookup-person-by-document.dto';

@Controller('persons')
export class PersonsController {
  constructor(
    private readonly personsService: PersonsService,
    private readonly siiTaxStatusService: SiiTaxStatusService,
  ) {}

  @Get('sii/tax-status')
  async lookupSiiTaxStatus(@Query() query: LookupSiiTaxStatusDto) {
    try {
      const data = await this.siiTaxStatusService.lookup(query.rut);
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('by-document')
  async lookupByDocument(@Query() query: LookupPersonByDocumentDto) {
    try {
      const data = await this.personsService.findByDocumentNumber({
        documentNumber: query.documentNumber,
        documentType: query.documentType,
        excludePersonId: query.excludePersonId,
      });
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async findAll(@Query() query: ListPersonsDto) {
    try {
      const persons = await this.personsService.findAll(query);

      return {
        success: true,
        data: persons,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query() query: FindPersonDto) {
    try {
      const person = await this.personsService.findOne(id, query.includeInactive);

      return {
        success: true,
        person,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        error instanceof Error && error.message.includes('not found')
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: CreatePersonDto) {
    try {
      const person = await this.personsService.create(data);

      return {
        success: true,
        person,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: UpdatePersonDto) {
    try {
      const person = await this.personsService.update(id, data);

      return {
        success: true,
        person,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        error instanceof Error && error.message.includes('not found')
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    try {
      await this.personsService.remove(id);

      return {
        success: true,
        message: 'Person deleted successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        error instanceof Error && error.message.includes('not found')
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':personId/bank-accounts')
  @HttpCode(HttpStatus.CREATED)
  async addBankAccount(
    @Param('personId') personId: string,
    @Body() accountData: PersonBankAccountDto,
  ) {
    try {
      const person = await this.personsService.addBankAccount(
        personId,
        accountData,
      );

      return {
        success: true,
        person,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        error instanceof Error && error.message.includes('not found')
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':personId/bank-accounts/:accountKey')
  @HttpCode(HttpStatus.OK)
  async removeBankAccount(
    @Param('personId') personId: string,
    @Param('accountKey') accountKey: string,
  ) {
    try {
      await this.personsService.removeBankAccount(personId, accountKey);

      return {
        success: true,
        message: 'Bank account removed successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        error instanceof Error && error.message.includes('not found')
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
