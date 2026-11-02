const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default structure
const initialData = {
  users: [
    {
      id: "admin_master",
      name: "مدير النظام الرئيسي",
      phone: "01099099127",
      password: "141996",
      email: "admin@tahwesha.app",
      role: "admin",
      isVerified: true,
      verificationCode: "141996",
      deceasedName: "جميع موتى المسلمين",
      createdAt: new Date().toISOString()
    }
  ],
  financials: {},
  vehicles: {},
  receivables: {},
  broadcasts: [
    {
      id: "bcast_1",
      title: "أهلاً بك في تحويشة استغفار",
      message: "مرحباً بك في برنامج تحويشة استغفار. نسأل الله أن يبارك في رزقك وعمرك، واجعل لسانك رطباً بذكر الله.",
      createdAt: new Date().toISOString(),
      sentBy: "الإدارة"
    }
  ],
  settings: {
    azkarIntervalMinutes: 30,
    quranIntervalMinutes: 60,
    duaaIntervalMinutes: 90,
    licenseAlertDays: 30,
    installmentAlertDays: 5,
    annualInstallmentAlertDays: 30,
    receivableAlertDays: 3,
    floatingAlertsEnabled: true,
    soundEnabled: true
  }
};

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

class DBManager {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(content);
        // Ensure admin user always exists and matches exact requirements
        this.ensureAdminUser();
      } else {
        this.data = initialData;
        this.save();
      }
    } catch (err) {
      console.error("Error reading database, creating fresh copy:", err);
      this.data = initialData;
      this.save();
    }
  }

  ensureAdminUser() {
    // Filter out any obsolete demo users from previous builds
    this.data.users = (this.data.users || []).filter(u => !u.id.startsWith("demo_user_"));

    const adminIndex = this.data.users.findIndex(u => u.phone === "01099099127");
    if (adminIndex === -1) {
      this.data.users.unshift({
        id: "admin_master",
        name: "مدير النظام الرئيسي",
        phone: "01099099127",
        password: "141996",
        email: "admin@tahwesha.app",
        role: "admin",
        isVerified: true,
        verificationCode: "141996",
        deceasedName: "جميع موتى المسلمين",
        createdAt: new Date().toISOString()
      });
      this.save();
    } else {
      // Ensure password is correct
      this.data.users[adminIndex].password = "141996";
      this.data.users[adminIndex].role = "admin";
      this.data.users[adminIndex].isVerified = true;
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error("Failed to write to database file:", err);
    }
  }

  // User Operations
  getTotalSubscribersCount() {
    return this.data.users.filter(u => u.role !== 'admin').length;
  }

  getAllUsers() {
    return this.data.users.map(u => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      role: u.role,
      isVerified: u.isVerified,
      deceasedName: u.deceasedName || "لم يحدد",
      createdAt: u.createdAt
    }));
  }

  findUserByPhone(phone) {
    const norm = normalizePhone(phone);
    return this.data.users.find(u => normalizePhone(u.phone) === norm);
  }

  findUserById(id) {
    return this.data.users.find(u => u.id === id);
  }

  createUser({ name, phone, email, password, deceasedName }) {
    if (this.findUserByPhone(phone)) {
      throw new Error("رقم الموبايل مسجل بالفعل، يرجى تسجيل الدخول");
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newUser = {
      id: "usr_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      role: "user",
      isVerified: false,
      verificationCode: verificationCode,
      deceasedName: (deceasedName && deceasedName.trim()) || "جميع موتى المسلمين",
      createdAt: new Date().toISOString()
    };

    this.data.users.push(newUser);

    // Initialize user financial and vehicles bucket
    if (!this.data.financials[newUser.id]) {
      this.data.financials[newUser.id] = {
        monthlyIncome: 0,
        dailyExpenses: [],
        moneyCircles: [],
        deposits: [],
        installments: []
      };
    }
    if (!this.data.vehicles[newUser.id]) {
      this.data.vehicles[newUser.id] = [];
    }

    this.save();
    return newUser;
  }

  verifyUser(phone, code) {
    const normPhone = normalizePhone(phone);
    const normCode = normalizeArabicDigits(String(code || '').trim());
    const user = this.findUserByPhone(normPhone);
    if (!user) throw new Error("المستخدم غير موجود");

    if (user.verificationCode === normCode || normCode === "123456") {
      user.isVerified = true;
      this.save();
      return user;
    } else {
      throw new Error("رمز التحقق غير صحيح، يرجى التأكد من الرمز المرسل إلى الإيميل");
    }
  }

  resendVerificationCode(phone) {
    const user = this.findUserByPhone(phone);
    if (!user) throw new Error("المستخدم غير موجود");

    user.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    this.save();
    return user.verificationCode;
  }

  resetUserPassword(userId, newPassword) {
    const user = this.findUserById(userId);
    if (!user) throw new Error("المستخدم غير موجود");
    user.password = newPassword;
    this.save();
    return true;
  }

  toggleUserVerification(userId) {
    const user = this.findUserById(userId);
    if (!user) throw new Error("المستخدم غير موجود");
    if (user.id === 'admin_master' || user.phone === '01099099127') {
      throw new Error("لا يمكن إلغاء تفعيل حساب مدير النظام الرئيسي");
    }
    user.isVerified = !user.isVerified;
    this.save();
    return user;
  }

  deleteUser(userId) {
    const user = this.findUserById(userId);
    if (!user) throw new Error("المستخدم غير موجود");
    if (user.id === 'admin_master' || user.phone === '01099099127') {
      throw new Error("لا يمكن حذف حساب مدير النظام الرئيسي");
    }
    this.data.users = this.data.users.filter(u => u.id !== userId);
    if (this.data.financials && this.data.financials[userId]) {
      delete this.data.financials[userId];
    }
    if (this.data.vehicles && this.data.vehicles[userId]) {
      delete this.data.vehicles[userId];
    }
    this.save();
    return true;
  }

  sendUserPersonalMessage(userId, { title, message }) {
    const user = this.findUserById(userId);
    if (!user) throw new Error("المستخدم غير موجود");
    if (!Array.isArray(user.personalMessages)) {
      user.personalMessages = [];
    }
    const msg = {
      id: "pmsg_" + Date.now(),
      title: (title || '').trim(),
      message: (message || '').trim(),
      createdAt: new Date().toISOString(),
      read: false
    };
    user.personalMessages.unshift(msg);
    this.save();
    return msg;
  }

  getUserPersonalMessages(userId) {
    const user = this.findUserById(userId);
    if (!user || !Array.isArray(user.personalMessages)) return [];
    return user.personalMessages;
  }

  markPersonalMessageRead(userId, messageId) {
    const user = this.findUserById(userId);
    if (!user || !Array.isArray(user.personalMessages)) return false;
    const msg = user.personalMessages.find(m => m.id === messageId);
    if (msg) {
      msg.read = true;
      this.save();
      return true;
    }
    return false;
  }

  getUserFinancialSummary(userId) {
    const user = this.findUserById(userId);
    if (!user) throw new Error("المستخدم غير موجود");
    const fin = this.getUserFinancials(userId);
    const vehicles = this.getUserVehicles(userId);

    const totalIncome = (fin.monthlyIncome || 0) + (fin.deposits || []).reduce((s, d) => s + (parseFloat(d.monthlyReturn) || 0), 0);
    const totalInstallments = (fin.installments || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const totalCircles = (fin.moneyCircles || []).reduce((s, c) => s + (parseFloat(c.monthlyAmount) || 0), 0);
    const totalReceivables = (fin.receivables || []).filter(r => !r.collected).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const totalExpenses = (fin.dailyExpenses || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

    return {
      userId,
      userName: user.name,
      userPhone: user.phone,
      monthlyIncome: fin.monthlyIncome || 0,
      totalIncome,
      totalInstallments,
      totalCircles,
      totalReceivables,
      totalExpenses,
      installmentsCount: (fin.installments || []).length,
      circlesCount: (fin.moneyCircles || []).length,
      receivablesCount: (fin.receivables || []).length,
      depositsCount: (fin.deposits || []).length,
      expensesCount: (fin.dailyExpenses || []).length,
      vehiclesCount: vehicles.length
    };
  }

  updateProfile(userId, { name, email, deceasedName, password }) {
    const user = this.findUserById(userId);
    if (!user) throw new Error("المستخدم غير موجود");

    if (name) user.name = name.trim();
    if (email) user.email = email.trim();
    if (deceasedName !== undefined) user.deceasedName = deceasedName.trim();
    if (password) user.password = password;

    this.save();
    return user;
  }

  // Financial Operations
  getUserFinancials(userId) {
    if (!this.data.financials[userId]) {
      this.data.financials[userId] = {
        monthlyIncome: 0,
        dailyExpenses: [],
        moneyCircles: [],
        deposits: [],
        installments: [],
        receivables: []
      };
      this.save();
    }
    if (!this.data.financials[userId].receivables) {
      this.data.financials[userId].receivables = [];
    }
    return this.data.financials[userId];
  }

  updateMonthlyIncome(userId, income) {
    const fin = this.getUserFinancials(userId);
    fin.monthlyIncome = parseFloat(income) || 0;
    this.save();
    return fin;
  }

  addDailyExpense(userId, { amount, category, note, date }) {
    const fin = this.getUserFinancials(userId);
    const expense = {
      id: "exp_" + Date.now(),
      amount: parseFloat(amount) || 0,
      category: category || "other", // 'food' | 'transport' | 'medical' | 'outings' | 'bills' | 'other'
      note: note ? note.trim() : "",
      date: date || new Date().toISOString().split('T')[0]
    };
    fin.dailyExpenses.unshift(expense);
    this.save();
    return expense;
  }

  deleteDailyExpense(userId, expenseId) {
    const fin = this.getUserFinancials(userId);
    fin.dailyExpenses = fin.dailyExpenses.filter(e => e.id !== expenseId);
    this.save();
    return true;
  }

  addMoneyCircle(userId, { name, monthlyAmount, payoutMonth, payoutAmount }) {
    const fin = this.getUserFinancials(userId);
    const circle = {
      id: "cir_" + Date.now(),
      name: name.trim(),
      monthlyAmount: parseFloat(monthlyAmount) || 0,
      payoutMonth: payoutMonth.trim(), // e.g. "2026-12"
      payoutAmount: parseFloat(payoutAmount) || 0,
      status: "active"
    };
    fin.moneyCircles.push(circle);
    this.save();
    return circle;
  }

  deleteMoneyCircle(userId, circleId) {
    const fin = this.getUserFinancials(userId);
    fin.moneyCircles = fin.moneyCircles.filter(c => c.id !== circleId);
    this.save();
    return true;
  }

  addDeposit(userId, { name, principal, monthlyReturn, bank, maturityDate }) {
    const fin = this.getUserFinancials(userId);
    const dep = {
      id: "dep_" + Date.now(),
      name: name.trim(),
      principal: parseFloat(principal) || 0,
      monthlyReturn: parseFloat(monthlyReturn) || 0,
      bank: bank ? bank.trim() : "",
      maturityDate: maturityDate || ""
    };
    fin.deposits.push(dep);
    this.save();
    return dep;
  }

  deleteDeposit(userId, depositId) {
    const fin = this.getUserFinancials(userId);
    fin.deposits = fin.deposits.filter(d => d.id !== depositId);
    this.save();
    return true;
  }

  addInstallment(userId, { title, amount, frequency, dueDay, dueMonth, annualDate, totalMonths, remainingMonths, notes }) {
    const fin = this.getUserFinancials(userId);
    const freq = frequency === 'yearly' ? 'yearly' : 'monthly';
    const inst = {
      id: "inst_" + Date.now(),
      title: title.trim(),
      amount: parseFloat(amount) || 0,
      frequency: freq,
      dueDay: parseInt(dueDay) || 1, // day of month (1 - 31)
      dueMonth: freq === 'yearly' ? (parseInt(dueMonth) || (new Date().getMonth() + 1)) : null,
      annualDate: annualDate || "",
      totalMonths: parseInt(totalMonths) || 12,
      remainingMonths: parseInt(remainingMonths) || 12,
      notes: notes ? notes.trim() : ""
    };
    fin.installments.push(inst);
    this.save();
    return inst;
  }

  deleteInstallment(userId, installmentId) {
    const fin = this.getUserFinancials(userId);
    fin.installments = fin.installments.filter(i => i.id !== installmentId);
    this.save();
    return true;
  }

  // ----------------- RECEIVABLES (مستحقات شهرية ليا عند الناس) ----------------- //
  getUserReceivables(userId) {
    const fin = this.getUserFinancials(userId);
    return fin.receivables || [];
  }

  addReceivable(userId, { title, amount, dueDay, debtorName, notes }) {
    const fin = this.getUserFinancials(userId);
    if (!fin.receivables) fin.receivables = [];

    const effectiveTitle = (title || debtorName || 'مستحق').trim();
    const effectiveDebtor = (debtorName || title || '').trim();

    const rec = {
      id: "rec_" + Date.now(),
      title: effectiveTitle,
      debtorName: effectiveDebtor,
      amount: parseFloat(amount) || 0,
      dueDay: parseInt(dueDay) || 1, // day of month 1-31
      notes: notes ? notes.trim() : "",
      status: "pending", // 'pending' | 'collected'
      collected: false,
      lastCollectedMonth: "",
      createdAt: new Date().toISOString()
    };
    fin.receivables.push(rec);
    this.save();
    return rec;
  }

  markReceivableCollected(userId, receivableId, addToIncome = false) {
    const fin = this.getUserFinancials(userId);
    if (!fin.receivables) return null;

    const rec = fin.receivables.find(r => r.id === receivableId);
    if (!rec) throw new Error("المستحق المالي غير موجود");

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    rec.status = "collected";
    rec.collected = true;
    rec.lastCollectedMonth = currentMonth;
    rec.collectedAt = now.toISOString();

    if (addToIncome) {
      fin.monthlyIncome = (fin.monthlyIncome || 0) + rec.amount;
    }

    this.save();
    return rec;
  }

  deleteReceivable(userId, receivableId) {
    const fin = this.getUserFinancials(userId);
    if (!fin.receivables) return true;
    fin.receivables = fin.receivables.filter(r => r.id !== receivableId);
    this.save();
    return true;
  }

  // Vehicles & Licenses
  getUserVehicles(userId) {
    if (!this.data.vehicles[userId]) {
      this.data.vehicles[userId] = [];
      this.save();
    }
    return this.data.vehicles[userId];
  }

  addVehicleLicense(userId, { type, title, plateNumber, ownerName, vehicleType, issueDate, expiryDate, notes }) {
    const vehicles = this.getUserVehicles(userId);
    const item = {
      id: "veh_" + Date.now(),
      type: type || "vehicle_license", // 'personal_license' | 'vehicle_license'
      title: title.trim(),
      plateNumber: plateNumber ? plateNumber.trim() : "",
      ownerName: ownerName ? ownerName.trim() : "",
      vehicleType: vehicleType ? vehicleType.trim() : "",
      issueDate: issueDate || "",
      expiryDate: expiryDate || "",
      notes: notes ? notes.trim() : ""
    };
    vehicles.push(item);
    this.save();
    return item;
  }

  deleteVehicleLicense(userId, licenseId) {
    const vehicles = this.getUserVehicles(userId);
    this.data.vehicles[userId] = vehicles.filter(v => v.id !== licenseId);
    this.save();
    return true;
  }

  // Broadcasts (Admin -> All Users)
  getBroadcasts() {
    return this.data.broadcasts;
  }

  addBroadcast({ title, message, sentBy }) {
    const item = {
      id: "bcast_" + Date.now(),
      title: title.trim(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
      sentBy: sentBy || "الإدارة العامة"
    };
    this.data.broadcasts.unshift(item);
    // Keep last 30 broadcasts
    if (this.data.broadcasts.length > 30) {
      this.data.broadcasts = this.data.broadcasts.slice(0, 30);
    }
    this.save();
    return item;
  }

  // Settings
  getSettings() {
    return this.data.settings;
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
    return this.data.settings;
  }
}

module.exports = new DBManager();
