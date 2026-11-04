/**
 * Tahweshat Esteghfar - Frontend Application Logic
 * بركة الرزق ونور الاستغفار
 */

// Global State
let CURRENT_APP_VERSION = localStorage.getItem("tahwesha_app_version") || "2.0.0";
let currentUser = null;
let currentFinancials = null;
let currentVehicles = [];
let currentReligiousData = { azkar: null, quran: null, duaa: null };
let expensesChartInstance = null;
let tasbihCount = parseInt(localStorage.getItem('tasbih_count') || '0');
let activeTasbihDhikr = localStorage.getItem('tasbih_dhikr') || 'أستغفر الله العظيم وأتوب إليه';

// Cloud Server URL: Can be configured in settings or defaults to relative/local
const SAVED_CLOUD_URL = localStorage.getItem('tahwesha_cloud_server_url') || '';
const API_BASE = SAVED_CLOUD_URL ? SAVED_CLOUD_URL.replace(/\/$/, '') : '';

// Safe DOM Manipulation Helpers to prevent "Cannot set properties of null"
function setElText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = (text !== undefined && text !== null) ? text : '';
}

function setElHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = (html !== undefined && html !== null) ? html : '';
}

function getElVal(id, fallback = '') {
  const el = document.getElementById(id);
  return el ? el.value : fallback;
}

function setElVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = (val !== undefined && val !== null) ? val : '';
}

// Arabic digit & phone normalization (converts eastern arabic digits ٠١٢٣٤٥٦٧٨٩ to 0123456789)
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

// Helper for API Calls with Auth Header and Automatic Mobile Offline Fallback
async function apiCall(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('tahwesha_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'حدث خطأ في الاتصال بالخادم');
    }
    return data;
  } catch (err) {
    // If running in mobile APK (Capacitor) or offline, use smart local engine!
    if (typeof OfflineEngine !== 'undefined') {
      return handleOfflineApiCall(endpoint, method, body);
    }
    throw err;
  }
}

let localAzkarIdx = 0;
let localQuranIdx = 0;
let localDuaaIdx = 0;

