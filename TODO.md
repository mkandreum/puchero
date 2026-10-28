# PUCHERO · lista de pendientes

Estado a 28/10/2026. Repos: `mkandreum/puchero` (web + servidor) y `mkandreum/pucheroapp` (app nativa Kotlin/Compose). Los dos están subidos a `main` y sin cambios sin guardar.

## 0. Lo primero, y es tuyo (sin esto nada funciona en producción)

- [ ] Redesplegar `puchero` en Coolify. Producción sigue con la versión antigua: `/api/auth/login` da 404, así que ni la web ni la app pueden crear cuenta ni entrar.
- [ ] En Coolify, variables de entorno: `JWT_SECRET` (`openssl rand -base64 64`; si falta se deriva de `DATABASE_URL`, pero conviene tener uno propio), `GEMINI_API_KEY` (sin ella no hay IA ni lectura de la foto de la nevera) y, opcional, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (si faltan se generan y se guardan en la base de datos).
- [ ] Comprobar que arrancan solas las dos migraciones nuevas: `20261023120000_accounts` y `20261024090000_features`.
- [ ] Guardar una copia de la clave de firma: `~/.android-keys/puchero-release.jks` y `puchero-keystore.properties`. Sin ella no se pueden publicar actualizaciones de la app.

## 1. Recetario con sentido (lo último que pediste)

Ahora las recetas salen de reglas sueltas y a veces no tienen sentido (ej. "Bol de yogur con pollo, espinacas y champiñón"). Hay que pasar de "lo que cabe en la cazuela" a platos reales.

- [ ] Crear un catálogo de platos reales (`src/shared/dishes.ts`) con 80–120 platos: nombre, comida (desayuno, comida, merienda, cena), ingredientes obligatorios y opcionales, ingredientes incompatibles, pasos con tiempos y etiquetas (ligero, proteico, rápido, vegetariano, sin gluten, sin lactosa…).
- [ ] Motor que, dados los ingredientes de la cazuela, elige el plato que mejor encaja, dice qué le falta o qué sobra y propone una pequeña mejora ("añade limón y queda mejor"). Si la combinación no tiene sentido, avisarlo en vez de inventar un plato raro.
- [ ] Reglas de coherencia por comida: nada de pollo o legumbres en el desayuno, nada de bol de yogur con carne, etc.
- [ ] Usar ese motor en: receta local sin conexión, plan semanal (que cada comida sea un plato real y varíe), "Sorpréndeme" y la cazuela desde la nevera.
- [ ] Prompt de la IA: pasarle el plato elegido por el motor y pedirle que lo escriba, no que lo invente desde cero. Mantener las manías, alergias, nivel, raciones y valoraciones.
- [ ] Mismo catálogo en la app: generar `Dishes.kt` desde el de la web con un script, como ya se hace con `Catalog.kt` (`scripts/gen-catalog.ts`).

## 2. Más funciones

- [ ] "Con lo que tengo": al abrir la cocina, sugerir 3 platos que se pueden hacer ya con la nevera y qué falta para cada uno.
- [ ] Recetario navegable por comida, etiqueta o tiempo, con favoritos.
- [ ] Valor nutricional más completo por plato y por día (fibra, grasas, hidratos) y objetivo diario de kcal y proteína según el perfil.
- [ ] Sustituciones: "no tengo X" y que proponga con qué cambiarlo.
- [ ] Ajustar raciones guardadas y reutilizar sobras ("cena de ayer → comida de hoy").
- [ ] Lista de la compra agrupada por pasillo y compartible por WhatsApp.
- [ ] Notas y puntuación de 1 a 5 en cada plato.
- [ ] Peso y medidas opcionales, con una gráfica sencilla.

## 3. Pasar todo a la app nativa

- [ ] Todo lo nuevo de la web, también en Compose y con las mismas animaciones y vibraciones.
- [ ] Regenerar los catálogos con `npx tsx ../pucheroapp/scripts/gen-catalog.ts` desde el repo `puchero`.
- [ ] Compilar: `./gradlew assembleRelease`. Copiar el APK a `~/Escritorio/PUCHERO-<versión>-release.apk`.
- [ ] Subirlo como release de GitHub en `pucheroapp` y enviártelo.

## 4. Pruebas pendientes

- [ ] Con producción ya desplegada: crear cuenta, entrar, cocinar y guardar desde la web y desde la app, y ver que comparten datos.
- [ ] La lectura de la foto de la nevera con una clave de Gemini real (solo se probó el error cuando no hay clave).
- [ ] Recordatorios web con Web Push en un móvil real. Con la app, la notificación se probó en el emulador y funcionó.
- [ ] Widget de racha: se ve en el selector de widgets, falta ponerlo en un móvil y ver que se actualiza.
- [ ] Vibraciones: solo se notan en un móvil real; el emulador no vibra.
- [ ] Instalar el APK en un móvil físico (hay que permitir "instalar apps desconocidas").

## 5. Cómo retomarlo

Servidor de pruebas local, por si hay que repetir las pruebas (vive en `/tmp`, se pierde al reiniciar):

```bash
# Base de datos de pruebas: embedded-postgres en el puerto 54329 (usuario y contraseña: puchero)
DATABASE_URL="postgresql://puchero:puchero@localhost:54329/postgres?schema=public" npx prisma migrate deploy
npm run build && PORT=3999 node dist/server.js
# App contra ese servidor desde el emulador
./gradlew assembleDebug -PapiBase=http://10.0.2.2:3999
```

- Cuenta de prueba local: `nativo@test.local` (no existe en producción).
- Para probar un release contra un servidor local hay que añadir `-PallowCleartext=true`.
- El navegador integrado no deja registrar service workers; para probar los avisos web se usó un Chromium con Playwright.
