package ai.chernobog.companion

import android.app.Notification
import android.content.Context
import android.service.notification.StatusBarNotification
import java.time.Instant

object NotificationNormalizer {
    fun normalize(
        context: Context,
        notification:
            StatusBarNotification,
        policy:
            NotificationCapturePolicy,
    ): NotificationSpoolEntity? {
        if (
            !policy.canCaptureMetadata()
        ) {
            return null
        }

        if (
            notification.packageName ==
            context.packageName
        ) {
            return null
        }

        val packageName =
            notification.packageName

        val notificationKey =
            notification.key

        val appLabel =
            runCatching {
                val applicationInfo =
                    context
                        .packageManager
                        .getApplicationInfo(
                            packageName,
                            0,
                        )

                context
                    .packageManager
                    .getApplicationLabel(
                        applicationInfo,
                    )
                    .toString()
            }.getOrNull()

        val androidNotification =
            notification.notification

        val category =
            androidNotification.category

        val channelId =
            androidNotification.channelId

        val extras =
            androidNotification.extras

        val rawTitle =
            NotificationContentRedactor
                .normalizePlainText(
                    extras?.getCharSequence(
                        Notification.EXTRA_TITLE,
                    ),
                    TITLE_LIMIT,
                )

        val rawBody =
            NotificationContentRedactor
                .normalizePlainText(
                    extras?.getCharSequence(
                        Notification.EXTRA_BIG_TEXT,
                    )
                        ?: extras?.getCharSequence(
                            Notification.EXTRA_TEXT,
                        ),
                    BODY_LIMIT,
                )

        val conversationTitle =
            NotificationContentRedactor
                .normalizePlainText(
                    extras?.getCharSequence(
                        Notification.EXTRA_CONVERSATION_TITLE,
                    ),
                    SENDER_LIMIT,
                )

        val correspondenceCategory =
            category ==
                Notification.CATEGORY_MESSAGE ||
                category ==
                    "email"

        val sender =
            if (
                policy.storeSenderIdentity &&
                correspondenceCategory
            ) {
                conversationTitle
                    ?: NotificationContentRedactor
                        .normalizePlainText(
                            rawTitle,
                            SENDER_LIMIT,
                        )
            } else {
                null
            }

        val contentTitle =
            if (
                correspondenceCategory &&
                !policy.storeSenderIdentity
            ) {
                null
            } else {
                rawTitle
            }

        var title:
            String? = null

        var body:
            String? = null

        var redactedTitle:
            String? = null

        var redactedBody:
            String? = null

        if (
            policy.capturesContent()
        ) {
            if (
                policy.usesRedactedContent()
            ) {
                redactedTitle =
                    NotificationContentRedactor
                        .redact(
                            contentTitle,
                            TITLE_LIMIT,
                        )

                redactedBody =
                    if (
                        policy.storeBodies
                    ) {
                        NotificationContentRedactor
                            .redact(
                                rawBody,
                                BODY_LIMIT,
                            )
                    } else {
                        null
                    }
            } else {
                title =
                    contentTitle

                body =
                    if (
                        policy.storeBodies
                    ) {
                        rawBody
                    } else {
                        null
                    }
            }
        }

        val postedAtEpochMs =
            notification.postTime

        return NotificationSpoolEntity(
            eventId =
                NotificationIdentity
                    .stableEventId(
                        packageName =
                            packageName,
                        notificationKey =
                            notificationKey,
                        postedAtEpochMs =
                            postedAtEpochMs,
                    ),
            appPackage =
                packageName,
            appLabel =
                appLabel,
            notificationKey =
                notificationKey,
            category =
                category,
            channelId =
                channelId,
            postedAt =
                Instant
                    .ofEpochMilli(
                        postedAtEpochMs,
                    )
                    .toString(),
            sender =
                sender,
            title =
                title,
            body =
                body,
            redactedTitle =
                redactedTitle,
            redactedBody =
                redactedBody,
            captureMode =
                policy.captureMode,
            receivedAtEpochMs =
                System.currentTimeMillis(),
        )
    }

    private const val TITLE_LIMIT =
        500

    private const val BODY_LIMIT =
        4_000

    private const val SENDER_LIMIT =
        300
}
