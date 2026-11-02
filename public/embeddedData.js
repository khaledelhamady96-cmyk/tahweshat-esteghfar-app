/**
 * Tahweshat Esteghfar - Embedded Datasets & Offline Engine for Android APK
 * بركة الرزق ونور الاستغفار
 */

const EMBEDDED_AZKAR = [
  {
    id: 1,
    text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ",
    fadl: "كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن",
    category: "تسبيح"
  },
  {
    id: 2,
    text: "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ",
    fadl: "من قالها غُفرت ذنوبه وإن كان فاراً من الزحف",
    category: "استغفار"
  },
  {
    id: 3,
    text: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ",
    fadl: "كنز من كنوز الجنة ودواء لتسعة وتسعين داء أيسرها الهم",
    category: "حوقلة"
  },
  {
    id: 4,
    text: "اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ وَعَلَى آلِهِ وَصَحْبِهِ أَجْمَعِينَ",
    fadl: "من صلى عليّ صلاة صلى الله عليه بها عشراً وكُفي همّه",
    category: "صلاة على النبي"
  },
  {
    id: 5,
    text: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
    fadl: "دعوة ذي النون ما دعا بها مسلم في كربة إلا فرّج الله عنه",
    category: "تفريج الكرب"
  },
  {
    id: 6,
    text: "سُبْحَانَ اللَّهِ ، وَالْحَمْدُ لِلَّهِ ، وَلَا إِلَهَ إِلَّا اللَّهُ ، وَاللَّهُ أَكْبَرُ",
    fadl: "أحب الكلام إلى الله تعالى والباقيات الصالحات",
    category: "الباقيات الصالحات"
  },
  {
    id: 7,
    text: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
    fadl: "من قالها سبع مرات كفاه الله ما أهمه",
    category: "توكل"
  },
  {
    id: 8,
    text: "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ ، أَصْلِحْ لِي شَأْنِي كُلَّهُ وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ",
    fadl: "من أعظم أدعية الصباح والمساء لحفظ وتوفيق العبد",
    category: "استغاثة ودعاء"
  }
];

const EMBEDDED_QURAN = [
  {
    id: 1,
    surah: "سورة البقرة",
    versesRange: "الآيات 285 - 286",
    verses: [
      "آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ",
      "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا",
      "رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا",
      "رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا",
      "أَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ"
    ],
    fadl: "من قرأ بهما في ليلة كفتاه من كل سوء"
  },
  {
    id: 2,
    surah: "سورة الشرح",
    versesRange: "الآيات 1 - 5",
    verses: [
      "أَلَمْ نَشْرَحْ لَكَ صَدْرَكَ",
      "وَوَضَعْنَا عَنكَ وِزْرَكَ",
      "الَّذِي أَنقَضَ ظَهْرَكَ",
      "وَرَفَعْنَا لَكَ ذِكْرَكَ",
      "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا"
    ],
    fadl: "بشارة بانفراج الكرب والهم وتيسير الأمور بإذن الله"
  },
  {
    id: 3,
    surah: "سورة الطلاق",
    versesRange: "آيات الرزق والتوكل",
    verses: [
      "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا ۝ وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ",
      "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ ۚ إِنَّ اللَّهَ بَالِغُ أَمْرِهِ",
      "قَدْ جَعَلَ اللَّهُ لِكُلِّ شَيْءٍ قَدْرًا",
      "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مِنْ أَمْرِهِ يُسْرًا",
      "سَيَجْعَلُ اللَّهُ بَعْدَ عُسْرٍ يُسْرًا"
    ],
    fadl: "آيات الرزق والتفريج والبركة والتوكل على الله"
  }
];

