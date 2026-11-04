package com.tahwesha.esteghfar;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class TahweshaBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            // Re-arm all native alarms immediately upon phone reboot or app update!
            TahweshaReminderManager.scheduleAllAlarms(context);
        }
    }
}
