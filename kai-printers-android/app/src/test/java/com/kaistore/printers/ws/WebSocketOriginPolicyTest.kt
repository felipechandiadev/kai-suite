package com.kaistore.printers.ws

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WebSocketOriginPolicyTest {
    @Test
    fun allowAll_permitsLanAndLoopback() {
        assertTrue(
            WebSocketOriginPolicy.isAllowed(
                "http://192.168.0.194:4032",
                allowAllOrigins = true,
                allowedOrigins = emptyList(),
            ),
        )
        assertTrue(
            WebSocketOriginPolicy.isAllowed(
                "http://127.0.0.1:4032",
                allowAllOrigins = true,
                allowedOrigins = emptyList(),
            ),
        )
    }

    @Test
    fun allowAll_permitsTrustedKaiSuiteOrigins() {
        assertTrue(
            WebSocketOriginPolicy.isAllowed(
                "https://pos.demo.kaisuite.pro",
                allowAllOrigins = true,
                allowedOrigins = emptyList(),
            ),
        )
        assertTrue(
            WebSocketOriginPolicy.isAllowed(
                "https://pos.joyarte.kaisuite.pro",
                allowAllOrigins = true,
                allowedOrigins = emptyList(),
            ),
        )
        assertTrue(WebSocketOriginPolicy.isTrustedKaiOrigin("https://kaisuite.pro"))
        assertTrue(WebSocketOriginPolicy.isTrustedKaiOrigin("https://pos.demo.kaisuite.pro"))
    }

    @Test
    fun allowAll_rejectsPublicInternetOrigin() {
        assertFalse(
            WebSocketOriginPolicy.isAllowed(
                "https://evil.example.com",
                allowAllOrigins = true,
                allowedOrigins = emptyList(),
            ),
        )
    }

    @Test
    fun whitelist_permitsPublicHostEvenWhenNotKaiOrLan() {
        val list = listOf("https://pos.custom-domain.cl")
        assertTrue(
            WebSocketOriginPolicy.isAllowed(
                "https://pos.custom-domain.cl",
                allowAllOrigins = false,
                allowedOrigins = list,
            ),
        )
        assertTrue(
            WebSocketOriginPolicy.isAllowed(
                "https://pos.custom-domain.cl",
                allowAllOrigins = true,
                allowedOrigins = list,
            ),
        )
    }

    @Test
    fun whitelist_onlyListedOrigins() {
        val list = listOf("http://192.168.0.10:4032")
        assertTrue(WebSocketOriginPolicy.isAllowed("http://192.168.0.10:4032", false, list))
        assertFalse(WebSocketOriginPolicy.isAllowed("http://192.168.0.11:4032", false, list))
    }

    @Test
    fun strictMode_emptyWhitelist_rejectsKaiOrigins() {
        assertFalse(
            WebSocketOriginPolicy.isAllowed(
                "https://pos.demo.kaisuite.pro",
                allowAllOrigins = false,
                allowedOrigins = emptyList(),
            ),
        )
    }

    @Test
    fun missingOrigin_allowed() {
        assertTrue(WebSocketOriginPolicy.isAllowed(null, allowAllOrigins = false, allowedOrigins = emptyList()))
    }
}
