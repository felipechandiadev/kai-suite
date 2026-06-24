package com.kaistore.screen.ui.prefs

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.serviceSetupStore: DataStore<Preferences> by preferencesDataStore(name = "screen_service_setup")

class ServiceSetupPrefs(private val context: Context) {
    private val chromeCertAck = booleanPreferencesKey("chrome_cert_acknowledged")

    suspend fun isChromeCertAcknowledged(): Boolean =
        context.serviceSetupStore.data.map { it[chromeCertAck] == true }.first()

    suspend fun setChromeCertAcknowledged(acknowledged: Boolean) {
        context.serviceSetupStore.edit { it[chromeCertAck] = acknowledged }
    }
}
