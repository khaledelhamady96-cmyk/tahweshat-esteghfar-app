/**
 * AI Financial Advisor Engine for Tahweshat Esteghfar
 * محرك الذكاء الاصطناعي المالي لتحليل المصروفات وتقديم توصيات الادخار والاستثمار
 */

function generateFinancialAnalysis(financials, user) {
  const baseIncome = financials.monthlyIncome || 0;
  
  // Calculate passive income from deposits
  const depositsReturn = (financials.deposits || []).reduce((sum, d) => sum + (parseFloat(d.monthlyReturn) || 0), 0);
  const totalIncome = baseIncome + depositsReturn;

  // Calculate monthly installments obligations
  const installmentsSum = (financials.installments || []).reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  
  // Calculate money circles obligations
  const circlesSum = (financials.moneyCircles || []).reduce((sum, c) => sum + (parseFloat(c.monthlyAmount) || 0), 0);
  
  const totalFixedObligations = installmentsSum + circlesSum;

  // Calculate daily expenses breakdown
  const expenses = financials.dailyExpenses || [];
  let totalDailyExpenses = 0;
  const categoryBreakdown = {
    food: 0,
    transport: 0,
    medical: 0,
    outings: 0,
    bills: 0,
    other: 0
  };

  expenses.forEach(e => {
    const amt = parseFloat(e.amount) || 0;
    totalDailyExpenses += amt;
    const cat = e.category || 'other';
    if (categoryBreakdown[cat] !== undefined) {
      categoryBreakdown[cat] += amt;
    } else {
      categoryBreakdown.other += amt;
    }
  });

  const totalSpent = totalFixedObligations + totalDailyExpenses;
  const netSavings = totalIncome - totalSpent;
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0;
  const expenseRatio = totalIncome > 0 ? ((totalSpent / totalIncome) * 100).toFixed(1) : 0;

  // Generate AI Insights & Recommendations
  const recommendations = [];
  const investmentProposals = [];
  const alerts = [];

  // 1. Analyze Outings (مصاريف الخروج والترفيه)
  const outingsPct = totalIncome > 0 ? (categoryBreakdown.outings / totalIncome) * 100 : 0;
  if (categoryBreakdown.outings > 0) {
    if (outingsPct > 15) {
      const suggestedSaving = Math.round(categoryBreakdown.outings * 0.4);
      recommendations.push({
        type: "reduce_expense",
        category: "outings",
        title: "ترشيد مصاريف الخروج والترفيه",
        description: `تمثل مصاريف الخروج ${outingsPct.toFixed(1)}% من دخلك (${categoryBreakdown.outings.toLocaleString()} ج). بتقليل عدد الخروجات الخارجية بنسبة 40%، ستوفر شهرياً حوالي ${suggestedSaving.toLocaleString()} جنيه تضاف مباشرة لتحويشتك.`,
        priority: "high",
        potentialMonthlySaving: suggestedSaving
      });
    } else {
      recommendations.push({
        type: "maintain",
        category: "outings",
        title: "مصاريف الخروج متوازنة ومضبوطة",
        description: `أنت تنفق بنسبة معتدلة (${outingsPct.toFixed(1)}%) على الترفيه، حافظ على هذا النمط الذكي.`,
        priority: "low",
        potentialMonthlySaving: 0
      });
    }
  }

  // 2. Analyze Medical expenses (مصاريف العلاج)
  if (categoryBreakdown.medical > 0) {
    const medicalPct = totalIncome > 0 ? (categoryBreakdown.medical / totalIncome) * 100 : 0;
    if (medicalPct > 20) {
      recommendations.push({
        type: "health_insurance",
        category: "medical",
        title: "دراسة اشتراك تأمين صحي عائلي أو خصومات الصيدليات",
        description: `مصاريف العلاج بلغت ${categoryBreakdown.medical.toLocaleString()} ج (${medicalPct.toFixed(1)}% من الدخل). نوصي بالاشتراك في بطاقات الرعاية الصحية المخفضة أو برامج التأمين الطبي لتقليص تكاليف الكشوفات والأدوية بنسبة تصل إلى 30%.`,
        priority: "medium",
        potentialMonthlySaving: Math.round(categoryBreakdown.medical * 0.25)
      });
    }
  }

  // 3. Analyze Installments Burden (أقساط الفيزا والمشتريات)
  const debtRatio = totalIncome > 0 ? (installmentsSum / totalIncome) * 100 : 0;
  if (debtRatio > 35) {
    alerts.push({
      type: "debt_warning",
      title: "تحذير: عبء الأقساط مرتفع جداً",
      message: `أقساطك الشهرية تبتلع ${debtRatio.toFixed(1)}% من دخلك! الحد الآمن الموصى به هو 25% كحد أقصى. تجنب شراء أي سلع جديدة بالتقسيط حتى تسديد الأقساط الحالية.`
    });
  } else if (installmentsSum > 0) {
    recommendations.push({
      type: "debt_tip",
      category: "installments",
      title: "التسريع في إغلاق أقساط فيزا المشتريات",
      description: `أقساطك الحالية تبلغ ${installmentsSum.toLocaleString()} ج شهرياً. عند انتهاء أحد الأقساط، وجه قيمته فوراً إلى بند الادخار أو سداد قسط آخر (استراتيجية كرة الثلج).`,
      priority: "medium"
    });
  }

  // 4. Investment & Surplus Wealth Building (اقتراحات الاستثمار)
  if (netSavings > 1000) {
    // Has good positive surplus!
    investmentProposals.push({
      title: "شهادات إدخار بنكية ذات عائد شهري",
      type: "certificate",
      description: `لديك فائض ادخار شهري قدره ${Math.round(netSavings).toLocaleString()} ج. يمكنك تجميع هذا الفائض وشراء شهادات بنكية تدر عائداً ثابتاً يُضاف تلقائياً لدخلك الشهري.`,
      expectedReturnRate: "23.5% - 27% سنوياً",
      riskLevel: "منخفض جداً (آمن 100%)",
      action: "شراء شهادة ادخار"
    });

    investmentProposals.push({
      title: "الادخار في الذهب الاستثماري (سبائك وجنيهات)",
      type: "gold",
      description: "اقتطاع جزء من الفائض (مثلاً 30%) لشراء جرامات أو سبائك ذهب صغيرة شهرياً كدرع قوي لحماية أموالك من التضخم وتقلبات الأسعار.",
      expectedReturnRate: "حفظ القيمة ونمو طويل الأجل",
      riskLevel: "متوسط (للمدى المتوسط والطويل)",
      action: "شراء سبيكة ذهبية عيار 24"
    });

    investmentProposals.push({
      title: "بدء جمعية ادخارية بهدف محدد",
      type: "money_circle",
      description: `يمكنك الاشتراك في جمعية شهرية بقسط ${Math.min(3000, Math.round(netSavings * 0.6)).toLocaleString()} ج للحصول على مبلغ مالي مجمع بعد فترة يُمكّنك من سداد التزام كبير أو استثمار عقاري.`,
      expectedReturnRate: "تمويل بدون فوائد",
      riskLevel: "آمن مع المعارف الموثوقين",
      action: "إضافة جمعية جديدة"
    });
  } else if (netSavings >= 0) {
    recommendations.push({
      type: "emergency_fund",
      category: "savings",
      title: "بناء صندوق الطوارئ أولاً",
      description: `الفائض المتبقي لديك محدود (${Math.round(netSavings).toLocaleString()} ج). الأولوية الآن هي تجميع مبلغ يعادل مصاريف 3 شهور (${(totalSpent * 3).toLocaleString()} ج) في حساب منفصل للطوارئ قبل بدء أي استثمار عالي المخاطر.`,
      priority: "high"
    });
  } else {
    // In deficit
    alerts.push({
      type: "deficit_alert",
      title: "تنبيه عاجل: المصروفات تتجاوز الدخل الشهري!",
      message: `عجز مالي شهري قدره ${Math.abs(Math.round(netSavings)).toLocaleString()} جنيه. تحتاج فوراً إلى تقليص النفقات المتغيرة والحد من الخروجات والطلبات الخارجية لتفادي الاستدانة.`
    });
  }

  // Summary AI verdict
  let verdict = "";
  let healthScore = 70; // out of 100

  if (netSavings > totalIncome * 0.25) {
    healthScore = 95;
    verdict = "وضعك المالي ممتاز! تحقق نسبة ادخار رائعة تتجاوز 25% من دخلك. أنت في المسار الصحيح لبناء الثروة وتأمين مستقبلك.";
  } else if (netSavings > 0) {
    healthScore = 75;
    verdict = "وضعك المالي مستقر وجيد، ولكن هناك هوامش للتحسين والادخار بشكل أفضل من خلال ترشيد النفقات الترفيهية والتسريع في سداد الأقساط.";
  } else {
    healthScore = 40;
    verdict = "تحتاج ميزانيتك إلى إعادة هيكلة عاجلة! إجمالي المنصرف يتجاوز الوارد، اتبع توصيات ترشيد المصروفات لتعديل المسار المالي في أسرع وقت.";
  }

  return {
    month: new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }),
    totalIncome,
    baseIncome,
    depositsReturn,
    totalSpent,
    totalFixedObligations,
    installmentsSum,
    circlesSum,
    totalDailyExpenses,
    netSavings,
    savingsRate: parseFloat(savingsRate),
    expenseRatio: parseFloat(expenseRatio),
    healthScore,
    verdict,
    categoryBreakdown,
    recommendations,
    investmentProposals,
    alerts
  };
}

module.exports = {
  generateFinancialAnalysis
};
