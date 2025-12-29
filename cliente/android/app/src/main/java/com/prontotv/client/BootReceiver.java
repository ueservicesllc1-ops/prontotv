package com.prontotv.client;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * BroadcastReceiver que inicia la aplicación automáticamente cuando el TV se
 * enciende.
 * 
 * Este receiver escucha dos eventos:
 * 1. BOOT_COMPLETED: Cuando el dispositivo termina de iniciar
 * 2. QUICKBOOT_POWERON: Evento específico de algunos fabricantes (HTC, Xiaomi,
 * etc.)
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "ProntoTV-BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();

        Log.d(TAG, "📱 Boot event received: " + action);

        // Verificar que sea un evento de boot
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
                "android.intent.action.QUICKBOOT_POWERON".equals(action)) {

            Log.i(TAG, "🚀 Iniciando ProntoTV automáticamente...");

            try {
                // Crear intent para iniciar la MainActivity
                Intent launchIntent = new Intent(context, MainActivity.class);

                // Flags necesarios para iniciar una actividad desde un BroadcastReceiver
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);

                // Pequeño delay para asegurar que el sistema esté listo
                // (algunos TVs necesitan que los servicios de red estén activos)
                new android.os.Handler().postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        context.startActivity(launchIntent);
                        Log.i(TAG, "✅ ProntoTV iniciado exitosamente");
                    }
                }, 3000); // 3 segundos de delay

            } catch (Exception e) {
                Log.e(TAG, "❌ Error al iniciar ProntoTV: " + e.getMessage(), e);
            }
        }
    }
}
