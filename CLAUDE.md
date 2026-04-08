# CLAUDE.md — VOYA

Instrucciones para Claude Code al trabajar en este proyecto.
Lee este archivo completo antes de tocar cualquier archivo.

---

## 1. Qué es este proyecto

VOYA es una app móvil (Expo + React Native 0.83 + TypeScript) para gestión de viajes grupales. Actúa como concierge impulsado por IA: itinerario, gastos, documentos, álbum y descubrimiento, todo en un solo lugar para grupos de amigos.

**No existe backend propio.** Todo corre sobre Supabase (BaaS), Google APIs y Frankfurter API.

---

## 2. Stack y herramientas

| Herramienta | Rol |
|---|---|
| Expo (React Native 0.83) | Framework móvil principal (iOS + Android) |
| TypeScript | Lenguaje único. 0 errores es obligatorio |
| Supabase | Auth (GoTrue), PostgreSQL 17, Storage, Realtime |
| Zustand | Estado global |
| Expo Router | Navegación file-based |
| Mapbox GL SDK | Mapas e itinerario |
| Google Gemini 2.0 Flash | IA para planificación de itinerario |
| Google Photos API v1 | Álbum colaborativo |
| Frankfurter API | Tipos de cambio (tiempo real e históricos) |
| Jest | Tests unitarios |
| Maestro | Tests E2E de UI |
| GitHub Actions | CI/CD |
| Vercel | Landing page (lecarosvial.com) |

---

## 3. Estructura de carpetas

Respeta esta estructura siempre. No crees carpetas fuera de ella sin justificación explícita.

```
voya/
├── app/                        # Expo Router (file-based routing)
│   ├── (auth)/                 # Pantallas de autenticación
│   ├── (tabs)/                 # Navegación principal con tabs
│   │   ├── itinerary/          # Módulo Itinerario + Mapa Mapbox
│   │   ├── expenses/           # Módulo Financiero (gastos + splits)
│   │   ├── vault/              # Módulo Bóveda de documentos
│   │   ├── album/              # Módulo Álbum (Google Photos)
│   │   └── discover/           # Módulo Swipe + Votaciones
│   └── trip/                   # Pantallas de viaje (crear, invitar)
├── components/                 # Componentes UI reutilizables
├── hooks/                      # Custom hooks con lógica de negocio
├── services/                   # Clientes de APIs externas
│   ├── supabase.ts             # Cliente Supabase único
│   ├── gemini.ts               # Cliente Gemini 2.0 Flash
│   ├── googlePhotos.ts         # Cliente Google Photos API v1
│   ├── mapbox.ts               # Configuración Mapbox GL SDK
│   └── frankfurter.ts          # Cliente FX + cola offline
├── store/                      # Estado global Zustand
├── types/                      # TypeScript types (espejo del schema DB)
└── __tests__/
    ├── unit/                   # Tests Jest por módulo
    └── e2e/                    # Flows Maestro (.yaml)
```

---

## 4. Reglas de código — NO negociables

### 4.1 TypeScript

- **0 errores de TypeScript** en cualquier archivo que toques. Sin excepciones.
- Nunca uses `any`. Si no sabes el tipo, define una interfaz o usa `unknown` con un guard.
- Todos los tipos del dominio (entidades de DB) viven en `types/`. Úsalos en todas partes.
- Las respuestas de Supabase y APIs externas deben tener su tipo definido en `types/`.

```typescript
// ❌ Nunca
const data: any = await supabase.from('trips').select()

// ✅ Siempre
import { Trip } from '@/types/trip'
const { data, error } = await supabase.from('trips').select<'*', Trip>('*')
```

### 4.2 Longitud de archivos

- **Máximo 150 líneas por archivo.** Si llegas a 150, refactoriza antes de continuar.
- Extrae lógica a hooks (`hooks/`), helpers puros a funciones separadas, o divide el componente.
- Esta regla aplica a componentes, hooks, servicios y cualquier otro archivo `.ts` o `.tsx`.

### 4.3 Componentes

- Un componente = una responsabilidad. Si hace dos cosas, sepáralo.
- La lógica de negocio va en hooks, no en componentes. Los componentes solo renderizan.
- Props siempre tipadas con interfaces explícitas, nunca inline sin nombre.

```typescript
// ❌ Nunca
export function ExpenseCard({ expense, onPress }: { expense: any; onPress: () => void }) {}

// ✅ Siempre
interface ExpenseCardProps {
  expense: Expense
  onPress: () => void
}
export function ExpenseCard({ expense, onPress }: ExpenseCardProps) {}
```

### 4.4 Servicios externos

