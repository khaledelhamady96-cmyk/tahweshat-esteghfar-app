package com.tahwesha.esteghfar;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

public class TahweshaReminderManager {
    private static final String TAG = "TahweshaReminder";

    public static final String TYPE_TEST = "type_test";
    public static final String TYPE_AZKAR = "type_azkar";
    public static final String TYPE_QURAN = "type_quran";
    public static final String TYPE_DUAA = "type_duaa";
    public static final String TYPE_VEHICLE = "type_vehicle";
    public static final String TYPE_FINANCIAL = "type_financial";
    public static final String TYPE_PRAYER = "prayer";
    public static final int PRAYER_ALARM_BASE_ID = 3000;

    private static final String[] AZKAR_ITEMS = {
        "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ (غُفِرَتْ ذُنُوبُهُ وَإِنْ كَانَ فَرَّ مِنَ الزَّحْفِ)",
        "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ (كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ ثَقِيلَتَانِ فِي الْمِيزَانِ)",
        "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ (كَنْزٌ مِنْ كُنُوزِ الْجَنَّةِ)",
        "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ (مَنْ صَلَّى عَلَيَّ صَلَاةً صَلَّى اللَّهُ عَلَيْهِ بِهَا عَشْراً)",
        "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ (دَعْوَةُ ذِي النُّونِ لَمْ يَدْعُ بِهَا رَجُلٌ مُسْلِمٌ إِلَّا اسْتَجَابَ اللَّهُ لَهُ)",
        "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ (مِائَةَ مَرَّةٍ فِي الْيَوْمِ تُفَتِّحُ أَبْوَابَ الرِّزْقِ)",
        "سُبْحَانَ اللَّهِ ، وَالْحَمْدُ لِلَّهِ ، وَلَا إِلَهَ إِلَّا اللَّهُ ، وَاللَّهُ أَكْبَرُ"
    };

    private static final String[] QURAN_ITEMS = {
        "﴿ فَقُلْتُ اسْتَغْفِرُوا رَبَّكُمْ إِنَّهُ كَانَ غَفَّارًا • يُرْسِلِ السَّمَاءَ عَلَيْكُمْ مِدْرَارًا • وَيُمْدِدْكُمْ بِأَمْوَالٍ وَبَنِينَ ﴾",
        "﴿ وَمَا كَانَ اللَّهُ مُعَذِّبَهُمْ وَهُمْ يَسْتَغْفِرُونَ ﴾",
        "﴿ وَمَنْ يَتَّقِ اللَّهَ يَجْعَلْ لَهُ مَخْرَجًا • وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ ﴾",
        "﴿ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾",
        "﴿ إِنَّ مَعَ الْعُسْرِ يُسْرًا ﴾",
        "﴿ وَتَوَكَّلْ عَلَى الْحَيِّ الَّذِي لَا يَمُوتُ وَسَبِّحْ بِحَمْدِهِ ﴾"
    };

    private static final String[] DUAA_ITEMS = {
        "اللَّهُمَّ اغْفِرْ لِأَمْوَاتِنَا وَأَمْوَاتِ الْمُسْلِمِينَ، وَارْحَمْهُمْ رَحْمَةً وَاسِعَةً، وَنَوِّرْ قُبُورَهُمْ.",
        "اللَّهُمَّ اجْعَلْ قُبُورَهُمْ رَوْضَةً مِنْ رِيَاضِ الْجَنَّةِ، وَلَا تَجْعَلْهَا حُفْرَةً مِنْ حُفَرِ النَّارِ.",
        "اللَّهُمَّ بَرِّدْ عَلَى قُبُورِهِمْ وَأَنْزِلْ عَلَيْهِمْ نُوراً وَفَرَحاً وَسُرُوراً إِلَى يَوْمِ يُبْعَثُونَ."
    };

    private static int azkarIndex = 0;
    private static int quranIndex = 0;
    private static int duaaIndex = 0;

    public static String getNextAzkar() {
        String item = AZKAR_ITEMS[Math.abs(azkarIndex % AZKAR_ITEMS.length)];
        azkarIndex++;
        return item;
    }