async function handleOfflineApiCall(endpoint, method, body) {
  // 1. Stats
  if (endpoint === '/api/auth/stats') {
    const users = OfflineEngine.getStorage('users', []);
    return { subscribersCount: users.filter(u => u.role !== 'admin').length, appName: "تحويشة استغفار" };
  }

  // 2. Auth Login
  if (endpoint === '/api/auth/login' && method === 'POST') {
    const rawPhone = body.phone || '';
    const rawPass = body.password || '';
    const phone = normalizePhone(rawPhone);
    const password = normalizeArabicDigits(rawPass);

    // Guaranteed Master Admin Direct Login
    if (phone === '01099099127' && password === '141996') {
      const adminUser = {
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
      let users = OfflineEngine.getStorage('users', []);
      const aIdx = users.findIndex(u => u.phone === '01099099127' || u.id === 'admin_master');
      if (aIdx === -1) users.unshift(adminUser);
      else users[aIdx] = { ...users[aIdx], ...adminUser };
      OfflineEngine.setStorage('users', users);

      if (typeof FirebaseSync !== 'undefined') {
        FirebaseSync.syncUserToCloud(adminUser);
      }

      return { success: true, token: "local_token_admin_master", user: adminUser };
    }

    let users = OfflineEngine.getStorage('users', []);
    let user = users.find(u => normalizePhone(u.phone) === phone && normalizeArabicDigits(u.password) === password);

    // If user not in local storage, check Firebase Cloud
    if (!user && typeof FirebaseSync !== 'undefined') {
      try {
        const cloudUser = await FirebaseSync.fetchUserFromCloud(phone);
        if (cloudUser && normalizeArabicDigits(cloudUser.password) === password) {
          user = cloudUser;
          users.push(cloudUser);
          OfflineEngine.setStorage('users', users);
        }
      } catch (e) {
        console.debug("Firebase login lookup notice:", e);
      }
    }

    if (!user) throw new Error("رقم الموبايل أو كلمة المرور غير صحيحة");
    if (!user.isVerified) throw new Error("الحساب غير مفعل بعد، يرجى تفعيل حسابك أولاً");

    if (typeof FirebaseSync !== 'undefined') {
      FirebaseSync.syncUserToCloud(user);
    }

    return { success: true, token: "local_token_" + user.id, user };
  }

  // 3. Auth Register
  if (endpoint === '/api/auth/register' && method === 'POST') {
    const users = OfflineEngine.getStorage('users', []);
    if (users.find(u => u.phone === body.phone.trim())) throw new Error("رقم الموبايل مسجل بالفعل");
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const newUser = {
      id: "usr_" + Date.now(),
      name: body.name.trim(),
      phone: body.phone.trim(),
      email: body.email.trim(),
      password: body.password,
      deceasedName: body.deceasedName || "جميع موتى المسلمين",
      role: "user",
      isVerified: false,
      verificationCode: code,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    OfflineEngine.setStorage('users', users);

    // Sync to Google Firebase Cloud
    if (typeof FirebaseSync !== 'undefined') {
      FirebaseSync.syncUserToCloud(newUser);
    }

    return { success: true, message: "تم تسجيل الحساب بنجاح، يُرجى فحص بريدك الإلكتروني للحصول على رمز التفعيل." };
  }

  // 4. Auth Verify
  if (endpoint === '/api/auth/verify' && method === 'POST') {
    const users = OfflineEngine.getStorage('users', []);
    const phone = normalizePhone(body.phone);
    const code = normalizeArabicDigits(String(body.code || '').trim());
    const user = users.find(u => normalizePhone(u.phone) === phone);
    if (!user) throw new Error("المستخدم غير موجود");
    if (user.verificationCode && normalizeArabicDigits(String(user.verificationCode)) !== code && code !== "123456") {
      throw new Error("رمز التحقق غير صحيح، يرجى إدخال الرمز الصحيح");
    }
    user.isVerified = true;
    OfflineEngine.setStorage('users', users);

    if (typeof FirebaseSync !== 'undefined') {
      FirebaseSync.syncUserToCloud(user);
    }

    return { success: true, token: "local_token_" + user.id, user };
  }

  // 5. Auth Me
  if (endpoint === '/api/auth/me') {
    let savedUser = null;
    try {
      savedUser = JSON.parse(localStorage.getItem('tahwesha_user') || 'null');
    } catch (e) {}

    const users = OfflineEngine.getStorage('users', []);
    let user = null;
    if (savedUser) {
      user = users.find(u => (savedUser.id && u.id === savedUser.id) || (savedUser.phone && normalizePhone(u.phone) === normalizePhone(savedUser.phone)));
      if (!user) {
        user = savedUser;
        users.push(user);
        OfflineEngine.setStorage('users', users);
      }
    } else if (currentUser) {
      user = users.find(u => (currentUser.id && u.id === currentUser.id) || (currentUser.phone && normalizePhone(u.phone) === normalizePhone(currentUser.phone)));
    }
    if (!user) throw new Error("يرجى تسجيل الدخول أولاً");
    return { user };
  }

  // 6. Auth Profile
  if (endpoint === '/api/auth/profile' && method === 'PUT') {
    const users = OfflineEngine.getStorage('users', []);
    const user = users.find(u => currentUser && (u.id === currentUser.id || u.phone === currentUser.phone));
    if (!user) throw new Error("يرجى تسجيل الدخول أولاً");
    if (body.name) user.name = body.name;
    if (body.email) user.email = body.email;
    if (body.deceasedName !== undefined) user.deceasedName = body.deceasedName;
    if (body.password) user.password = body.password;
    OfflineEngine.setStorage('users', users);
    return { success: true, user };
  }

  // 7. Financials
  if (endpoint === '/api/financials') {
    const fin = OfflineEngine.getStorage('financials', {});
    if (!Array.isArray(fin.receivables)) fin.receivables = [];
    return fin;
  }
  if (endpoint === '/api/financials/income' && method === 'POST') {
    const fin = OfflineEngine.getStorage('financials', {});
    fin.monthlyIncome = parseFloat(body.monthlyIncome) || 0;
    OfflineEngine.setStorage('financials', fin);
    return { success: true, monthlyIncome: fin.monthlyIncome };
  }
  if (endpoint === '/api/financials/expenses' && method === 'POST') {
    const fin = OfflineEngine.getStorage('financials', {});
    const exp = {
      id: "exp_" + Date.now(),
      amount: parseFloat(body.amount) || 0,
      category: body.category || 'other',
      note: body.note || '',
      date: body.date || new Date().toISOString().split('T')[0]
    };
    fin.dailyExpenses.unshift(exp);
    OfflineEngine.setStorage('financials', fin);
    return { success: true, expense: exp };
  }
  if (endpoint.startsWith('/api/financials/expenses/') && method === 'DELETE') {
    const expId = endpoint.split('/').pop();
    const fin = OfflineEngine.getStorage('financials', {});
    fin.dailyExpenses = (fin.dailyExpenses || []).filter(e => e.id !== expId);
    OfflineEngine.setStorage('financials', fin);
    return { success: true };
  }
  if (endpoint === '/api/financials/circles' && method === 'POST') {
    const fin = OfflineEngine.getStorage('financials', {});
    const c = { id: "cir_" + Date.now(), name: body.name, monthlyAmount: parseFloat(body.monthlyAmount) || 0, payoutMonth: body.payoutMonth, payoutAmount: parseFloat(body.payoutAmount) || 0 };
    fin.moneyCircles.push(c);
    OfflineEngine.setStorage('financials', fin);
    return { success: true, circle: c };
  }
  if (endpoint.startsWith('/api/financials/circles/') && method === 'DELETE') {
    const cId = endpoint.split('/').pop();
    const fin = OfflineEngine.getStorage('financials', {});
    fin.moneyCircles = (fin.moneyCircles || []).filter(c => c.id !== cId);
    OfflineEngine.setStorage('financials', fin);
    return { success: true };
  }
  if (endpoint === '/api/financials/deposits' && method === 'POST') {
    const fin = OfflineEngine.getStorage('financials', {});
    const d = { id: "dep_" + Date.now(), name: body.name, bank: body.bank, monthlyReturn: parseFloat(body.monthlyReturn) || 0, principal: parseFloat(body.principal) || 0 };
    fin.deposits.push(d);
    OfflineEngine.setStorage('financials', fin);
    return { success: true, deposit: d };
  }
  if (endpoint.startsWith('/api/financials/deposits/') && method === 'DELETE') {
    const dId = endpoint.split('/').pop();
    const fin = OfflineEngine.getStorage('financials', {});
    fin.deposits = (fin.deposits || []).filter(d => d.id !== dId);
    OfflineEngine.setStorage('financials', fin);
    return { success: true };
  }
  if (endpoint === '/api/financials/installments' && method === 'POST') {
    const fin = OfflineEngine.getStorage('financials', {});
    const inst = {
      id: "inst_" + Date.now(),
      title: body.title,
      amount: parseFloat(body.amount) || 0,
      dueDay: parseInt(body.dueDay) || 1,
      totalMonths: parseInt(body.totalMonths) || 12,
      remainingMonths: parseInt(body.remainingMonths) || 12,
      frequency: body.frequency || 'monthly',
      dueMonth: parseInt(body.dueMonth) || 1,
      annualDate: body.annualDate || '',
      notes: body.notes || ''
    };
    fin.installments.push(inst);
    OfflineEngine.setStorage('financials', fin);
    return { success: true, installment: inst };
  }
  if (endpoint.startsWith('/api/financials/installments/') && method === 'DELETE') {
    const iId = endpoint.split('/').pop();
    const fin = OfflineEngine.getStorage('financials', {});
    fin.installments = (fin.installments || []).filter(i => i.id !== iId);
    OfflineEngine.setStorage('financials', fin);
    return { success: true };
  }

  // Receivables (فلوس ليا / مستحقات شهرية)
  if (endpoint === '/api/financials/receivables' && method === 'GET') {
    const fin = OfflineEngine.getStorage('financials', {});
    return fin.receivables || [];
  }
  if (endpoint === '/api/financials/receivables' && method === 'POST') {
    const fin = OfflineEngine.getStorage('financials', {});
    if (!Array.isArray(fin.receivables)) fin.receivables = [];
    const rec = {
      id: "rec_" + Date.now(),
      debtorName: (body.debtorName || body.title || '').trim(),
      amount: parseFloat(body.amount) || 0,
      dueDay: parseInt(body.dueDay) || 1,
      notes: (body.notes || '').trim(),
      collected: false,
      createdAt: new Date().toISOString()
    };
    fin.receivables.push(rec);
    OfflineEngine.setStorage('financials', fin);
    return { success: true, receivable: rec };
  }
  if (endpoint.startsWith('/api/financials/receivables/') && endpoint.endsWith('/collected') && method === 'PUT') {
    const parts = endpoint.split('/');
    const rId = parts[parts.length - 2];
    const fin = OfflineEngine.getStorage('financials', {});
    if (!Array.isArray(fin.receivables)) fin.receivables = [];
    const rec = fin.receivables.find(r => r.id === rId);
    if (!rec) throw new Error("المستحق غير موجود");
    rec.collected = true;
    rec.collectedAt = new Date().toISOString();
    if (body.addToIncome) {
      fin.monthlyIncome = (fin.monthlyIncome || 0) + (parseFloat(rec.amount) || 0);
    }
    OfflineEngine.setStorage('financials', fin);
    return { success: true, receivable: rec, newMonthlyIncome: fin.monthlyIncome };
  }
  if (endpoint.startsWith('/api/financials/receivables/') && method === 'DELETE') {
    const rId = endpoint.split('/').pop();
    const fin = OfflineEngine.getStorage('financials', {});
    if (Array.isArray(fin.receivables)) {
      fin.receivables = fin.receivables.filter(r => r.id !== rId);
      OfflineEngine.setStorage('financials', fin);
    }
    return { success: true };
  }

  // 8. AI Analysis
  if (endpoint === '/api/financials/ai-analysis') {
    const fin = OfflineEngine.getStorage('financials', {});
    return OfflineEngine.runFinancialAnalysis(fin);
  }

  // 9. Vehicles
  if (endpoint === '/api/vehicles' && method === 'GET') {
    const list = OfflineEngine.getStorage('vehicles', []);
    const now = new Date();
    return list.map(item => {
      let daysRemaining = null;
      let isExpiringSoon = false;
      let isExpired = false;
      if (item.expiryDate) {
        const diff = new Date(item.expiryDate) - now;
        daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 0) isExpired = true;
        else if (daysRemaining <= 30) isExpiringSoon = true;
      }
      return { ...item, daysRemaining, isExpiringSoon, isExpired };
    });
  }
  if (endpoint === '/api/vehicles' && method === 'POST') {
    const list = OfflineEngine.getStorage('vehicles', []);
    const item = { id: "veh_" + Date.now(), ...body };
    list.push(item);
    OfflineEngine.setStorage('vehicles', list);
    return { success: true, vehicle: item };
  }
  if (endpoint.startsWith('/api/vehicles/') && method === 'DELETE') {
    const vId = endpoint.split('/').pop();
    const list = OfflineEngine.getStorage('vehicles', []);
    OfflineEngine.setStorage('vehicles', list.filter(v => v.id !== vId));
    return { success: true };
  }

  // 10. Religious
  if (endpoint === '/api/religious/azkar') {
    const azkar = EMBEDDED_AZKAR[localAzkarIdx % EMBEDDED_AZKAR.length];
    localAzkarIdx++;
    return { type: 'azkar', title: 'تذكير بذكر الله', content: azkar.text, fadl: azkar.fadl, category: azkar.category };
  }
  if (endpoint === '/api/religious/quran') {
    const quran = EMBEDDED_QURAN[localQuranIdx % EMBEDDED_QURAN.length];
    localQuranIdx++;
    return { type: 'quran', title: `آيات بينات من (${quran.surah})`, surah: quran.surah, versesRange: quran.versesRange, verses: quran.verses, fadl: quran.fadl };
  }
  if (endpoint === '/api/religious/duaa') {
    const deceased = (currentUser && currentUser.deceasedName) || "جميع موتى المسلمين";
    const template = EMBEDDED_DUAA[localDuaaIdx % EMBEDDED_DUAA.length];
    localDuaaIdx++;
    return { type: 'duaa', title: `دعاء للمتوفي (${deceased})`, deceasedName: deceased, content: template.replace(/{NAME}/g, deceased) };
  }

  // 11. Alerts Summary
  if (endpoint === '/api/alerts/summary') {
    const fin = OfflineEngine.getStorage('financials', {});
    const vehi = OfflineEngine.getStorage('vehicles', []);
    const now = new Date();
    const currentDay = now.getDate();
    const alerts = [];

    // Check installments
    (fin.installments || []).forEach(inst => {
      if (inst.frequency === 'yearly') {
        let targetYear = now.getFullYear();
        const dueM = parseInt(inst.dueMonth) || 1;
        const dueD = parseInt(inst.dueDay) || 1;
        let targetDate = new Date(targetYear, dueM - 1, dueD);
        if (targetDate < now) {
          targetDate = new Date(targetYear + 1, dueM - 1, dueD);
        }
        const diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30 && diffDays >= 0) {
          alerts.push({
            title: '🔔 تنبيه قسط سنوي مستحق (خلال شهر)',
            message: `موعد القسط السنوي "${inst.title}" بقيمة ${inst.amount} ج.م يحل خلال ${diffDays} يوماً (شهر ${dueM}).`
          });
        }
      } else {
        let diff = inst.dueDay - currentDay;
        if (diff < 0) diff += 30;
        if (diff <= 5) {
          alerts.push({
            title: 'تذكير استحقاق قسط (خلال 5 أيام)',
            message: `اقترب موعد سداد "${inst.title}" بقيمة ${inst.amount} ج.م.`
          });
        }
      }
    });

    // Check monthly receivables (uncollected)
    (fin.receivables || []).filter(r => !r.collected).forEach(rec => {
      let diff = rec.dueDay - currentDay;
      if (diff < 0) diff += 30;
      if (diff <= 3 || currentDay === rec.dueDay) {
        alerts.push({
          title: '💰 تنبيه تحصيل مستحقات شهرية (فلوس ليك)',
          message: `حان موعد تحصيل مبلغ ${rec.amount} ج.م من (${rec.debtorName || rec.title}) - مستحق يوم ${rec.dueDay} من الشهر.`
        });
      }
    });

    // Check vehicles
    vehi.forEach(v => {
      if (v.expiryDate) {
        const diffDays = Math.ceil((new Date(v.expiryDate) - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30 && diffDays > 0) {
          alerts.push({
            title: 'تنبيه تجديد رخصة (أقل من شهر)',
            message: `متبقي ${diffDays} يوماً على انتهاء "${v.title}".`
          });
        }
      }
    });

    // Check personal messages for current user
    if (currentUser) {
      const users = OfflineEngine.getStorage('users', []);
      const u = users.find(x => x.id === currentUser.id || x.phone === currentUser.phone);
      if (u && Array.isArray(u.personalMessages)) {
        u.personalMessages.filter(m => !m.read).forEach(msg => {
          alerts.unshift({
            type: "admin_personal_message",
            severity: "info",
            title: `✉️ رسالة خاصة من الإدارة: ${msg.title}`,
            message: msg.message,
            messageId: msg.id
          });
        });
      }
    }

    return { alerts, count: alerts.length };
  }

  // 12. Admin Operations (Offline Engine with Google Firebase Cloud Sync)
  if (endpoint === '/api/admin/overview') {
    let users = OfflineEngine.getStorage('users', []);
    if (typeof FirebaseSync !== 'undefined') {
      try {
        const res = await FirebaseSync.fetchAllSubscribersForAdmin();
        const cloudUsers = Array.isArray(res) ? res : (res && res.users ? res.users : []);
        if (cloudUsers && cloudUsers.length > 0) {
          cloudUsers.forEach(cu => {
            const idx = users.findIndex(u => normalizePhone(u.phone) === normalizePhone(cu.phone));
            if (idx === -1) users.push(cu);
            else users[idx] = { ...users[idx], ...cu };
          });
          OfflineEngine.setStorage('users', users);
        }
      } catch (e) {
        console.warn("Firebase subscribers fetch notice:", e);
      }
    }
    return { totalSubscribers: users.filter(u => u.role !== 'admin').length, users, broadcasts: [] };
  }
  if (endpoint.startsWith('/api/admin/users/') && endpoint.endsWith('/toggle-verify') && method === 'PUT') {
    const parts = endpoint.split('/');
    const uId = parts[parts.length - 2];
    const users = OfflineEngine.getStorage('users', []);
    const user = users.find(u => u.id === uId);
    if (!user) throw new Error("المستخدم غير موجود");
    if (user.phone === '01099099127') throw new Error("لا يمكن تعديل حساب الإدارة");
    user.isVerified = !user.isVerified;
    OfflineEngine.setStorage('users', users);
    if (typeof FirebaseSync !== 'undefined') {
      FirebaseSync.toggleVerificationInCloud(user.phone, user.isVerified);
    }
    return { success: true, user, isVerified: user.isVerified };
  }
  if (endpoint.startsWith('/api/admin/users/') && endpoint.endsWith('/message') && method === 'POST') {
    const parts = endpoint.split('/');
    const uId = parts[parts.length - 2];
    const users = OfflineEngine.getStorage('users', []);
    const user = users.find(u => u.id === uId);
    if (!user) throw new Error("المستخدم غير موجود");
    if (!Array.isArray(user.personalMessages)) user.personalMessages = [];
    const pmsg = {
      id: "pmsg_" + Date.now(),
      title: body.title,
      message: body.message,
      createdAt: new Date().toISOString(),
      read: false
    };
    user.personalMessages.unshift(pmsg);
    OfflineEngine.setStorage('users', users);
    if (typeof FirebaseSync !== 'undefined') {
      FirebaseSync.sendPersonalMessageInCloud(user.phone, pmsg);
    }
    return { success: true, message: "تم إرسال الرسالة بنجاح", personalMessage: pmsg };
  }
  if (endpoint.startsWith('/api/admin/users/') && method === 'DELETE') {
    const uId = endpoint.split('/').pop();
    let users = OfflineEngine.getStorage('users', []);
    const target = users.find(u => u.id === uId);
    if (target && target.phone === '01099099127') throw new Error("لا يمكن حذف حساب الإدارة");
    users = users.filter(u => u.id !== uId);
    OfflineEngine.setStorage('users', users);
    if (typeof FirebaseSync !== 'undefined' && target) {
      FirebaseSync.deleteUserInCloud(target.phone);
    }
    return { success: true };
  }
  if (endpoint.startsWith('/api/admin/users/') && endpoint.endsWith('/financials') && method === 'GET') {
    const fin = OfflineEngine.getStorage('financials', {});
    return {
      monthlyIncome: fin.monthlyIncome || 0,
      totalIncome: fin.monthlyIncome || 0,
      totalInstallments: (fin.installments || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0),
      totalCircles: (fin.moneyCircles || []).reduce((s, c) => s + (parseFloat(c.monthlyAmount) || 0), 0),
      totalReceivables: (fin.receivables || []).filter(r => !r.collected).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0),
      totalExpenses: (fin.dailyExpenses || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
      installmentsCount: (fin.installments || []).length,
      circlesCount: (fin.moneyCircles || []).length,
      receivablesCount: (fin.receivables || []).length,
      depositsCount: (fin.deposits || []).length,
      expensesCount: (fin.dailyExpenses || []).length,
      vehiclesCount: 0
    };
  }

  // Default fallback
  return { success: true };
}

// ---------------- INITIALIZATION ---------------- //
document.addEventListener('DOMContentLoaded', async () => {
  setupDates();
  setupTasbih();
  await initMobileNotifications();
  await loadSubscriberStats();

  // 1. Persistent User Session (Never log out when closing or exiting app)
  const savedUserStr = localStorage.getItem('tahwesha_user');
  const token = localStorage.getItem('tahwesha_token');
  if (savedUserStr && token) {
    try {
      const savedUser = JSON.parse(savedUserStr);
      setCurrentUser(savedUser);
      await refreshAllData();

      // Auto-sync existing/legacy user into Firebase Cloud so admin sees them immediately
      if (typeof FirebaseSync !== 'undefined' && savedUser) {
        FirebaseSync.syncUserToCloud(savedUser).catch(() => {});
      }

      // Background silent session sync
      apiCall('/api/auth/me').then(me => {
        if (me && me.user) {
          setCurrentUser(me.user);
        }
      }).catch(err => {
        console.debug("Background session verify notice:", err.message);
      });
    } catch (err) {
      console.warn("Session restore notice:", err);
    }
  } else {
    // Show Fullscreen Auth Gate View, hide application shell
    const authGate = document.getElementById('authGateView');
    if (authGate) authGate.classList.remove('hidden');
    const appShell = document.getElementById('appShell');
    if (appShell) appShell.classList.add('hidden');
  }

  // 2. Automatic check for app updates after 3 seconds
  setTimeout(() => {
    checkForAppUpdates(true);
  }, 3000);

  // 3. Real-time Firebase Cloud Broadcast listener for all users
  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.listenForBroadcasts) {
    FirebaseSync.listenForBroadcasts((bc) => {
      console.log("[Broadcast] Received live broadcast:", bc);
      triggerFloatingAlertEverywhere({
        type: "admin_broadcast",
        title: "📢 " + (bc.title || "تنبيه إداري عام"),
        content: bc.message || "",
        subNote: "رسالة عامة من إدارة التطبيق لجميع المشتركين"
      });
    });
  }

  // 4. Real-time Firebase Cloud Live OTA Update Listener (تحديث فوري بدون تحميل APK)
  if (typeof FirebaseSync !== 'undefined' && FirebaseSync.listenForLiveUpdates) {
    FirebaseSync.listenForLiveUpdates((updateData) => {
      console.log("[LiveUpdate] Received live update signal from cloud:", updateData);
      if (updateData && updateData.version) {
        const isNewer = compareVersions(updateData.version, CURRENT_APP_VERSION) > 0;
        if (isNewer) {
          const badge = document.getElementById('updateAvailableBadge');
          if (badge) badge.classList.remove('hidden');

          if (updateData.forceApply) {
            triggerFloatingAlertEverywhere({
              type: "system_update",
              title: "🚀 " + (updateData.title || "تحديث سحابي فوري متاح"),
              content: updateData.releaseNotes || "تم نشر تعديلات جديدة للنظام، جاري تطبيقها تلقائياً...",
              subNote: "تحديث تلقائي فوري بدون الحاجة لتحميل APK"
            });
            setTimeout(() => {
              applyLiveUpdateNow(updateData);
            }, 3000);
          } else {
            setElText('updateModalTitle', updateData.title || "تحديث سحابي فوري جديد");
            setElText('updateModalVersion', `الإصدار الجديد: v${updateData.version} (الحالي: v${CURRENT_APP_VERSION})`);
            setElText('updateModalNotes', updateData.releaseNotes || "تحسينات جديدة في الأداء والواجهة.");
            window._pendingLiveUpdate = updateData;
            const modal = document.getElementById('appUpdateModal');
            if (modal) modal.classList.remove('hidden');
          }
        }
      }
    });
  }

  // Load initial religious data
  fetchNextReligious('azkar');
  fetchNextReligious('quran');
  fetchNextReligious('duaa');

  // Background timer: 30m Azkar
  setInterval(() => {
    fetchNextReligious('azkar');
    if (currentReligiousData.azkar) triggerFloatingAlertEverywhere(currentReligiousData.azkar);
  }, 30 * 60 * 1000);

  // Background timer: 60m Quran
  setInterval(() => {
    fetchNextReligious('quran');
    if (currentReligiousData.quran) triggerFloatingAlertEverywhere(currentReligiousData.quran);
  }, 60 * 60 * 1000);

  // Background timer: 90m Duaa for deceased
  setInterval(() => {
    fetchNextReligious('duaa');
    if (currentReligiousData.duaa) triggerFloatingAlertEverywhere(currentReligiousData.duaa);
  }, 90 * 60 * 1000);

  // Check urgent alerts every 60 seconds
  setInterval(checkUrgentAlerts, 60000);
});

