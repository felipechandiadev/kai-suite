package com.kaistore.printers.tls

import android.content.Context
import com.kaistore.printers.net.LanAddressResolver
import java.io.File
import java.io.FileOutputStream
import java.math.BigInteger
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Security
import java.security.cert.Certificate
import java.security.cert.X509Certificate
import java.util.Date
import javax.net.ssl.KeyManagerFactory
import javax.net.ssl.SSLContext
import javax.security.auth.x500.X500Principal
import org.bouncycastle.asn1.x509.BasicConstraints
import org.bouncycastle.asn1.x509.Extension
import org.bouncycastle.asn1.x509.GeneralName
import org.bouncycastle.asn1.x509.GeneralNames
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder

/**
 * Certificado autofirmado para WSS local (loopback + IPs LAN de la tablet).
 * Usa PKCS12: JKS no está disponible en Android 11+ (API 30).
 */
object SelfSignedCertProvider {
    const val ALIAS = "kaiprinters"
    const val PASSWORD = "kaiprinters"

    private const val KEYSTORE_TYPE = "PKCS12"
    private const val KEYSTORE_FILENAME = "agent.p12"
    private const val LEGACY_KEYSTORE_FILENAME = "agent.jks"
    /** Incrementar para forzar regeneración con nuevos SAN (p. ej. bind LAN). */
    private const val CERT_GENERATION = 2
    private const val PREFS = "tls_meta"
    private const val PREF_CERT_GENERATION = "cert_generation"

    fun keyStoreFile(context: Context): File =
        File(File(context.filesDir, "tls"), KEYSTORE_FILENAME)

    fun getOrCreateKeyStore(context: Context): KeyStore {
        val dir = File(context.filesDir, "tls")
        dir.mkdirs()
        val ksFile = keyStoreFile(context)
        val legacyFile = File(dir, LEGACY_KEYSTORE_FILENAME)
        if (!ksFile.exists() && legacyFile.exists()) {
            legacyFile.delete()
        }
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val storedGen = prefs.getInt(PREF_CERT_GENERATION, 0)
        if (ksFile.exists() && storedGen < CERT_GENERATION) {
            ksFile.delete()
        }
        val password = PASSWORD.toCharArray()
        val keyStore = if (ksFile.exists()) {
            KeyStore.getInstance(KEYSTORE_TYPE).apply {
                ksFile.inputStream().use { load(it, password) }
            }
        } else {
            createAndSave(ksFile, password, LanAddressResolver.ipv4NonLoopback())
        }
        if (storedGen < CERT_GENERATION) {
            prefs.edit().putInt(PREF_CERT_GENERATION, CERT_GENERATION).apply()
        }
        return keyStore
    }

    fun getOrCreateSslContext(context: Context): SSLContext {
        val keyStore = getOrCreateKeyStore(context)
        val password = PASSWORD.toCharArray()
        val kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm())
        kmf.init(keyStore, password)
        return SSLContext.getInstance("TLS").apply {
            init(kmf.keyManagers, null, null)
        }
    }

    private fun createAndSave(ksFile: File, password: CharArray, lanIpv4: List<String>): KeyStore {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(BouncyCastleProvider())
        }
        val keyPairGenerator = KeyPairGenerator.getInstance("RSA")
        keyPairGenerator.initialize(2048)
        val keyPair = keyPairGenerator.generateKeyPair()

        val now = System.currentTimeMillis()
        val certBuilder = JcaX509v3CertificateBuilder(
            X500Principal("CN=Kai Printers Local"),
            BigInteger.valueOf(now),
            Date(now - 86_400_000L),
            Date(now + 365L * 86_400_000L * 10),
            X500Principal("CN=Kai Printers Local"),
            keyPair.public,
        )
        certBuilder.addExtension(Extension.basicConstraints, true, BasicConstraints(true))
        certBuilder.addExtension(
            Extension.subjectAlternativeName,
            false,
            buildSubjectAltNames(lanIpv4),
        )
        val signer = JcaContentSignerBuilder("SHA256withRSA").build(keyPair.private)
        val cert: X509Certificate = JcaX509CertificateConverter()
            .getCertificate(certBuilder.build(signer))

        val keyStore = KeyStore.getInstance(KEYSTORE_TYPE)
        keyStore.load(null, password)
        keyStore.setKeyEntry(ALIAS, keyPair.private, password, arrayOf<Certificate>(cert))
        FileOutputStream(ksFile).use { keyStore.store(it, password) }
        return keyStore
    }

    private fun buildSubjectAltNames(lanIpv4: List<String>): GeneralNames {
        val names = mutableListOf<GeneralName>()
        names.add(GeneralName(GeneralName.dNSName, "localhost"))
        names.add(GeneralName(GeneralName.iPAddress, "127.0.0.1"))
        for (ip in lanIpv4.distinct()) {
            if (ip.isNotBlank()) {
                names.add(GeneralName(GeneralName.iPAddress, ip.trim()))
            }
        }
        return GeneralNames(names.toTypedArray())
    }
}
