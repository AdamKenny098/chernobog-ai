package ai.chernobog.companion

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Index
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Update
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Entity(
    tableName = "notification_spool",
    indices = [
        Index(
            value = [
                "receivedAtEpochMs",
            ],
        ),
    ],
)
data class NotificationSpoolEntity(
    @PrimaryKey
    val eventId: String,
    val appPackage: String,
    val appLabel: String?,
    val notificationKey: String?,
    val category: String?,
    val channelId: String?,
    val postedAt: String,
    val sender: String? = null,
    val title: String? = null,
    val body: String? = null,
    val redactedTitle: String? = null,
    val redactedBody: String? = null,
    val captureMode: String,
    val receivedAtEpochMs: Long,
    val attemptCount: Int = 0,
    val lastAttemptAtEpochMs: Long? = null,
) {
    fun enforcePolicy(
        policy:
            NotificationCapturePolicy,
    ): NotificationSpoolEntity {
        if (
            !policy.canCaptureMetadata() ||
            policy.captureMode ==
                "metadata-only"
        ) {
            return copy(
                sender =
                    null,
                title =
                    null,
                body =
                    null,
                redactedTitle =
                    null,
                redactedBody =
                    null,
                captureMode =
                    policy.captureMode,
            )
        }

        val effectiveSender =
            if (
                policy.storeSenderIdentity
            ) {
                sender
            } else {
                null
            }

        if (
            policy.usesRedactedContent()
        ) {
            return copy(
                sender =
                    effectiveSender,
                title =
                    null,
                body =
                    null,
                redactedTitle =
                    NotificationContentRedactor
                        .redact(
                            redactedTitle
                                ?: title,
                            500,
                        ),
                redactedBody =
                    if (
                        policy.storeBodies
                    ) {
                        NotificationContentRedactor
                            .redact(
                                redactedBody
                                    ?: body,
                                4_000,
                            )
                    } else {
                        null
                    },
                captureMode =
                    policy.captureMode,
            )
        }

        return copy(
            sender =
                effectiveSender,
            body =
                if (
                    policy.storeBodies
                ) {
                    body
                } else {
                    null
                },
            redactedTitle =
                null,
            redactedBody =
                null,
            captureMode =
                policy.captureMode,
        )
    }
}

@Dao
interface NotificationSpoolDao {
    @Insert(
        onConflict =
            OnConflictStrategy.IGNORE,
    )
    suspend fun insert(
        item: NotificationSpoolEntity,
    ): Long

    @Update
    suspend fun update(
        item: NotificationSpoolEntity,
    )

    @Query(
        """
        SELECT *
        FROM notification_spool
        ORDER BY receivedAtEpochMs ASC
        LIMIT :limit
        """,
    )
    suspend fun oldest(
        limit: Int,
    ): List<NotificationSpoolEntity>

    @Query(
        """
        DELETE FROM notification_spool
        WHERE eventId IN (:eventIds)
        """,
    )
    suspend fun deleteByEventIds(
        eventIds: List<String>,
    ): Int

    @Query(
        """
        DELETE FROM notification_spool
        """,
    )
    suspend fun deleteAll(): Int

    @Query(
        """
        SELECT COUNT(*)
        FROM notification_spool
        """,
    )
    suspend fun count(): Int

    @Query(
        """
        UPDATE notification_spool
        SET
            attemptCount = attemptCount + 1,
            lastAttemptAtEpochMs = :attemptedAtEpochMs
        WHERE eventId IN (:eventIds)
        """,
    )
    suspend fun markAttempt(
        eventIds: List<String>,
        attemptedAtEpochMs: Long,
    ): Int
}

@Database(
    entities = [
        NotificationSpoolEntity::class,
    ],
    version = 2,
    exportSchema = false,
)
abstract class NotificationSpoolDatabase :
    RoomDatabase() {
    abstract fun notifications():
        NotificationSpoolDao

    companion object {
        @Volatile
        private var instance:
            NotificationSpoolDatabase? =
            null

        private val MIGRATION_1_2 =
            object : Migration(
                1,
                2,
            ) {
                override fun migrate(
                    database:
                        SupportSQLiteDatabase,
                ) {
                    database.execSQL(
                        "ALTER TABLE notification_spool ADD COLUMN sender TEXT",
                    )
                    database.execSQL(
                        "ALTER TABLE notification_spool ADD COLUMN title TEXT",
                    )
                    database.execSQL(
                        "ALTER TABLE notification_spool ADD COLUMN body TEXT",
                    )
                    database.execSQL(
                        "ALTER TABLE notification_spool ADD COLUMN redactedTitle TEXT",
                    )
                    database.execSQL(
                        "ALTER TABLE notification_spool ADD COLUMN redactedBody TEXT",
                    )
                }
            }

        fun get(
            context: Context,
        ): NotificationSpoolDatabase =
            instance
                ?: synchronized(
                    this,
                ) {
                    instance
                        ?: Room
                            .databaseBuilder(
                                context
                                    .applicationContext,
                                NotificationSpoolDatabase::class.java,
                                DATABASE_NAME,
                            )
                            .addMigrations(
                                MIGRATION_1_2,
                            )
                            .build()
                            .also {
                                database ->
                                instance =
                                    database
                            }
                }

        private const val DATABASE_NAME =
            "chernobog-notification-spool.db"
    }
}