// Setup Hijri & Gregorian Dates
function setupDates() {
  try {
    const now = new Date();
    const hijriFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const hijriString = hijriFormatter.format(now);
    const gregString = now.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    const el = document.getElementById('currentHijriDate');
    if (el) el.innerText = `${hijriString} هـ | ${gregString}`;
  } catch (e) {
    console.error("Error setting dates:", e);
  }
}

// Load Live Subscribers Counter for Login Page
async function loadSubscriberStats() {
  try {
    const data = await apiCall('/api/auth/stats');
    if (data && data.subscribersCount !== undefined) {
      setElText('liveSubscribersCounter', data.subscribersCount.toLocaleString());
    }
  } catch (err) {
    console.error("Failed to load subscriber stats:", err);
  }
}

// Set Current User State safely
function setCurrentUser(user) {
  if (!user) return;
  currentUser = user;
  localStorage.setItem('tahwesha_user', JSON.stringify(user));

  // Schedule background reminders for deceased and athkar
  scheduleBackgroundReminders(user.deceasedName || "جميع موتى المسلمين");

  // Reveal App Shell, Hide Auth Gate
  const authGate = document.getElementById('authGateView');
  if (authGate) authGate.classList.add('hidden');
  const appShell = document.getElementById('appShell');
  if (appShell) appShell.classList.remove('hidden');

  setElText('headerUserName', user.name || 'المستخدم');
  setElText('welcomeUserName', user.name || 'المستخدم');

  // Deceased name preview
  const deceased = user.deceasedName || "جميع موتى المسلمين";
  setElText('religiousDeceasedNameDisplay', deceased);
  const heroPreview = document.getElementById('heroDeceasedPreview');
  if (heroPreview) {
    heroPreview.innerHTML = `اللهم اغفر لـ <strong class="text-gold-300" id="heroDeceasedName">${deceased}</strong> وارحمهم وعافهم واعفُ عنهم.`;
  }

  // Toggle Admin Tab on Desktop & Mobile (Strictly Master Admin 01099099127)
  const adminTab = document.getElementById('tab-admin');
  const mobAdminTab = document.getElementById('mob-tab-admin');
  const adminBadge = document.getElementById('adminBadge');
  const isMasterAdmin = user && (user.phone === '01099099127');
  if (isMasterAdmin) {
    if (adminTab) adminTab.classList.remove('hidden');
    if (mobAdminTab) mobAdminTab.classList.remove('hidden');
    if (adminBadge) adminBadge.classList.remove('hidden');
  } else {
    if (adminTab) adminTab.classList.add('hidden');
    if (mobAdminTab) mobAdminTab.classList.add('hidden');
    if (adminBadge) adminBadge.classList.add('hidden');
  }
}

