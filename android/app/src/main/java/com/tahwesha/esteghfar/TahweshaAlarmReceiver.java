package com.tahwesha.esteghfar;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;

public class TahweshaAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "TahweshaAlarmReceiver";
    public static final String ACTION_FIRE_REMINDER = "com.tahwesha.esteghfar.ACTION_FIRE_REMINDER";
    public static final String ACTION_STOP_ATHAN = "com.tahwesha.esteghfar.ACTION_STOP_ATHAN";
    public static final String EXTRA_TYPE = "extra_type";
    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_BODY = "extra_body";
    public static final String EXTRA_ID = "extra_id";

    public static final String CHANNEL_HEADS_UP = "tahwesha_azkar_v7";
    public static final String CHANNEL_AZKAR = "tahwesha_azkar_v7";
    public static final int NOTIF_ID_PRAYER = 7777;

    private static android.media.MediaPlayer activeAthanPlayer = null;

    public static synchronized void stopAthanPlayer() {
        if (activeAthanPlayer != null) {
            try {
                if (activeAthanPlayer.isPlaying()) {
                    activeAthanPlayer.stop();
                }
                activeAthanPlayer.release();
            } catch (Exception ignored) {}
            activeAthanPlayer = null;
        }
    }

    public static void playAthanSound(Context context) {
        if (context == null) return;
        try {
            stopAthanPlayer();
            android.content.SharedPreferences prefs = context.getSharedPreferences("tahwesha_prefs", Context.MODE_PRIVATE);
            String voice = prefs.getString("selected_athan_voice", "mishary");

            int rawResId = R.raw.athan_mishary;
            if ("makkah".equalsIgnoreCase(voice)) {
                rawResId = R.raw.athan_makkah;
            } else if ("madinah".equalsIgnoreCase(voice)) {
                rawResId = R.raw.athan_madinah;
            } else if ("abdulbasit".equalsIgnoreCase(voice)) {
                rawResId = R.raw.athan_abdulbasit;
            } else if ("qatami".equalsIgnoreCase(voice)) {
                rawResId = R.raw.athan_qatami;
            }

            activeAthanPlayer = android.media.MediaPlayer.create(context, rawResId);
            if (activeAthanPlayer != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    AudioAttributes aa = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build();
                    activeAthanPlayer.setAudioAttributes(aa);
                } else {
                    activeAthanPlayer.setAudioStreamType(android.media.AudioManager.STREAM_ALARM);
                }
                activeAthanPlayer.setLooping(false);
                activeAthanPlayer.setOnCompletionListener(mp -> stopAthanPlayer());
                activeAthanPlayer.start();
                Log.d(TAG, "Playing Athan sound natively: " + voice);
            }
        } catch (Throwable t) {
            Log.e(TAG, "playAthanSound error", t);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null) return;

        // Handle Stop Athan Action from notification button
        if (intent != null && ACTION_STOP_ATHAN.equals(intent.getAction())) {
            stopAthanPlayer();
            try {
                Intent stopServiceIntent = new Intent(context, TahweshaAthanService.class);
                stopServiceIntent.setAction(TahweshaAthanService.ACTION_STOP_ATHAN);
                context.startService(stopServiceIntent);
            } catch (Exception ignored) {}
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(NOTIF_ID_PRAYER);
                nm.cancel(TahweshaAthanService.NOTIF_ID_ATHAN);
            }
            return;
        }

        // 1. Acquire WakeLock to turn on screen and wake CPU immediately
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            try {
                wakeLock = pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK |
                    PowerManager.ACQUIRE_CAUSES_WAKEUP |
                    PowerManager.ON_AFTER_RELEASE,
                    "Tahwesha:ScreenWakeUpLock"
                );
                wakeLock.acquire(10000); // 10 seconds of screen bright
            } catch (Exception e) {
                try {
                    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Tahwesha:AlarmReceiverWakeLock");
                    wakeLock.acquire(15000);
                } catch (Exception ignored) {}
            }
        }

        try {
            String type = intent != null ? intent.getStringExtra(EXTRA_TYPE) : null;
            String title = intent != null ? intent.getStringExtra(EXTRA_TITLE) : null;
            String body = intent != null ? intent.getStringExtra(EXTRA_BODY) : null;

            // Prayer Athan Handling
            if ("prayer".equalsIgnoreCase(type)) {
                if (title == null || title.isEmpty()) {
                    title = "🕌 حان الآن موعد الأذان والصلاة";
                }
                if (body == null || body.isEmpty()) {
                    body = "الله أكبر، الله أكبر • حي على الصلاة • حي على الفلاح";
                }

                // Delegate playback and lockscreen heads-up notification to TahweshaAthanService (Foreground Service)
                try {
                    Intent serviceIntent = new Intent(context, TahweshaAthanService.class);
                    serviceIntent.setAction(TahweshaAthanService.ACTION_PLAY_ATHAN);
                    String prayerName = title.replace("🕌 حان الآن موعد أذان صلاة ", "").replace("🕌 حان الآن موعد الأذان والصلاة: ", "").replace("🕌 حان الآن موعد الأذان والصلاة", "").trim();
                    if (prayerName.isEmpty()) prayerName = "الصلاة";
                    serviceIntent.putExtra(TahweshaAthanService.EXTRA_PRAYER_NAME, prayerName);

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(serviceIntent);
                    } else {
                        context.startService(serviceIntent);
                    }
                    Log.d(TAG, "Delegated Prayer Athan to TahweshaAthanService: " + prayerName);
                } catch (Throwable t) {
                    Log.e(TAG, "Could not start TahweshaAthanService, falling back to direct play", t);
                    playAthanSound(context);
                    showPrayerAthanNotification(context, title, body);
                }

                // Re-schedule prayer for tomorrow
                TahweshaReminderManager.scheduleNextForType(context, TahweshaReminderManager.TYPE_PRAYER);
                return;
            }

            if (title == null || title.isEmpty()) {
                title = "📿 ذكر واستغفار • تحويشة استغفار";
            }
            if (body == null || body.isEmpty()) {
                body = TahweshaReminderManager.getNextAzkar();
            }

            // Display the high-priority floating heads-up alert
            showImmediateNotification(context, title, body);

            // Automatically reschedule next reminder of this type to maintain an infinite loop!
            if (type != null) {
                TahweshaReminderManager.scheduleNextForType(context, type);
            } else {
                TahweshaReminderManager.scheduleNextForType(context, TahweshaReminderManager.TYPE_AZKAR);
            }

        } catch (Throwable t) {
            Log.e(TAG, "Error in AlarmReceiver onReceive", t);
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) {
                try {
                    wakeLock.release();
                } catch (Exception ignored) {}
            }
        }
    }

    public static void showPrayerAthanNotification(Context context, String title, String body) {
        if (context == null) return;
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            ensureChannelExists(context, nm, CHANNEL_HEADS_UP);

            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent contentPendingIntent = PendingIntent.getActivity(
                context,
                7771,
                launchIntent,
                flags
            );

            // Intent to STOP athan audio from notification button
            Intent stopIntent = new Intent(context, TahweshaAlarmReceiver.class);
            stopIntent.setAction(ACTION_STOP_ATHAN);
            PendingIntent stopPendingIntent = PendingIntent.getBroadcast(
                context,
                7772,
                stopIntent,
                flags
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_HEADS_UP)
                .setSmallIcon(R.drawable.ic_stat_tahwesha)
                .setLargeIcon(BitmapFactory.decodeResource(context.getResources(), R.mipmap.ic_launcher))
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body + "\n\nالله أكبر الله أكبر • حي على الصلاة • حي على الفلاح"))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setFullScreenIntent(contentPendingIntent, true)
                .setContentIntent(contentPendingIntent)
                .setAutoCancel(true)
                .setColor(Color.parseColor("#10B981"))
                .addAction(android.R.drawable.ic_media_pause, "🛑 كتم / إيقاف الأذان", stopPendingIntent)
                .addAction(android.R.drawable.ic_menu_today, "📖 فتح التطبيق والمصحف", contentPendingIntent)
                .setVibrate(new long[]{0, 500, 200, 500, 200, 500});

            nm.notify(NOTIF_ID_PRAYER, builder.build());
            Log.d(TAG, "Prayer Athan notification successfully displayed: " + title);
        } catch (Throwable t) {
            Log.e(TAG, "showPrayerAthanNotification failed", t);
        }
    }

    public static void showImmediateNotification(Context context, String title, String body) {
        if (context == null) return;
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            ensureChannelExists(context, nm, CHANNEL_HEADS_UP);

            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent contentPendingIntent = PendingIntent.getActivity(
                context,
                (int) (System.currentTimeMillis() % 10000),
                launchIntent,
                flags
            );

            Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_HEADS_UP)
                .setSmallIcon(R.drawable.ic_stat_tahwesha)
                .setLargeIcon(BitmapFactory.decodeResource(context.getResources(), R.mipmap.ic_launcher))
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setFullScreenIntent(contentPendingIntent, true)
                .setContentIntent(contentPendingIntent)
                .setAutoCancel(true)
                .setColor(Color.parseColor("#10B981"))
                .setSound(defaultSoundUri)
                .setVibrate(new long[]{0, 350, 150, 350});

            int notifId = (int) (System.currentTimeMillis() % 100000) + 1000;
            nm.notify(notifId, builder.build());
            Log.d(TAG, "Notification successfully displayed: " + title);
        } catch (Throwable t) {
            Log.e(TAG, "showImmediateNotification failed", t);
        }
    }

    private static void ensureChannelExists(Context context, NotificationManager nm, String channelId) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm != null) {
            NotificationChannel channel = nm.getNotificationChannel(channelId);
            if (channel == null) {
                channel = new NotificationChannel(
                    channelId,
                    "تنبيهات وأذكار تحويشة استغفار v7",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("تنبيهات عائمة منبثقة تظهر على الشاشة وفوق شاشة القفل مع الصوت والاهتزاز للأذكار والاستغفار");
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 350, 150, 350});
                channel.enableLights(true);
                channel.setLightColor(Color.YELLOW);
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                channel.setBypassDnd(true);

                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                    .build();

                Uri defaultSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                channel.setSound(defaultSound, audioAttributes);

                nm.createNotificationChannel(channel);
            }
        }
    }
}
