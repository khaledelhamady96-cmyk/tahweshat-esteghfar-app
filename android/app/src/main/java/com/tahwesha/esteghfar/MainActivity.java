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
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.net.Uri;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.graphics.Color;
import androidx.core.app.NotificationManagerCompat;
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

        // 1. Explicitly request permissions (POST_NOTIFICATIONS on Android 13+ & Location for GPS)
        requestAppPermissionsIfNeeded();

        // 2. Request ignoring battery optimizations so OEM engines (Xiaomi, Oppo, Samsung) don't kill alarms
        requestBatteryExemptionIfNeeded();

        // 3. Start Permanent Foreground Service (Guarantee background survival!)
        startTahweshaBackgroundService();

        // 4. Native Alarm Engine: schedule background alarms
        TahweshaReminderManager.ensureAlarmsScheduled(this);

        // 5. Inject JavascriptInterface into WebView for In-App Native Diagnostics
        setupNativeJavascriptBridge();
    }

    @Override
    public void onResume() {
        super.onResume();
        startTahweshaBackgroundService();
        TahweshaReminderManager.ensureAlarmsScheduled(this);
    }

    private void startTahweshaBackgroundService() {
        try {
            Intent serviceIntent = new Intent(this, TahweshaService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
        } catch (Exception e) {
            android.util.Log.w("MainActivity", "startForegroundService notice: " + e.getMessage());
        }
    }

    private void setupNativeJavascriptBridge() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public boolean areNotificationsEnabled() {
                        return NotificationManagerCompat.from(MainActivity.this).areNotificationsEnabled();
                    }

                    @JavascriptInterface
                    public void openNotificationSettings() {
                        try {
                            Intent intent = new Intent();
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                                intent.putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
                            } else {
                                intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                                intent.setData(Uri.parse("package:" + getPackageName()));
                            }
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                        } catch (Exception ignored) {}
                    }

                    @JavascriptInterface
                    public void openAutoStartSettings() {
                        AutoStartHelper.openAutoStart(MainActivity.this);
                    }

                    @JavascriptInterface
                    public boolean isBatteryOptimizationIgnored() {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            try {
                                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                                return pm != null && pm.isIgnoringBatteryOptimizations(getPackageName());
                            } catch (Exception ignored) {}
                        }
                        return true;
                    }

                    @JavascriptInterface
                    public void requestBatteryExemption() {
                        runOnUiThread(() -> requestBatteryExemptionIfNeeded());
                    }

                    @JavascriptInterface
                    public void requestPostNotificationPermission() {
                        runOnUiThread(() -> {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                                    requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, REQ_PERMISSIONS);
                                    return;
                                }
                            }
                            openNotificationSettings();
                        });
                    }

                    @JavascriptInterface
                    public void testNotificationInSeconds(int seconds) {
                        TahweshaReminderManager.scheduleSingleAlarm(
                            MainActivity.this,
                            TahweshaReminderManager.TYPE_AZKAR,
                            seconds * 1000L,
                            9999,
                            "📿 ذكر واستغفار • تجربة حقيقية ناجحة",
                            "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ • التنبيهات تعمل بامتياز وشاشتك مقفولة!"
                        );
                    }

                    @JavascriptInterface
                    public void showImmediateNotification() {
                        TahweshaAlarmReceiver.showImmediateNotification(
                            MainActivity.this,
                            "📿 ذكر واستغفار • تحويشة استغفار",
                            TahweshaReminderManager.getNextAzkar()
                        );
                    }

                    @JavascriptInterface
                    public void schedulePrayerAlarms(long fajr, long dhuhr, long asr, long maghrib, long isha, String voiceKey) {
                        TahweshaReminderManager.schedulePrayerAlarms(MainActivity.this, fajr, dhuhr, asr, maghrib, isha, voiceKey);
                    }

                    @JavascriptInterface
                    public void setSelectedAthanVoice(String voiceKey) {
                        getSharedPreferences("tahwesha_prefs", Context.MODE_PRIVATE)
                            .edit()
                            .putString("selected_athan_voice", voiceKey)
                            .apply();
                    }

                    @JavascriptInterface
                    public void playNativeAthanPreview(String voiceKey) {
                        setSelectedAthanVoice(voiceKey);
                        TahweshaAlarmReceiver.playAthanSound(MainActivity.this);
                    }

                    @JavascriptInterface
                    public void stopNativeAthan() {
                        TahweshaAlarmReceiver.stopAthanPlayer();
                    }

                    @JavascriptInterface
                    public void testAthanInSeconds(int seconds, String voiceKey) {
                        setSelectedAthanVoice(voiceKey);
                        TahweshaReminderManager.scheduleSingleAlarm(
                            MainActivity.this,
                            TahweshaReminderManager.TYPE_PRAYER,
                            seconds * 1000L,
                            8888,
                            "🕌 تجربة أذان حقيقي • تحويشة استغفار",
                            "الله أكبر، الله أكبر • تجربة ناجحة للأذان وشاشتك مقفولة!"
                        );
                    }
                }, "TahweshaNative");
            }
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "setupNativeJavascriptBridge error", e);
        }
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
            String channelId = "tahwesha_heads_up_v5";
            CharSequence name = "تنبيهات تحويشة استغفار العائمة v5";
            String description = "تنبيهات منبثقة عائمة تظهر على الشاشة وفوق شاشة القفل مباشرة مع الصوت والاهتزاز";
            int importance = NotificationManager.IMPORTANCE_HIGH;

            NotificationChannel channel = new NotificationChannel(channelId, name, importance);
            channel.setDescription(description);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 350, 150, 350});
            channel.enableLights(true);
            channel.setLightColor(Color.YELLOW);
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            channel.setBypassDnd(true);

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                .build();

            Uri defaultSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            channel.setSound(defaultSound, audioAttributes);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }
}
