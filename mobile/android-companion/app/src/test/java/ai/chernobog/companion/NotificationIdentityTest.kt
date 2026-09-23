package ai.chernobog.companion

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class NotificationIdentityTest {
    @Test
    fun stableAcrossRetries() {
        val first =
            NotificationIdentity
                .stableEventId(
                    packageName =
                        "com.example.app",
                    notificationKey =
                        "key-1",
                    postedAtEpochMs =
                        123456789L,
                )

        val second =
            NotificationIdentity
                .stableEventId(
                    packageName =
                        "com.example.app",
                    notificationKey =
                        "key-1",
                    postedAtEpochMs =
                        123456789L,
                )

        assertEquals(
            first,
            second,
        )
    }

    @Test
    fun changesForDifferentPosting() {
        val first =
            NotificationIdentity
                .stableEventId(
                    packageName =
                        "com.example.app",
                    notificationKey =
                        "key-1",
                    postedAtEpochMs =
                        123456789L,
                )

        val second =
            NotificationIdentity
                .stableEventId(
                    packageName =
                        "com.example.app",
                    notificationKey =
                        "key-1",
                    postedAtEpochMs =
                        123456790L,
                )

        assertNotEquals(
            first,
            second,
        )
    }
}
