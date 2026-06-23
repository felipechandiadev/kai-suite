package com.kaistore.printers.boot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.kaistore.printers.service.PrintAgentForegroundService
import com.kaistore.printers.ui.prefs.OnboardingPrefs
import kotlinx.coroutines.runBlocking

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return
        val prefs = OnboardingPrefs(context)
        val autostart = runBlocking { prefs.isServiceAutostartEnabled() }
        if (autostart) {
            PrintAgentForegroundService.start(context)
        }
    }
}