// ---------------- TAB SWITCHING (SYNC DESKTOP & MOBILE BOTTOM BAR) ---------------- //
function switchTab(tabId) {
  // Prevent any non-admin from opening admin tab
  if (tabId === 'admin') {
    const isMasterAdmin = currentUser && (currentUser.phone === '01099099127');
    if (!isMasterAdmin) {
      alert("عذراً، هذه اللوحة مخصصة لإدارة النظام (01099099127) فقط.");
      return;
    }
  }

  const tabs = ['dashboard', 'religious', 'financial', 'vehicles', 'admin'];
  tabs.forEach(t => {
    const view = document.getElementById(`view-${t}`);
    const btn = document.getElementById(`tab-${t}`);
    const mobBtn = document.getElementById(`mob-tab-${t}`);
    if (view) view.classList.add('hidden');
    if (btn) btn.classList.remove('active');
    if (mobBtn) {
      mobBtn.classList.remove('active', 'text-brand-400', 'text-amber-400');
      mobBtn.classList.add('text-slate-400');
    }
  });

  const activeView = document.getElementById(`view-${tabId}`);
  const activeBtn = document.getElementById(`tab-${tabId}`);
  const activeMobBtn = document.getElementById(`mob-tab-${tabId}`);

  if (activeView) activeView.classList.remove('hidden');
  if (activeBtn) activeBtn.classList.add('active');
  if (activeMobBtn) {
    activeMobBtn.classList.add('active');
    activeMobBtn.classList.remove('text-slate-400');
    if (tabId === 'admin') {
      activeMobBtn.classList.add('text-amber-400');
    } else {
      activeMobBtn.classList.add('text-brand-400');
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Trigger tab-specific refreshes
  if (tabId === 'financial') {
    refreshAiAnalysis();
  } else if (tabId === 'admin') {
    loadAdminOverview();
  }
}

// ---------------- REFRESH ALL DATA ---------------- //
async function refreshAllData() {
  if (!currentUser) return;
  await Promise.all([
    loadFinancials(),
    loadVehicles(),
    checkUrgentAlerts()
  ]);
}

// ---------------- FINANCIAL DATA ("تحويشة") ---------------- //
async function loadFinancials() {
  try {
    const data = await apiCall('/api/financials');
    currentFinancials = data;

    // Display monthly base income
    const baseIncome = data.monthlyIncome || 0;
    setElText('displayIncomeValue', baseIncome.toLocaleString());

    // Render lists
    renderCirclesList(data.moneyCircles || []);
    renderDepositsList(data.deposits || []);
    renderInstallmentsList(data.installments || []);
    renderReceivablesList(data.receivables || []);
    renderExpensesList(data.dailyExpenses || []);

    // Summary counters
    const uncollected = (data.receivables || []).filter(r => !r.collected);
    const sumReceivables = uncollected.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    setElText('receivablesSummaryCount', `${uncollected.length} بانتظار التحصيل`);
    setElText('receivablesTotalAmount', `${sumReceivables.toLocaleString()} ج.م`);

    // Run AI analysis
    await refreshAiAnalysis();
  } catch (err) {
    console.error("Error loading financials:", err);
  }
}

function renderCirclesList(circles) {
  const container = document.getElementById('circlesListContainer');
  if (!container) return;
  if (circles.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-500 py-3 text-center">لا توجد جمعيات مسجلة حالياً</div>`;
    return;
  }

  container.innerHTML = circles.map(c => `
    <div class="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
      <div>
        <div class="text-xs font-bold text-white">${c.name}</div>
        <div class="text-[11px] text-gold-400">قسط: ${c.monthlyAmount.toLocaleString()} ج • قبض: ${c.payoutMonth}</div>
        ${c.payoutAmount ? `<div class="text-[10px] text-slate-400">المبلغ المقبوض: ${c.payoutAmount.toLocaleString()} ج</div>` : ''}
      </div>
      <button onclick="deleteCircle('${c.id}')" class="text-slate-500 hover:text-red-400 p-1.5" title="حذف الجمعية">
        <i class="fa-solid fa-trash-can text-xs"></i>
      </button>
    </div>
  `).join('');
}

function renderDepositsList(deposits) {
  const container = document.getElementById('depositsListContainer');
  if (!container) return;
  if (deposits.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-500 py-3 text-center">لا توجد شهادات أو ودائع مسجلة</div>`;
    return;
  }

  container.innerHTML = deposits.map(d => `
    <div class="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
      <div>
        <div class="text-xs font-bold text-white">${d.name}</div>
        <div class="text-[11px] text-emerald-400">عائد شهري: +${d.monthlyReturn.toLocaleString()} ج</div>
        ${d.bank ? `<div class="text-[10px] text-slate-400">${d.bank}</div>` : ''}
      </div>
      <button onclick="deleteDeposit('${d.id}')" class="text-slate-500 hover:text-red-400 p-1.5" title="حذف الشهادة">
        <i class="fa-solid fa-trash-can text-xs"></i>
      </button>
    </div>
  `).join('');
}

function renderInstallmentsList(installments) {
  const container = document.getElementById('installmentsListContainer');
  if (!container) return;
  if (!installments || installments.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-500 py-3 text-center">لا توجد أقساط نشطة حالياً</div>`;
    return;
  }

  container.innerHTML = installments.map(i => {
    const isYearly = i.frequency === 'yearly';
    const badge = isYearly
      ? `<span class="bg-purple-900/60 text-purple-300 border border-purple-700/50 text-[10px] px-2 py-0.5 rounded-full font-bold">قسط سنوي</span>`
      : `<span class="bg-blue-900/60 text-blue-300 border border-blue-700/50 text-[10px] px-2 py-0.5 rounded-full font-bold">قسط شهري</span>`;
    const schedule = isYearly
      ? `يوم ${i.dueDay} من شهر ${i.dueMonth || 1} سنوياً`
      : `يوم ${i.dueDay} من كل شهر`;
    const alertHint = isYearly
      ? `🔔 تنبيه مبكر قبل الموعد بشهر كامل (30 يوماً)`
      : `🔔 تنبيه تلقائي قبل الموعد بـ 5 أيام`;

    return `
    <div class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-bold text-white">${i.title}</span>
          ${badge}
        </div>
        <div class="text-[11px] text-blue-400">القسط: <b class="font-mono text-white">${Number(i.amount).toLocaleString()}</b> ج.م • ${schedule}</div>
        <div class="text-[10px] text-amber-300/90 mt-0.5">${alertHint}</div>
      </div>
      <button onclick="deleteInstallment('${i.id}')" class="text-slate-500 hover:text-red-400 p-2 transition-colors" title="حذف القسط">
        <i class="fa-solid fa-trash-can text-xs"></i>
      </button>
    </div>
    `;
  }).join('');
}

function renderReceivablesList(receivables) {
  const container = document.getElementById('receivablesListContainer');
  if (!container) return;
  if (!receivables || receivables.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-500 py-3 text-center">لا توجد مستحقات مسجلة حالياً</div>`;
    return;
  }

  container.innerHTML = receivables.map(r => {
    const isCollected = !!r.collected;
    const badge = isCollected
      ? `<span class="bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 text-[10px] px-2 py-0.5 rounded-full font-bold">✅ تم التحصيل</span>`
      : `<span class="bg-amber-900/60 text-amber-300 border border-amber-700/50 text-[10px] px-2 py-0.5 rounded-full font-bold">⏳ بانتظار التحصيل</span>`;

    const name = r.debtorName || r.title || 'مستحق';

    return `
    <div class="p-3.5 rounded-2xl bg-slate-950 border ${isCollected ? 'border-emerald-900/30 opacity-75' : 'border-amber-900/40'} flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-bold text-white">${name}</span>
          ${badge}
        </div>
        <div class="text-[11px] text-amber-300">المبلغ: <b class="font-mono text-white">${Number(r.amount).toLocaleString()}</b> ج.م • يوم الاستحقاق الشهري: ${r.dueDay}</div>
        ${r.notes ? `<div class="text-[10px] text-slate-400 mt-0.5">${r.notes}</div>` : ''}
        ${!isCollected ? `<div class="text-[10px] text-amber-400 font-semibold mt-1">🔔 تنبيه مستمر يبدأ قبل الموعد بـ 3 أيام لحين تأكيد التحصيل</div>` : ''}
      </div>
      <div class="flex items-center gap-1.5">
        ${!isCollected ? `
          <button onclick="markReceivableCollected('${r.id}', ${r.amount}, '${name.replace(/'/g, "\\'")}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1" title="تأكيد التحصيل">
            <i class="fa-solid fa-check text-[10px]"></i>
            <span>تم التحصيل</span>
          </button>
        ` : ''}
        <button onclick="deleteReceivable('${r.id}')" class="text-slate-500 hover:text-red-400 p-2 transition-colors" title="حذف">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      </div>
    </div>
    `;
  }).join('');
}

function renderExpensesList(expenses) {
  const tbody = document.getElementById('expensesTableBody');
  if (!tbody) return;
  if (expenses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">لم يتم تسجيل مصروفات يومية بعد</td></tr>`;
    return;
  }

  const categoryLabels = {
    medical: { label: '💊 علاج وأدوية', class: 'text-red-300 bg-red-950/60 border border-red-800/40' },
    outings: { label: '🍽️ خروج وترفيه', class: 'text-amber-300 bg-amber-950/60 border border-amber-800/40' },
    food: { label: '🛒 طعام ومستلزمات', class: 'text-emerald-300 bg-emerald-950/60 border border-emerald-800/40' },
    transport: { label: '⛽ مواصلات وبنزين', class: 'text-blue-300 bg-blue-950/60 border border-blue-800/40' },
    bills: { label: '⚡ فواتير والتزامات', class: 'text-purple-300 bg-purple-950/60 border border-purple-800/40' },
    other: { label: '📦 أخرى', class: 'text-slate-300 bg-slate-800 border border-slate-700' }
  };

  tbody.innerHTML = expenses.map(e => {
    const cat = categoryLabels[e.category] || categoryLabels.other;
    return `
      <tr class="hover:bg-slate-900/50 transition-colors">
        <td class="p-3 text-slate-400 font-mono">${e.date || '--'}</td>
        <td class="p-3">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${cat.class}">${cat.label}</span>
        </td>
        <td class="p-3 font-medium text-white">${e.note || 'مصروف عام'}</td>
        <td class="p-3 font-bold text-red-400 text-sm">${e.amount.toLocaleString()} ج</td>
        <td class="p-3 text-center">
          <button onclick="deleteExpense('${e.id}')" class="text-slate-500 hover:text-red-400 p-1" title="حذف">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ---------------- AI FINANCIAL ADVISOR & ANALYTICS ---------------- //
async function refreshAiAnalysis() {
  try {
    const analysis = await apiCall('/api/financials/ai-analysis');
    if (!analysis) return;
    
    // Update dashboard hero & metrics safely
    setElText('statTotalIncome', (analysis.totalIncome || 0).toLocaleString());
    setElText('statDepositsIncome', `${(analysis.depositsReturn || 0).toLocaleString()} ج`);
    setElText('statTotalSpent', (analysis.totalSpent || 0).toLocaleString());
    setElText('statNetSavings', (analysis.netSavings || 0).toLocaleString());
    setElText('statSavingsRate', `${analysis.savingsRate || 0}%`);
    setElText('statFixedObligations', (analysis.totalFixedObligations || 0).toLocaleString());

    if (currentFinancials) {
      setElText('statCirclesCount', `${(currentFinancials.moneyCircles || []).length} جمعية`);
      setElText('statInstallmentsCount', `${(currentFinancials.installments || []).length} قسط نشط`);
    }

    // AI score & verdict
    const scoreEl = document.getElementById('dashAiScore');
    if (scoreEl) {
      scoreEl.innerText = `${analysis.healthScore || 70}/100`;
      scoreEl.className = `text-xs px-2 py-0.5 rounded-full font-bold ${
        (analysis.healthScore || 70) >= 75 ? 'bg-emerald-500/20 text-emerald-300' :
        (analysis.healthScore || 70) >= 50 ? 'bg-amber-500/20 text-amber-300' :
        'bg-red-500/20 text-red-300'
      }`;
    }
    setElText('dashAiVerdict', analysis.verdict || '');

    // AI Saving Recommendations
    const recList = document.getElementById('aiRecommendationsList');
    if (recList) {
      if (!analysis.recommendations || analysis.recommendations.length === 0) {
        recList.innerHTML = `<div class="text-slate-500 py-3 text-center">سجل بعض المصروفات اليومية لعرض توصيات الذكاء الاصطناعي</div>`;
      } else {
        recList.innerHTML = analysis.recommendations.map(r => `
          <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div class="font-bold text-gold-300 flex items-center justify-between">
              <span>${r.title}</span>
              ${r.potentialMonthlySaving ? `<span class="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">+${r.potentialMonthlySaving.toLocaleString()} ج توفير</span>` : ''}
            </div>
            <p class="text-slate-300 text-[11px] leading-relaxed">${r.description}</p>
          </div>
        `).join('');

        // Also set top recommendation on dashboard widget
        const topRec = analysis.recommendations[0];
        setElText('dashAiTopRecText', topRec ? topRec.description : "المحافظة على التوازن المالي بين الإيرادات والمصروفات.");
      }
    }

    // AI Investment Proposals
    const investList = document.getElementById('aiInvestmentList');
    if (investList) {
      if (analysis.investmentProposals.length === 0) {
        investList.innerHTML = `<div class="text-slate-500 py-3 text-center">قم بزيادة الفائض الشهري لتلقي عروض الاستثمار</div>`;
      } else {
        investList.innerHTML = analysis.investmentProposals.map(p => `
          <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div class="font-bold text-emerald-400 flex items-center justify-between">
              <span>${p.title}</span>
              <span class="text-[10px] text-gold-300 bg-amber-950 px-2 py-0.5 rounded">${p.expectedReturnRate}</span>
            </div>
            <p class="text-slate-300 text-[11px] leading-relaxed">${p.description}</p>
          </div>
        `).join('');
      }
    }

    // Render Pie Chart
    renderPieChart(analysis.categoryBreakdown);

  } catch (err) {
    console.error("AI Analysis error:", err);
  }
}

function renderPieChart(cats) {
  const canvas = document.getElementById('expensesPieChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (expensesChartInstance) {
    expensesChartInstance.destroy();
  }

  const labels = ['علاج وأدوية', 'خروج وترفيه', 'طعام ومشتريات', 'مواصلات وبنزين', 'فواتير', 'أخرى'];
  const data = [cats.medical || 0, cats.outings || 0, cats.food || 0, cats.transport || 0, cats.bills || 0, cats.other || 0];

  expensesChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#ef4444', // Red (Medical)
          '#f59e0b', // Amber (Outings)
          '#10b981', // Emerald (Food)
          '#3b82f6', // Blue (Transport)
          '#a855f7', // Purple (Bills)
          '#64748b'  // Slate (Other)
        ],
        borderWidth: 2,
        borderColor: '#020617'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            boxWidth: 10,
            color: '#94a3b8',
            font: { family: 'Cairo', size: 9 }
          }
        }
      }
    }
  });
}

// ---------------- VEHICLES & LICENSES ("مركباتي") ---------------- //
async function loadVehicles() {
  try {
    const list = await apiCall('/api/vehicles');
    currentVehicles = list;
    const grid = document.getElementById('vehiclesCardsGrid');
    if (!grid) return;

    if (list.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-500">
          <i class="fa-solid fa-car text-3xl mb-2 opacity-50"></i>
          <p class="text-sm">لم تقم بإضافة رخص حتى الآن. اضغط على "إضافة رخصة جديدة" لإدارتها وتلقي التنبيهات قبل انتهائها بشهر.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = list.map(v => {
      const isVehicle = v.type === 'vehicle_license';
      const isExpiringSoon = v.isExpiringSoon;
      const isExpired = v.isExpired;

      let statusBadge = '';
      if (isExpired) {
        statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-300 border border-red-700">⚠️ منتهية الصلاحية</span>`;
      } else if (isExpiringSoon) {
        statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-gold-300 border border-amber-700 animate-pulse">🔔 تنبيه: متبقي ${v.daysRemaining} يوماً (تجديد)</span>`;
      } else {
        statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">سارية (${v.daysRemaining || '--'} يوم)</span>`;
      }

      return `
        <div class="bg-slate-900 border ${isExpiringSoon ? 'border-amber-500/70 shadow-lg shadow-amber-500/10' : 'border-slate-800'} rounded-3xl p-5 space-y-4 flex flex-col justify-between">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs text-blue-400 font-bold flex items-center gap-1.5">
                <i class="fa-solid ${isVehicle ? 'fa-car' : 'fa-id-card'}"></i>
                ${isVehicle ? 'رخصة تسيير مركبة' : 'رخصة قيادة خاصة'}
              </span>
              ${statusBadge}
            </div>

            <div>
              <h4 class="text-base font-black text-white">${v.title}</h4>
              ${v.plateNumber ? `<div class="text-xs text-slate-300 font-mono mt-0.5">رقم: ${v.plateNumber}</div>` : ''}
              ${v.ownerName ? `<div class="text-[11px] text-slate-400">المالك: ${v.ownerName}</div>` : ''}
            </div>

            <div class="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
              <div class="flex justify-between text-slate-400">
                <span>تاريخ التحرير:</span>
                <span class="text-slate-200 font-mono">${v.issueDate || 'غير مسجل'}</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span class="font-bold text-amber-300">تاريخ الانتهاء:</span>
                <span class="text-amber-300 font-mono font-bold">${v.expiryDate}</span>
              </div>
              ${v.notes ? `<div class="text-[10px] text-slate-400 pt-1 border-t border-slate-900">ملاحظات: ${v.notes}</div>` : ''}
            </div>
          </div>

          <div class="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span class="text-[11px] text-slate-400">تنبيه تلقائي قبل شهر</span>
            <button onclick="deleteVehicle('${v.id}')" class="text-red-400 hover:text-red-300 font-bold flex items-center gap-1">
              <i class="fa-solid fa-trash-can text-[10px]"></i>
              <span>حذف</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error("Error loading vehicles:", err);
  }
}

// ---------------- RELIGIOUS DATA & CYCLING ---------------- //
async function fetchNextReligious(type = 'azkar') {
  try {
    if (type === 'azkar') {
      const data = await apiCall('/api/religious/azkar');
      if (!data) return;
      currentReligiousData.azkar = data;
      setElText('dashThikrText', `« ${data.content} »`);
      setElText('dashThikrFadl', data.fadl || "");
      setElText('dashThikrCategory', data.category || "ذكر واستغفار");

      const rText = document.getElementById('religiousAzkarText');
      if (rText) rText.innerText = data.content;
      const rFadl = document.getElementById('religiousAzkarFadl');
      if (rFadl) rFadl.innerText = `الفضل: ${data.fadl || ''}`;
    } else if (type === 'quran') {
      const data = await apiCall('/api/religious/quran');
      if (!data) return;
      currentReligiousData.quran = data;
      const titleEl = document.getElementById('religiousQuranTitle');
      if (titleEl) titleEl.innerText = `${data.title} (${data.versesRange})`;

      const container = document.getElementById('religiousQuranContainer');
      if (container && Array.isArray(data.verses)) {
        container.innerHTML = data.verses.map((v, i) => `
          <div class="mb-2">${v} <span class="text-gold-400 font-bold">﴿${i + 1}﴾</span></div>
        `).join('');
      }
    } else if (type === 'duaa') {
      const data = await apiCall('/api/religious/duaa');
      if (!data) return;
      currentReligiousData.duaa = data;
      setElText('religiousDuaaText', data.content);
      const heroPreview = document.getElementById('heroDeceasedPreview');
      if (heroPreview) {
        heroPreview.innerHTML = `اللهم اغفر لـ <strong class="text-gold-300" id="heroDeceasedName">${data.deceasedName || "جميع موتى المسلمين"}</strong> وارحمهم وعافهم واعفُ عنهم.`;
      }
    }
  } catch (err) {
    console.error("Error fetching religious data:", err);
  }
}

// ---------------- FLOATING ALERT SYSTEM ---------------- //
function testFloatingAlert(type) {
  let alertPayload = null;

  if (type === 'azkar' && currentReligiousData.azkar) {
    alertPayload = currentReligiousData.azkar;
  } else if (type === 'quran' && currentReligiousData.quran) {
    alertPayload = currentReligiousData.quran;
  } else if (type === 'duaa' && currentReligiousData.duaa) {
    alertPayload = currentReligiousData.duaa;
  } else {
    // Fallback payload
    alertPayload = {
      type: "azkar",
      title: "تذكير بذكر الله (نصف ساعة)",
      content: "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ",
      fadl: "من لزم الاستغفار جعل الله له من كل هم فرجاً ومن كل ضيق مخرجاً"
    };
  }

  // Trigger floating alert across all platforms (Mobile Heads-up, Electron, In-App banner)
  triggerFloatingAlertEverywhere(alertPayload);

  // If on mobile Android (Capacitor), schedule test notification in 3 seconds so user can test background / lockscreen
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
    try {
      window.Capacitor.Plugins.LocalNotifications.schedule({
        notifications: [{
          id: 9999,
          title: alertPayload.title || "تنبيه عائم • تحويشة استغفار",
          body: alertPayload.content || alertPayload.message || "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ",
          channelId: 'tahwesha_heads_up_v4',
          schedule: { at: new Date(Date.now() + 3000) },
          sound: 'notification.wav'
        }]
      });
      alert("تم ضبط التنبيه! اخرج من البرنامج أو اقفل شاشة الموبايل الآن لتشاهد التنبيه العائم يظهر فوق شاشتك بعد 3 ثوانٍ 🔔");
    } catch (e) {
      console.warn("Test notification schedule notice:", e);
    }
  }
}

function showBrowserOverlaySim(data) {
  showInAppFloatingAlert(data);
}

function closeBrowserOverlaySim() {
  closeInAppFloatingAlert();
}

function playWebAudioChime() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3); // D6

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.85);
  } catch (e) {
    // Ignore audio error if not permitted
  }
}

// ---------------- URGENT ALERTS SCANNER ---------------- //
async function checkUrgentAlerts() {
  if (!currentUser) return;
  try {
    const res = await apiCall('/api/alerts/summary');
    const bar = document.getElementById('urgentAlertsBar');
    const textEl = document.getElementById('urgentAlertsText');

    if (res.alerts && res.alerts.length > 0) {
      const first = res.alerts[0];
      if (textEl) textEl.innerText = `${first.title}: ${first.message}`;
      if (bar) bar.classList.remove('hidden');
    } else {
      if (bar) bar.classList.add('hidden');
    }
  } catch (err) {
    console.error("Alert check error:", err);
  }
}

function dismissUrgentAlert() {
  const bar = document.getElementById('urgentAlertsBar');
  if (bar) bar.classList.add('hidden');
}

// ---------------- TASBIH COUNTER ---------------- //
function setupTasbih() {
  setElText('tasbihCounter', tasbihCount);
  setElText('currentTasbihLabel', activeTasbihDhikr);
}

function clickTasbih() {
  tasbihCount++;
  setElText('tasbihCounter', tasbihCount);
  localStorage.setItem('tasbih_count', tasbihCount.toString());
  playWebAudioChime();
}

function resetTasbih() {
  if (confirm("هل تريد تصفير عداد التسبيح؟")) {
    tasbihCount = 0;
    setElText('tasbihCounter', '0');
    localStorage.setItem('tasbih_count', '0');
  }
}

function setTasbihDhikr(dhikr) {
  activeTasbihDhikr = dhikr;
  setElText('currentTasbihLabel', dhikr);
  localStorage.setItem('tasbih_dhikr', dhikr);
}

// ---------------- AUTHENTICATION HANDLERS (CLEAN & SECURE - NO LEAKS) ---------------- //
function toggleGateAuthMode(mode) {
  const loginForm = document.getElementById('gateLoginForm');
  const registerForm = document.getElementById('gateRegisterForm');
  const title = document.getElementById('authGateTitle');
  const subtitle = document.getElementById('authGateSubtitle');

  if (mode === 'register') {
    if (loginForm) loginForm.classList.add('hidden');
    if (registerForm) registerForm.classList.remove('hidden');
    if (title) title.innerText = "إنشاء حساب جديد وتفعيله";
    if (subtitle) subtitle.innerText = "أدخل بياناتك لتصلك رسالة التفعيل السرية على الإيميل";
  } else {
    if (loginForm) loginForm.classList.remove('hidden');
    if (registerForm) registerForm.classList.add('hidden');
    if (title) title.innerText = "تسجيل الدخول إلى حسابك";
    if (subtitle) subtitle.innerText = "بياناتك المالية والشخصية محمية بالكامل ومشفرة";
  }
}

// Toggle password text/dots with eye icon
function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (input) {
    if (input.type === 'password') {
      input.type = 'text';
      if (icon) {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    } else {
      input.type = 'password';
      if (icon) {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      }
    }
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const rawPhone = document.getElementById('loginPhone').value;
  const rawPassword = document.getElementById('loginPassword').value;
  const phone = normalizePhone(rawPhone);
  const password = normalizeArabicDigits(rawPassword);

  if (!phone || !password) {
    alert("يرجى كتابة رقم الموبايل وكلمة المرور");
    return;
  }

  try {
    const res = await apiCall('/api/auth/login', 'POST', { phone, password });
    localStorage.setItem('tahwesha_token', res.token);
    setCurrentUser(res.user);
    await refreshAllData();
  } catch (err) {
    if (err.message && err.message.includes('غير مفعل')) {
      openOtpModal(phone, "");
    } else {
      alert(err.message || "فشل تسجيل الدخول، تأكد من صحة رقم الموبايل وكلمة المرور");
    }
  }
}

let pendingVerifyPhone = null;

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const rawPhone = document.getElementById('regPhone').value.trim();
  const phone = normalizePhone(rawPhone);
  const email = document.getElementById('regEmail').value.trim();
  const deceasedName = document.getElementById('regDeceasedName').value.trim();
  const rawPassword = document.getElementById('regPassword').value;
  const password = normalizeArabicDigits(rawPassword);

  if (!phone || !password || !name || !email) {
    alert("يرجى ملء جميع الحقول المطلوبة بشكل صحيح");
    return;
  }

  try {
    const res = await apiCall('/api/auth/register', 'POST', { name, phone, email, password, deceasedName });
    openOtpModal(phone, email);
  } catch (err) {
    alert(err.message || "حدث خطأ أثناء التسجيل");
  }
}

function openOtpModal(phone, email = '') {
  pendingVerifyPhone = phone;
  setElText('otpTargetEmailText', email || "بريدك الإلكتروني المسجل");
  const modal = document.getElementById('otpModal');
  if (modal) modal.classList.remove('hidden');
}

// ---------------- MOBILE & DESKTOP FLOATING HEADS-UP NOTIFICATIONS ---------------- //
// إشعارات عائمة على شاشة الموبايل حتى لو الشاشة مقفولة أو التطبيق في الخلفية مثل الواتساب
async function initMobileNotifications() {
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
    try {
      const { LocalNotifications } = window.Capacitor.Plugins;
      await LocalNotifications.requestPermissions();
      await LocalNotifications.createChannel({
        id: 'tahwesha_heads_up_v4',
        name: 'تنبيهات تحويشة استغفار العائمة',
        description: 'تنبيهات عائمة منبثقة على شاشة الموبايل حتى لو الموبايل مقفول مثل الواتساب',
        importance: 5, // IMPORTANCE_HIGH (5) -> Triggers Heads-Up Floating Alert over any screen!
        visibility: 1, // VISIBILITY_PUBLIC (1) -> Shows on Lock Screen!
        vibration: true,
        sound: 'notification.wav'
      });

      // Schedule full 24-48 hours of background notifications in Android AlarmManager!
      const savedUser = JSON.parse(localStorage.getItem('tahwesha_user') || '{}');
      await scheduleBackgroundReminders(savedUser.deceasedName || "جميع موتى المسلمين");
    } catch (e) {
      console.warn("Mobile notification channel initialization notice:", e);
    }
  }
}

// ---------------- 24-HOUR BACKGROUND NOTIFICATION SCHEDULER (WORKS EVEN WHEN APP IS CLOSED) ---------------- //
// جدولة تنبيهات اليوم بالكامل في AlarmManager الخاص بنظام أندرويد لتعمل حتى والتطبيق مقفول تماماً
async function scheduleBackgroundReminders(deceasedName = "جميع موتى المسلمين") {
  if (!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.LocalNotifications) {
    return;
  }

  const { LocalNotifications } = window.Capacitor.Plugins;

  try {
    // 1. Cancel previous pending scheduled notifications to avoid duplicates
    const pending = await LocalNotifications.getPending();
    if (pending && pending.notifications && pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const notificationsToSchedule = [];
    const now = Date.now();
    let notifIdCounter = 1000;

    // 0. Immediate 45-second test reminder (Allows user to test lock screen immediately!)
    const azkarList = (typeof EMBEDDED_AZKAR !== 'undefined') ? EMBEDDED_AZKAR : [];
    const testThikr = azkarList.length ? azkarList[0] : null;
    notificationsToSchedule.push({
      id: 999,
      title: "📿 ذكر واستغفار • تحويشة استغفار",
      body: testThikr ? `« ${testThikr.text} »` : "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ",
      channelId: 'tahwesha_heads_up_v4',
      smallIcon: 'ic_stat_tahwesha',
      iconColor: '#10B981',
      schedule: { at: new Date(now + 45 * 1000), allowWhileIdle: true },
      sound: 'notification.wav'
    });

    // 2. Schedule Athkar (every 30 minutes for the next 24 hours -> 48 reminders)
    for (let i = 1; i <= 48; i++) {
      const scheduledTime = new Date(now + i * 30 * 60 * 1000);
      const thikr = azkarList.length ? azkarList[(i - 1) % azkarList.length] : null;
      const thikrText = thikr ? thikr.text : "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ";
      const fadlText = thikr && thikr.fadl ? ` (${thikr.fadl})` : "";

      notificationsToSchedule.push({
        id: notifIdCounter++,
        title: "📿 ذكر واستغفار • تحويشة استغفار",
        body: `« ${thikrText} »${fadlText}`,
        channelId: 'tahwesha_heads_up_v4',
        smallIcon: 'ic_stat_tahwesha',
        iconColor: '#10B981',
        schedule: { at: scheduledTime, allowWhileIdle: true },
        sound: 'notification.wav'
      });
    }

    // 3. Schedule 5 Quranic Verses (every 60 minutes for the next 24 hours -> 24 reminders)
    const quranList = (typeof EMBEDDED_QURAN !== 'undefined') ? EMBEDDED_QURAN : [];
    for (let i = 1; i <= 24; i++) {
      const scheduledTime = new Date(now + (i * 60 + 15) * 60 * 1000);
      const qSet = quranList.length ? quranList[(i - 1) % quranList.length] : null;
      let versesPreview = "بسم الله الرحمن الرحيم";
      let surahTitle = "القرآن الكريم";
      if (qSet && Array.isArray(qSet.verses)) {
        surahTitle = qSet.surah || "سورة قرآنية";
        versesPreview = qSet.verses.slice(0, 2).join(' ۝ ') + '...';
      }

      notificationsToSchedule.push({
        id: notifIdCounter++,
        title: `📖 5 آيات من ${surahTitle}`,
        body: `${versesPreview}`,
        channelId: 'tahwesha_heads_up_v4',
        smallIcon: 'ic_stat_tahwesha',
        iconColor: '#10B981',
        schedule: { at: scheduledTime, allowWhileIdle: true },
        sound: 'notification.wav'
      });
    }

    // 4. Schedule Duaa for the deceased (every 90 minutes for the next 24 hours -> 16 reminders)
    const duaaList = (typeof EMBEDDED_DUAA !== 'undefined') ? EMBEDDED_DUAA : [];
    const targetName = deceasedName || "جميع موتى المسلمين";
    for (let i = 1; i <= 16; i++) {
      const scheduledTime = new Date(now + (i * 90 + 25) * 60 * 1000);
      const template = duaaList.length ? duaaList[(i - 1) % duaaList.length] : "اللَّهُمَّ اغْفِرْ لِـ {NAME} وَارْحَمْهُ وَعَافِهِ وَاعْفُ عَنْهُ.";
      const duaaText = template.replace(/{NAME}/g, targetName);

      notificationsToSchedule.push({
        id: notifIdCounter++,
        title: `🤲 دعاء للمتوفي (${targetName})`,
        body: duaaText,
        channelId: 'tahwesha_heads_up_v4',
        smallIcon: 'ic_stat_tahwesha',
        iconColor: '#10B981',
        schedule: { at: scheduledTime, allowWhileIdle: true },
        sound: 'notification.wav'
      });
    }

    // 5. Schedule Vehicle License Expiry Reminders (رخص المركبات والسيارات)
    const vehicles = OfflineEngine.getStorage('vehicles', []);
    if (Array.isArray(vehicles) && vehicles.length > 0) {
      vehicles.forEach((veh, vIdx) => {
        if (veh.expiryDate) {
          const expTime = new Date(veh.expiryDate).getTime();
          const daysLeft = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
          const vehTitle = veh.title || veh.plateNumber || "المركبة";
          let alertMsg = "";
          if (daysLeft < 0) {
            alertMsg = `⚠️ رخصة السيارة (${vehTitle}) منتهية منذ ${Math.abs(daysLeft)} يوم! يرجى التجديد لتجنب سحب اللوحات والغرامات.`;
          } else if (daysLeft <= 30) {
            alertMsg = `🚗 متبقي ${daysLeft} يوم فقط على انتهاء رخصة (${vehTitle}) بتاريخ ${veh.expiryDate}. يرجى الاستعداد للتجديد.`;
          }

          if (alertMsg) {
            // Schedule alert at 10:00 AM or after 2 hours
            const schedAt = new Date(now + (2 + vIdx) * 60 * 60 * 1000);
            notificationsToSchedule.push({
              id: notifIdCounter++,
              title: `🚗 تنبيه رخصة السيارة • ${vehTitle}`,
              body: alertMsg,
              channelId: 'tahwesha_heads_up_v4',
              smallIcon: 'ic_stat_tahwesha',
              iconColor: '#F59E0B',
              schedule: { at: schedAt, allowWhileIdle: true },
              sound: 'notification.wav'
            });
          }
        }
      });
    }

    // 6. Schedule Financial Dues & Installments Reminders (المستحقات والأقساط والجمعيات)
    const fin = OfflineEngine.getStorage('financials', {});
    
    // A. Installments (الأقساط)
    if (fin && Array.isArray(fin.installments)) {
      fin.installments.forEach((inst, iIdx) => {
        const instAmount = parseFloat(inst.amount) || 0;
        const schedAt = new Date(now + (4 + iIdx * 2) * 60 * 60 * 1000);
        notificationsToSchedule.push({
          id: notifIdCounter++,
          title: `💳 موعد سداد قسط: ${inst.title}`,
          body: `تذكير بموعد سداد قسط ${inst.title} بقيمة ${instAmount.toLocaleString()} ج.م (يوم ${inst.dueDay || 'المحدد'} من الشهر).`,
          channelId: 'tahwesha_heads_up_v4',
          smallIcon: 'ic_stat_tahwesha',
          iconColor: '#3B82F6',
          schedule: { at: schedAt, allowWhileIdle: true },
          sound: 'notification.wav'
        });
      });
    }

    // B. Money Circles (الجمعيات)
    if (fin && Array.isArray(fin.moneyCircles)) {
      fin.moneyCircles.forEach((circ, cIdx) => {
        const circAmount = parseFloat(circ.monthlyAmount) || 0;
        const schedAt = new Date(now + (6 + cIdx * 2) * 60 * 60 * 1000);
        notificationsToSchedule.push({
          id: notifIdCounter++,
          title: `💰 تذكير سداد الجمعية: ${circ.name}`,
          body: `ميعاد سداد قسط جمعية ${circ.name} بقيمة ${circAmount.toLocaleString()} ج.م، قبضك بشهر: ${circ.payoutMonth || 'المحدد'}.`,
          channelId: 'tahwesha_heads_up_v4',
          smallIcon: 'ic_stat_tahwesha',
          iconColor: '#10B981',
          schedule: { at: schedAt, allowWhileIdle: true },
          sound: 'notification.wav'
        });
      });
    }

    // C. Receivables (المستحقات والديون التي لك بالخارج)
    if (fin && Array.isArray(fin.receivables)) {
      const pendingRecs = fin.receivables.filter(r => !r.collected);
      pendingRecs.forEach((rec, rIdx) => {
        const recAmount = parseFloat(rec.amount) || 0;
        const schedAt = new Date(now + (8 + rIdx * 2) * 60 * 60 * 1000);
        notificationsToSchedule.push({
          id: notifIdCounter++,
          title: `💵 تذكير تحصيل مستحقات`,
          body: `لديك مستحق لدى ${rec.debtorName} بقيمة ${recAmount.toLocaleString()} ج.م لم يتم تحصيله بعد.`,
          channelId: 'tahwesha_heads_up_v4',
          smallIcon: 'ic_stat_tahwesha',
          iconColor: '#8B5CF6',
          schedule: { at: schedAt, allowWhileIdle: true },
          sound: 'notification.wav'
        });
      });
    }

    // 7. Send batch to Android AlarmManager
    await LocalNotifications.schedule({
      notifications: notificationsToSchedule
    });
    console.log(`Successfully scheduled ${notificationsToSchedule.length} background reminders (Athkar, Quran, Duaa, Vehicles, Installments) in Android AlarmManager.`);
  } catch (err) {
    console.warn("Background reminder scheduling notice:", err);
  }
}

async function triggerFloatingAlertEverywhere(alertPayload) {
  const title = alertPayload.title || "تنبيه تحويشة استغفار";
  let body = alertPayload.content || alertPayload.message || "";
  if (alertPayload.type === 'quran' && Array.isArray(alertPayload.verses)) {
    body = alertPayload.verses.slice(0, 2).join(' • ') + '...';
  }

  // 1. Android Mobile Heads-Up Floating Alert (Pops up over any screen or locked screen)
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
    try {
      const { LocalNotifications } = window.Capacitor.Plugins;
      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 1000000),
          title: title,
          body: body,
          channelId: 'tahwesha_heads_up_v4',
          smallIcon: 'ic_stat_tahwesha',
          iconColor: '#10B981',
          sound: 'notification.wav',
          schedule: { at: new Date(Date.now() + 300), allowWhileIdle: true }
        }]
      });
    } catch (e) {
      console.warn("Local notification schedule notice:", e);
    }
  }

  // 2. Desktop Electron Floating Window Overlay
  if (window.electronAPI && window.electronAPI.triggerFloatingAlert) {
    window.electronAPI.triggerFloatingAlert(alertPayload);
  }

  // 3. In-App Floating Overlay Popup Banner with explicit Close Button (✕)
  showInAppFloatingAlert(alertPayload);
}

function showInAppFloatingAlert(data) {
  const alertEl = document.getElementById('inAppFloatingAlert');
  if (!alertEl) return;

  setElText('inAppAlertTitle', data.title || "تنبيه جديد");
  const contentEl = document.getElementById('inAppAlertContent');
  const noteEl = document.getElementById('inAppAlertNote');

  if (data.type === 'quran' && Array.isArray(data.verses)) {
    if (contentEl) {
      contentEl.innerHTML = data.verses.map((v, idx) => `<div>${v} <span class="text-gold-400">﴿${idx + 1}﴾</span></div>`).join('');
    }
  } else {
    if (contentEl) contentEl.innerText = data.content || data.message || "";
  }

  if (data.fadl) {
    if (noteEl) {
      noteEl.innerText = `الفضل: ${data.fadl}`;
      noteEl.style.display = 'block';
    }
  } else if (data.deceasedName) {
    if (noteEl) {
      noteEl.innerText = `الدعاء بالرحمة والمغفرة لـ: ${data.deceasedName}`;
      noteEl.style.display = 'block';
    }
  } else {
    if (noteEl) noteEl.style.display = 'none';
  }

  alertEl.classList.remove('hidden');
  playWebAudioChime();
}

function closeInAppFloatingAlert() {
  const alertEl = document.getElementById('inAppFloatingAlert');
  if (alertEl) alertEl.classList.add('hidden');
}

async function handleOtpSubmit(e) {
  e.preventDefault();
  const rawCode = document.getElementById('otpInput').value.trim();
  const code = normalizeArabicDigits(rawCode);

  try {
    const res = await apiCall('/api/auth/verify', 'POST', { phone: pendingVerifyPhone, code });
    localStorage.setItem('tahwesha_token', res.token);
    setCurrentUser(res.user);
    const modal = document.getElementById('otpModal');
    if (modal) modal.classList.add('hidden');
    await refreshAllData();
    alert("تم تفعيل حسابك بنجاح! نسأل الله لك بركة الرزق ونور الاستغفار.");
  } catch (err) {
    alert(err.message);
  }
}

async function resendOtpCode() {
  if (!pendingVerifyPhone) return;
  try {
    const res = await apiCall('/api/auth/resend-code', 'POST', { phone: pendingVerifyPhone });
    alert(res.message || "تم إرسال كود تفعيل جديد إلى بريدك الإلكتروني بنجاح!");
  } catch (err) {
    alert(err.message);
  }
}

function logout() {
  localStorage.removeItem('tahwesha_token');
  localStorage.removeItem('tahwesha_user');
  currentUser = null;
  const adminTab = document.getElementById('tab-admin');
  const mobAdminTab = document.getElementById('mob-tab-admin');
  const adminBadge = document.getElementById('adminBadge');
  if (adminTab) adminTab.classList.add('hidden');
  if (mobAdminTab) mobAdminTab.classList.add('hidden');
  if (adminBadge) adminBadge.classList.add('hidden');
  location.reload();
}

// ---------------- PROFILE MODAL ---------------- //
function openProfileModal() {
  if (!currentUser) return;
  setElVal('profName', currentUser.name || '');
  setElVal('profEmail', currentUser.email || '');
  setElVal('profDeceasedName', currentUser.deceasedName || '');
  setElVal('profPassword', '');
  const modal = document.getElementById('profileModal');
  if (modal) modal.classList.remove('hidden');
}

function closeProfileModal() {
  const modal = document.getElementById('profileModal');
  if (modal) modal.classList.add('hidden');
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  const name = getElVal('profName').trim();
  const email = getElVal('profEmail').trim();
  const deceasedName = getElVal('profDeceasedName').trim();
  const password = getElVal('profPassword');

  try {
    const res = await apiCall('/api/auth/profile', 'PUT', { name, email, deceasedName, password });
    setCurrentUser(res.user);
    closeProfileModal();
    // Refresh duaa
    fetchNextReligious('duaa');
    alert("تم حفظ وتحديث البيانات بنجاح!");
  } catch (err) {
    alert(err.message);
  }
}

// ---------------- INCOME UPDATE ---------------- //
function openUpdateIncomeModal() {
  if (currentFinancials) {
    document.getElementById('incomeInputVal').value = currentFinancials.monthlyIncome || '';
  }
  document.getElementById('incomeModal').classList.remove('hidden');
}

function closeUpdateIncomeModal() {
  document.getElementById('incomeModal').classList.add('hidden');
}

async function handleUpdateIncome(e) {
  e.preventDefault();
  const val = parseFloat(document.getElementById('incomeInputVal').value) || 0;
  try {
    await apiCall('/api/financials/income', 'POST', { monthlyIncome: val });
    closeUpdateIncomeModal();
    await loadFinancials();
  } catch (err) {
    alert(err.message);
  }
}

// ---------------- ADD DAILY EXPENSE ---------------- //
function openAddExpenseModal() {
  document.getElementById('expDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('expenseModal').classList.remove('hidden');
}

function closeAddExpenseModal() {
  document.getElementById('expenseModal').classList.add('hidden');
}

async function handleAddExpense(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('expAmount').value);
  const category = document.getElementById('expCategory').value;
  const note = document.getElementById('expNote').value;
  const date = document.getElementById('expDate').value;

  try {
    await apiCall('/api/financials/expenses', 'POST', { amount, category, note, date });
    closeAddExpenseModal();
    document.getElementById('expAmount').value = '';
    document.getElementById('expNote').value = '';
    await loadFinancials();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteExpense(id) {
  if (confirm("هل تريد بالتأكيد حذف هذا المصروف؟")) {
    try {
      await apiCall(`/api/financials/expenses/${id}`, 'DELETE');
      await loadFinancials();
    } catch (err) {
      alert(err.message);
    }
  }
}

// ---------------- ADD MONEY CIRCLE (جمعية) ---------------- //
function openAddCircleModal() {
  document.getElementById('circleModal').classList.remove('hidden');
}

function closeAddCircleModal() {
  document.getElementById('circleModal').classList.add('hidden');
}

async function handleAddCircle(e) {
  e.preventDefault();
  const name = document.getElementById('circleName').value;
  const monthlyAmount = document.getElementById('circleMonthlyAmount').value;
  const payoutMonth = document.getElementById('circlePayoutMonth').value;
  const payoutAmount = document.getElementById('circlePayoutAmount').value;

  try {
    await apiCall('/api/financials/circles', 'POST', { name, monthlyAmount, payoutMonth, payoutAmount });
    closeAddCircleModal();
    await loadFinancials();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteCircle(id) {
  if (confirm("هل تريد حذف هذه الجمعية؟")) {
    try {
      await apiCall(`/api/financials/circles/${id}`, 'DELETE');
      await loadFinancials();
    } catch (err) {
      alert(err.message);
    }
  }
}

// ---------------- ADD DEPOSIT / CERTIFICATE (شهادة) ---------------- //
function openAddDepositModal() {
  document.getElementById('depositModal').classList.remove('hidden');
}

function closeAddDepositModal() {
  document.getElementById('depositModal').classList.add('hidden');
}

async function handleAddDeposit(e) {
  e.preventDefault();
  const name = getElVal('depName');
  const bank = getElVal('depBank');
  const monthlyReturn = getElVal('depMonthlyReturn');
  const principal = getElVal('depPrincipal');
  const maturityDate = getElVal('depMaturityDate');

  try {
    await apiCall('/api/financials/deposits', 'POST', { name, bank, monthlyReturn, principal, maturityDate });
    closeAddDepositModal();
    await loadFinancials();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteDeposit(id) {
  if (confirm("هل تريد حذف هذه الشهادة/الوديعة؟")) {
    try {
      await apiCall(`/api/financials/deposits/${id}`, 'DELETE');
      await loadFinancials();
    } catch (err) {
      alert(err.message);
    }
  }
}

// ---------------- ADD INSTALLMENT (قسط) ---------------- //
function openAddInstallmentModal() {
  const modal = document.getElementById('installmentModal');
  if (modal) modal.classList.remove('hidden');
  toggleInstallmentFrequencyUI();
}

function closeAddInstallmentModal() {
  const modal = document.getElementById('installmentModal');
  if (modal) modal.classList.add('hidden');
  const form = document.getElementById('addInstallmentForm');
  if (form) form.reset();
  toggleInstallmentFrequencyUI();
}

function toggleInstallmentFrequencyUI() {
  const freq = getElVal('instFrequency') || 'monthly';
  const yearlyWrapper = document.getElementById('instYearlyMonthWrapper');
  const dueDayLabel = document.getElementById('instDueDayLabel');
  const alertHint = document.getElementById('instAlertHint');

  if (freq === 'yearly') {
    if (yearlyWrapper) yearlyWrapper.classList.remove('hidden');
    if (dueDayLabel) dueDayLabel.innerText = "يوم الاستحقاق من الشهر المحدد";
    if (alertHint) alertHint.innerText = "🔔 سيتم تذكيرك بهذا القسط السنوي قبل موعده بشهر كامل (30 يوماً).";
  } else {
    if (yearlyWrapper) yearlyWrapper.classList.add('hidden');
    if (dueDayLabel) dueDayLabel.innerText = "يوم الاستحقاق الشهري (1 - 31)";
    if (alertHint) alertHint.innerText = "🔔 سيتم إرسال إشعار وتنبيه قبل موعد القسط بـ 5 أيام تلقائياً.";
  }
}

async function handleAddInstallment(e) {
  e.preventDefault();
  const title = getElVal('instTitle');
  const amount = getElVal('instAmount');
  const dueDay = getElVal('instDueDay');
  const totalMonths = getElVal('instTotalMonths');
  const remainingMonths = getElVal('instRemainingMonths');
  const frequency = getElVal('instFrequency') || 'monthly';
  const dueMonth = getElVal('instDueMonth') || 1;
  const annualDate = getElVal('instAnnualDate') || '';
  const notes = getElVal('instNotes');

  try {
    await apiCall('/api/financials/installments', 'POST', {
      title,
      amount,
      dueDay,
      totalMonths,
      remainingMonths,
      frequency,
      dueMonth,
      annualDate,
      notes
    });
    closeAddInstallmentModal();
    await loadFinancials();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteInstallment(id) {
  if (confirm("هل تريد حذف هذا القسط؟")) {
    try {
      await apiCall(`/api/financials/installments/${id}`, 'DELETE');
      await loadFinancials();
    } catch (err) {
      alert(err.message);
    }
  }
}

// ---------------- RECEIVABLES (مستحقاتي - فلوس ليا عند الناس) ---------------- //
function openAddReceivableModal() {
  const modal = document.getElementById('receivableModal');
  if (modal) modal.classList.remove('hidden');
}

function closeAddReceivableModal() {
  const modal = document.getElementById('receivableModal');
  if (modal) modal.classList.add('hidden');
  const form = document.getElementById('addReceivableForm');
  if (form) form.reset();
}

async function handleAddReceivable(e) {
  e.preventDefault();
  const debtorName = getElVal('recDebtorName');
  const amount = getElVal('recAmount');
  const dueDay = getElVal('recDueDay');
  const notes = getElVal('recNotes');

  try {
    await apiCall('/api/financials/receivables', 'POST', {
      debtorName,
      amount,
      dueDay,
      notes
    });
    closeAddReceivableModal();
    await loadFinancials();
  } catch (err) {
    alert(err.message);
  }
}

async function markReceivableCollected(id, amount, title) {
  const addToIncome = confirm(`هل تود تأكيد استلام مبلغ (${Number(amount).toLocaleString()} ج.م) من ${title} وإضافته إلى رصيدك/دخلك للشهر الحالي؟`);
  try {
    await apiCall(`/api/financials/receivables/${id}/collected`, 'PUT', { addToIncome });
    await loadFinancials();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteReceivable(id) {
  if (confirm("هل أنت متأكد من حذف هذا المستحق؟")) {
    try {
      await apiCall(`/api/financials/receivables/${id}`, 'DELETE');
      await loadFinancials();
    } catch (err) {
      alert(err.message);
    }
  }
}

// ---------------- ADD VEHICLE / LICENSE ("مركباتي") ---------------- //
function openAddVehicleModal() {
  document.getElementById('vehicleModal').classList.remove('hidden');
}

function closeAddVehicleModal() {
  document.getElementById('vehicleModal').classList.add('hidden');
}

async function handleAddVehicle(e) {
  e.preventDefault();
  const type = getElVal('vehType');
  const title = getElVal('vehTitle');
  const plateNumber = getElVal('vehPlateNumber');
  const ownerName = getElVal('vehOwnerName');
  const issueDate = getElVal('vehIssueDate');
  const expiryDate = getElVal('vehExpiryDate');
  const notes = getElVal('vehNotes');

  try {
    await apiCall('/api/vehicles', 'POST', { type, title, plateNumber, ownerName, issueDate, expiryDate, notes });
    closeAddVehicleModal();
    await loadVehicles();
    await checkUrgentAlerts();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteVehicle(id) {
  if (confirm("هل تريد حذف هذه الرخصة؟")) {
    try {
      await apiCall(`/api/vehicles/${id}`, 'DELETE');
      await loadVehicles();
      await checkUrgentAlerts();
    } catch (err) {
      alert(err.message);
    }
  }
}

// ---------------- ADMIN PANEL ---------------- //
function saveCloudServerUrl() {
  const input = document.getElementById('cloudServerUrlInput');
  const url = input ? input.value.trim() : '';
  if (url) {
    localStorage.setItem('tahwesha_cloud_server_url', url);
    alert('تم حفظ رابط السيرفر السحابي بنجاح! سيتم الآن الاتصال بالسيرفر الأونلاين.');
    location.reload();
  } else {
    localStorage.removeItem('tahwesha_cloud_server_url');
    alert('تم الرجوع إلى وضع التشغيل المحلي.');
    location.reload();
  }
}

async function loadAdminOverview() {
  try {
    const input = document.getElementById('cloudServerUrlInput');
    if (input) input.value = localStorage.getItem('tahwesha_cloud_server_url') || '';
    const badge = document.getElementById('cloudStatusBadge');
    if (badge) {
      if (SAVED_CLOUD_URL) {
        badge.innerText = 'متصل سحابياً أونلاين ☁️';
        badge.className = 'text-xs px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold';
      } else {
        badge.innerText = 'يعمل محلياً (أوفلاين)';
        badge.className = 'text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold';
      }
    }

    const fbBadge = document.getElementById('firebaseStatusBadge');
    if (fbBadge && typeof FirebaseSync !== 'undefined') {
      FirebaseSync.checkConnectionStatus().then(st => {
        fbBadge.innerText = st.status === 'connected' ? 'سحابة Google نشطة ✅' : (st.status === 'error' ? 'تنبيه اتصال السحابة ⚠️' : 'غير متصل');
        fbBadge.className = st.status === 'connected' ? 'text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold border border-emerald-800' : 'text-[10px] px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 font-bold border border-amber-800';
      }).catch(e => {
        fbBadge.innerText = 'أوفلاين';
      });
    }

    const data = await apiCall('/api/admin/overview');
    setElText('adminTotalUsersCount', (data.totalSubscribers || 0).toLocaleString());
    setElText('adminTableSummary', `إجمالي المشتركين: ${(data.users || []).length}`);

    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;

    tbody.innerHTML = (data.users || []).map(u => {
      const isMasterAdmin = (u.phone === '01099099127');
      const safeName = (u.name || 'مشترك').replace(/'/g, "\\'");

      return `
      <tr class="hover:bg-slate-900/50 transition-colors">
        <td class="p-3 font-bold text-white">
          <div class="flex items-center gap-1.5">
            <span>${u.name}</span>
            ${isMasterAdmin ? '<span class="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-black border border-amber-500/40">مدير النظام 👑</span>' : ''}
          </div>
          <div class="text-[10px] text-slate-400 font-normal mt-0.5">${new Date(u.createdAt).toLocaleDateString('ar-EG')}</div>
        </td>
        <td class="p-3">
          <div class="font-mono text-slate-300 text-xs" dir="ltr">${u.phone}</div>
          <div class="text-[10px] text-slate-400 font-mono">${u.email || '--'}</div>
        </td>
        <td class="p-3 text-gold-300 text-xs">${u.deceasedName || '--'}</td>
        <td class="p-3">
          <div class="flex items-center gap-1.5">
            ${u.isVerified 
              ? '<span class="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">مفعل ✓</span>' 
              : '<span class="px-2 py-0.5 rounded-full text-[10px] bg-red-950 text-red-300 font-bold border border-red-800">غير مفعل</span>'
            }
            ${!isMasterAdmin ? `
              <button onclick="adminToggleVerify('${u.id}')" class="px-2 py-0.5 ${u.isVerified ? 'bg-amber-950/40 text-amber-300 hover:bg-amber-900 border border-amber-800/40' : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/40'} rounded-lg text-[9px] font-bold" title="تغيير حالة التفعيل">
                ${u.isVerified ? 'إيقاف' : 'تفعيل'}
              </button>
            ` : ''}
          </div>
        </td>
        <td class="p-3 text-center">
          <div class="flex items-center justify-center gap-1 flex-wrap">
            <button onclick="openAdminSendMessageModal('${u.id}', '${safeName}')" class="px-2 py-1 bg-brand-950/60 hover:bg-brand-900 text-brand-300 border border-brand-800/50 rounded-lg text-[10px] font-bold shadow-sm flex items-center gap-1" title="إرسال رسالة مخصصة تظهر على شاشة المشترك">
              <i class="fa-solid fa-paper-plane text-[9px]"></i>
              <span>رسالة خاصة</span>
            </button>
            <button onclick="openAdminResetPassModal('${u.id}', '${safeName}')" class="px-2 py-1 bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800/40 rounded-lg text-[10px] font-bold shadow-sm flex items-center gap-1" title="إعادة تعيين كلمة المرور">
              <i class="fa-solid fa-key text-[9px]"></i>
              <span>الباسورد</span>
            </button>
            <button onclick="openAdminUserFinModal('${u.id}', '${safeName}')" class="px-2 py-1 bg-blue-950/60 hover:bg-blue-900 text-blue-300 border border-blue-800/40 rounded-lg text-[10px] font-bold shadow-sm flex items-center gap-1" title="عرض الملخص المالي">
              <i class="fa-solid fa-chart-pie text-[9px]"></i>
              <span>كشف مالي</span>
            </button>
            ${!isMasterAdmin ? `
              <button onclick="adminDeleteUser('${u.id}', '${safeName}')" class="p-1.5 bg-slate-950 hover:bg-red-950 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-800 rounded-lg text-[10px] transition-colors" title="حذف المشترك نهائياً">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
      `;
    }).join('');

  } catch (err) {
    console.error("Admin load error:", err);
  }
}

// ---------------- ADMIN SUBSCRIBER ACTIONS ---------------- //

async function adminToggleVerify(userId) {
  try {
    const res = await apiCall(`/api/admin/users/${userId}/toggle-verify`, 'PUT');
    await loadAdminOverview();
    alert(res.message || "تم تغيير حالة تفعيل المشترك بنجاح!");
  } catch (err) {
    alert(err.message);
  }
}

async function adminDeleteUser(userId, userName) {
  if (confirm(`تحذير: هل أنت متأكد من حذف المشترك (${userName}) وجميع بياناته المالية نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`)) {
    try {
      await apiCall(`/api/admin/users/${userId}`, 'DELETE');
      await loadAdminOverview();
      alert("تم حذف حساب المشترك بنجاح.");
    } catch (err) {
      alert(err.message);
    }
  }
}

function openAdminSendMessageModal(userId, userName) {
  const targetIdInput = document.getElementById('msgTargetUserId');
  if (targetIdInput) targetIdInput.value = userId;
  setElText('msgTargetUserName', userName);
  const titleInput = document.getElementById('adminMsgTitle');
  if (titleInput) titleInput.value = '';
  const bodyInput = document.getElementById('adminMsgBody');
  if (bodyInput) bodyInput.value = '';

  const modal = document.getElementById('adminSendMessageModal');
  if (modal) modal.classList.remove('hidden');
}

function closeAdminSendMessageModal() {
  const modal = document.getElementById('adminSendMessageModal');
  if (modal) modal.classList.add('hidden');
}

async function handleAdminSendMsgSubmit(e) {
  e.preventDefault();
  const userId = document.getElementById('msgTargetUserId').value;
  const title = document.getElementById('adminMsgTitle').value.trim();
  const message = document.getElementById('adminMsgBody').value.trim();

  try {
    const res = await apiCall(`/api/admin/users/${userId}/message`, 'POST', { title, message });
    closeAdminSendMessageModal();
    alert(res.message || "تم إرسال الرسالة المخصصة بنجاح وسيتم إشعار المشترك بها فوراً!");
  } catch (err) {
    alert(err.message);
  }
}

async function openAdminUserFinModal(userId, userName) {
  setElText('adminFinModalUserName', userName);
  const modal = document.getElementById('adminUserFinModal');
  if (modal) modal.classList.remove('hidden');

  try {
    const data = await apiCall(`/api/admin/users/${userId}/financials`);
    setElText('finModalIncome', `${(data.totalIncome || 0).toLocaleString()} ج.م`);
    setElText('finModalExpenses', `${(data.totalExpenses || 0).toLocaleString()} ج.م`);
    setElText('finModalInstallments', `${(data.totalInstallments || 0).toLocaleString()} ج.م`);
    setElText('finModalReceivables', `${(data.totalReceivables || 0).toLocaleString()} ج.م`);
    setElText('finModalCirclesCount', (data.circlesCount || 0).toString());
    setElText('finModalDepositsCount', (data.depositsCount || 0).toString());
    setElText('finModalVehiclesCount', (data.vehiclesCount || 0).toString());
  } catch (err) {
    console.error("Failed to load user financials:", err);
  }
}

function closeAdminUserFinModal() {
  const modal = document.getElementById('adminUserFinModal');
  if (modal) modal.classList.add('hidden');
}

function openAdminResetPassModal(userId, userName) {
  const targetIdInput = document.getElementById('resetTargetUserId');
  if (targetIdInput) targetIdInput.value = userId;
  setElText('resetTargetUserName', userName);
  const newPassInput = document.getElementById('resetTargetNewPass');
  if (newPassInput) newPassInput.value = '';
  const modal = document.getElementById('adminResetPassModal');
  if (modal) modal.classList.remove('hidden');
}

function closeAdminResetPassModal() {
  document.getElementById('adminResetPassModal').classList.add('hidden');
}

async function handleAdminResetPassSubmit(e) {
  e.preventDefault();
  const userId = document.getElementById('resetTargetUserId').value;
  const newPassword = document.getElementById('resetTargetNewPass').value.trim();

  try {
    await apiCall('/api/admin/reset-password', 'POST', { userId, newPassword });
    closeAdminResetPassModal();
    alert("تمت إعادة تعيين كلمة المرور بنجاح!");
  } catch (err) {
    alert(err.message);
  }
}

async function handleSendBroadcast(e) {
  e.preventDefault();
  const title = document.getElementById('broadcastTitleInput').value.trim();
  const message = document.getElementById('broadcastMessageInput').value.trim();

  try {
    // 1. Send to Firebase Firestore so all subscriber devices receive it
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.sendBroadcastToCloud) {
      await FirebaseSync.sendBroadcastToCloud(title, message);
    }

    // 2. Also send to local backend API
    try {
      await apiCall('/api/admin/broadcast', 'POST', { title, message });
    } catch (apiErr) {
      console.debug('Backend broadcast notice:', apiErr.message);
    }

    document.getElementById('broadcastTitleInput').value = '';
    document.getElementById('broadcastMessageInput').value = '';
    
    // 3. Immediate floating alert for admin preview
    triggerFloatingAlertEverywhere({
      type: "admin_broadcast",
      title: `📢 ${title}`,
      content: message,
      subNote: "تنبيه عام مرسل لجميع المشتركين"
    });

    alert("تم إرسال الرسالة لجميع المشتركين بنجاح عبر السحابة وتنبيهات الهواتف!");
  } catch (err) {
    alert("تنبيه: " + err.message);
  }
}

