package ai.chernobog.companion

object NotificationContentRedactor {
    private val emailPattern =
        Regex(
            """(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b""",
        )

    private val urlPattern =
        Regex(
            """(?i)\b(?:https?://|www\.)\S+""",
        )

    private val credentialPattern =
        Regex(
            """(?i)\b(?:otp|pin|passcode|password|verification\s+code|security\s+code)\s*[:=\-]?\s*[A-Z0-9\-]{4,}\b""",
        )

    private val longNumberPattern =
        Regex(
            """(?<!\w)\+?\d[\d\s().\-]{7,}\d(?!\w)""",
        )

    private val longTokenPattern =
        Regex(
            """\b[A-Za-z0-9_-]{24,}\b""",
        )

    private val whitespacePattern =
        Regex(
            """\s+""",
        )

    fun normalizePlainText(
        value: CharSequence?,
        maxLength: Int,
    ): String? {
        val cleaned =
            value
                ?.toString()
                ?.filter {
                    character ->
                    !character.isISOControl() ||
                        character == '\n' ||
                        character == '\t'
                }
                ?.let {
                    whitespacePattern
                        .replace(
                            it,
                            " ",
                        )
                }
                ?.trim()
                ?.takeIf {
                    it.isNotBlank()
                }
                ?: return null

        return cleaned.take(
            maxLength,
        )
    }

    fun redact(
        value: CharSequence?,
        maxLength: Int,
    ): String? {
        val normalized =
            normalizePlainText(
                value,
                maxLength * 2,
            )
                ?: return null

        val redacted =
            normalized
                .replace(
                    credentialPattern,
                    "[secret]",
                )
                .replace(
                    emailPattern,
                    "[email]",
                )
                .replace(
                    urlPattern,
                    "[link]",
                )
                .replace(
                    longNumberPattern,
                    "[number]",
                )
                .replace(
                    longTokenPattern,
                    "[token]",
                )

        return normalizePlainText(
            redacted,
            maxLength,
        )
    }
}
