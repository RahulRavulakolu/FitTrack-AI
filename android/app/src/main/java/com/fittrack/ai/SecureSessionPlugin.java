package com.fittrack.ai;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "SecureSession")
public class SecureSessionPlugin extends Plugin {
    private static final String ALIAS = "fittrack.session.key";
    private SharedPreferences preferences() { return getContext().getSharedPreferences("fittrack_secure_session", Context.MODE_PRIVATE); }
    private SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        if (store.containsAlias(ALIAS)) return ((KeyStore.SecretKeyEntry) store.getEntry(ALIAS, null)).getSecretKey();
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());
        return generator.generateKey();
    }
    @PluginMethod public void write(PluginCall call) {
        String token = call.getString("token");
        if (token == null || !token.matches("[a-f0-9]{64}")) { call.reject("Invalid session token"); return; }
        try { Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key());
            String encrypted = Base64.encodeToString(cipher.doFinal(token.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
            String iv = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP);
            if (!preferences().edit().putString("token", encrypted).putString("iv", iv).commit()) throw new Exception("Storage write failed");
            call.resolve();
        } catch (Exception e) { call.reject("Could not securely store the session"); }
    }
    @PluginMethod public void read(PluginCall call) {
        JSObject result = new JSObject();
        String encrypted = preferences().getString("token", null), iv = preferences().getString("iv", null);
        if (encrypted == null || iv == null) { result.put("token", JSObject.NULL); call.resolve(result); return; }
        try { Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
            result.put("token", new String(cipher.doFinal(Base64.decode(encrypted, Base64.NO_WRAP)), StandardCharsets.UTF_8)); call.resolve(result);
        } catch (Exception e) { preferences().edit().clear().apply(); result.put("token", JSObject.NULL); call.resolve(result); }
    }
    @PluginMethod public void clear(PluginCall call) { preferences().edit().clear().commit(); call.resolve(); }
}
