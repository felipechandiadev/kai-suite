package com.kaistore.printers.ui.prefs

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "onboarding")

class OnboardingPrefs(private val context: Context) {
    private val permissionsDone = booleanPreferencesKey("permissions_onboarding_done")
    private val serviceAutostart = booleanPreferencesKey("service_autostart")

    suspend fun isPermissionsOnboardingDone(): Boolean =
        context.dataStore.data.map { it[permissionsDone] == true }.first()

    suspend fun setPermissionsOnboardingDone(done: Boolean) {
        context.dataStore.edit { it[permissionsDone] = done }
    }

    suspend fun isServiceAutostartEnabled(): Boolean =
        context.dataStore.data.map { it[serviceAutostart] == true }.first()

    suspend fun setServiceAutostart(enabled: Boolean) {
        context.dataStore.edit { it[serviceAutostart] = enabled }
    }
}
