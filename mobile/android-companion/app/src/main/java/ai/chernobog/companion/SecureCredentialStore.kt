package ai.chernobog.companion

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class SecureCredentialStore(
    context: Context,
) {
    private val preferences =
        context.getSharedPreferences(
            PREFERENCES_NAME,
            Context.MODE_PRIVATE,
        )

    fun installationId(): String {
        val existing =
            preferences.getString(
                KEY_INSTALLATION_ID,
                null,
            )

        if (!existing.isNullOrBlank()) {
            return existing
        }

        val generated =
            UUID.randomUUID().toString()

        preferences
            .edit()
            .putString(
                KEY_INSTALLATION_ID,
                generated,
            )
            .apply()

        return generated
    }

    fun rotateInstallationId(): String {
        val generated =
            UUID.randomUUID().toString()

        preferences
            .edit()
            .putString(
                KEY_INSTALLATION_ID,
                generated,
            )
            .apply()

        return generated
    }

    fun savedEndpoint(): String =
        preferences.getString(
            KEY_ENDPOINT,
            "",
        ).orEmpty()

    fun savedDisplayName(): String =
        preferences.getString(
            KEY_DISPLAY_NAME,
            "",
        ).orEmpty()

    fun savedDeviceId(): String? =
        preferences.getString(
            KEY_DEVICE_ID,
            null,
        )

    fun savedToken(): String? {
        val encoded =
            preferences.getString(
                KEY_ENCRYPTED_TOKEN,
                null,
            ) ?: return null

        return decrypt(encoded)
    }

    fun saveEnrollment(
        record: EnrollmentRecord,
    ) {
        val encryptedToken =
            encrypt(record.token)

        preferences
            .edit()
            .putString(
                KEY_ENDPOINT,
                record.endpoint,
            )
            .putString(
                KEY_INSTALLATION_ID,
                record.installationId,
            )
            .putString(
                KEY_DEVICE_ID,
                record.deviceId,
            )
            .putString(
                KEY_DISPLAY_NAME,
                record.displayName,
            )
            .putString(
                KEY_ENCRYPTED_TOKEN,
                encryptedToken,
            )
            .apply()
    }

    fun saveEndpoint(
        endpoint: String,
    ) {
        preferences
            .edit()
            .putString(
                KEY_ENDPOINT,
                endpoint,
            )
            .apply()
    }

    fun saveDisplayName(
        displayName: String,
    ) {
        preferences
            .edit()
            .putString(
                KEY_DISPLAY_NAME,
                displayName,
            )
            .apply()
    }

    fun clearEnrollment(
        rotateInstallationIdentity: Boolean,
    ) {
        val editor =
            preferences
                .edit()
                .remove(
                    KEY_DEVICE_ID,
                )
                .remove(
                    KEY_ENCRYPTED_TOKEN,
                )

        if (rotateInstallationIdentity) {
            editor.putString(
                KEY_INSTALLATION_ID,
                UUID.randomUUID().toString(),
            )
        }

        editor.apply()
    }

    private fun encrypt(
        plaintext: String,
    ): String {
        val cipher =
            Cipher.getInstance(
                TRANSFORMATION,
            )

        cipher.init(
            Cipher.ENCRYPT_MODE,
            getOrCreateKey(),
        )

        val ciphertext =
            cipher.doFinal(
                plaintext.toByteArray(
                    Charsets.UTF_8,
                ),
            )

        val iv =
            Base64.encodeToString(
                cipher.iv,
                Base64.NO_WRAP,
            )

        val encrypted =
            Base64.encodeToString(
                ciphertext,
                Base64.NO_WRAP,
            )

        return "$iv:$encrypted"
    }

    private fun decrypt(
        payload: String,
    ): String {
        val parts =
            payload.split(
                ":",
                limit = 2,
            )

        require(parts.size == 2) {
            "Stored Chernobog credential is malformed."
        }

        val iv =
            Base64.decode(
                parts[0],
                Base64.NO_WRAP,
            )

        val ciphertext =
            Base64.decode(
                parts[1],
                Base64.NO_WRAP,
            )

        val cipher =
            Cipher.getInstance(
                TRANSFORMATION,
            )

        cipher.init(
            Cipher.DECRYPT_MODE,
            getOrCreateKey(),
            GCMParameterSpec(
                128,
                iv,
            ),
        )

        return String(
            cipher.doFinal(
                ciphertext,
            ),
            Charsets.UTF_8,
        )
    }

    private fun getOrCreateKey():
        SecretKey {
        val keyStore =
            KeyStore.getInstance(
                ANDROID_KEY_STORE,
            ).apply {
                load(null)
            }

        val existing =
            keyStore.getKey(
                KEY_ALIAS,
                null,
            )

        if (existing is SecretKey) {
            return existing
        }

        val generator =
            KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES,
                ANDROID_KEY_STORE,
            )

        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or
                    KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(
                    KeyProperties.BLOCK_MODE_GCM,
                )
                .setEncryptionPaddings(
                    KeyProperties.ENCRYPTION_PADDING_NONE,
                )
                .setKeySize(256)
                .build(),
        )

        return generator.generateKey()
    }

    companion object {
        private const val PREFERENCES_NAME =
            "chernobog_companion"

        private const val KEY_ALIAS =
            "chernobog_companion_device_token_v1"

        private const val KEY_ENDPOINT =
            "endpoint"

        private const val KEY_INSTALLATION_ID =
            "installation_id"

        private const val KEY_DEVICE_ID =
            "device_id"

        private const val KEY_DISPLAY_NAME =
            "display_name"

        private const val KEY_ENCRYPTED_TOKEN =
            "encrypted_device_token"

        private const val ANDROID_KEY_STORE =
            "AndroidKeyStore"

        private const val TRANSFORMATION =
            "AES/GCM/NoPadding"
    }
}
