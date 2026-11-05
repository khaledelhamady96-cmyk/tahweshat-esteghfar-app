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
    public static final String EXTRA_TYPE = "extra_type";
    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_BODY = "extra_body";
    public static final String EXTRA_ID = "extra_id";

    public static final String CHANNEL_HEADS_UP = "tahwesha_heads_up_v5";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null) return;

        // 1. Acquire WakeLock to wake CPU
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            try {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Tahwesha:AlarmReceiverWakeLock");
                wakeLock.acquire(10000); // 10 seconds max
            } catch (Exception e) {
                Log.w(TAG, "WakeLock acquire warning: " + e.getMessage());
            }
        }

        try {
            String type = intent != null ? intent.getStringExtra(EXTRA_TYPE) : null;
            String title = intent != null ? intent.getStringExtra(EXTRA_TITLE) : null;
            String body = intent != null ? intent.getStringExtra(EXTRA_BODY) : null;

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
                    "تنبيهات تحويشة استغفار العائمة v5",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("تنبيهات عائمة منبثقة تظهر على الشاشة وفوق شاشة القفل مع الصوت والاهتزاز");
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
