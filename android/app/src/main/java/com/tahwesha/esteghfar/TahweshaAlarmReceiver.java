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

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null) return;

        // 1. Acquire WakeLock to wake CPU and turn on locked screen
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            try {
                wakeLock = pm.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK |
                    PowerManager.ACQUIRE_CAUSES_WAKEUP |
                    PowerManager.ON_AFTER_RELEASE,
                    "Tahwesha:AlarmReceiverWakeLock"
                );
                wakeLock.acquire(15000); // 15 seconds max
            } catch (Exception e) {
                Log.w(TAG, "WakeLock acquire warning: " + e.getMessage());
            }
        }

        try {
            String type = intent.getStringExtra(EXTRA_TYPE);
            String title = intent.getStringExtra(EXTRA_TITLE);
            String body = intent.getStringExtra(EXTRA_BODY);
            int id = intent.getIntExtra(EXTRA_ID, (int) (System.currentTimeMillis() % 100000) + 1000);

            if (title == null || title.isEmpty()) {
                title = "📿 ذكر واستغفار • تحويشة استغفار";
            }
            if (body == null || body.isEmpty()) {
                body = "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ";
            }

            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            String channelId = "tahwesha_heads_up_v4";
            ensureChannelExists(context, nm, channelId);

            // Intent to open MainActivity when user taps notification
            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent contentPendingIntent = PendingIntent.getActivity(context, id, launchIntent, flags);

            Uri soundUri;
            try {
                soundUri = Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.notification);
            } catch (Exception e) {
                soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
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
                .setSound(soundUri)
                .setVibrate(new long[]{0, 500, 200, 500})
                .setDefaults(Notification.DEFAULT_ALL);

            nm.notify(id, builder.build());
            Log.d(TAG, "Notification successfully displayed: " + title);

            // Automatically reschedule next reminder of this type to maintain an infinite loop!
            TahweshaReminderManager.scheduleNextForType(context, type);

        } catch (Throwable t) {
            Log.e(TAG, "Error displaying notification in onReceive", t);
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) {
                try {
                    wakeLock.release();
                } catch (Exception ignored) {}
            }
        }
    }

    private void ensureChannelExists(Context context, NotificationManager nm, String channelId) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm != null) {
            NotificationChannel channel = nm.getNotificationChannel(channelId);
            if (channel == null) {
                channel = new NotificationChannel(
                    channelId,
                    "تنبيهات تحويشة استغفار العائمة",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("تنبيهات عائمة منبثقة تظهر على الشاشة وفوق شاشة القفل مع الصوت والاهتزاز");
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 250, 150, 250});
                channel.enableLights(true);
                channel.setLightColor(Color.YELLOW);
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                channel.setBypassDnd(true);

                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                    .build();

                Uri soundUri = Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.notification);
                channel.setSound(soundUri, audioAttributes);

                nm.createNotificationChannel(channel);
            }
        }
    }
}
