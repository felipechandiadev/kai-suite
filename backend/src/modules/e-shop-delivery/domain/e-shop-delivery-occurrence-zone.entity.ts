import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('e_shop_delivery_occurrence_zones')
@Index('idx_e_shop_delivery_occurrence_zones_zone', ['zoneId'])
export class EShopDeliveryOccurrenceZone {
  @PrimaryColumn({ name: 'occurrence_id', type: 'uuid' })
  occurrenceId!: string;

  @PrimaryColumn({ name: 'zone_id', type: 'uuid' })
  zoneId!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;
}
