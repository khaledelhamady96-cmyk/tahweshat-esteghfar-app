const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { azkarList, quranSets, deceasedDuaaTemplates } = require('./religiousData');
const { generateFinancialAnalysis } = require('./aiAdvisor');
const { getSmtpConfig, saveSmtpConfig, sendVerificationEmail } = require('./emailService');

const app = express();
const PORT = process.env.PORT || 4500;
const JWT_SECRET = process.env.JWT_SECRET || "tahweshat_esteghfar_secret_key_2026";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Authentication Middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "يرجى تسجيل الدخول أولاً" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "المستخدم غير موجود أو تم إلغاؤه" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "جلسة العمل منتهية الصلاحية، يرجى إعادة تسجيل الدخول" });
  }
}

// Admin only middleware (Strictly Master Admin 01099099127)
function adminMiddleware(req, res, next) {
  if (req.user && (req.user.phone === '01099099127' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ error: "غير مصرح لك بالوصول، هذه الصلاحية خاصة بإدارة البرنامج (01099099127) فقط" });
  }
}

// ----------------- AUTH ROUTES ----------------- //

// Live subscriber counter for login page
app.get('/api/auth/stats', (req, res) => {
  const count = db.getTotalSubscribersCount();
  res.json({
    subscribersCount: count,
    appName: "تحويشة استغفار",
    version: "2.0.0"
  });
});

// User Registration without OTP (Direct Registration & Auto-Login)
app.post('/api/auth/register', async (req, res) => {
  const { name, phone, email, password, deceasedName } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: "يرجى ملء الحقول المطلوبة (الاسم، رقم الموبايل، كلمة المرور)" });
  }

  try {
    const user = db.createUser({ name, phone, email: email || "", password, deceasedName });
    const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    
    res.json({
      success: true,
      message: "تم إنشاء الحساب بنجاح والدخول مباشرة! مرحباً بك في تحويشة استغفار.",
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        deceasedName: user.deceasedName
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Verify Registration OTP
app.post('/api/auth/verify', (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ error: "يرجى إدخال رقم الموبايل وكود التحقق" });
  }

  try {
    const user = db.verifyUser(phone, code);
    const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      success: true,
      message: "تم تفعيل حسابك بنجاح! مرحباً بك في تحويشة استغفار",
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        deceasedName: user.deceasedName
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Resend OTP via Email
app.post('/api/auth/resend-code', async (req, res) => {
  const { phone } = req.body;
  try {
    const user = db.findUserByPhone(phone);
    if (!user) throw new Error("المستخدم غير موجود");
    const code = db.resendVerificationCode(phone);
    
    // Send real verification email
    await sendVerificationEmail(user.email, user.name, code);

    res.json({
      success: true,
      message: `تمت إعادة إرسال كود التحقق السري إلى بريدك الإلكتروني (${user.email}) بنجاح.`
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

function normalizeArabicDigits(str) {
  if (str === undefined || str === null) return '';
  return str.toString()
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .trim();
}

function normalizePhone(phone) {
  if (!phone) return '';
  let p = normalizeArabicDigits(phone).replace(/[\s\-\(\)\.]/g, '');
  if (p.startsWith('+20')) p = '0' + p.slice(3);
  else if (p.startsWith('0020')) p = '0' + p.slice(4);
  else if (p.startsWith('20') && p.length === 12) p = '0' + p.slice(2);
  return p;
}

// Login
app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: "يرجى إدخال رقم الموبايل وكلمة المرور" });
  }

  const normPhone = normalizePhone(phone);
  const normPass = normalizeArabicDigits(password);

  // Direct Master Admin Authentication Bypass
  if (normPhone === '01099099127' && normPass === '141996') {
    let adminUser = db.findUserByPhone('01099099127');
    if (!adminUser) {
      db.ensureAdminUser();
      adminUser = db.findUserByPhone('01099099127');
    }
    const token = jwt.sign({ id: adminUser.id, phone: adminUser.phone, role: adminUser.role }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح كمدير للنظام",
      token,
      user: {
        id: adminUser.id,
        name: adminUser.name,
        phone: adminUser.phone,
        email: adminUser.email,
        role: adminUser.role,
        deceasedName: adminUser.deceasedName
      }
    });
  }

  const user = db.findUserByPhone(normPhone);
  if (!user || normalizeArabicDigits(user.password) !== normPass) {
    return res.status(400).json({ error: "رقم الموبايل أو كلمة المرور غير صحيحة" });
  }

  if (!user.isVerified) {
    user.isVerified = true;
    db.save();
  }

  const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({
    success: true,
    message: "تم تسجيل الدخول بنجاح",
    token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      deceasedName: user.deceasedName
    }
  });
});

// Current User Profile
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      phone: req.user.phone,
      email: req.user.email,
      role: req.user.role,
      deceasedName: req.user.deceasedName
    }
  });
});

