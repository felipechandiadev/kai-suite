package com.kaistore.printers.data

import androidx.room.ColumnInfo
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import android.content.Context

@Entity(tableName = "settings")
data class SettingEntity(
    @PrimaryKey val key: String,
    val value: String,
)

@Entity(tableName = "printer_mapping_lines")
data class MappingLineEntity(
    @PrimaryKey val id: String,
    val purpose: String,
    @ColumnInfo(name = "system_printer_name") val systemPrinterName: String,
    @ColumnInfo(name = "sort_order") val sortOrder: Int,
    @ColumnInfo(name = "display_label") val displayLabel: String?,
)

@Entity(tableName = "print_jobs")
data class PrintJobEntity(
    @PrimaryKey val id: String,
    val status: String,
    val purpose: String?,
    val filename: String?,
    @ColumnInfo(name = "payload_ref") val payloadRef: String?,
    val copies: Int,
    @ColumnInfo(name = "created_at") val createdAt: String,
    @ColumnInfo(name = "started_at") val startedAt: String?,
    @ColumnInfo(name = "printed_at") val printedAt: String?,
    val error: String?,
    val priority: Int,
    @ColumnInfo(name = "client_id") val clientId: String?,
    @ColumnInfo(name = "retry_count") val retryCount: Int,
    @ColumnInfo(name = "document_type") val documentType: String?,
    @ColumnInfo(name = "internal_folio") val internalFolio: String?,
    @ColumnInfo(name = "source_app") val sourceApp: String?,
    @ColumnInfo(name = "requested_by") val requestedBy: String?,
    @ColumnInfo(name = "target_system_printer") val targetSystemPrinter: String?,
)

@Dao
interface SettingsDao {
    @Query("SELECT value FROM settings WHERE key = :key LIMIT 1")
    suspend fun get(key: String): String?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun put(entity: SettingEntity)

    @Query("SELECT * FROM settings")
    suspend fun getAll(): List<SettingEntity>
}

@Dao
interface MappingLineDao {
    @Query("SELECT * FROM printer_mapping_lines ORDER BY purpose, sort_order, id")
    suspend fun getAll(): List<MappingLineEntity>

    @Query("DELETE FROM printer_mapping_lines")
    suspend fun deleteAll()

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(lines: List<MappingLineEntity>)
}

@Dao
interface PrintJobDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(job: PrintJobEntity)

    @Query("UPDATE print_jobs SET status = :status, error = :error, printed_at = :printedAt WHERE id = :id")
    suspend fun updateStatus(id: String, status: String, error: String?, printedAt: String?)

    @Query("SELECT * FROM print_jobs ORDER BY priority DESC, created_at ASC LIMIT :limit")
    suspend fun listQueue(limit: Int): List<PrintJobEntity>

    @Query("DELETE FROM print_jobs WHERE id = :id AND status = 'queued'")
    suspend fun dismissQueued(id: String): Int
}

@Database(
    entities = [SettingEntity::class, MappingLineEntity::class, PrintJobEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class AgentDatabase : RoomDatabase() {
    abstract fun settingsDao(): SettingsDao
    abstract fun mappingLineDao(): MappingLineDao
    abstract fun printJobDao(): PrintJobDao
}

fun createAgentDatabase(context: Context): AgentDatabase =
    Room.databaseBuilder(context, AgentDatabase::class.java, "kai_printers_agent.db")
        .fallbackToDestructiveMigration()
        .build()
