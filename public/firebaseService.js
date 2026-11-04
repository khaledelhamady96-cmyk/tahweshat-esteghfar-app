/**
 * Tahweshat Esteghfar - Google Firebase Cloud Firestore Sync Engine
 * بركة الرزق ونور الاستغفار - الربط السحابي مع خوادم جوجل الرسمية
 */

const firebaseConfig = {
  apiKey: "AIzaSyAp6f9ghhXhWDyIIJYoPH7fHKGRG8xMaPg",
  authDomain: "tahweshat-esteghfar.firebaseapp.com",
  projectId: "tahweshat-esteghfar",
  storageBucket: "tahweshat-esteghfar.firebasestorage.app",
  messagingSenderId: "336742288898",
  appId: "1:336742288898:web:31447e4e8b4be2e4eaa11b",
  measurementId: "G-RND3800P1B"
};

let firebaseDb = null;
let isFirebaseConnected = false;
let lastCloudError = null;

const FirebaseSync = {
  init() {
    if (typeof firebase !== 'undefined') {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        firebaseDb = firebase.firestore();

        // Enable offline persistence so Firestore caches all data on the phone
        firebaseDb.enablePersistence({ synchronizeTabs: true }).catch(err => {
          console.warn("[Firebase] Persistence notification:", err.message);
        });

        isFirebaseConnected = true;
        console.log("[Firebase] Connected to Google Cloud Project: tahweshat-esteghfar");

        // Sync master admin record into Firestore
        this.ensureMasterAdminInCloud();
      } catch (err) {
        lastCloudError = err.message;
        console.warn("[Firebase] Could not initialize Firebase Cloud:", err);
      }
    } else {
      console.warn("[Firebase] SDK not loaded, operating in full local mode.");
    }
  },

  async checkConnectionStatus() {
    if (!firebaseDb) {
      return { status: 'disconnected', message: 'مكتبة فايربيز غير مهيأة بعد' };
    }
    try {
      await firebaseDb.collection('_health_check').doc('ping').set({
        ping: Date.now(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      lastCloudError = null;
      return { status: 'connected', message: 'متصل بنجاح مع سحابة جوجل فايربيز ✅' };
    } catch (e) {
      lastCloudError = e.message;
      let hint = "";
      if (e.message && e.message.includes('permission-denied')) {
        hint = " (يرجى فتح قواعد Firestore Rules وتغييرها إلى allow read, write: if true; في كونسول فايربيز)";
      } else if (e.message && e.message.includes('NOT_FOUND')) {
        hint = " (يرجى الضغط على Create Database في قسم Firestore Database في كونسول فايربيز)";
      }
      return { status: 'error', message: `تعذر الاتصال بسحابة جوجل: ${e.message}${hint}` };
    }
  },

  async ensureMasterAdminInCloud() {
    if (!firebaseDb) return;
    try {
      const adminRef = firebaseDb.collection('users').doc('01099099127');
      const doc = await adminRef.get();
      if (!doc.exists) {
        await adminRef.set({
          id: "admin_master",
          name: "مدير النظام الرئيسي",
          phone: "01099099127",
          email: "admin@tahwesha.app",
          role: "admin",
          isVerified: true,
          verificationCode: "141996",
          deceasedName: "جميع موتى المسلمين",
          createdAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (e) {
      console.debug("[Firebase] Master admin cloud sync notice:", e.message);
    }
  },

  async syncUserToCloud(user) {
    if (!firebaseDb || !user || !user.phone) return;
    try {
      const cleanPhone = user.phone.replace(/[\s\-\(\)\.]/g, '');
      const userRef = firebaseDb.collection('users').doc(cleanPhone);
      await userRef.set({
        ...user,
        phone: cleanPhone,
        lastActive: new Date().toISOString()
      }, { merge: true });
      console.log(`[Firebase] User ${cleanPhone} synced to cloud.`);
    } catch (e) {
      lastCloudError = e.message;
      console.warn("[Firebase] Sync user error:", e.message);
    }
  },

  async fetchUserFromCloud(phone) {
    if (!firebaseDb || !phone) return null;
    try {
      const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
      const doc = await firebaseDb.collection('users').doc(cleanPhone).get();
      if (doc.exists) {
        return doc.data();
      }
    } catch (e) {
      console.warn("[Firebase] Fetch user error:", e.message);
    }
    return null;
  },

  async fetchAllSubscribersForAdmin() {
    if (!firebaseDb) {
      return { success: false, error: "مكتبة فايربيز غير مهيأة", users: [] };
    }
    try {
      const snapshot = await firebaseDb.collection('users').get();
      const list = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data && data.phone) list.push(data);
      });
      return { success: true, users: list };
    } catch (e) {
      lastCloudError = e.message;
      console.warn("[Firebase] Fetch subscribers error:", e.message);
      return { success: false, error: e.message, users: [] };
    }
  },

  async syncFinancialsToCloud(phone, financials) {
    if (!firebaseDb || !phone) return;
    try {
      const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
      const finRef = firebaseDb.collection('financials').doc(cleanPhone);
      await finRef.set({
        phone: cleanPhone,
        monthlyIncome: financials.monthlyIncome || 0,
        dailyExpenses: financials.dailyExpenses || [],
        moneyCircles: financials.moneyCircles || [],
        deposits: financials.deposits || [],
        installments: financials.installments || [],
        receivables: financials.receivables || [],
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`[Firebase] Financials for ${cleanPhone} synced to cloud.`);
    } catch (e) {
      console.warn("[Firebase] Sync financials error:", e.message);
    }
  },

  async fetchFinancialsFromCloud(phone) {
    if (!firebaseDb || !phone) return null;
    try {
      const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
      const doc = await firebaseDb.collection('financials').doc(cleanPhone).get();
      if (doc.exists) {
        return doc.data();
      }
    } catch (e) {
      console.warn("[Firebase] Fetch financials error:", e.message);
    }
    return null;
  },

  async sendPersonalMessageInCloud(phone, messageObj) {
    if (!firebaseDb || !phone) return;
    try {
      const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
      const userRef = firebaseDb.collection('users').doc(cleanPhone);
      const doc = await userRef.get();
      if (doc.exists) {
        const u = doc.data();
        const pmsgs = Array.isArray(u.personalMessages) ? u.personalMessages : [];
        pmsgs.unshift(messageObj);
        await userRef.update({ personalMessages: pmsgs });
        console.log(`[Firebase] Personal message sent to ${cleanPhone}`);
      }
    } catch (e) {
      console.warn("[Firebase] Send personal message error:", e.message);
    }
  },

  async toggleVerificationInCloud(phone, isVerified) {
    if (!firebaseDb || !phone) return;
    try {
      const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
      await firebaseDb.collection('users').doc(cleanPhone).update({ isVerified });
    } catch (e) {
      console.warn("[Firebase] Toggle verify error:", e.message);
    }
  },

  async deleteUserInCloud(phone) {
    if (!firebaseDb || !phone) return;
    try {
      const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
      await firebaseDb.collection('users').doc(cleanPhone).delete();
      await firebaseDb.collection('financials').doc(cleanPhone).delete();
    } catch (e) {
      console.warn("[Firebase] Delete user error:", e.message);
    }
  },

  async getAppUpdateConfig() {
    if (!firebaseDb) return null;
    try {
      const doc = await firebaseDb.collection('app_config').doc('version').get();
      if (doc.exists) {
        return doc.data();
      }
    } catch (e) {
      console.debug("Firebase version check notice:", e.message);
    }
    return null;
  },

  async sendBroadcastToCloud(title, message) {
    if (!firebaseDb) return { success: false, error: "Firebase not initialized" };
    try {
      const bcId = "bc_" + Date.now();
      await firebaseDb.collection('broadcasts').doc(bcId).set({
        id: bcId,
        title: title,
        message: message,
        createdAt: new Date().toISOString()
      });
      console.log(`[Firebase] Broadcast ${bcId} sent to cloud.`);
      return { success: true, id: bcId };
    } catch (e) {
      console.warn("[Firebase] Send broadcast error:", e.message);
      return { success: false, error: e.message };
    }
  },

  listenForBroadcasts(callback) {
    if (!firebaseDb) return;
    try {
      firebaseDb.collection('broadcasts')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .onSnapshot(snapshot => {
          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = doc.data();
            const lastSeen = localStorage.getItem('tahwesha_last_seen_broadcast');
            if (data && data.id && data.id !== lastSeen) {
              const createdTime = new Date(data.createdAt).getTime();
              // Trigger if broadcast was sent in the last 24 hours
              if (Date.now() - createdTime < 24 * 60 * 60 * 1000) {
                localStorage.setItem('tahwesha_last_seen_broadcast', data.id);
                if (typeof callback === 'function') {
                  callback(data);
                }
              }
            }
          }
        }, err => {
          console.debug("[Firebase] Broadcast listener notice:", err.message);
        });
    } catch (e) {
      console.debug("[Firebase] Broadcast listen setup notice:", e.message);
    }
  }
};

// Initialize on script load
try {
  FirebaseSync.init();
} catch (e) {
  console.warn("Firebase auto-init notice:", e);
}
