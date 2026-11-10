# Activar la IA (opcional, gratuita)

NutriTrack funciona completo sin IA. La IA activa el **análisis de fotos de comida**
(Escanear → Foto de comida) y las **ideas de comidas** en Inicio. Para activarla:

1. Entra a https://aistudio.google.com con tu cuenta de Google y crea una
   **API key**. No asocies una cuenta de facturación: así solo existe el plan
   gratuito y no puede haber cobros.
2. Genera un secreto largo y aleatorio para `APP_ACCESS_TOKEN` (por ejemplo,
   en PowerShell: `[guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()`).
3. En Vercel → proyecto `nutritrack` → **Settings → Environment Variables**, agrega:
   - `AI_API_KEY` = la clave de AI Studio
   - `APP_ACCESS_TOKEN` = el secreto del paso 2
   - (opcional) `AI_MODEL`: déjalo vacío; por defecto usa `gemini-flash-lite-latest` (responde en 1–2 s) y, si está saturado, `gemini-flash-latest` (Google retiró `gemini-2.5-flash` para cuentas nuevas)
4. Vuelve a desplegar (Deployments → Redeploy).
5. En la app: **Ajustes → Inteligencia artificial** debe decir "Configurada".
   Pega ahí el mismo `APP_ACCESS_TOKEN` y guárdalo. Aparecerá la tarjeta
   "Ideas con IA" en Inicio y se habilita Escanear → Foto de comida.

## Seguridad

- La clave nunca llega al navegador: solo la usa `src/lib/server/ai.ts`.
- `/api/ia/sugerencias` exige el header `x-app-token` (comparación en tiempo
  constante). Sin él responde 401, así nadie más gasta tu cuota.
- Si se supera el límite gratuito, la API responde 429 y la app lo informa.

## Estado verificado (9-nov-2026)

- Sin variables: `/api/ia/estado` → `configured:false`; sugerencias → 503.
- Con token incorrecto → 401. Datos inválidos → 400.
- Con clave falsa → 502 controlado (Google rechaza la clave).
- **No se pudo probar una respuesta real** porque no hay una clave configurada.

## Foto de comida (`/api/ia/foto`)

- La app reduce la foto en el teléfono (JPEG, lado mayor 1280 px) y la envía
  con el token. El servidor la reenvía a Gemini; la app no la guarda.
- La IA solo identifica alimentos y estima gramos. Si el alimento coincide con
  la lista USDA de la app (`id_usda`), las calorías salen de USDA; si no, se usa
  la estimación de la IA y se muestra como "Estimación IA" (y en el diario como
  "(estimado)"). Todo es editable antes de registrar.
- La respuesta se valida en `src/lib/nutrition/photo.ts`: ids inexistentes,
  gramos fuera de 1–2000 o macros imposibles se descartan.
- Plan gratuito: Google puede usar las imágenes para mejorar sus productos.
  No fotografiar personas ni datos personales.

## Próximos pasos con IA

- Etiquetas nutricionales (`/escanear/etiqueta`) con la misma clave.
- Menú semanal y recetas a partir de los macros objetivo.