    public static String getNextQuran() {
        String item = QURAN_ITEMS[Math.abs(quranIndex % QURAN_ITEMS.length)];
        quranIndex++;
        return item;
    }

    public static String getNextDuaa() {
        String item = DUAA_ITEMS[Math.abs(duaaIndex % DUAA_ITEMS.length)];
        duaaIndex++;
        return item;
    }

    public static void ensureAlarmsScheduled(Context context) {
        if (context == null) return;
        try {
            // Always ensure alarms are scheduled without restrictive cooldowns
            scheduleAllAlarms(context);
        } catch (Throwable t) {
            Log.e(TAG, "Error in ensureAlarmsScheduled", t);
        }
    }

    public static void scheduleAllAlarms(Context context) {
        if (context == null) return;
        try {
            // 1. First Azkar alarm after 1 MINUTE so user immediately verifies delivery upon testing!
            scheduleSingleAlarm(context, TYPE_AZKAR, 60 * 1000L, 2001,
                "📿 ذكر واستغفار • تحويشة استغفار",
                getNextAzkar());

            // 2. Schedule Quran staggered at 25 minutes
            scheduleSingleAlarm(context, TYPE_QURAN, 25 * 60 * 1000L, 2002,
                "📖 آيات بينات من الذكر الحكيم",
                getNextQuran());

            // 3. Schedule Duaa staggered at 50 minutes
            scheduleSingleAlarm(context, TYPE_DUAA, 50 * 60 * 1000L, 2003,
                "🤲 دعاء للمتوفي • تحويشة استغفار",
                getNextDuaa());

            // 4. Schedule Vehicle reminder at 2 hours
            scheduleSingleAlarm(context, TYPE_VEHICLE, 2 * 60 * 60 * 1000L, 2004,
                "🚗 متابعة رخص المركبات والسيارات",
                "تذكير: راجع تواريخ انتهاء رخص مركباتك المسجلة للتجديد في موعدها لتفادي الغرامات.");

            // 5. Schedule Financial reminder at 4 hours
            scheduleSingleAlarm(context, TYPE_FINANCIAL, 4 * 60 * 60 * 1000L, 2005,
                "💳 متابعة الأقساط والجمعيات المالية",
                "تذكير: راجع مواعيد سداد الأقساط والجمعيات الشهرية المسجلة في خطتك المالية.");

            Log.d(TAG, "All background alarms successfully scheduled!");
        } catch (Throwable t) {
            Log.e(TAG, "Error in scheduleAllAlarms", t);
        }
    }

    public static void scheduleNextForType(Context context, String type) {
        if (context == null) return;
        long delayMillis;
        int id;
        String title;
        String body;

        if (TYPE_AZKAR.equals(type)) {
            delayMillis = 25 * 60 * 1000L; // 25 minutes
            id = 2001;
            title = "📿 ذكر واستغفار • تحويشة استغفار";
            body = getNextAzkar();
        } else if (TYPE_QURAN.equals(type)) {
            delayMillis = 50 * 60 * 1000L; // 50 minutes
            id = 2002;
            title = "📖 آيات بينات من الذكر الحكيم";
            body = getNextQuran();
        } else if (TYPE_DUAA.equals(type)) {
            delayMillis = 75 * 60 * 1000L; // 75 minutes
            id = 2003;
            title = "🤲 دعاء للمتوفي • تحويشة استغفار";
            body = getNextDuaa();
        } else if (TYPE_VEHICLE.equals(type)) {
            delayMillis = 3 * 60 * 60 * 1000L; // 3 hours
            id = 2004;
            title = "🚗 تنبيه رخص المركبات والسيارات";
            body = "تذكير: راجع تواريخ انتهاء رخص القيادة وتسيير المركبات لتفادي الغرامات وسحب اللوحات.";
        } else if (TYPE_FINANCIAL.equals(type)) {
            delayMillis = 4 * 60 * 60 * 1000L; // 4 hours
            id = 2005;
            title = "💳 تنبيه الأقساط والمستحقات المالية";
            body = "تذكير: لديك مواعيد استحقاق أقساط وجمعيات ومستحقات مسجلة في خطتك المالية.";
        } else if (TYPE_PRAYER.equals(type)) {
            delayMillis = 24 * 60 * 60 * 1000L; // Re-schedule next day
            id = 3001;
            title = "🕌 حان الآن موعد الصلاة والأذان";
            body = "حي على الصلاة • حي على الفلاح";
        } else {
            return;
        }

        scheduleSingleAlarm(context, type, delayMillis, id, title, body);
    }