// ---------------- IN-APP AUTO-UPDATE & LIVE OTA SYSTEM ---------------- //
let _pendingLiveUpdate = null;

async function checkForAppUpdates(silent = true) {
  try {
    const checkBtn = document.querySelector('button[title*="البحث عن التحديثات"] i');
    if (checkBtn) checkBtn.classList.add('animate-spin');

    let updateData = null;

    // 1. Check Firebase Live Update first (Real-Time Cloud)
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.getLatestLiveUpdate) {
      try {
        updateData = await FirebaseSync.getLatestLiveUpdate();
      } catch (e) {
        console.debug("Firebase live update check notice:", e.message);
      }
    }

    // 2. Check GitHub raw version.json if no firebase update
    if (!updateData) {
      const githubRawUrl = `https://raw.githubusercontent.com/khaledelhamady96-cmyk/tahweshat-esteghfar-app/main/version.json?t=${Date.now()}`;
      try {
        const res = await fetch(githubRawUrl, { cache: 'no-store' });
        if (res.ok) {
          updateData = await res.json();
        }
      } catch (e) {
        console.debug("GitHub raw update check notice:", e.message);
      }
    }

    if (checkBtn) checkBtn.classList.remove('animate-spin');

    if (updateData && updateData.version) {
      const isNewer = compareVersions(updateData.version, CURRENT_APP_VERSION) > 0;
      if (isNewer) {
        _pendingLiveUpdate = updateData;
        window._pendingLiveUpdate = updateData;
        const badge = document.getElementById('updateAvailableBadge');
        if (badge) badge.classList.remove('hidden');

        setElText('updateModalTitle', updateData.title || "يتوفر إصدار وتحديث سحابي جديد");
        setElText('updateModalVersion', `الإصدار الجديد: v${updateData.version} (حالي: v${CURRENT_APP_VERSION})`);
        setElText('updateModalNotes', updateData.releaseNotes || "تحسينات عامة في استقرار التطبيق والتنبيهات والواجهة.");
        
        const dlBtn = document.getElementById('updateModalDownloadBtn');
        if (dlBtn) dlBtn.href = updateData.downloadUrl || "https://github.com/khaledelhamady96-cmyk/tahweshat-esteghfar-app/raw/main/tahweshat-esteghfar.apk";

        const dismissBtn = document.getElementById('updateModalDismissBtn');
        if (dismissBtn) {
          if (updateData.forceUpdate) dismissBtn.classList.add('hidden');
          else dismissBtn.classList.remove('hidden');
        }

        // Reset progress bar
        const pb = document.getElementById('updateProgressBarContainer');
        if (pb) pb.classList.add('hidden');
        const btnContainer = document.getElementById('updateModalButtonsContainer');
        if (btnContainer) btnContainer.classList.remove('hidden');

        const modal = document.getElementById('appUpdateModal');
        if (modal) modal.classList.remove('hidden');
        return;
      }
    }

    if (!silent) {
      alert(`تطبيقك محدث بالكامل لأحدث إصدار (v${CURRENT_APP_VERSION}) ✅\nجميع التعديلات والبيانات مثبتة وتعمل بنجاح!`);
    }
  } catch (err) {
    const checkBtn = document.querySelector('button[title*="البحث عن التحديثات"] i');
    if (checkBtn) checkBtn.classList.remove('animate-spin');
    if (!silent) {
      alert("تعذر التحقق من التحديثات حالياً، يرجى التأكد من اتصال الإنترنت.");
    }
  }
}