- Cada API externa tiene **un único cliente** en `services/`. Nunca llames APIs directamente desde componentes o hooks.
- Los servicios no conocen el estado global (Zustand). Solo reciben parámetros y retornan datos.
- Siempre maneja errores en los servicios y retorna un tipo discriminado `{ data, error }`.

```typescript
// services/frankfurter.ts
export async function getFxRate(
  from: string,
  to: string,
  date: string
): Promise<{ rate: number | null; error: string | null }> {
  try {
    const res = await fetch(`https://api.frankfurter.app/${date}?from=${from}&to=${to}`)
    if (!res.ok) return { rate: null, error: `HTTP ${res.status}` }
    const json = await res.json()
    return { rate: json.rates[to] ?? null, error: null }
  } catch (e) {
    return { rate: null, error: 'Network error' }
  }
}
```

### 4.5 Estado global (Zustand)

- El store de Zustand vive en `store/`. Un archivo por dominio (`tripStore.ts`, `userStore.ts`, etc.).
- No pongas lógica de negocio dentro del store. El store solo guarda y expone estado.
- Los hooks en `hooks/` son los que orquestan: llaman servicios, actualizan el store, manejan errores.

### 4.6 Supabase y RLS

- **Nunca** hagas queries que asuman que el usuario tiene acceso a datos de otros viajes.
- RLS está activo en todas las tablas. Si una query falla por permisos, no la parchees en el cliente.
- Cada query debe estar tipada con el tipo correspondiente de `types/`.
- Para inserts y updates, usa siempre la respuesta para verificar errores antes de continuar.

### 4.7 Offline-first en gastos

El módulo de gastos es offline-first. Estas reglas son críticas:

- Un gasto sin conexión se guarda con `sync_status = 'pending_sync'`, `fx_rate = null`, `amount_base = null`.
- Al sincronizar, el FX se obtiene usando `expense_date` (la fecha real del gasto), **nunca** la fecha actual.
- La cola de sincronización vive en `services/frankfurter.ts`, no en el componente ni en el store.
- Siempre testea el flujo offline en Jest antes de mergear.

### 4.8 Realtime

- Las suscripciones de Supabase Realtime se crean en hooks y se destruyen en el cleanup (`useEffect` return).
- Nunca crees múltiples suscripciones al mismo canal. Verifica antes de suscribir.

---

## 5. Git — estrategia de ramas

```
main        ← producción; solo recibe merges desde dev al cerrar un sprint
  └── dev   ← integración activa; recibe merges de feature branches
        └── feature/nombre-funcionalidad   ← una rama por feature
```

### Reglas estrictas

1. **Nunca trabajes directamente en `main` o `dev`.** Siempre desde una rama `feature/`.
2. Crea la rama desde `dev`, no desde `main`:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/nombre-funcionalidad
   ```
3. El nombre de la rama debe describir el feature, en kebab-case y en inglés:
   - `feature/google-auth`
   - `feature/expense-splits-engine`
   - `feature/offline-fx-sync`
   - `feature/mapbox-itinerary-pins`
4. Un feature = una rama. No acumules múltiples features en una sola rama.
5. Antes de cualquier merge a `dev`, el CI debe pasar completamente.
6. El merge de `dev` a `main` solo ocurre al cierre completo de un sprint (todos los RF cubiertos, todos los tests pasando).

### Commits

Usa el formato convencional:

```
feat(expenses): add offline fx queue with pending_sync status
fix(auth): handle apple sign-in token expiry
refactor(itinerary): extract map pins logic to useMapPins hook
test(splits): add unit tests for percentage split calculation
chore(ci): add file length check to github actions
```