    public static void schedulePrayerAlarms(
        Context context,
        long fajrMillis,
        long dhuhrMillis,
        long asrMillis,
        long maghribMillis,
        long ishaMillis,
        String voiceKey
    ) {
        if (context == null) return;
        try {
            if (voiceKey != null && !voiceKey.isEmpty()) {
                context.getSharedPreferences("tahwesha_prefs", Context.MODE_PRIVATE)
                    .edit()
                    .putString("selected_athan_voice", voiceKey)
                    .apply();
            }

            long now = System.currentTimeMillis();
            long dayMillis = 24 * 60 * 60 * 1000L;

            long[] prayerTimes = new long[]{ fajrMillis, dhuhrMillis, asrMillis, maghribMillis, ishaMillis };
            String[] prayerNames = new String[]{ "الفجر", "الظهر", "العصر", "المغرب", "العشاء" };
            String[] prayerSubtext = new String[]{
                "الصلاة خير من النوم • الصلاة خير من النوم",
                "حي على الصلاة • حي على الفلاح",
                "حي على الصلاة • حي على الفلاح",
                "حي على الصلاة • حي على الفلاح",
                "حي على الصلاة • حي على الفلاح"
            };

            for (int i = 0; i < 5; i++) {
                long target = prayerTimes[i];
                if (target <= now) {
                    target += dayMillis; // Past for today, schedule for tomorrow!
                }
                long delay = target - now;
                int alarmId = PRAYER_ALARM_BASE_ID + (i + 1);
                String title = "🕌 حان الآن موعد أذان صلاة " + prayerNames[i];
                String body = prayerSubtext[i] + " • تقبل الله طاعتكم";

                scheduleSingleAlarm(context, TYPE_PRAYER, delay, alarmId, title, body);
                Log.d(TAG, "Scheduled Prayer " + prayerNames[i] + " in " + (delay / 1000 / 60) + " minutes (id=" + alarmId + ")");
            }
        } catch (Throwable t) {
            Log.e(TAG, "schedulePrayerAlarms failed", t);
        }
    }

    public static void scheduleSingleAlarm(Context context, String type, long delayMillis, int id, String title, String body) {
        if (context == null) return;
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent intent = new Intent(context, TahweshaAlarmReceiver.class);
        intent.setAction(TahweshaAlarmReceiver.ACTION_FIRE_REMINDER);
        intent.putExtra(TahweshaAlarmReceiver.EXTRA_TYPE, type);
        intent.putExtra(TahweshaAlarmReceiver.EXTRA_TITLE, title);
        intent.putExtra(TahweshaAlarmReceiver.EXTRA_BODY, body);
        intent.putExtra(TahweshaAlarmReceiver.EXTRA_ID, id);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getBroadcast(context, id, intent, flags);

        long triggerAt = System.currentTimeMillis() + delayMillis;

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (am.canScheduleExactAlarms()) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                } else {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            }
        } catch (SecurityException se) {
            Log.w(TAG, "Exact alarm restricted, falling back to setAndAllowWhileIdle: " + se.getMessage());
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                } else {
                    am.set(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                }
            } catch (Throwable t) {
                Log.e(TAG, "Fallback setAndAllowWhileIdle failed", t);
            }
        } catch (Throwable t) {
            Log.e(TAG, "Unexpected error in scheduleSingleAlarm", t);
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                }
            } catch (Throwable ignored) {}
        }
    }
}
