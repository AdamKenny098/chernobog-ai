package ai.chernobog.companion

import java.security.MessageDigest

object NotificationIdentity {
    fun stableEventId(
        packageName: String,
        notificationKey: String,
        postedAtEpochMs: Long,
    ): String {
        val source =
            listOf(
                packageName,
                notificationKey,
                postedAtEpochMs.toString(),
            ).joinToString(
                separator = "\u0000",
            )

        val digest =
            MessageDigest
                .getInstance(
                    "SHA-256",
                )
                .digest(
                    source.toByteArray(
                        Charsets.UTF_8,
                    ),
                )

        val hex =
            digest.joinToString(
                separator = "",
            ) {
                byte ->
                "%02x".format(
                    byte.toInt() and 0xff,
                )
            }

        return "android-$hex"
    }
}
