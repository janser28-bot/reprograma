// =====================================================================
//  RePrograma · capa de datos
//  Dos implementaciones con la MISMA interfaz:
//    · createLocalStore  → modo demo (localStorage, sin cuentas)
//    · createCloudStore  → Firebase Auth + Cloud Firestore
//
//  Estructura en Firestore (todo cuelga del usuario):
//    users/{uid}                 perfil: nombre, modo, semana, declaración, plan de 21 días…
//    users/{uid}/days/{AAAA-MM-DD}   estado, coherencia, ¡Cambia!, sesiones del día
//    users/{uid}/entries/{id}    entradas de la bitácora
//    users/{uid}/links/{id}      enlaces de meditaciones y audios del usuario
// =====================================================================

import { CONFIG, isConfigured } from './config.js';

const LS_DATA = 'reprograma.demo.v1';
const LS_ON = 'reprograma.demo.on';

const plain = (o) => JSON.parse(JSON.stringify(o)); // quita undefined y copia

// ---------------------------------------------------------------------
//  Modo demo
// ---------------------------------------------------------------------
export function createLocalStore(storage = globalThis.localStorage) {
  const listeners = [];
  const demoUser = { uid: 'demo', email: '', name: '' };
  const empty = () => ({ profile: null, days: {}, entries: [], links: [] });
  const read = () => {
    try {
      const raw = storage.getItem(LS_DATA);
      if (raw) return Object.assign(empty(), JSON.parse(raw));
    } catch (e) { /* datos dañados: se empieza de cero */ }
    return empty();
  };
  let db = read();
  const write = () => { storage.setItem(LS_DATA, JSON.stringify(db)); return Promise.resolve(); };
  const reject = () => Promise.reject(Object.assign(new Error('demo'), { code: 'demo/no-auth' }));

  return {
    kind: 'demo',
    onAuth(cb) {
      listeners.push(cb);
      cb(storage.getItem(LS_ON) === '1' ? demoUser : null);
    },
    signInDemo() {
      storage.setItem(LS_ON, '1');
      listeners.forEach((cb) => cb(demoUser));
      return Promise.resolve();
    },
    signUp: reject, signIn: reject, signInGoogle: reject, resetPassword: reject,
    signOut() {
      storage.removeItem(LS_ON);
      listeners.forEach((cb) => cb(null));
      return Promise.resolve();
    },
    loadAll() { db = read(); return Promise.resolve(plain(db)); },
    saveProfile(p) { db.profile = plain(p); return write(); },
    saveDay(k, d) { db.days[k] = plain(d); return write(); },
    addEntry(e) { db.entries = [plain(e)].concat(db.entries.filter((x) => x.id !== e.id)); return write(); },
    removeEntry(id) { db.entries = db.entries.filter((x) => x.id !== id); return write(); },
    addLink(l) { db.links = db.links.filter((x) => x.id !== l.id).concat([plain(l)]); return write(); },
    removeLink(id) { db.links = db.links.filter((x) => x.id !== id); return write(); },
    deleteAllData() { db = empty(); return write(); },
    deleteAccount() { db = empty(); storage.removeItem(LS_ON); return write().then(() => listeners.forEach((cb) => cb(null))); }
  };
}

// ---------------------------------------------------------------------
//  Firebase
// ---------------------------------------------------------------------
export async function loadSDK(version = CONFIG.sdkVersion) {
  const base = `https://www.gstatic.com/firebasejs/${version}/`;
  const [app, auth, fs] = await Promise.all([
    import(base + 'firebase-app.js'),
    import(base + 'firebase-auth.js'),
    import(base + 'firebase-firestore.js')
  ]);
  return { app, auth, fs };
}

export function createCloudStore(sdk, fbConfig) {
  const { app: A, auth: AU, fs: F } = sdk;
  const app = A.initializeApp(fbConfig);
  const auth = AU.getAuth(app);
  let db;
  try {
    // Caché local persistente: la app abre rápido y guarda sin conexión.
    db = F.initializeFirestore(app, {
      localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() })
    });
  } catch (e) {
    db = F.getFirestore(app);
  }

  let uid = null;
  const userDoc = () => F.doc(db, 'users', uid);
  const col = (name) => F.collection(db, 'users', uid, name);
  const item = (name, id) => F.doc(db, 'users', uid, name, id);

  async function wipeCollection(name) {
    const snap = await F.getDocs(col(name));
    let batch = F.writeBatch(db);
    let n = 0;
    const jobs = [];
    snap.forEach((d) => {
      batch.delete(d.ref || item(name, d.id));
      n++;
      if (n === 400) { jobs.push(batch.commit()); batch = F.writeBatch(db); n = 0; }
    });
    if (n > 0) jobs.push(batch.commit());
    await Promise.all(jobs);
  }

  const store = {
    kind: 'cloud',
    onAuth(cb) {
      return AU.onAuthStateChanged(auth, (u) => {
        uid = u ? u.uid : null;
        cb(u ? { uid: u.uid, email: u.email || '', name: u.displayName || '' } : null);
      });
    },
    async signUp(name, email, pass) {
      const cred = await AU.createUserWithEmailAndPassword(auth, email, pass);
      try { await AU.updateProfile(cred.user, { displayName: name }); } catch (e) { /* no es crítico */ }
      return cred.user;
    },
    signIn(email, pass) { return AU.signInWithEmailAndPassword(auth, email, pass); },
    signInGoogle() { return AU.signInWithPopup(auth, new AU.GoogleAuthProvider()); },
    resetPassword(email) { return AU.sendPasswordResetEmail(auth, email); },
    signOut() { return AU.signOut(auth); },

    async loadAll() {
      const [p, days, entries, links] = await Promise.all([
        F.getDoc(userDoc()),
        F.getDocs(col('days')),
        F.getDocs(F.query(col('entries'), F.orderBy('ts', 'desc'), F.limit(500))),
        F.getDocs(col('links'))
      ]);
      const out = { profile: p.exists() ? p.data() : null, days: {}, entries: [], links: [] };
      days.forEach((d) => { out.days[d.id] = d.data(); });
      entries.forEach((d) => { out.entries.push(Object.assign({}, d.data(), { id: d.id })); });
      links.forEach((d) => { out.links.push(Object.assign({}, d.data(), { id: d.id })); });
      return out;
    },
    saveProfile(p) { return F.setDoc(userDoc(), plain(Object.assign({}, p, { updatedAt: Date.now() })), { merge: true }); },
    saveDay(k, d) { return F.setDoc(item('days', k), plain(d)); },
    addEntry(e) { const { id, ...rest } = e; return F.setDoc(item('entries', id), plain(rest)); },
    removeEntry(id) { return F.deleteDoc(item('entries', id)); },
    addLink(l) { const { id, ...rest } = l; return F.setDoc(item('links', id), plain(rest)); },
    removeLink(id) { return F.deleteDoc(item('links', id)); },

    async deleteAllData() {
      await Promise.all(['days', 'entries', 'links'].map(wipeCollection));
      await F.deleteDoc(userDoc());
    },
    async deleteAccount() {
      await store.deleteAllData();
      await AU.deleteUser(auth.currentUser);
    }
  };
  return store;
}

// ---------------------------------------------------------------------
//  Punto de entrada: nube si Firebase está configurado; si no, demo.
// ---------------------------------------------------------------------
export async function createStore() {
  if (isConfigured()) {
    const sdk = await loadSDK();
    return createCloudStore(sdk, CONFIG.firebase);
  }
  return createLocalStore();
}
