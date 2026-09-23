package ai.chernobog.companion

import android.app.Activity
import android.app.Application
import android.os.Bundle
import java.util.concurrent.atomic.AtomicInteger

object AppVisibilityTracker :
    Application.ActivityLifecycleCallbacks {
    private val startedActivities =
        AtomicInteger(
            0,
        )

    @Volatile
    private var registered =
        false

    fun register(
        application: Application,
    ) {
        if (
            registered
        ) {
            return
        }

        synchronized(
            this,
        ) {
            if (
                registered
            ) {
                return
            }

            application
                .registerActivityLifecycleCallbacks(
                    this,
                )

            registered =
                true
        }
    }

    fun appState():
        String =
        if (
            startedActivities
                .get() > 0
        ) {
            "foreground"
        } else {
            "background"
        }

    override fun onActivityStarted(
        activity: Activity,
    ) {
        startedActivities
            .incrementAndGet()
    }

    override fun onActivityStopped(
        activity: Activity,
    ) {
        while (
            true
        ) {
            val current =
                startedActivities
                    .get()

            if (
                current <= 0
            ) {
                startedActivities
                    .set(
                        0,
                    )
                return
            }

            if (
                startedActivities
                    .compareAndSet(
                        current,
                        current - 1,
                    )
            ) {
                return
            }
        }
    }

    override fun onActivityCreated(
        activity: Activity,
        savedInstanceState: Bundle?,
    ) = Unit

    override fun onActivityResumed(
        activity: Activity,
    ) = Unit

    override fun onActivityPaused(
        activity: Activity,
    ) = Unit

    override fun onActivitySaveInstanceState(
        activity: Activity,
        outState: Bundle,
    ) = Unit

    override fun onActivityDestroyed(
        activity: Activity,
    ) = Unit
}
