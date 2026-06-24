package com.kaistore.screen.display

import kotlinx.serialization.Serializable

@Serializable
data class CustomerDisplayLine(
    val lineId: String,
    val name: String,
    val quantity: Double,
    val unitPrice: Double,
    val lineTotal: Double,
)

@Serializable
data class CustomerDisplaySnapshot(
    val state: String,
    val pointOfSaleId: String,
    val storeName: String? = null,
    val currency: String = "CLP",
    val lines: List<CustomerDisplayLine> = emptyList(),
    val total: Double = 0.0,
    val itemCount: Int = 0,
    val updatedAt: String = "",
)

@Serializable
data class CustomerDisplayEvent(
    val type: String,
    val pointOfSaleId: String,
    val total: Double? = null,
    val updatedAt: String = "",
)
