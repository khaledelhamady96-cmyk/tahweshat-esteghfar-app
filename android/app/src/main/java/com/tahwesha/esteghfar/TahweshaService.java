package com.tahwesha.esteghfar;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;
import androidx.core.app.NotificationCompat;

public class TahweshaService extends Service {
    private static final String TAG = "TahweshaService";
    public static final int NOTIF_STICKY_ID = 7777;
    public static final String CHANNEL_STICKY = "tahwesha_service_sticky_v5";

    private Handler handler;
    private Runnable periodicRunnable;

    @Override
    public void onCreate() {
        super.onCreate();
        createStickyChannel();
        
        Notification notification = buildStickyNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(NOTIF_STICKY_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
            } else {
                startForeground(NOTIF_STICKY_ID, notification);
            }
        } else {
            startForeground(NOTIF_STICKY_ID, notification);
        }

        startPeriodicReminders();
        Log.d(TAG, "TahweshaService started and foreground protection active!");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY; // Ensures Android automatically restarts the service if killed
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void startPeriodicReminders() {
        handler = new Handler(Looper.getMainLooper());
        periodicRunnable = new Runnable() {
            @Override
            public void run() {
                try {
                    // Send an actual Azkar notification
                    TahweshaAlarmReceiver.showImmediateNotification(
                        getApplicationContext(),
                        "📿 ذكر واستغفار • تحويشة استغفار",
                        TahweshaReminderManager.getNextAzkar()
                    );
                } catch (Exception e) {
                    Log.e(TAG, "Error in periodic reminder execution", e);
                }
                // Schedule next run in 25 minutes
                handler.postDelayed(this, 25 * 60 * 1000L);
            }
        };

        // First run staggered after 2 minutes so user quickly sees that reminders work!
        handler.postDelayed(periodicRunnable, 2 * 60 * 1000L);
    }

    private Notification buildStickyNotification() {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            this, 0, openIntent,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0
        );

        return new NotificationCompat.Builder(this, CHANNEL_STICKY)
            .setContentTitle("تحويشة استغفار • محرك التنبيهات نشط 📿")
            .setContentText("التنبيهات والأذكار تعمل في الخلفية بانتظام حتى لو الشاشة مقفولة")
            .setSmallIcon(R.drawable.ic_stat_tahwesha)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pi)
            .build();
    }

    private void createStickyChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = nm.getNotificationChannel(CHANNEL_STICKY);
                if (channel == null) {
                    channel = new NotificationChannel(
                        CHANNEL_STICKY,
                        "خدمة التنبيهات الدائمة (خلفية)",
                        NotificationManager.IMPORTANCE_LOW
                    );
                    channel.setDescription("تبقي محرك الأذكار والتنبيهات نشطاً في خلفية الموبايل دون انقطاع");
                    channel.setShowBadge(false);
                    nm.createNotificationChannel(channel);
                }
            }
        }
    }

    @Override
    public void onDestroy() {
        if (handler != null && periodicRunnable != null) {
            handler.removeCallbacks(periodicRunnable);
        }
        super.onDestroy();
        Log.w(TAG, "TahweshaService destroyed, sending revive broadcast...");
        // Revive via AlarmManager if destroyed
        TahweshaReminderManager.scheduleAllAlarms(getApplicationContext());
    }
}
