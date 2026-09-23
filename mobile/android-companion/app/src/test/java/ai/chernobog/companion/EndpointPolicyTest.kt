package ai.chernobog.companion

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class EndpointPolicyTest {
    @Test
    fun normalizesHttpsEndpoint() {
        assertEquals(
            "https://chernobog.example.test",
            EndpointPolicy.normalize(
                " https://chernobog.example.test/ ",
            ),
        )
    }

    @Test
    fun rejectsCleartextHttp() {
        assertThrows(
            IllegalArgumentException::class.java,
        ) {
            EndpointPolicy.normalize(
                "http://chernobog.example.test",
            )
        }
    }

    @Test
    fun rejectsEmbeddedCredentials() {
        assertThrows(
            IllegalArgumentException::class.java,
        ) {
            EndpointPolicy.normalize(
                "https://user:secret@chernobog.example.test",
            )
        }
    }

    @Test
    fun buildsApiUrl() {
        assertEquals(
            "https://chernobog.example.test/api/personal-assistance/mobile/session",
            EndpointPolicy.apiUrl(
                "https://chernobog.example.test/",
                "api/personal-assistance/mobile/session",
            ),
        )
    }
}
