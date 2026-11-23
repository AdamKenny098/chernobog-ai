package ai.chernobog.companion

class VoiceTurnDetector {
    var active = false
        private set
    private var onset = 0
    private var quiet = 0
    private var frames = 0
    private var noise = 180.0

    enum class Event { NONE, START, END, DISCARD }

    fun accept(rms: Double): Event {
        val voiced = rms > maxOf(650.0, noise * 3.0)
        if (!active) {
            if (!voiced) noise = (noise * 0.98 + rms.coerceAtMost(600.0) * 0.02)
            onset = if (voiced) onset + 1 else 0
            if (onset < 4) return Event.NONE
            active = true
            frames = 4
            quiet = 0
            return Event.START
        }
        frames++
        quiet = if (voiced) 0 else quiet + 1
        if (quiet >= 70 || frames >= 1500) {
            val useful = frames - quiet >= 12
            reset()
            return if (useful) Event.END else Event.DISCARD
        }
        return Event.NONE
    }

    fun reset() { active = false; onset = 0; quiet = 0; frames = 0 }
}
