import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DiningRoom } from './dining-room.entity';
import { TableShape } from './dining.enums';

@Entity('dining_tables')
@Index('idx_dining_tables_room_id', ['diningRoomId'])
@Index('uq_dining_tables_room_code', ['diningRoomId', 'code'], { unique: true })
export class DiningTable {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'dining_room_id', type: 'uuid' })
  diningRoomId!: string;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  label!: string;

  @Column({ type: 'int', default: 2 })
  capacity!: number;

  @Column({ type: 'enum', enum: TableShape, enumName: 'table_shape_enum', default: TableShape.RECT })
  shape!: TableShape;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  x!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  y!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 80 })
  width!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 80 })
  height!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  rotation!: number;

  @Column({ name: 'merge_group_id', type: 'uuid', nullable: true })
  mergeGroupId?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => DiningRoom, (room) => room.tables, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dining_room_id' })
  diningRoom?: DiningRoom;
}
