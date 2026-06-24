package com.kaistore.printers.print

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class JsonElementExtTest {
    @Test
    fun jsonStrReturnsNullForJsonNullFields() {
        val obj = Json.parseToJsonElement(
            """{"nombreFantasia":null,"rut":null,"razonSocial":"Comercial Demo SpA"}""",
        ).jsonObj()!!
        assertTrue(obj["nombreFantasia"] is JsonNull)
        assertNull(obj.jsonStr("nombreFantasia"))
        assertNull(obj.jsonStr("rut"))
        assertEquals("Comercial Demo SpA", obj.jsonStr("razonSocial"))
    }
}
