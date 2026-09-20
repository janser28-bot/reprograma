// =====================================================================
//  RePrograma · configuración
// =====================================================================
//  1) En la consola de Firebase: Configuración del proyecto > Tus apps > Web (</>)
//     Copia los valores de "firebaseConfig" y pégalos abajo.
//  2) Mientras "apiKey" siga diciendo PEGA_AQUI, la app funciona en MODO DEMO:
//     todo se guarda solo en el navegador del dispositivo (sin cuentas ni nube).
// =====================================================================

export const CONFIG = {
  appName: 'RePrograma',

  firebase: {
    apiKey: 'PEGA_AQUI',
    authDomain: 'PEGA_AQUI.firebaseapp.com',
    projectId: 'PEGA_AQUI',
    storageBucket: 'PEGA_AQUI.appspot.com',
    messagingSenderId: 'PEGA_AQUI',
    appId: 'PEGA_AQUI'
  },

  // Versión del SDK web de Firebase que se carga desde el CDN de Google.
  // Si algún día falla, pon la versión que muestra la consola de Firebase en el
  // fragmento de instalación (Configuración del proyecto > Tus apps > Web).
  sdkVersion: '10.14.1',

  // Muestra el botón "Continuar con Google" (actívalo antes en Authentication).
  enableGoogleLogin: true
};

export function isConfigured() {
  const k = CONFIG.firebase.apiKey || '';
  return k !== '' && !k.startsWith('PEGA');
}
