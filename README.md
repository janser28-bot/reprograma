# RePrograma — paquete para GitHub Pages + Firebase

App web (móvil y computador, sin instalar nada) con tres modos: **RePrograma**, **Vacío** y **Gratitud**.
Guarda en **Cloud Firestore**, con cuentas de **Firebase Authentication**. Sin servidor propio.

## Qué hay en la carpeta (todo va en la raíz del repositorio)

| Archivo | Para qué sirve |
|---|---|
| `index.html`, `styles.css`, `app.js` | La app (pantallas, temas, lógica) |
| `content.js` | **Todo el texto**: ideas por semana, ejercicios, plan de 21 días, hitos. Edítalo aquí |
| `store.js` | Capa de datos: Firebase (nube) o modo demo (solo el navegador) |
| `config.js` | **Aquí pegas la configuración de tu Firebase** |
| `firestore.rules` | Reglas de seguridad (cada usuario solo ve lo suyo) |
| `firebase.json`, `firestore.indexes.json` | Solo si despliegas las reglas con la CLI (opcional) |
| `manifest.webmanifest`, `icon-*.png`, `apple-touch-icon.png`, `favicon.png` | Para "Agregar a pantalla de inicio" |
| `logo-*-192.png` | Miniaturas que usa la app en el selector de modos |
| `logo-*-1024.png` | Los 3 logos en 1024×1024 (tamaño de icono de App Store) |
| `FICHA-TIENDA.md` | Slogans, descripciones y colores + ajustes recomendados |

> Los archivos son módulos ES: **no funcionan abriendo `index.html` con doble clic** (`file://`).
> Sube al repositorio, o prueba en local con `python3 -m http.server` y abre `http://localhost:8000`.

## Paso 0 · Probarla ya, sin Firebase

Sube todo a GitHub Pages (paso 4) **sin tocar `config.js`**. Verás el botón *Entrar en modo demostración*:
todo funciona y se guarda en el navegador. Sirve para revisar diseño y flujo.

## Paso 1 · Crear el proyecto de Firebase

1. Entra a https://console.firebase.google.com → **Agregar proyecto** (puedes desactivar Google Analytics).
2. En el proyecto: **Configuración del proyecto (engranaje) → Tus apps → Web (`</>`)**. Ponle un nombre y registra la app (no hace falta Firebase Hosting).
3. Copia el objeto `firebaseConfig` y pega sus valores en **`config.js`** (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).

## Paso 2 · Activar el acceso de usuarios

1. **Build → Authentication → Comenzar → Método de acceso**: activa **Correo electrónico/contraseña**. Si quieres el botón de Google, activa también **Google** (o pon `enableGoogleLogin: false` en `config.js`).
2. **Authentication → Configuración → Dominios autorizados → Agregar dominio**: agrega `TUUSUARIO.github.io` (y tu dominio propio si usas uno). Sin esto, el acceso con Google falla con `unauthorized-domain`.

## Paso 3 · Crear Firestore y publicar las reglas

1. **Build → Firestore Database → Crear base de datos** → modo **producción** → elige una región cercana a tus usuarios (no se puede cambiar después).
2. Pestaña **Reglas**: borra lo que haya, pega el contenido de **`firestore.rules`** y pulsa **Publicar**.
   (Alternativa con CLI: `firebase deploy --only firestore:rules`.)

Estructura que se crea sola al usar la app:

```
users/{uid}                     perfil: nombre, modo, semana, declaración, plan de 21 días, ideas ya mostradas
users/{uid}/days/{AAAA-MM-DD}   semáforo, coherencia, veces de ¡Cambia!, sesiones del día
users/{uid}/entries/{id}        entradas de la bitácora (fase, modo, texto)
users/{uid}/links/{id}          enlaces de meditaciones y audios del usuario
```

## Paso 4 · Publicar en GitHub Pages

1. Crea un repositorio (público, o privado si tu plan lo permite) y sube **todos los archivos a la raíz**.
2. **Settings → Pages → Build and deployment**: *Deploy from a branch* → rama `main`, carpeta `/ (root)` → Save.
3. En 1–2 minutos queda en `https://TUUSUARIO.github.io/NOMBRE-DEL-REPO/`.

## Paso 5 · Probar (lista de verificación)

- [ ] Abre la URL en el celular: aparece el acceso con el logo de RePrograma (ya sin el aviso de demostración).
- [ ] **Crear cuenta** → entras a *Hoy*. En Firestore aparece `users/{uid}`.
- [ ] Elige semáforo y coherencia → aparece `users/{uid}/days/AAAA-MM-DD`.
- [ ] Escribe una entrada en *Bitácora* → aparece en `entries`.
- [ ] Cambia de modo (Vacío / Gratitud): cambian colores, logo y contenido.
- [ ] Entra desde otro dispositivo con el mismo correo: ves los mismos datos.
- [ ] Modo avión: la app abre y guarda; sincroniza al volver la conexión.
- [ ] *Yo → Eliminar mis datos* borra los documentos y la cuenta.

## Recordatorios inteligentes (ideas del libro)

`content.js → IDEAS` tiene cada idea con `w` (semanas), `m` (modos) y `t` (situaciones en las que es más útil:
`start, gap, pasado, observando, futuro, low, high, redirect, stopped, streak, pattern, after-session, after-entry`).
La app puntúa cada idea con lo que hace el usuario (semáforo, coherencia, ¡Cambia!, sesiones canceladas, días sin practicar,
palabras de la bitácora, semana del programa) y evita repetir las vistas en los últimos días.
Aparecen en *Hoy*, al terminar una sesión y al guardar una entrada. Para agregar ideas, copia un bloque y cambia el `id`.
Las ideas están **parafraseadas** (no son citas textuales); si quieres citas literales, revisa antes los permisos de la editorial.

## Cosas a tener en cuenta

- **La `apiKey` de Firebase web no es un secreto**: va en el código público. La protección real son las **reglas** (paso 3) y los **dominios autorizados** (paso 2). Opcional: restringe la API key por referrer HTTP en Google Cloud Console → Credenciales.
- **Versión del SDK**: `config.js → sdkVersion` (se carga desde el CDN de Google). Si falla, pon la versión que muestra la consola en el fragmento de instalación web.
- **Privacidad**: la bitácora guarda texto muy personal. Antes de abrirla a otras personas publica una política de privacidad y términos, y no la presentes como tratamiento médico ni psicológico.
- **No hay notificaciones push todavía**: los recordatorios son dentro de la app. Las push requieren un servicio aparte (Firebase Cloud Messaging + Cloud Functions) y, en iPhone, que la app esté instalada en pantalla de inicio.
- **App Store / Google Play**: esto es una app web (PWA). Para tiendas hay que empaquetarla (por ejemplo con Capacitor) y cumplir sus reglas.
- **Audios de Gratitud**: la app reproduce enlaces a archivos `.mp3/.m4a/.wav/.ogg`. Puedes subir tus propias grabaciones al mismo repositorio y usar su URL.
- **Meditaciones oficiales del libro**: la app no las contiene ni las reproduce; cada usuario guarda el enlace de las que tiene en su cuenta del sitio oficial.
