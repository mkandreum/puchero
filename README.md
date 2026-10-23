# PUCHERO · come bien sin drama

App web (móvil y escritorio) para la gente a la que le cuesta comer bien, por manías o por pereza. Funciona así:

1. **Eliges** en un mini súper de alimentos 3D y los **arrastras con el dedo** a la cazuela. Si prefieres, también vale tocarlos.
2. **Remueves** la cazuela girando el dedo dentro: 3 vueltas, con cuchara, burbujas, fuego y vibración en cada cuarto de vuelta.
3. La **IA** (Gemini, igual que VoltBody Powered) te devuelve un plato hecho con esos alimentos. Si has marcado algo que odias, la receta lo **camufla**.
4. Lo apuntas con **"Me lo como"** y suma a tu **racha**.

Diseño: colores sólidos y tipografía grande (Bricolage Grotesque, Instrument Serif y JetBrains Mono). En móvil la navegación es una píldora flotante abajo; en escritorio, una barra lateral izquierda.

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | React 19 + TypeScript, CSS propio, empaquetado con esbuild |
| Backend | Express + Prisma + PostgreSQL |
| IA | `@google/genai` con cadena de modelos y reintento, como en VoltBody. Sin clave usa recetas locales |
| Despliegue | Docker / docker compose, listo para Coolify |

Los usuarios son anónimos: cada dispositivo genera un id y lo envía en la cabecera `x-device-id`, así que no hay login.

## API

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/api/health` | Healthcheck (incluye la base de datos) |
| GET / PUT | `/api/me` | Perfil: `dislikes` (lo que odias) y `goal` (`verde`, `proteina` o `rapido`) |
| GET | `/api/today` | Reto del día, comidas de hoy, racha, mejor racha y semana |
| POST | `/api/recipe` | `{ ingredients: string[] }` → receta (IA o local) |
| GET / POST | `/api/meals` | Historial / guardar un plato |
| DELETE | `/api/meals/:id` | Borrar un plato |

## Desplegar en Coolify

**Opción A, Docker Compose (recomendada):**

1. En Coolify, crea un recurso nuevo: *Public/Private Repository* → `mkandreum/puchero` → Build Pack **Docker Compose** (`docker-compose.yaml`).
2. Configura las variables de entorno:
   - `POSTGRES_PASSWORD`: obligatoria.
   - `GEMINI_API_KEY`: la de VoltBody. Es opcional; sin ella hay recetas locales.
   - Opcionales: `GEMINI_MODEL_FAST`, `APP_TZ`.
3. Asigna tu dominio al servicio `app`, puerto **3000**, por ejemplo `puchero.xyoncloud.win`.
4. Lanza **Deploy**. Las migraciones se aplican solas al arrancar (`prisma migrate deploy`).

**Opción B, solo Dockerfile:**

1. Crea un PostgreSQL desde Coolify.
2. Crea la app con Build Pack **Dockerfile**, puerto 3000.
3. Configura `DATABASE_URL` con la URL interna de esa base de datos y `GEMINI_API_KEY`.

La vibración usa `navigator.vibrate` en Android. En iPhone (iOS 18+) se usa el háptico nativo del interruptor del sistema.

## Desarrollo local

```bash
cp .env.example .env          # rellena DATABASE_URL
npm install
npx prisma migrate deploy
npm run dev                   # esbuild en watch + API con tsx
# abre http://localhost:3000
```

## Estructura

```
src/
  client/     React: App, pantallas (Hoy, Cocina, Racha, Yo), Cazuela, hápticos
  server/     Express, IA (Gemini), rachas y retos
  shared/     catálogo de ingredientes, recetas locales, tipos
prisma/       esquema y migraciones
public/       index.html, manifest, iconos y food/*.webp
```

## Créditos

Ilustraciones 3D de alimentos: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji), con licencia MIT.
