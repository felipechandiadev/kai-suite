package com.kaistore.screen.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.kaistore.screen.protocol.DEFAULT_LISTEN_HOST
import com.kaistore.screen.protocol.DEFAULT_LISTEN_PORT
import com.kaistore.screen.protocol.DEFAULT_WSS_LISTEN_PORT
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "kai_screen_agent")

object AgentSettingsKeys {
    val LISTEN_HOST = stringPreferencesKey("listen_host")
    val LISTEN_PORT = stringPreferencesKey("listen_port")
    val WSS_LISTEN_PORT = stringPreferencesKey("wss_listen_port")
    val WSS_ENABLED = booleanPreferencesKey("wss_enabled")
    val AGENT_TOKEN = stringPreferencesKey("agent_token")
}

class DisplayAgentRepository(private val context: Context) {
    suspend fun ensureDefaults() {
        val prefs = context.dataStore.data.first()
        context.dataStore.edit { edit ->
            if (prefs[AgentSettingsKeys.LISTEN_HOST] == null) {
                edit[AgentSettingsKeys.LISTEN_HOST] = DEFAULT_LISTEN_HOST
            }
            if (prefs[AgentSettingsKeys.LISTEN_PORT] == null) {
                edit[AgentSettingsKeys.LISTEN_PORT] = DEFAULT_LISTEN_PORT.toString()
            }
            if (prefs[AgentSettingsKeys.WSS_LISTEN_PORT] == null) {
                edit[AgentSettingsKeys.WSS_LISTEN_PORT] = DEFAULT_WSS_LISTEN_PORT.toString()
            }
            if (prefs[AgentSettingsKeys.WSS_ENABLED] == null) {
                edit[AgentSettingsKeys.WSS_ENABLED] = true
            }
        }
    }

    suspend fun listenHost(): String =
        context.dataStore.data.map { it[AgentSettingsKeys.LISTEN_HOST] ?: DEFAULT_LISTEN_HOST }.first()

    suspend fun listenPort(): Int =
        context.dataStore.data.map {
            it[AgentSettingsKeys.LISTEN_PORT]?.toIntOrNull() ?: DEFAULT_LISTEN_PORT
        }.first()

    suspend fun wssListenPort(): Int =
        context.dataStore.data.map {
            it[AgentSettingsKeys.WSS_LISTEN_PORT]?.toIntOrNull() ?: DEFAULT_WSS_LISTEN_PORT
        }.first()

    suspend fun wssEnabled(): Boolean =
        context.dataStore.data.map { it[AgentSettingsKeys.WSS_ENABLED] != false }.first()

    suspend fun agentToken(): String? =
        context.dataStore.data.map { it[AgentSettingsKeys.AGENT_TOKEN]?.trim()?.ifEmpty { null } }.first()
}
