package com.kaistore.printers.print

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** `null` JSON y tipos incorrectos devuelven null (no lanzan como `.jsonObject`). */
fun JsonElement?.jsonObj(): JsonObject? = when (this) {
    is JsonObject -> this
    else -> null
}

fun JsonElement?.jsonArr(): JsonArray? = when (this) {
    is JsonArray -> this
    else -> null
}

fun JsonElement?.jsonStr(): String? {
    if (this == null || this is JsonNull) return null
    val p = this as? JsonPrimitive ?: return null
    if (!p.isString) return null
    return p.content
}

fun JsonElement?.jsonNum(): Double? {
    if (this == null || this is JsonNull) return null
    val p = this as? JsonPrimitive ?: return null
    return p.content.toDoubleOrNull()
}

fun JsonObject.jsonStr(key: String): String? = this[key].jsonStr()

fun JsonObject.jsonObj(key: String): JsonObject? = this[key].jsonObj()

fun JsonObject.jsonArr(key: String): JsonArray? = this[key].jsonArr()

fun JsonObject.jsonNum(key: String): Double? = this[key].jsonNum()

fun JsonObject.jsonBool(key: String): Boolean {
    val el = this[key] ?: return false
    if (el is JsonNull) return false
    val p = el as? JsonPrimitive ?: return false
    return p.content.equals("true", ignoreCase = true)
}

fun String?.present(): String? = this?.takeIf { it.isNotBlank() }