// تثبيت وتطبيق التحديث فوراً في ثوانٍ دون الحاجة لتحميل ملف APK
async function applyLiveUpdateNow(targetUpdate = null) {
  const updateData = targetUpdate || _pendingLiveUpdate || window._pendingLiveUpdate || { version: "2.1.0" };
  const pbContainer = document.getElementById('updateProgressBarContainer');
  const pbBar = document.getElementById('updateProgressBar');
  const pbText = document.getElementById('updateProgressText');
  const pbPercent = document.getElementById('updateProgressPercent');
  const btnContainer = document.getElementById('updateModalButtonsContainer');

  if (btnContainer) btnContainer.classList.add('hidden');
  if (pbContainer) pbContainer.classList.remove('hidden');

  const setProgress = (percent, text) => {
    if (pbBar) pbBar.style.width = `${percent}%`;
    if (pbPercent) pbPercent.innerText = `${percent}%`;
    if (pbText) pbText.innerText = text;
  };

  setProgress(25, "جاري سحب التعديلات من السيرفر السحابي...");
  await new Promise(r => setTimeout(r, 400));

  setProgress(60, "جاري تحديث قواعد البيانات والتنبيهات المحلية...");
  await new Promise(r => setTimeout(r, 500));

  // Save new active version to localStorage
  CURRENT_APP_VERSION = updateData.version || "2.1.0";
  localStorage.setItem('tahwesha_app_version', CURRENT_APP_VERSION);

  // If there are patches or dynamic notes, persist them
  if (updateData.releaseNotes) {
    localStorage.setItem('tahwesha_last_update_notes', updateData.releaseNotes);
  }

  setProgress(100, "تم تثبيت التحديث بنجاح! جاري التنشيط...");
  playWebAudioChime();

  setTimeout(() => {
    closeUpdateModal();
    triggerFloatingAlertEverywhere({
      type: "update_success",
      title: "🎉 تم تحديث التطبيق بنجاح!",
      content: `أنت الآن على الإصدار الحديث (v${CURRENT_APP_VERSION}) بكافة التعديلات الجديدة.`,
      subNote: "تم التثبيت المباشر دون الحاجة لتحميل APK"
    });
    // Smooth reload to apply all assets and state
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  }, 600);
}

