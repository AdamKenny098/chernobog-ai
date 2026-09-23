package ai.chernobog.companion

import android.accessibilityservice.AccessibilityService
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.security.MessageDigest
import java.time.Instant
import java.util.concurrent.Executors

class AlkimiiRosterAccessibilityService :
    AccessibilityService() {
    private val handler =
        Handler(
            Looper.getMainLooper(),
        )

    private val executor =
        Executors.newSingleThreadExecutor()

    private var captureScheduled =
        false

    private val pendingCapture =
        Runnable {
            captureScheduled =
                false
            captureVisibleRoster()
        }

    private val preferences by lazy {
        getSharedPreferences(
            PREFERENCES_NAME,
            MODE_PRIVATE,
        )
    }

    override fun onAccessibilityEvent(
        event: AccessibilityEvent?,
    ) {
        if (
            event?.packageName
                ?.toString() !=
            AlkimiiRosterTransportClient.ALKIMII_PACKAGE
        ) {
            return
        }

        when (
            event.eventType
        ) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED,
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED,
            AccessibilityEvent.TYPE_VIEW_SCROLLED,
            -> {
                scheduleCapture()
            }
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        scheduleCapture()
    }

    override fun onInterrupt() {
        handler.removeCallbacks(
            pendingCapture,
        )
        captureScheduled =
            false
    }

    override fun onDestroy() {
        handler.removeCallbacks(
            pendingCapture,
        )
        captureScheduled =
            false
        executor.shutdownNow()
        super.onDestroy()
    }

    private fun scheduleCapture() {
        if (
            captureScheduled
        ) {
            return
        }

        captureScheduled =
            true

        handler.postDelayed(
            pendingCapture,
            CAPTURE_DELAY_MS,
        )
    }

    private fun captureVisibleRoster() {
        val root =
            rootInActiveWindow
                ?: return

        if (
            root.packageName
                ?.toString() !=
            AlkimiiRosterTransportClient.ALKIMII_PACKAGE
        ) {
            return
        }

        val nodes =
            mutableListOf<String>()

        collectVisibleText(
            root,
            nodes,
        )

        val normalized =
            nodes
                .map {
                    it
                        .replace(
                            Regex(
                                "\\s+",
                            ),
                            " ",
                        )
                        .trim()
                }
                .filter {
                    it.isNotBlank()
                }
                .fold(
                    mutableListOf<String>(),
                ) {
                    acc,
                    value ->
                    if (
                        acc.lastOrNull() !=
                        value
                    ) {
                        acc.add(
                            value,
                        )
                    }

                    acc
                }
                .take(
                    MAX_NODES,
                )

        if (
            !looksLikeRoster(
                normalized,
            )
        ) {
            return
        }

        val hash =
            sha256(
                normalized.joinToString(
                    "\n",
                ),
            )

        if (
            hash ==
            preferences.getString(
                KEY_LAST_CAPTURE_HASH,
                null,
            )
        ) {
            return
        }

        executor.execute {
            preferences
                .edit()
                .putLong(
                    KEY_LAST_ATTEMPT_AT,
                    System.currentTimeMillis(),
                )
                .apply()

            val credentials =
                readEnrollmentCredentials()

            if (
                credentials ==
                null
            ) {
                preferences
                    .edit()
                    .putLong(
                        KEY_LAST_FAILURE_AT,
                        System.currentTimeMillis(),
                    )
                    .apply()

                Log.w(
                    TAG,
                    "Alkimii roster upload skipped: enrollment credentials unavailable.",
                )
                return@execute
            }

            runCatching {
                AlkimiiRosterTransportClient()
                    .upload(
                        endpoint =
                            credentials.first,
                        token =
                            credentials.second,
                        captureId =
                            "alkimii-accessibility-$hash",
                        observedAt =
                            Instant
                                .now()
                                .toString(),
                        nodes =
                            normalized,
                    )
            }
                .onSuccess {
                    preferences
                        .edit()
                        .putString(
                            KEY_LAST_CAPTURE_HASH,
                            hash,
                        )
                        .putLong(
                            KEY_LAST_UPLOAD_AT,
                            System.currentTimeMillis(),
                        )
                        .remove(
                            KEY_LAST_FAILURE_AT,
                        )
                        .apply()

                    Log.i(
                        TAG,
                        "Alkimii roster upload accepted.",
                    )
                }
                .onFailure {
                    error ->
                    preferences
                        .edit()
                        .putLong(
                            KEY_LAST_FAILURE_AT,
                            System.currentTimeMillis(),
                        )
                        .apply()

                    Log.w(
                        TAG,
                        "Alkimii roster upload failed: ${error.javaClass.simpleName}",
                    )
                }
        }
    }

    private fun collectVisibleText(
        node:
            AccessibilityNodeInfo,
        output:
            MutableList<String>,
    ) {
        if (
            output.size >=
            MAX_NODES
        ) {
            return
        }

        node.text
            ?.toString()
            ?.takeIf {
                it.isNotBlank()
            }
            ?.let {
                output.add(
                    it,
                )
            }

        node.contentDescription
            ?.toString()
            ?.takeIf {
                it.isNotBlank()
            }
            ?.let {
                output.add(
                    it,
                )
            }

        for (
            index in
            0 until
            node.childCount
        ) {
            val child =
                node.getChild(
                    index,
                )
                    ?: continue

            try {
                collectVisibleText(
                    child,
                    output,
                )
            } finally {
                child.recycle()
            }
        }
    }

    private fun looksLikeRoster(
        nodes:
            List<String>,
    ): Boolean {
        if (
            nodes.size <
            3
        ) {
            return false
        }

        val combined =
            nodes
                .joinToString(
                    " ",
                )
                .lowercase()

        val hasRosterMarker =
            Regex(
                "\\b(my schedule|schedule|roster|rota|shift|shifts)\\b",
            ).containsMatchIn(
                combined,
            )

        val hasTime =
            Regex(
                "\\b\\d{1,2}:\\d{2}\\b",
            ).containsMatchIn(
                combined,
            )

        val hasExplicitDate =
            Regex(
                "\\b\\d{1,2}[/.\\-]\\d{1,2}\\b|\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\b",
                RegexOption.IGNORE_CASE,
            ).containsMatchIn(
                combined,
            )

        val hasWeekRange =
            Regex(
                "\\b\\d{1,2}\\s*(?:-|\\u2013|\\u2014)\\s*\\d{1,2}\\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\b",
                RegexOption.IGNORE_CASE,
            ).containsMatchIn(
                combined,
            )

        val hasSplitWeekdayDay =
            nodes
                .windowed(
                    size = 2,
                    step = 1,
                    partialWindows = false,
                )
                .any {
                    pair ->
                    Regex(
                        "^(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day)?$",
                        RegexOption.IGNORE_CASE,
                    ).matches(
                        pair[0],
                    ) &&
                    Regex(
                        "^\\d{1,2}$",
                    ).matches(
                        pair[1],
                    )
                }

        val hasDate =
            hasExplicitDate ||
            hasWeekRange ||
            hasSplitWeekdayDay

        if (
            !hasRosterMarker ||
            !hasTime ||
            !hasDate
        ) {
            Log.d(
                TAG,
                "Roster candidate rejected: marker=$hasRosterMarker time=$hasTime date=$hasDate explicitDate=$hasExplicitDate weekRange=$hasWeekRange splitWeekdayDay=$hasSplitWeekdayDay",
            )
        }

        return hasRosterMarker &&
            hasTime &&
            hasDate
    }

    private fun readEnrollmentCredentials():
        Pair<String, String>? {
        return runCatching {
            val store =
                SecureCredentialStore(
                    applicationContext,
                )

            val endpoint =
                store
                    .savedEndpoint()
                    .trim()

            val token =
                store
                    .savedToken()
                    ?.trim()

            if (
                endpoint.isBlank() ||
                token.isNullOrBlank()
            ) {
                null
            } else {
                endpoint to
                    token
            }
        }
            .onFailure {
                error ->
                Log.w(
                    TAG,
                    "Unable to read enrolled Chernobog credentials: ${error.javaClass.simpleName}",
                )
            }
            .getOrNull()
    }

    private fun sha256(
        value: String,
    ): String {
        return MessageDigest
            .getInstance(
                "SHA-256",
            )
            .digest(
                value.toByteArray(
                    Charsets.UTF_8,
                ),
            )
            .joinToString(
                "",
            ) {
                byte ->
                "%02x".format(
                    byte,
                )
            }
    }

    companion object {
        private const val CAPTURE_DELAY_MS =
            1_250L

        private const val MAX_NODES =
            500

        private const val PREFERENCES_NAME =
            "chernobog_alkimii_roster_v2"

        private const val KEY_LAST_CAPTURE_HASH =
            "last_capture_hash"

        private const val KEY_LAST_UPLOAD_AT =
            "last_upload_at"

        private const val KEY_LAST_ATTEMPT_AT =
            "last_attempt_at"

        private const val KEY_LAST_FAILURE_AT =
            "last_failure_at"

        private const val TAG =
            "ChernobogPA4"
    }
}
