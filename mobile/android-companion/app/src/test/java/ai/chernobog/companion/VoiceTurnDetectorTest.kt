package ai.chernobog.companion

import org.junit.Assert.*
import org.junit.Test

class VoiceTurnDetectorTest {
    @Test fun silenceAndClicksDoNotStartATurn() {
        val detector = VoiceTurnDetector()
        repeat(100) { assertEquals(VoiceTurnDetector.Event.NONE, detector.accept(120.0)) }
        repeat(3) { detector.accept(3000.0) }
        detector.accept(100.0)
        assertFalse(detector.active)
    }
    @Test fun shortPausesDoNotSplitSpeechButTrailingSilenceEndsIt() {
        val detector = VoiceTurnDetector()
        repeat(20) { detector.accept(3000.0) }
        repeat(20) { assertEquals(VoiceTurnDetector.Event.NONE, detector.accept(50.0)) }
        repeat(20) { detector.accept(3000.0) }
        repeat(39) { assertEquals(VoiceTurnDetector.Event.NONE, detector.accept(50.0)) }
        assertEquals(VoiceTurnDetector.Event.END, detector.accept(50.0))
        assertFalse(detector.active)
    }
    @Test fun resetDropsUnfinishedSpeechAndLongTurnsAreBounded() {
        val detector = VoiceTurnDetector()
        repeat(10) { detector.accept(2000.0) }
        detector.reset()
        assertFalse(detector.active)
        var ended = false
        repeat(1500) { if (detector.accept(3000.0) == VoiceTurnDetector.Event.END) ended = true }
        assertTrue(ended)
    }
}
