package com.prontotv.client;

import android.os.Bundle;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "VideoCache")
public class VideoCachePlugin extends Plugin {

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void cacheVideo(PluginCall call) {
        String videoUrl = call.getString("url");
        if (videoUrl == null) {
            call.reject("Must provide an url");
            return;
        }

        // Run network operation in background thread
        executor.execute(() -> {
            try {
                // Generate filename from URL hash
                String filename = md5(videoUrl) + ".mp4";
                File cacheDir = new File(getContext().getFilesDir(), "videos");
                if (!cacheDir.exists()) {
                    cacheDir.mkdirs();
                }

                File file = new File(cacheDir, filename);

                // If file exists and is larger than 0 bytes, assume it's good
                if (file.exists() && file.length() > 0) {
                    JSObject ret = new JSObject();
                    ret.put("path", file.getAbsolutePath());
                    ret.put("uri", "file://" + file.getAbsolutePath());
                    ret.put("cached", true);
                    call.resolve(ret);
                    return;
                }

                // Download
                URL url = new URL(videoUrl);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(15000);
                connection.connect();

                if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                    call.reject("Server returned HTTP " + connection.getResponseCode()
                            + " " + connection.getResponseMessage());
                    return;
                }

                InputStream input = connection.getInputStream();
                FileOutputStream output = new FileOutputStream(file);

                byte[] data = new byte[4096];
                int count;
                while ((count = input.read(data)) != -1) {
                    output.write(data, 0, count);
                }

                output.close();
                input.close();

                JSObject ret = new JSObject();
                ret.put("path", file.getAbsolutePath());
                ret.put("uri", "file://" + file.getAbsolutePath());
                ret.put("cached", false); // false means just downloaded
                call.resolve(ret);

            } catch (Exception e) {
                call.reject("Error caching video: " + e.getMessage());
            }
        });
    }

    private String md5(String s) {
        try {
            MessageDigest digest = java.security.MessageDigest.getInstance("MD5");
            digest.update(s.getBytes());
            byte[] messageDigest = digest.digest();
            StringBuilder hexString = new StringBuilder();
            for (byte b : messageDigest)
                hexString.append(String.format("%02x", b));
            return hexString.toString();
        } catch (Exception e) {
            return String.valueOf(s.hashCode());
        }
    }
}
