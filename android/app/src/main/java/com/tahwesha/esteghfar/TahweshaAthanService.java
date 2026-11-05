package com.tahwesha.esteghfar;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;

public class TahweshaAthanService extends Service {
    private static final String TAG = "TahweshaAthanService";
    public static final String ACTION_PLAY_ATHAN = "com.tahwesha.esteghfar.ACTION_PLAY_ATHAN";
    public static final String ACTION_STOP_ATHAN = "com.tahwesha.esteghfar.ACTION_STOP_ATHAN";
    public static final String EXTRA_PRAYER_NAME = "extra_prayer_name";
    public static final String EXTRA_VOICE_KEY = "extra_voice_key";

    public static final String CHANNEL_ATHAN = "tahwesha_athan_v7";
    public static final int NOTIF_ID_ATHAN = 8888;

    private MediaPlayer mediaPlayer = null;
    private PowerManager.WakeLock wakeLock = null;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;

        String action = intent.getAction();
        if (ACTION_STOP_ATHAN.equals(action)) {
            stopAthan();
            stopSelf();
            return START_NOT_STICKY;
        }

        if (ACTION_PLAY_ATHAN.equals(action)) {
            String prayerName = intent.getStringExtra(EXTRA_PRAYER_NAME);
            if (prayerName == null || prayerName.isEmpty()) prayerName = "الصلاة";
            String voiceKey = intent.getStringExtra(EXTRA_VOICE_KEY);
            if (voiceKey == null || voiceKey.isEmpty()) {
                voiceKey = getSharedPreferences("tahwesha_prefs", Context.MODE_PRIVATE)
                    .getString("selected_athan_voice", "mishary");
            }

            acquireWakeLock();
            createAthanNotificationChannel();
            Notification notification = buildAthanNotification(prayerName);

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                        startForeground(NOTIF_ID_ATHAN, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
                    } else {
                        startForeground(NOTIF_ID_ATHAN, notification);
                    }
                } else {
                    startForeground(NOTIF_ID_ATHAN, notification);
                }
            } catch (Exception e) {
                Log.w(TAG, "startForeground notice: " + e.getMessage());
            }

            startAudio(voiceKey);
        }

        return START_NOT_STICKY;
    }

    private void acquireWakeLock() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK |
                    PowerManager.ACQUIRE_CAUSES_WAKEUP |
                    PowerManager.ON_AFTER_RELEASE,
                    "Tahwesha:AthanServiceWakeLock"
                );
                wakeLock.acquire(210 * 1000L); // 3.5 minutes max
            }
        } catch (Exception e) {
            try {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Tahwesha:AthanServiceWakeLock");
                    wakeLock.acquire(210 * 1000L);
                }
            } catch (Exception ignored) {}
        }
    }

    private void startAudio(String voiceKey) {
        stopAthan();
        try {
            int rawResId = R.raw.athan_mishary;
            if ("makkah".equalsIgnoreCase(voiceKey)) {
                rawResId = R.raw.athan_makkah;
            } else if ("madinah".equalsIgnoreCase(voiceKey)) {
                rawResId = R.raw.athan_madinah;
            } else if ("abdulbasit".equalsIgnoreCase(voiceKey)) {
                rawResId = R.raw.athan_abdulbasit;
            } else if ("qatami".equalsIgnoreCase(voiceKey)) {
                rawResId = R.raw.athan_qatami;
            }

            mediaPlayer = MediaPlayer.create(this, rawResId);
            if (mediaPlayer != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    AudioAttributes aa = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build();
                    mediaPlayer.setAudioAttributes(aa);
                } else {
                    mediaPlayer.setAudioStreamType(android.media.AudioManager.STREAM_ALARM);
                }
                mediaPlayer.setLooping(false);
                mediaPlayer.setOnCompletionListener(mp -> {
                    Log.d(TAG, "Athan audio finished completely.");
                    stopAthan();
                    stopSelf();
                });
                mediaPlayer.start();
                Log.d(TAG, "TahweshaAthanService playing voice: " + voiceKey);
            }
        } catch (Exception e) {
            Log.e(TAG, "startAudio error", e);
            stopSelf();
        }
    }

    private void stopAthan() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
            } catch (Exception ignored) {}
            mediaPlayer = null;
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {}
            wakeLock = null;
        }
    }

    private Notification buildAthanNotification(String prayerName) {
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) piFlags |= PendingIntent.FLAG_IMMUTABLE;

        PendingIntent openPi = PendingIntent.getActivity(this, 8881, launchIntent, piFlags);

        Intent stopIntent = new Intent(this, TahweshaAthanService.class);
        stopIntent.setAction(ACTION_STOP_ATHAN);
        PendingIntent stopPi = PendingIntent.getService(this, 8882, stopIntent, piFlags);

        return new NotificationCompat.Builder(this, CHANNEL_ATHAN)
            .setSmallIcon(R.drawable.ic_stat_tahwesha)
            .setLargeIcon(BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher))
            .setContentTitle("🕌 حان الآن موعد أذان صلاة " + prayerName)
            .setContentText("الله أكبر، الله أكبر • حي على الصلاة • حي على الفلاح")
            .setStyle(new NotificationCompat.BigTextStyle().bigText("الله أكبر الله أكبر • حي على الصلاة حي على الفلاح • تقبل الله طاعتكم."))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(openPi, true)
            .setContentIntent(openPi)
            .setOngoing(true)
            .setAutoCancel(false)
            .setColor(Color.parseColor("#10B981"))
            .addAction(android.R.drawable.ic_media_pause, "🛑 كتم / إيقاف الأذان", stopPi)
            .addAction(android.R.drawable.ic_menu_today, "📖 فتح المصحف الشريف", openPi)
            .setVibrate(new long[]{0, 500, 200, 500, 200, 500})
            .build();
    }

    private void createAthanNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ATHAN,
                    "تنبيهات وأصوات الأذان v7",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("تشغيل الأذان الصوتي ومواقيت الصلاة الخمس مع شاشة القفل");
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 500, 200, 500});
                channel.enableLights(true);
                channel.setLightColor(Color.GREEN);
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                channel.setBypassDnd(true);
                nm.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onDestroy() {
        stopAthan();
        super.onDestroy();
    }
}
