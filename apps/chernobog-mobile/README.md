# Chernobog Mobile

OH-1J establishes `apps/chernobog-mobile` as the architectural owner of the Android companion.

The accepted Gradle project remains physically at `mobile/android-companion` during this slice because the current PA/Android acceptance estate is path-sensitive to that source root. OH-1J does not redesign, fork, or duplicate the companion.

The mobile application communicates with Chernobog through authenticated HTTPS APIs. It does not own server persistence and must not import or depend on server implementation internals.

Preserved accepted capabilities include enrollment, secure bearer credentials, heartbeat/reconnect, Notification Listener ingress, durable offline notification spool, governed PA transport, the existing Android UI, and the scoped Alkimii Accessibility capture.