const EMBEDDED_DUAA = [
  "اللَّهُمَّ اغْفِرْ لِـ {NAME} وَارْحَمْهُ، وَعَافِهِ وَاعْفُ عَنْهُ، وَأَكْرِمْ نُزُلَهُ، وَوَسِّعْ مُدْخَلَهُ، وَاغْسِلْهُ بِالْمَاءِ وَالثَّلْجِ وَالْبَرَدِ.",
  "اللَّهُمَّ أَبْدِلْ {NAME} دَاراً خَيْراً مِنْ دَارِهِ، وَأَهْلاً خَيْراً مِنْ أَهْلِهِ، وَأَدْخِلْهُ الْجَنَّةَ، وَأَعِذْهُ مِنْ عَذَابِ الْقَبْرِ.",
  "اللَّهُمَّ اجْعَلْ قَبْرَ {NAME} رَوْضَةً مِنْ رِيَاضِ الْجَنَّةِ، وَلا تَجْعَلْهُ حُفْرَةً مِنْ حُفَرِ النَّارِ.",
  "اللَّهُمَّ إِنْ كَانَ {NAME} مُحْسِناً فَزِدْ فِي إِحْسَانِهِ، وَإِنْ كَانَ مُسِيئاً فَتَجَاوَزْ عَنْ سَيِّئَاتِهِ."
];