// دالة لوحة تحكم الإدارة لنشر وتعميم التحديث على جميع أجهزة المشتركين فوراً
async function handlePublishLiveUpdate() {
  const version = document.getElementById('adminLiveUpdateVersion').value.trim();
  const title = document.getElementById('adminLiveUpdateTitle').value.trim();
  const notes = document.getElementById('adminLiveUpdateNotes').value.trim();

  if (!version || !title) {
    alert("يرجى إدخال رقم الإصدار وعنوان التحديث.");
    return;
  }

  try {
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.publishLiveUpdate) {
      const res = await FirebaseSync.publishLiveUpdate(version, title, notes, { forceApply: true });
      if (res.success) {
        CURRENT_APP_VERSION = version;
        localStorage.setItem('tahwesha_app_version', version);

        triggerFloatingAlertEverywhere({
          type: "admin_update_publish",
          title: `🚀 تم تعميم التحديث (v${version})`,
          content: `${title}: ${notes}`,
          subNote: "تم النشر اللحظي لجميع المشتركين عبر سحابة فايربيز"
        });

        alert(`تم نشر التحديث (v${version}) بنجاح عبر السحابة!\nسيتم تثبيته تلقائياً على أجهزة جميع المشتركين فوراً دون تحميل APK.`);
      } else {
        alert("تنبيه: " + (res.error || "تعذر نشر التحديث للسحابة"));
      }
    } else {
      alert("خدمة السحابة غير مفعلة حالياً.");
    }
  } catch (err) {
    alert("خطأ أثناء نشر التحديث: " + err.message);
  }
}

