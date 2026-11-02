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
        console.warn("[Firebase] Could not initialize Firebase Cloud:", err);
      }
    } else {
      console.warn("[Firebase] SDK not loaded, operating in full local mode.");
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
      // Offline or permissions notice
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
    if (!firebaseDb) return [];
    try {
      const snapshot = await firebaseDb.collection('users').get();
      const list = [];
      snapshot.forEach(doc => {
        list.push(doc.data());
      });
      return list;
    } catch (e) {
      console.warn("[Firebase] Fetch subscribers error:", e.message);
      return [];
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
  }
};

// Initialize on script load
try {
  FirebaseSync.init();
} catch (e) {
  console.warn("Firebase auto-init notice:", e);
}