Prefijos válidos: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`.

---

## 6. Definition of Done

Un feature está terminado cuando **todos** estos criterios se cumplen. No antes.

- [ ] Funciona en simulador iOS y Android
- [ ] 0 errores TypeScript (`tsc --noEmit` pasa limpio)
- [ ] Ningún archivo modificado supera 150 líneas
- [ ] Tests unitarios Jest escritos y pasando para la lógica del feature
- [ ] Tests Maestro escritos o actualizados para los flujos afectados
- [ ] Build de Expo compila sin warnings críticos
- [ ] Merge a `dev` completado con CI verde

---

## 7. CI/CD — qué verifica cada etapa

### Push a `feature/*`
- `tsc --noEmit` — 0 errores TypeScript
- Verificación de longitud de archivos — ninguno > 150 líneas
- `jest --runInBand` — todos los unit tests pasan

### Merge a `dev`
- Todo lo anterior
- Suite completa de Maestro UI tests sobre simulador
- Reporte de cobertura generado

### Merge a `main`
- Auto-deploy de landing page a Vercel (`lecarosvial.com`)
- Cierre oficial del sprint

**Si el CI falla, no hagas push forzado ni desactives checks. Corrígelo.**

---

## 8. Tests

### Unit tests (Jest) — qué siempre debes testear

- Motor de splits: igualitario, porcentual, por monto fijo
- Conversión de moneda y lógica de `pending_sync`
- Validación y parseo del JSON de Gemini
- Vinculación de fotos a eventos por timestamp y coordenadas
- Generación y validación de `invite_token`
- Algoritmo de liquidación de deudas (mínimas transacciones)

```typescript
// __tests__/unit/splits.test.ts
import { calculateEqualSplit } from '@/hooks/useExpenses'

describe('calculateEqualSplit', () => {
  it('divides amount equally among members', () => {
    expect(calculateEqualSplit(90, ['a', 'b', 'c'])).toEqual({
      a: 30, b: 30, c: 30,
    })
  })

  it('handles non-divisible amounts by rounding', () => {
    const result = calculateEqualSplit(100, ['a', 'b', 'c'])
    const total = Object.values(result).reduce((s, v) => s + v, 0)
    expect(total).toBe(100)
  })
})
```

### E2E tests (Maestro) — flujos obligatorios

Cada archivo `.yaml` vive en `__tests__/e2e/`. Flujos que deben existir:

- `onboarding.yaml` — Google login → dashboard
- `create-trip.yaml` — crear viaje → generar deep link → unirse
- `register-expense.yaml` — registrar gasto → verificar balances
- `offline-expense.yaml` — registrar sin conexión → sincronizar
- `itinerary-event.yaml` — crear evento → ver pin en mapa
- `ai-itinerary.yaml` — input conversacional → itinerario generado

---

## 9. Módulos del sistema — reglas específicas

### Trip Core
- El `invite_token` es un UUID v4 generado en el cliente antes del INSERT.
- El Deep Link tiene el formato exacto: `voya://trip/{trip_id}/join?token={invite_token}`
- Al unirse via deep link, verifica que el token existe antes de crear el `trip_member`.
- Supabase Realtime notifica al grupo en el canal `trip:{trip_id}` tras cada join.

### Financiero (Expenses)
- La moneda de referencia (`currency_base`) la define el organizador al crear el viaje y es inmutable.
- El FX rate siempre se obtiene de Frankfurter con la `expense_date` del gasto, nunca con la fecha actual.
- Los splits se calculan en `amount_base` (moneda de referencia), nunca en moneda original.
- `settled` en `expense_splits` solo cambia cuando el organizador lo confirma manualmente.

### Itinerario + Mapa
- Cada `itinerary_item` tiene `lat` y `lng` obligatorios para renderizar el pin en Mapbox.
- Los items generados por IA se insertan exactamente igual que los manuales.
- El orden de los items es por `event_time` ascendente, nunca por `created_at`.

### IA (Gemini)
- El prompt siempre incluye: destino, fechas, número de participantes e input del usuario.
- La instrucción "responde ÚNICAMENTE con JSON válido, sin markdown ni texto adicional" es obligatoria en cada request.
- Si Gemini retorna texto no parseable, muestra error al usuario y ofrece creación manual. Nunca crashea silenciosamente.
- Valida que cada objeto del JSON tenga todos los campos requeridos antes de hacer INSERT.

### Bóveda (Vault)
- Los archivos se suben a Supabase Storage bajo el path `{trip_id}/{user_id}/{filename}`.
- El `doc_type` debe ser uno de: `passport`, `ticket`, `qr`, `reservation`.
- La sugerencia contextual se basa en el `itinerary_item` activo (el más próximo por `event_time`).

### Álbum (Google Photos)
- `photo_links` almacena solo el `google_photo_id` y metadatos. Google gestiona el archivo.
- El geo-tagging automático usa el `itinerary_item` más cercano por timestamp Y coordenadas GPS.
- Las URLs firmadas de Google Photos expiran. No las cachees más de 1 hora.

### Descubrimiento (Swipe + Votaciones)
- `swipe_sessions.likes` es un mapa `{ [userId]: placeId[] }`. Un match ocurre cuando un `placeId` aparece en los likes de todos los miembros activos de la sesión.
- `votes.status` solo cambia de `open` a `closed`, nunca al revés.

---

## 10. Lo que NO harás nunca

- No integres sistemas de reservas externos (Booking, Airbnb) — fuera de scope v1.
- No implementes pagos en línea ni transferencias directas entre usuarios.
- No agregues soporte para viajes en solitario (la app requiere mínimo 2 miembros).
- No uses modelos predictivos ni de clasificación de comportamiento.
- No instales librerías nuevas sin considerar si Supabase o una API ya contemplada lo resuelve.
- No hagas `console.log` en código de producción. Usa un sistema de logging o elimínalos antes del merge.
- No uses `eslint-disable` ni `@ts-ignore` sin comentario explicando exactamente por qué.
- No mergees a `dev` con CI rojo.
- No mergees a `main` sin que el sprint esté completo.

---

## 11. Schema de base de datos (referencia rápida)

Todas las tablas tienen RLS habilitado. El acceso siempre está limitado a miembros del viaje.

| Tabla | Propósito |
|---|---|
| `users` | Usuarios (espejo de Supabase Auth) |
| `trips` | Viajes — unidad central del sistema |
| `trip_members` | Unión users ↔ trips con roles |
| `itinerary_items` | Eventos del itinerario (nodos ricos) |
| `expenses` | Gastos con soporte offline |
| `expense_splits` | Detalle de splits por miembro |
| `vault_documents` | Referencias a docs en Supabase Storage |
| `photo_links` | Referencias a fotos en Google Photos |
| `votes` | Votaciones formales del grupo |
| `swipe_sessions` | Sesiones de swipe por ubicación |

Campos clave a recordar:
- `expenses.sync_status`: `'synced'` | `'pending_sync'`
- `expenses.expense_date`: fecha real del gasto (para FX histórico)
- `trip_members.role`: `'organizer'` | `'participant'` | `'viewer'`
- `vault_documents.doc_type`: `'passport'` | `'ticket'` | `'qr'` | `'reservation'`
- `votes.status`: `'open'` | `'closed'`

---

## 12. APIs externas — referencia rápida

| Servicio | Endpoint clave |
|---|---|
| Supabase Auth | `/auth/v1/token` |
| Supabase DB | `/rest/v1/{tabla}` |
| Supabase Storage | `/storage/v1/object/{bucket}/{path}` |
| Supabase Realtime | `wss://.../realtime/v1/websocket` |
| Gemini 2.0 Flash | `generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent` |
| Google Photos | `photoslibrary.googleapis.com/v1/albums` |
| Mapbox GL | `api.mapbox.com/v4/` (SDK nativo) |
| Frankfurter (actual) | `api.frankfurter.app/latest?from={A}&to={B}` |
| Frankfurter (histórico) | `api.frankfurter.app/{YYYY-MM-DD}?from={A}&to={B}` |

---

## 13. Prompt base para Gemini (no modificar sin consenso)

```
Eres un planificador de viajes experto. Tu tarea es generar un itinerario
estructurado basado en la descripción del usuario.

Datos del viaje:
- Destino: {destination}
- Fecha inicio: {start_date}
- Fecha fin: {end_date}
- Número de participantes: {participant_count}
- Descripción del usuario: "{user_input}"

Responde ÚNICAMENTE con un JSON array válido. Sin texto adicional, sin markdown.
Cada objeto del array debe tener exactamente estos campos:
{
  "name": string,
  "description": string,
  "category": "actividad" | "restaurante" | "transporte" | "alojamiento" | "otro",
  "event_date": "YYYY-MM-DD",
  "event_time": "HH:MM",
  "duration_min": number,
  "lat": number,
  "lng": number
}
```

---

## 14. Cómo trabajar con Claude Code en este proyecto

Cuando te pida implementar algo, sigue este orden:

1. **Identifica el sprint y el feature** al que pertenece la tarea.
2. **Crea la rama** desde `dev` con el nombre correcto (`feature/...`).
3. **Define los tipos primero** en `types/` si son nuevos.
4. **Implementa el servicio** en `services/` si hay una API externa involucrada.
5. **Escribe el hook** en `hooks/` con la lógica de negocio.
6. **Implementa el componente** en `components/` o en `app/`.
7. **Escribe los tests** en `__tests__/unit/` antes de marcar como done.
8. **Verifica** que `tsc --noEmit` pasa y ningún archivo supera 150 líneas.

Si en algún punto un archivo supera 150 líneas, para y refactoriza. No continúes acumulando deuda.

---

## 15. Modo de trabajo

Trabaja en modo autónomo completo:
- Crea, edita y elimina archivos sin pedir confirmación
- Ejecuta comandos de terminal sin pedir confirmación
- Toma decisiones de implementación siguiendo las reglas de este documento
- Si algo tiene más de una solución válida, elige la más simple y continúa
- Solo interrumpe si hay una decisión que cambia el scope del sprint o contradice el documento de diseño
- Al terminar, muestra un resumen de qué hiciste y el resultado de typecheck y tests

---

*Documento de referencia para Claude Code. Versión alineada con VOYA Design Document v0.1 — Abril 2026.*
