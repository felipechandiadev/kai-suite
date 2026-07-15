import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('delivery_settings')
export class EShopDeliverySettings {
  @PrimaryColumn({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'depot_lat', type: 'double precision', nullable: true })
  depotLat!: number | null;

  @Column({ name: 'depot_lng', type: 'double precision', nullable: true })
  depotLng!: number | null;

  @Column({ name: 'depot_address', type: 'varchar', length: 255, nullable: true })
  depotAddress!: string | null;

  @Column({ name: 'region_code', type: 'varchar', length: 64, default: 'maule' })
  regionCode!: string;

  @Column({ name: 'local_delivery_enabled', type: 'boolean', default: false })
  localDeliveryEnabled!: boolean;

  @Column({ name: 'osrm_url', type: 'varchar', length: 500, nullable: true })
  osrmUrl!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