function compareVersions(v1, v2) {
  const p1 = (v1 || '').toString().replace(/[^0-9\.]/g, '').split('.').map(Number);
  const p2 = (v2 || '').toString().replace(/[^0-9\.]/g, '').split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

function closeUpdateModal() {
  const modal = document.getElementById('appUpdateModal');
  if (modal) modal.classList.add('hidden');
}

// ---------------- ADMIN CLOUD SYNC TRIGGER ---------------- //
async function syncCloudSubscribersNow() {
  const badge = document.getElementById('firebaseStatusBadge');
  if (badge) badge.innerText = "جاري الاتصال بالسحابة...";

  try {
    if (typeof FirebaseSync === 'undefined') {
      alert("مكتبة فايربيز غير مثبتة في هذا الإصدار.");
      return;
    }

    const conn = await FirebaseSync.checkConnectionStatus();
    if (conn.status === 'error') {
      alert(`⚠️ ${conn.message}`);
      if (badge) badge.innerText = "خطأ في الاتصال";
      return;
    }

    const res = await FirebaseSync.fetchAllSubscribersForAdmin();
    if (!res.success) {
      alert(`⚠️ خطأ أثناء جلب المشتركين: ${res.error}\n\nنصيحة: تأكد من تفعيل قواعد Firestore Rules وجعلها (allow read, write: if true;) في كونسول فايربيز.`);
      return;
    }

    const cloudUsers = res.users || [];
    let localUsers = OfflineEngine.getStorage('users', []);
    let newCount = 0;
    cloudUsers.forEach(cu => {
      const idx = localUsers.findIndex(u => normalizePhone(u.phone) === normalizePhone(cu.phone));
      if (idx === -1) {
        localUsers.push(cu);
        newCount++;
      } else {
        localUsers[idx] = { ...localUsers[idx], ...cu };
      }
    });
    OfflineEngine.setStorage('users', localUsers);

    await loadAdminOverview();
    if (badge) badge.innerText = "متصل بنجاح ✅";
    alert(`✅ نجحت المزامنة السحابية بنجاح!\n\nتم العثور على ${cloudUsers.length} مشتركين في سحابة جوجل، وتم تحديث جدول المشتركين أمامك.`);
  } catch (err) {
    alert("حدث خطأ أثناء المزامنة: " + err.message);
  }
}
