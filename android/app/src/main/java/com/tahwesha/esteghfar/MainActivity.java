package com.tahwesha.esteghfar;

import android.os.Bundle;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.view.WindowManager;
import android.net.Uri;
import android.media.AudioAttributes;
import android.graphics.Color;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
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

        // Native Alarm Engine: schedule background alarms that survive app closure!
        TahweshaReminderManager.scheduleAllAlarms(this);
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
