export const CONFIG = {
  appName: 'RePrograma',

  firebase: {
  apiKey: "AIzaSyDDxWydnClaLI4-pJIJjQuzcbAlA3wctmM",
  authDomain: "reprograma-app.firebaseapp.com",
  projectId: "reprograma-app",
  storageBucket: "reprograma-app.firebasestorage.app",
  messagingSenderId: "1048533945745",
  appId: "1:1048533945745:web:f86dc021c7fae419ab1e30"
  },

  sdkVersion: '10.14.1',
  enableGoogleLogin: true
};

export function isConfigured() {
  const k = CONFIG.firebase.apiKey || '';
  return k !== '' && !k.startsWith('PEGA');
}
