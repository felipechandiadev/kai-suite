import type {
  NotificationAudienceType,
  NotificationDomain,
  NotificationSeverity,
  NotificationSource,
} from '../../domain/notification.enums';

export type NotificationAudienceSpec = {
  audienceType: NotificationAudienceType;
  audienceConfig: Record<string, unknown>;
};

export class PublishNotificationCommand {
  companyId!: string;
  source!: NotificationSource;
  domain!: NotificationDomain;
  kind!: string;
  severity!: NotificationSeverity;
  title!: string;
  body?: string | null;
  payload!: Record<string, unknown>;
  entityType?: string | null;
  entityId?: string | null;
  groupKey?: string | null;
  actorUserId?: string | null;
  audiences!: NotificationAudienceSpec[];
}
