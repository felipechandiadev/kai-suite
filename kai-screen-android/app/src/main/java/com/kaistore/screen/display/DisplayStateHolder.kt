package com.kaistore.screen.display

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

object DisplayStateHolder {
    private val _snapshot = MutableStateFlow(
        CustomerDisplaySnapshot(
            state = "idle",
            pointOfSaleId = "",
            storeName = null,
        ),
    )
    val snapshot: StateFlow<CustomerDisplaySnapshot> = _snapshot.asStateFlow()

    private val _posConnected = MutableStateFlow(false)
    val posConnected: StateFlow<Boolean> = _posConnected.asStateFlow()

    private val _displayAttached = MutableStateFlow(false)
    val displayAttached: StateFlow<Boolean> = _displayAttached.asStateFlow()

    fun setSnapshot(value: CustomerDisplaySnapshot) {
        _snapshot.value = value
    }

    fun setPosConnected(value: Boolean) {
        _posConnected.value = value
    }

    fun setDisplayAttached(value: Boolean) {
        _displayAttached.value = value
    }
}
