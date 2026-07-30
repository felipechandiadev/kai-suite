import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'forbidLegacyAttachments', async: false })
export class ForbidLegacyAttachmentsConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    if (value === undefined || value === null) {
      return true;
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    return !Object.prototype.hasOwnProperty.call(value, 'attachments');
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'metadata.attachments is no longer supported; use multimediaAssetIds instead';
  }
}