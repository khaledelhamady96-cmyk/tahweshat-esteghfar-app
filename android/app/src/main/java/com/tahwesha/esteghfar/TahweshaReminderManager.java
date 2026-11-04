package com.tahwesha.esteghfar;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class TahweshaReminderManager {

    public static final String TYPE_TEST = "type_test";
    public static final String TYPE_AZKAR = "type_azkar";
    public static final String TYPE_QURAN = "type_quran";
    public static final String TYPE_DUAA = "type_duaa";
    public static final String TYPE_VEHICLE = "type_vehicle";
    public static final String TYPE_FINANCIAL = "type_financial";

    private static final String[] AZKAR_ITEMS = {
        "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ (استغفار يمحو الذنوب ويجلب الرزق)",
        "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ (كلمتان خفيفتان على اللسان ثقيلتان في الميزان)",
        "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ (كنز عظيم من كنوز الجنة)",
        "اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ (من صلى علي صلاة صلى الله عليه بها عشراً)",
        "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ (دعوة ذي النون ما دعا بها مكروب إلا فرج الله عنه)",
        "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ، حَمْداً كَثِيراً طَيِّباً مُبَارَكاً فِيهِ",
        "سُبْحَانَ اللَّهِ ، وَالْحَمْدُ لِلَّهِ ، وَلَا إِلَهَ إِلَّا اللَّهُ ، وَاللَّهُ أَكْبَرُ"
    };

    private static final String[] QURAN_ITEMS = {
        "📖 سورة البقرة: « اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ »",
        "📖 سورة الشرح: « فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا »",
        "📖 سورة الطلاق: « وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا ۝ وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ »",
        "📖 سورة النور: « اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ ۚ مَثَلُ نُورِهِ كَمِشْكَاةٍ فِيهَا مِصْبَاحٌ »",
        "📖 سورة الإخلاص: « قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ »"
    };

    private static final String[] DUAA_ITEMS = {
        "اللَّهُمَّ اغْفِرْ لِمَوْتَانَا وَمَوْتَى الْمُسْلِمِينَ، وَارْحَمْهُمْ وَعَافِهِمْ وَاعْفُ عَنْهُمْ، وَأَكْرِمْ نُزُلَهُمْ وَوَسِّعْ مَدْخَلَهُمْ.",
        "اللَّهُمَّ اجْعَلْ قُبُورَهُمْ رَوْضَةً مِنْ رِيَاضِ الْجَنَّةِ، وَلَا تَجْعَلْهَا حُفْرَةً مِنْ حُفَرِ النَّارِ.",
        "اللَّهُمَّ بَرِّدْ عَلَى قُبُورِهِمْ وَأَنْزِلْ عَلَيْهِمْ نُوراً وَفَرَحاً وَسُرُوراً إِلَى يَوْمِ يُبْعَثُونَ."
    };

    private static int azkarIndex = 0;
    private static int quranIndex = 0;
    private static int duaaIndex = 0;

    public static void scheduleAllAlarms(Context context) {
        // 1. Quick 15-second test reminder so user can lock screen and see it
        scheduleSingleAlarm(context, TYPE_TEST, 15 * 1000, 1001,
            "📿 ذكر واستغفار • تحويشة استغفار",
            "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ");

        // 2. Schedule Azkar (30 minutes)
        scheduleNextForType(context, TYPE_AZKAR);

        // 3. Schedule Quran (60 minutes)
        scheduleNextForType(context, TYPE_QURAN);

        // 4. Schedule Duaa (90 minutes)
        scheduleNextForType(context, TYPE_DUAA);

        // 5. Schedule Vehicle alert (every 3 hours)
        scheduleNextForType(context, TYPE_VEHICLE);

        // 6. Schedule Financial installment reminder (every 4 hours)
        scheduleNextForType(context, TYPE_FINANCIAL);
    }

    public static void scheduleNextForType(Context context, String type) {
        long delayMillis;
        int id;
        String title;
        String body;

        if (TYPE_AZKAR.equals(type)) {
            delayMillis = 30 * 60 * 1000L; // 30 minutes
            id = 2001;
            title = "📿 ذكر واستغفار • تحويشة استغفار";
            body = AZKAR_ITEMS[Math.abs(azkarIndex % AZKAR_ITEMS.length)];
            azkarIndex++;
        } else if (TYPE_QURAN.equals(type)) {
            delayMillis = 60 * 60 * 1000L; // 60 minutes
            id = 2002;
            title = "📖 آيات بينات من الذكر الحكيم";
            body = QURAN_ITEMS[Math.abs(quranIndex % QURAN_ITEMS.length)];
            quranIndex++;
        } else if (TYPE_DUAA.equals(type)) {
            delayMillis = 90 * 60 * 1000L; // 90 minutes
            id = 2003;
            title = "🤲 دعاء للمتوفي • تحويشة استغفar";
            body = DUAA_ITEMS[Math.abs(duaaIndex % DUAA_ITEMS.length)];
            duaaIndex++;
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
        } else {
            return;
        }

        scheduleSingleAlarm(context, type, delayMillis, id, title, body);
    }

    public static void scheduleSingleAlarm(Context context, String type, long delayMillis, int id, String title, String body) {
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

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
        } else {
            am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
        }
    }
}
