# Informe de la jornada nocturna — 9 de noviembre de 2026

Trabajo real: de **03:32 a ~04:50** (hora local del equipo). Versión 0.2.0 → **0.4.0**.
Producción: https://nutritrack-zeta.vercel.app · Repo: https://github.com/Fernazg/nutritrack

## 1. Mejoras visuales

- Paleta ajustada para **contraste WCAG AA**: verde de acento `#157a4c` (5,4:1 sobre blanco)
  y color "sobre acento" oscuro en modo oscuro (antes el texto blanco sobre verde claro tenía ~2,5:1).
- Transición suave de entrada entre pantallas (se desactiva con "Reducir movimiento").
- Estados de carga (esqueletos) en búsquedas, mensajes de error claros y accesibles (`role="alert"`).
- Panel inferior (sheet) reutilizado en todos los formularios, con botón principal arriba para que
  el teclado del iPhone no lo tape.
- Gráficos SVG propios (sin librerías): barras de 7 días con línea de meta, reparto de energía por macro.

## 2. Funcionalidades nuevas

- **Perfil y plan nutricional**: BMR (Mifflin-St Jeor), TDEE, déficit/superávit con salvaguardas
  (máx. 25 % del TDEE, mínimo 1.200/1.500 kcal), proteína por kg configurable, grasas 25 %, agua.
  Se recalcula cuando cambian tus datos.
- **Agua**: tarjeta en Inicio, +250 ml y deshacer; meta editable.
- **Buscador de alimentos**: recientes, favoritos (★), búsqueda en **Open Food Facts**, porciones en
  gramos con atajos (porción del envase, 50/100/150/200 g).
- **Escáner de código de barras** con la cámara (ZXing) + ingreso manual del código.
- **Evaluación de etiquetas**: azúcares, grasas saturadas y sodio por 100 g/ml, con referencia a los
  sellos «ALTO EN» de la Ley 20.606 (límites de sólidos y líquidos). Los líquidos se miden en ml.
- **Repetir comida del día anterior** en un toque.
- **Comidas personalizadas**: guarda una comida completa (2+ alimentos) como favorito y regístrala en un toque.
- **Colación** como quinta comida.
- **Estadísticas**: últimos 7 días (barras), promedio, días registrados, días cerca de la meta,
  comparación con la semana anterior, proteína promedio, reparto de macros, cambio de peso 7/30 días.
- **Actividad física** con estimación MET (Compendio de Actividades Físicas 2011).
- **Sugerencias "Para completar tu día"** a partir de tus propios alimentos (reglas, no IA).
- **Restaurar respaldo** (importar JSON) además de exportar.
- **IA preparada** (Gemini, plan gratuito) protegida por token; desactivada hasta configurarla.

## 3. Funcionalidades existentes mejoradas

- Registro manual: recuerda el alimento para repetirlo; selector de comida con 5 opciones.
- Dashboard: proteína restante, aviso para personalizar metas, peso con meta, agua, sugerencias.
- Ajustes: perfil, meta de agua, estado de IA, restaurar respaldo.
- Exportación v2 incluye alimentos guardados, agua y actividad.

## 4. Problemas encontrados y corregidos

- `new Date()` en render de un componente cliente rompía el prerender de Next 16 → condicionado a la fecha del cliente.
- Formato de litros mostraba "0,50 L" → nuevo `formatLiters` ("0,5 L").
- Contraste insuficiente de botones (ver punto 1).
- El buscador clásico de Open Food Facts devolvía "temporarily unavailable" → se usa Search-a-licious.
- Un `id` de campo con tildes generaba selectores inválidos (corregido antes, mantenido).

## 5. Pruebas ejecutadas (resultados reales)

- **Unitarias (Vitest)**: 41/41 OK — motor energético, porciones, estadísticas, sugerencias,
  actividad, sellos de etiqueta, normalizador de Open Food Facts y **migración de la base v1 → v3** (los datos
  existentes en el iPhone se conservan).
- **Extremo a extremo** (Edge headless emulando iPhone 390 px, compilación de producción):
  23/23 OK en la versión final (local), 20/20 en modo oscuro y contra producción en versiones
  previas de la noche. Cubre perfil, agua, manual, recientes, favoritos, comidas personalizadas,
  código de barras real (Colun 7802920000084) con su etiqueta, búsqueda en línea,
  estadísticas, actividad, sugerencias (visibles y ocultas al superar la meta) y que la
  tarjeta de IA quede oculta sin configuración.
- **API de IA**: sin configurar → 503; token incorrecto → 401; datos inválidos → 400;
  clave falsa → 502 controlado. **No se probó una respuesta real** (no hay clave).
- `tsc`, `eslint` y `next build` sin errores.

## 6. Arquitectura

- `lib/nutrition/*`: lógica pura y testeada (energy, portion, stats, suggest, activity, chile-seals).
- `lib/db`: Dexie **v3** (tablas `foods`, `waterEntries`, `exerciseEntries`); migración automática,
  los datos existentes se conservan. Toda escritura pasa por `repository.ts`.
- `lib/server/*`: código solo de servidor (`server-only`): Open Food Facts y proveedor de IA.
- `app/api/alimentos/*` y `app/api/ia/*`: rutas del backend con validación de entrada y caché CDN.
- `features/*`: módulos por dominio (foods, meals, activity, water, ai, progress, settings, scanner).

## 7. Skills descargadas e instaladas

**Ninguna.** Con ~78 minutos reales prioricé implementar y probar funcionalidades. No se ejecutó
código de terceros fuera de dependencias npm revisadas.

## 8. Repositorios / recursos de GitHub utilizados

| Recurso | Uso | Licencia |
|---|---|---|
| zxing-js/browser (`@zxing/browser`) | Lectura de códigos con la cámara | MIT |
| zxing-js/library (`@zxing/library`) | Motor de decodificación | Apache-2.0 |
| vitest-dev/vitest | Pruebas unitarias (solo desarrollo) | MIT |
| dumbmatter/fakeIndexedDB | IndexedDB simulada para probar la migración (solo desarrollo) | Apache-2.0 |
| openfoodfacts (API pública) | Datos de productos | Datos ODbL |

## 9. Pendiente

- Análisis de **fotos de comida** y **etiquetas** con IA (requiere configurar la clave gratuita; ver `docs/IA.md`).
- **Planificación** de menú semanal y recetas.
- Recetas con porciones (hoy una comida guardada se registra completa, sin dividir en porciones).
- Base de alimentos genéricos (frutas, verduras, preparaciones caseras) con datos verificables
  (p. ej. USDA FoodData Central, dominio público) — hoy dependen de Open Food Facts o carga manual.
- Micronutrientes (fibra, sodio, azúcares) en el registro.
- Gráfico de peso con tendencia suavizada y vista mensual de calorías.
- Algunos números de macros usan colores (ámbar) con contraste bajo sobre blanco; el texto
  adyacente los identifica, pero conviene revisarlos.

## 10. Recomendaciones

1. Abre la app instalada en el iPhone y entra a **Ajustes → Calcular mis metas**.
2. Usa la app 2–3 semanas y compara el cambio de peso real con el esperado; ajusta actividad o ritmo.
3. Exporta un respaldo semanal (Ajustes → Exportar datos).
4. Si quieres IA: sigue `docs/IA.md` (sin cuenta de facturación = sin cobros posibles).

## 11. Gastos

**$0 CLP.** No se contrató, compró ni activó nada de pago. Servicios usados: Vercel (plan gratuito
existente), GitHub (repo existente), Open Food Facts (gratuito y abierto). La IA queda preparada
para el plan gratuito de Google AI Studio, sin activar.