// Offline Local Database Engine
const OfflineEngine = {
  getStorage(key, defaultVal) {
    try {
      const data = localStorage.getItem(`tahwesha_apk_${key}`);
      return data ? JSON.parse(data) : defaultVal;
    } catch {
      return defaultVal;
    }
  },

  setStorage(key, val) {
    try {
      localStorage.setItem(`tahwesha_apk_${key}`, JSON.stringify(val));
    } catch (e) {
      console.warn("Storage error:", e);
    }
  },

  init() {
    let users = this.getStorage('users', null);
    if (!users || !Array.isArray(users)) {
      users = [];
    }

    // Master Admin Object - Always guaranteed 100%
    const masterAdmin = {
      id: "admin_master",
      name: "مدير النظام الرئيسي",
      phone: "01099099127",
      password: "141996",
      email: "admin@tahwesha.app",
      role: "admin",
      isVerified: true,
      verificationCode: "141996",
      deceasedName: "جميع موتى المسلمين",
      createdAt: "2026-11-02T12:00:00.000Z"
    };

    // Always ensure Master Admin exists with exact credentials
    const adminIndex = users.findIndex(u => u.phone === '01099099127' || u.id === 'admin_master');
    if (adminIndex === -1) {
      users.unshift(masterAdmin);
    } else {
      users[adminIndex] = { ...users[adminIndex], ...masterAdmin };
    }

    // Filter out any legacy dummy/demo users
    users = users.filter(u => u.id === 'admin_master' || (!u.id.startsWith('demo_') && u.phone !== '01012345678'));
    this.setStorage('users', users);

    let financials = this.getStorage('financials', null);
    if (!financials || !Array.isArray(financials.dailyExpenses)) {
      financials = {
        monthlyIncome: 0,
        dailyExpenses: [],
        moneyCircles: [],
        deposits: [],
        installments: [],
        receivables: []
      };
      this.setStorage('financials', financials);
    } else {
      // Ensure no legacy demo expenses or installments
      let changed = false;
      if (!Array.isArray(financials.receivables)) {
        financials.receivables = [];
        changed = true;
      }
      if (financials.dailyExpenses && financials.dailyExpenses.some(e => e.id === 'exp_1' || e.id === 'exp_2')) {
        financials.dailyExpenses = financials.dailyExpenses.filter(e => e.id !== 'exp_1' && e.id !== 'exp_2');
        changed = true;
      }
      if (financials.moneyCircles && financials.moneyCircles.some(c => c.id === 'cir_1')) {
        financials.moneyCircles = financials.moneyCircles.filter(c => c.id !== 'cir_1');
        changed = true;
      }
      if (financials.deposits && financials.deposits.some(d => d.id === 'dep_1')) {
        financials.deposits = financials.deposits.filter(d => d.id !== 'dep_1');
        changed = true;
      }
      if (financials.installments && financials.installments.some(i => i.id === 'inst_1')) {
        financials.installments = financials.installments.filter(i => i.id !== 'inst_1');
        changed = true;
      }
      if (changed) {
        this.setStorage('financials', financials);
      }
    }

    let vehicles = this.getStorage('vehicles', null);
    if (!vehicles || !Array.isArray(vehicles)) {
      vehicles = [];
      this.setStorage('vehicles', vehicles);
    } else {
      // Clean any legacy demo vehicle
      if (vehicles.some(v => v.id === 'veh_1')) {
        vehicles = vehicles.filter(v => v.id !== 'veh_1');
        this.setStorage('vehicles', vehicles);
      }
    }
  },

  runFinancialAnalysis(financials) {
    const baseIncome = financials.monthlyIncome || 0;
    const depositsReturn = (financials.deposits || []).reduce((sum, d) => sum + (parseFloat(d.monthlyReturn) || 0), 0);
    const totalIncome = baseIncome + depositsReturn;
    const installmentsSum = (financials.installments || []).reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
    const circlesSum = (financials.moneyCircles || []).reduce((sum, c) => sum + (parseFloat(c.monthlyAmount) || 0), 0);
    const totalFixedObligations = installmentsSum + circlesSum;

    let totalDailyExpenses = 0;
    const categoryBreakdown = { food: 0, transport: 0, medical: 0, outings: 0, bills: 0, other: 0 };
    (financials.dailyExpenses || []).forEach(e => {
      const amt = parseFloat(e.amount) || 0;
      totalDailyExpenses += amt;
      const cat = e.category || 'other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + amt;
    });

    const totalSpent = totalFixedObligations + totalDailyExpenses;
    const netSavings = totalIncome - totalSpent;
    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0;

    const recommendations = [];
    const investmentProposals = [];

    if (categoryBreakdown.outings > 0) {
      const suggestedSaving = Math.round(categoryBreakdown.outings * 0.4);
      recommendations.push({
        title: "ترشيد مصاريف الخروج والترفيه",
        description: `بتقليل الخروجات بنسبة 40% ستوفر شهرياً ${suggestedSaving.toLocaleString()} جنيه تضاف لتحويشتك.`,
        potentialMonthlySaving: suggestedSaving
      });
    }

    if (installmentsSum > 0) {
      recommendations.push({
        title: "تسريع سداد الأقساط",
        description: `التزام الأقساط الحالي ${installmentsSum.toLocaleString()} ج شهرياً. عند انتهاء أحد الأقساط وجه قيمته للادخار.`,
        potentialMonthlySaving: 0
      });
    }

    if (netSavings > 1000) {
      investmentProposals.push({
        title: "شهادات إدخار بنكية ذات عائد شهري",
        expectedReturnRate: "23.5% - 27%",
        description: `استثمر الفائض الشهري (${Math.round(netSavings).toLocaleString()} ج) في شهادات بنكية لزيادة دخلك.`
      });
      investmentProposals.push({
        title: "شراء سبائك ذهب عيار 24",
        expectedReturnRate: "حفظ القيمة",
        description: "شراء جرامات ذهب شهرياً كدرع لحماية مدخراتك من التضخم."
      });
    }

    return {
      totalIncome,
      baseIncome,
      depositsReturn,
      totalSpent,
      totalFixedObligations,
      netSavings,
      savingsRate: parseFloat(savingsRate),
      healthScore: netSavings > totalIncome * 0.25 ? 90 : (netSavings > 0 ? 75 : 45),
      verdict: netSavings > 0 ? "وضعك المالي مستقر وجيد، اتبع التوصيات لتنمية تحويشتك." : "عجز مالي: قم بترشيد النفقات الترفيهية فوراً.",
      categoryBreakdown,
      recommendations,
      investmentProposals
    };
  }
};

// Initialize offline database
OfflineEngine.init();
