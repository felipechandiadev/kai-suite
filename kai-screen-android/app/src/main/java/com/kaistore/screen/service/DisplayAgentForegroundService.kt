package com.kaistore.screen.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.kaistore.screen.KaiScreenApp
import com.kaistore.screen.R
import com.kaistore.screen.display.CustomerDisplayManager
import com.kaistore.screen.ui.MainActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class DisplayAgentForegroundService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var displayManager: CustomerDisplayManager? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopServer()
                stopSelf()
                return START_NOT_STICKY
            }
        }
        startForeground(NOTIFICATION_ID, buildNotification())
        scope.launch {
            try {
                val app = application as KaiScreenApp
                app.container.repository.ensureDefaults()
                val port = if (app.container.repository.wssEnabled()) {
                    app.container.repository.wssListenPort()
                } else {
                    app.container.repository.listenPort()
                }
                app.container.webSocketServer.start(applicationContext)
                try {
                    displayManager = CustomerDisplayManager(this@DisplayAgentForegroundService, app.container.broadcaster)
                    displayManager?.start()
                } catch (e: Exception) {
                    Log.w(TAG, "Secondary display unavailable; WebSocket agent still running", e)
                }
                val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                nm.notify(NOTIFICATION_ID, buildNotification(port))
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start Kai Screen agent", e)
                stopServer()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        stopServer()
        scope.cancel()
        super.onDestroy()
    }

    private fun stopServer() {
        displayManager?.stop()
        displayManager = null
        (application as? KaiScreenApp)?.container?.webSocketServer?.stop()
    }

    private fun buildNotification(port: Int = 14571): Notification {
        createChannel()
        val pending = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.notification_title))
            .setContentText(getString(R.string.notification_text, port))
            .setSmallIcon(R.drawable.ic_notification)
            .setOngoing(true)
            .setContentIntent(pending)
            .build()
    }

    private fun createChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.notification_channel_name),
            NotificationManager.IMPORTANCE_LOW,
        )
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(channel)
    }

    companion object {
        private const val TAG = "KaiScreenFGS"
        const val CHANNEL_ID = "kai_screen_agent"
        const val NOTIFICATION_ID = 2001
        const val ACTION_STOP = "com.kaistore.screen.STOP"

        fun start(context: Context) {
            val intent = Intent(context, DisplayAgentForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, DisplayAgentForegroundService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }
}
