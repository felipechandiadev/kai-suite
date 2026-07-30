package com.kaistore.screen.tls

import android.content.Context
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
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder

object SelfSignedCertProvider {
    const val ALIAS = "kaiscreen"
    const val PASSWORD = "kaiscreen"

    private const val KEYSTORE_TYPE = "PKCS12"
    private const val KEYSTORE_FILENAME = "agent.p12"

    fun keyStoreFile(context: Context): File =
        File(File(context.filesDir, "tls"), KEYSTORE_FILENAME)

    fun getOrCreateKeyStore(context: Context): KeyStore {
        val dir = File(context.filesDir, "tls")
        dir.mkdirs()
        val ksFile = keyStoreFile(context)
        val password = PASSWORD.toCharArray()
        return if (ksFile.exists()) {
            KeyStore.getInstance(KEYSTORE_TYPE).apply {
                ksFile.inputStream().use { load(it, password) }
            }
        } else {
            createAndSave(ksFile, password)
        }
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

    private fun createAndSave(ksFile: File, password: CharArray): KeyStore {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(BouncyCastleProvider())
        }
        val keyPairGenerator = KeyPairGenerator.getInstance("RSA")
        keyPairGenerator.initialize(2048)
        val keyPair = keyPairGenerator.generateKeyPair()

        val now = System.currentTimeMillis()
        val certBuilder = JcaX509v3CertificateBuilder(
            X500Principal("CN=Kai CFD Local"),
            BigInteger.valueOf(now),
            Date(now - 86_400_000L),
            Date(now + 365L * 86_400_000L * 10),
            X500Principal("CN=127.0.0.1"),
            keyPair.public,
        )
        certBuilder.addExtension(Extension.basicConstraints, true, BasicConstraints(true))
        val signer = JcaContentSignerBuilder("SHA256withRSA").build(keyPair.private)
        val cert: X509Certificate = JcaX509CertificateConverter()
            .getCertificate(certBuilder.build(signer))

        val keyStore = KeyStore.getInstance(KEYSTORE_TYPE)
        keyStore.load(null, password)
        keyStore.setKeyEntry(ALIAS, keyPair.private, password, arrayOf<Certificate>(cert))
        FileOutputStream(ksFile).use { keyStore.store(it, password) }
        return keyStore
    }
}
