package com.tahwesha.esteghfar;

import android.os.Bundle;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.WindowManager;
import android.net.Uri;
import android.media.AudioAttributes;
import android.graphics.Color;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int REQ_PERMISSIONS = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Wake up screen and show over lock screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );
        }

        createFloatingNotificationChannel();

        // 1. Explicitly request permissions (POST_NOTIFICATIONS on Android 13+ & Location for GPS prayer calculation)
        requestAppPermissionsIfNeeded();

        // 2. Request ignoring battery optimizations so OEM engines (Xiaomi, Oppo, Samsung) don't kill alarms
        requestBatteryExemptionIfNeeded();

        // 3. Native Alarm Engine: schedule background alarms that survive app closure!
        TahweshaReminderManager.ensureAlarmsScheduled(this);
    }

    @Override
    public void onResume() {
        super.onResume();
        // Ensure alarms are alive without spamming duplicate alarms
        TahweshaReminderManager.ensureAlarmsScheduled(this);
    }

    private void requestAppPermissionsIfNeeded() {
        java.util.List<String> perms = new java.util.ArrayList<>();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                perms.add(android.Manifest.permission.POST_NOTIFICATIONS);
            }
        }
        if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            perms.add(android.Manifest.permission.ACCESS_FINE_LOCATION);
        }
        if (checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            perms.add(android.Manifest.permission.ACCESS_COARSE_LOCATION);
        }
        if (!perms.isEmpty()) {
            requestPermissions(perms.toArray(new String[0]), REQ_PERMISSIONS);
        }
    }

    private void requestBatteryExemptionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                }
            } catch (Exception ignored) {}
        }
    }

    private void createFloatingNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            String channelId = "tahwesha_heads_up_v4";
            CharSequence name = "تنبيهات تحويشة استغفار العائمة";
            String description = "تنبيهات منبثقة عائمة تظهر على الشاشة وفوق شاشة القفل مباشرة مع الصوت والاهتزاز";
            int importance = NotificationManager.IMPORTANCE_HIGH;

            NotificationChannel channel = new NotificationChannel(channelId, name, importance);
            channel.setDescription(description);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 250, 150, 250});
            channel.enableLights(true);
            channel.setLightColor(Color.YELLOW);
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            channel.setBypassDnd(true);

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                .build();

            Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.notification);
            channel.setSound(soundUri, audioAttributes);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }
}
