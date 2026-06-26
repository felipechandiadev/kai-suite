package com.kaistore.screen.display

import android.app.Presentation
import android.content.Context
import android.hardware.display.DisplayManager
import android.os.Bundle
import android.view.Display
import androidx.compose.ui.platform.ComposeView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import com.kaistore.screen.protocol.EventBroadcaster
import com.kaistore.screen.ui.CustomerCartScreen

class CustomerDisplayPresentation(
    context: Context,
    display: Display,
    private val broadcaster: EventBroadcaster,
) : Presentation(context, display), LifecycleOwner, SavedStateRegistryOwner {

    private val lifecycleRegistry = LifecycleRegistry(this)
    private val savedStateRegistryController = SavedStateRegistryController.create(this)

    override val lifecycle: Lifecycle get() = lifecycleRegistry
    override val savedStateRegistry: SavedStateRegistry
        get() = savedStateRegistryController.savedStateRegistry

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        savedStateRegistryController.performRestore(savedInstanceState)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
        val composeView = ComposeView(context).apply {
            setViewTreeLifecycleOwner(this@CustomerDisplayPresentation)
            setViewTreeSavedStateRegistryOwner(this@CustomerDisplayPresentation)
            setContent {
                CustomerCartScreen()
            }
        }
        setContentView(composeView)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)
    }

    override fun onStop() {
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)
        super.onStop()
    }
}

class CustomerDisplayManager(
    private val context: Context,
    private val broadcaster: EventBroadcaster,
) {
    private var presentation: CustomerDisplayPresentation? = null
    private val displayListener = object : DisplayManager.DisplayListener {
        override fun onDisplayAdded(displayId: Int) = refresh()
        override fun onDisplayRemoved(displayId: Int) = refresh()
        override fun onDisplayChanged(displayId: Int) = refresh()
    }

    fun start() {
        val dm = context.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
        dm.registerDisplayListener(displayListener, null)
        refresh()
    }

    fun stop() {
        val dm = context.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
        dm.unregisterDisplayListener(displayListener)
        presentation?.dismiss()
        presentation = null
        DisplayStateHolder.setDisplayAttached(false)
        broadcaster.emitDisplayStatus(
            connected = DisplayStateHolder.posConnected.value,
            displayAttached = false,
            message = "display_missing",
        )
    }

    private fun refresh() {
        val dm = context.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
        val secondary = dm.displays.firstOrNull { it.displayId != Display.DEFAULT_DISPLAY }
        if (secondary == null) {
            presentation?.dismiss()
            presentation = null
            DisplayStateHolder.setDisplayAttached(false)
            broadcaster.emitDisplayStatus(
                connected = DisplayStateHolder.posConnected.value,
                displayAttached = false,
                message = "display_missing",
            )
            return
        }
        if (presentation?.display?.displayId == secondary.displayId) {
            DisplayStateHolder.setDisplayAttached(true)
            return
        }
        presentation?.dismiss()
        presentation = CustomerDisplayPresentation(context, secondary, broadcaster).also {
            try {
                it.show()
                DisplayStateHolder.setDisplayAttached(true)
                broadcaster.emitDisplayStatus(
                    connected = DisplayStateHolder.posConnected.value,
                    displayAttached = true,
                )
            } catch (e: Exception) {
                presentation = null
                DisplayStateHolder.setDisplayAttached(false)
                broadcaster.emitDisplayStatus(
                    connected = DisplayStateHolder.posConnected.value,
                    displayAttached = false,
                    message = "display_missing",
                )
            }
        }
    }
}