// Update Profile & Deceased Name
app.put('/api/auth/profile', authMiddleware, (req, res) => {
  const { name, email, deceasedName, password } = req.body;
  try {
    const updated = db.updateProfile(req.user.id, { name, email, deceasedName, password });
    res.json({
      success: true,
      message: "تم تحديث البيانات الشخصية بنجاح",
      user: {
        id: updated.id,
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
        role: updated.role,
        deceasedName: updated.deceasedName
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------- FINANCIALS ROUTES ("تحويشة") ----------------- //

app.get('/api/financials', authMiddleware, (req, res) => {
  const financials = db.getUserFinancials(req.user.id);
  res.json(financials);
});

app.post('/api/financials/income', authMiddleware, (req, res) => {
  const { monthlyIncome } = req.body;
  const financials = db.updateMonthlyIncome(req.user.id, monthlyIncome);
  res.json({ success: true, monthlyIncome: financials.monthlyIncome });
});

app.post('/api/financials/expenses', authMiddleware, (req, res) => {
  const { amount, category, note, date } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "يرجى تحديد قيمة المصروف بشكل صحيح" });
  }
  const expense = db.addDailyExpense(req.user.id, { amount, category, note, date });
  res.json({ success: true, expense });
});

app.delete('/api/financials/expenses/:id', authMiddleware, (req, res) => {
  db.deleteDailyExpense(req.user.id, req.params.id);
  res.json({ success: true, message: "تم حذف المصروف بنجاح" });
});

app.post('/api/financials/circles', authMiddleware, (req, res) => {
  const { name, monthlyAmount, payoutMonth, payoutAmount } = req.body;
  if (!name || !monthlyAmount || !payoutMonth) {
    return res.status(400).json({ error: "يرجى ملء جميع بيانات الجمعية (الاسم، القسط، شهر الاستلام)" });
  }
  const circle = db.addMoneyCircle(req.user.id, { name, monthlyAmount, payoutMonth, payoutAmount });
  res.json({ success: true, circle });
});

app.delete('/api/financials/circles/:id', authMiddleware, (req, res) => {
  db.deleteMoneyCircle(req.user.id, req.params.id);
  res.json({ success: true, message: "تم حذف الجمعية بنجاح" });
});

app.post('/api/financials/deposits', authMiddleware, (req, res) => {
  const { name, principal, monthlyReturn, bank, maturityDate } = req.body;
  if (!name || !monthlyReturn) {
    return res.status(400).json({ error: "يرجى إدخال اسم الوديعة أو الشهادة والعائد الشهري" });
  }
  const deposit = db.addDeposit(req.user.id, { name, principal, monthlyReturn, bank, maturityDate });
  res.json({ success: true, deposit });
});

app.delete('/api/financials/deposits/:id', authMiddleware, (req, res) => {
  db.deleteDeposit(req.user.id, req.params.id);
  res.json({ success: true, message: "تم حذف الشهادة/الوديعة بنجاح" });
});

app.post('/api/financials/installments', authMiddleware, (req, res) => {
  const { title, amount, frequency, dueDay, dueMonth, annualDate, totalMonths, remainingMonths, notes } = req.body;
  if (!title || !amount) {
    return res.status(400).json({ error: "يرجى إدخال عنوان القسط وقيمته" });
  }
  const inst = db.addInstallment(req.user.id, { title, amount, frequency, dueDay, dueMonth, annualDate, totalMonths, remainingMonths, notes });
  res.json({ success: true, installment: inst });
});

app.delete('/api/financials/installments/:id', authMiddleware, (req, res) => {
  db.deleteInstallment(req.user.id, req.params.id);
  res.json({ success: true, message: "تم حذف القسط بنجاح" });
});

// ----------------- RECEIVABLES ROUTES (مستحقات شهرية ليا عند الناس) ----------------- //

app.get('/api/financials/receivables', authMiddleware, (req, res) => {
  const list = db.getUserReceivables(req.user.id);
  res.json(list);
});

app.post('/api/financials/receivables', authMiddleware, (req, res) => {
  const { title, amount, dueDay, debtorName, notes } = req.body;
  if (!title || !amount || !dueDay) {
    return res.status(400).json({ error: "يرجى إدخال مسمى المستحق وقيمته ويوم الاستحقاق الشهري" });
  }
  const rec = db.addReceivable(req.user.id, { title, amount, dueDay, debtorName, notes });
  res.json({ success: true, receivable: rec });
});

app.put('/api/financials/receivables/:id/collected', authMiddleware, (req, res) => {
  const { addToIncome } = req.body;
  try {
    const rec = db.markReceivableCollected(req.user.id, req.params.id, !!addToIncome);
    res.json({ success: true, message: "تم تسجيل التحصيل بنجاح!", receivable: rec });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/financials/receivables/:id', authMiddleware, (req, res) => {
  db.deleteReceivable(req.user.id, req.params.id);
  res.json({ success: true, message: "تم حذف المستحق بنجاح" });
});

// AI Financial Advisor & Monthly Analytics Endpoint
app.get('/api/financials/ai-analysis', authMiddleware, (req, res) => {
  const financials = db.getUserFinancials(req.user.id);
  const analysis = generateFinancialAnalysis(financials, req.user);
  res.json(analysis);
});

// ----------------- VEHICLES & LICENSES ROUTES ("مركباتي") ----------------- //

app.get('/api/vehicles', authMiddleware, (req, res) => {
  const list = db.getUserVehicles(req.user.id);
  
  // Calculate expiry warning (if expires within 30 days)
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const enhancedList = list.map(item => {
    let daysRemaining = null;
    let isExpiringSoon = false;
    let isExpired = false;

    if (item.expiryDate) {
      const expDate = new Date(item.expiryDate);
      const diffTime = expDate - now;
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 0) {
        isExpired = true;
      } else if (daysRemaining <= 30) {
        isExpiringSoon = true;
      }
    }

    return {
      ...item,
      daysRemaining,
      isExpiringSoon,
      isExpired
    };
  });

  res.json(enhancedList);
});

app.post('/api/vehicles', authMiddleware, (req, res) => {
  const { type, title, plateNumber, ownerName, vehicleType, issueDate, expiryDate, notes } = req.body;
  if (!title || !expiryDate) {
    return res.status(400).json({ error: "يرجى إدخال مسمى الرخصة وتاريخ الانتهاء" });
  }
  const item = db.addVehicleLicense(req.user.id, {
    type,
    title,
    plateNumber,
    ownerName: ownerName || req.user.name,
    vehicleType,
    issueDate,
    expiryDate,
    notes
  });
  res.json({ success: true, vehicle: item });
});

app.delete('/api/vehicles/:id', authMiddleware, (req, res) => {
  db.deleteVehicleLicense(req.user.id, req.params.id);
  res.json({ success: true, message: "تم حذف الرخصة بنجاح" });
});

// ----------------- RELIGIOUS CONTENT & REMINDERS ----------------- //

let azkarIndex = 0;
let quranIndex = 0;
let duaaIndex = 0;

app.get('/api/religious/azkar', (req, res) => {
  const item = azkarList[azkarIndex % azkarList.length];
  azkarIndex++;
  res.json({
    type: "azkar",
    title: "تذكير بذكر الله (نصف ساعة)",
    category: item.category,
    content: item.text,
    fadl: item.fadl,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/religious/quran', (req, res) => {
  const item = quranSets[quranIndex % quranSets.length];
  quranIndex++;
  res.json({
    type: "quran",
    title: `آيات بينات من الذكر الحكيم (${item.surah})`,
    surah: item.surah,
    versesRange: item.versesRange,
    verses: item.verses,
    fadl: item.fadl,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/religious/duaa', authMiddleware, (req, res) => {
  const deceasedName = (req.user && req.user.deceasedName) || "جميع موتى المسلمين";
  const rawTemplate = deceasedDuaaTemplates[duaaIndex % deceasedDuaaTemplates.length];
  duaaIndex++;
  const formattedDuaa = rawTemplate.replace(/{NAME}/g, deceasedName);
  
  res.json({
    type: "duaa",
    title: `دعاء للمتوفي (${deceasedName})`,
    deceasedName: deceasedName,
    content: formattedDuaa,
    timestamp: new Date().toISOString()
  });
});

// Consolidated smart alert scanner (installments, annual installments, receivables, licenses, broadcasts)
app.get('/api/alerts/summary', authMiddleware, (req, res) => {
  const financials = db.getUserFinancials(req.user.id);
  const vehicles = db.getUserVehicles(req.user.id);
  const broadcasts = db.getBroadcasts();

  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const alerts = [];

  // 1. Check Installments:
  // - Yearly: alert 30 days before (1 month)
  // - Monthly: alert 5 days before
  (financials.installments || []).forEach(inst => {
    if (inst.frequency === 'yearly') {
      const dueM = inst.dueMonth || 1;
      const dueD = inst.dueDay || 1;

      let nextDue = new Date(currentYear, dueM - 1, dueD);
      // If already passed by more than 2 days this year, check next year
      if (now.getTime() - nextDue.getTime() > 2 * 86400000) {
        nextDue = new Date(currentYear + 1, dueM - 1, dueD);
      }

      const diffDays = Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 30) {
        alerts.push({
          type: "annual_installment_reminder",
          severity: "warning",
          title: "🔔 تنبيه استحقاق قسط سنوي (قبلها بشهر)",
          message: `اقترب موعد سداد القسط السنوي لـ "${inst.title}" بمبلغ ${inst.amount.toLocaleString()} ج في تاريخ (${nextDue.toISOString().split('T')[0]}). متبقي ${diffDays === 0 ? 'اليوم' : diffDays + ' يوم'}.`,
          amount: inst.amount,
          daysRemaining: diffDays,
          isAnnual: true
        });
      }
    } else {
      // Monthly installment: alert 5 days before
      let diff = inst.dueDay - currentDay;
      if (diff < 0) {
        diff += 30;
      }
      if (diff >= 0 && diff <= 5) {
        alerts.push({
          type: "installment_reminder",
          severity: "warning",
          title: "تذكير استحقاق قسط شهري (خلال 5 أيام)",
          message: `اقترب موعد سداد "${inst.title}" بقيمة ${inst.amount.toLocaleString()} ج (متبقي ${diff === 0 ? 'اليوم' : diff + ' أيام'}).`,
          dueDay: inst.dueDay,
          amount: inst.amount
        });
      }
    }
  });

  // 2. Check Receivables (مستحقات شهرية ليا عند الناس):
  // Alert 3 days before due day, and KEEP ALERTING until marked collected!
  (financials.receivables || []).forEach(rec => {
    const isCollectedThisMonth = (rec.lastCollectedMonth === currentMonthStr);
    if (!isCollectedThisMonth) {
      const diff = rec.dueDay - currentDay;
      // Alert if within 3 days before due day, on due day, or past due day
      if (diff <= 3) {
        const statusText = diff < 0 ? `فات موعده بـ ${Math.abs(diff)} يوم ولم يُحصّل بعد!` : (diff === 0 ? "مستحق التحصيل اليوم!" : `متبقي ${diff} أيام على موعد الاستحقاق`);
        alerts.push({
          type: "receivable_reminder",
          severity: diff < 0 ? "danger" : "warning",
          title: `💰 مستحق مالي لك: "${rec.title}"`,
          message: `مستحق لك مبلغ ${rec.amount.toLocaleString()} ج ${rec.debtorName ? `من (${rec.debtorName})` : ''} يوم ${rec.dueDay} من الشهر (${statusText}). اضغط تم التحصيل فور الاستلام.`,
          receivableId: rec.id,
          amount: rec.amount,
          isReceivable: true
        });
      }
    }
  });

  // Check vehicle licenses expiring in <= 30 days
  vehicles.forEach(veh => {
    if (veh.expiryDate) {
      const expDate = new Date(veh.expiryDate);
      const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
      if (diffDays <= 30 && diffDays > 0) {
        alerts.push({
          type: "license_reminder",
          severity: "warning",
          title: "تنبيه تجديد رخصة (أقل من شهر)",
          message: `تنبيه: متبقي ${diffDays} يوماً على انتهاء "${veh.title}". يرجى التحضير للفحص والتجديد قبل الانتهاء!`,
          expiryDate: veh.expiryDate,
          daysRemaining: diffDays
        });
      } else if (diffDays <= 0) {
        alerts.push({
          type: "license_expired",
          severity: "danger",
          title: "تحذير: الرخصة منتهية!",
          message: `انتهت صلاحية "${veh.title}" بتاريخ ${veh.expiryDate}. يرجى التجديد فوراً لتجنب المخالفات القانونية.`,
          expiryDate: veh.expiryDate
        });
      }
    }
  });

  // Include unread personal messages from Admin for this specific user
  const personalMessages = db.getUserPersonalMessages(req.user.id);
  personalMessages.filter(m => !m.read).forEach(msg => {
    alerts.unshift({
      type: "admin_personal_message",
      severity: "info",
      title: `✉️ رسالة خاصة من الإدارة: ${msg.title}`,
      message: msg.message,
      messageId: msg.id,
      createdAt: msg.createdAt
    });
  });

  // Include latest broadcast if within 7 days
  if (broadcasts.length > 0) {
    const latest = broadcasts[0];
    alerts.push({
      type: "admin_broadcast",
      severity: "info",
      title: latest.title,
      message: latest.message,
      sentBy: latest.sentBy,
      createdAt: latest.createdAt
    });
  }

  res.json({ alerts, count: alerts.length });
});

// Mark personal message as read
app.post('/api/user/messages/:id/read', authMiddleware, (req, res) => {
  db.markPersonalMessageRead(req.user.id, req.params.id);
  res.json({ success: true });
});

// ----------------- ADMIN DASHBOARD ROUTES ----------------- //

// Admin Login Shortcut / Verification
app.get('/api/admin/overview', authMiddleware, adminMiddleware, (req, res) => {
  const totalSubscribers = db.getTotalSubscribersCount();
  const allUsers = db.getAllUsers();
  const broadcasts = db.getBroadcasts();
  const settings = db.getSettings();

  res.json({
    totalSubscribers,
    users: allUsers,
    broadcasts,
    settings
  });
});

// Admin Reset Password for any user
app.post('/api/admin/reset-password', authMiddleware, adminMiddleware, (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) {
    return res.status(400).json({ error: "يرجى تحديد المستخدم وكلمة المرور الجديدة" });
  }

  try {
    db.resetUserPassword(userId, newPassword);
    res.json({ success: true, message: "تمت إعادة تعيين كلمة المرور للمستخدم بنجاح" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Toggle User Verification (Activate / Suspend)
app.put('/api/admin/users/:id/toggle-verify', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const user = db.toggleUserVerification(req.params.id);
    res.json({
      success: true,
      message: user.isVerified ? "تم تفعيل حساب المشترك بنجاح" : "تم إيقاف حساب المشترك",
      isVerified: user.isVerified
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Delete User Account
app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    db.deleteUser(req.params.id);
    res.json({ success: true, message: "تم حذف حساب المشترك وبياناته بالكامل بنجاح" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Send Direct Personal Message to Specific User
app.post('/api/admin/users/:id/message', authMiddleware, adminMiddleware, (req, res) => {
  const { title, message } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: "يرجى كتابة عنوان ونص الرسالة المخصصة" });
  }
  try {
    const personalMessage = db.sendUserPersonalMessage(req.params.id, { title, message });
    res.json({
      success: true,
      message: "تم إرسال الرسالة المخصصة للمشترك بنجاح وسيصل إليه تنبيه مباشر في حسابه!",
      personalMessage
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Get Subscriber Financial Summary
app.get('/api/admin/users/:id/financials', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const summary = db.getUserFinancialSummary(req.params.id);
    res.json(summary);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Send Broadcast Alert to All Users
app.post('/api/admin/broadcast', authMiddleware, adminMiddleware, (req, res) => {
  const { title, message } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: "يرجى إدخال عنوان ونص الرسالة العامة" });
  }

  const broadcast = db.addBroadcast({
    title,
    message,
    sentBy: req.user.name || "الإدارة العامة"
  });

  res.json({
    success: true,
    message: "تم إرسال التنبيه العام لجميع المشتركين بنجاح",
    broadcast
  });
});

// Admin Settings
app.get('/api/admin/settings', authMiddleware, adminMiddleware, (req, res) => {
  res.json(db.getSettings());
});

app.post('/api/admin/settings', authMiddleware, adminMiddleware, (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json({ success: true, settings: updated });
});

// Catch-all route for single-page app
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start Server if called directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Tahweshat Esteghfar] Server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
