package com.tahwesha.esteghfar;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;

public class TahweshaAlarmReceiver extends BroadcastReceiver {
    public static final String ACTION_FIRE_REMINDER = "com.tahwesha.esteghfar.ACTION_FIRE_REMINDER";
    public static final String EXTRA_TYPE = "extra_type";
    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_BODY = "extra_body";
    public static final String EXTRA_ID = "extra_id";

    @Override
    public void onReceive(Context context, Intent intent) {
        // 1. Acquire WakeLock to wake CPU and turn on locked screen
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK |
                PowerManager.ACQUIRE_CAUSES_WAKEUP |
                PowerManager.ON_AFTER_RELEASE,
                "Tahwesha:AlarmReceiverWakeLock"
            );
            wakeLock.acquire(10000); // 10 seconds max
        }

        try {
            String type = intent.getStringExtra(EXTRA_TYPE);
            String title = intent.getStringExtra(EXTRA_TITLE);
            String body = intent.getStringExtra(EXTRA_BODY);
            int id = intent.getIntExtra(EXTRA_ID, (int) System.currentTimeMillis());

            if (title == null || title.isEmpty()) {
                title = "📿 ذكر واستغفار • تحويشة استغفار";
            }
            if (body == null || body.isEmpty()) {
                body = "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ";
            }

            // Full-screen launch intent for Heads-Up / Lock Screen display
            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(context, id, launchIntent, flags);

            String channelId = "tahwesha_heads_up_v4";
            Uri soundUri = Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.notification);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.ic_stat_tahwesha)
                .setLargeIcon(BitmapFactory.decodeResource(context.getResources(), R.mipmap.ic_launcher))
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setContentIntent(fullScreenPendingIntent)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setAutoCancel(true)
                .setColor(Color.parseColor("#10B981"))
                .setSound(soundUri)
                .setVibrate(new long[]{0, 500, 200, 500})
                .setDefaults(Notification.DEFAULT_LIGHTS);

            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(id, builder.build());
            }

            // Automatically reschedule next reminder of this type
            TahweshaReminderManager.scheduleNextForType(context, type);

        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) {
                try {
                    wakeLock.release();
                } catch (Exception ignored) {}
            }
        }
    }
}
