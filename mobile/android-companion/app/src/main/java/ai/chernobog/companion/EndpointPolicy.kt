package ai.chernobog.companion

import java.net.URI

object EndpointPolicy {
    fun normalize(
        raw: String,
    ): String {
        val trimmed =
            raw.trim().trimEnd('/')

        require(trimmed.isNotBlank()) {
            "Chernobog endpoint is required."
        }

        val uri =
            try {
                URI(trimmed)
            } catch (_: Exception) {
                throw IllegalArgumentException(
                    "Chernobog endpoint is not a valid URL.",
                )
            }

        require(
            uri.scheme.equals(
                "https",
                ignoreCase = true,
            ),
        ) {
            "Chernobog Companion requires an HTTPS endpoint."
        }

        require(
            !uri.host.isNullOrBlank(),
        ) {
            "Chernobog endpoint must include a hostname."
        }

        require(
            uri.userInfo == null,
        ) {
            "Credentials must not be embedded in the endpoint URL."
        }

        require(
            uri.query == null &&
                uri.fragment == null,
        ) {
            "Chernobog endpoint must not include query parameters or fragments."
        }

        return trimmed
    }

    fun apiUrl(
        endpoint: String,
        path: String,
    ): String {
        val normalized =
            normalize(endpoint)

        val normalizedPath =
            if (path.startsWith("/")) {
                path
            } else {
                "/$path"
            }

        return normalized +
            normalizedPath
    }
}
