# Activar la IA (opcional, gratuita)

NutriTrack funciona completo sin IA. Si quieres ideas de comidas generadas por IA:

1. Entra a https://aistudio.google.com con tu cuenta de Google y crea una
   **API key**. No asocies una cuenta de facturación: así solo existe el plan
   gratuito y no puede haber cobros.
2. Genera un secreto largo y aleatorio para `APP_ACCESS_TOKEN` (por ejemplo,
   en PowerShell: `[guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()`).
3. En Vercel → proyecto `nutritrack` → **Settings → Environment Variables**, agrega:
   - `AI_API_KEY` = la clave de AI Studio
   - `APP_ACCESS_TOKEN` = el secreto del paso 2
   - (opcional) `AI_MODEL` = `gemini-2.5-flash`
4. Vuelve a desplegar (Deployments → Redeploy).
5. En la app: **Ajustes → Inteligencia artificial** debe decir "Configurada".
   Pega ahí el mismo `APP_ACCESS_TOKEN` y guárdalo. Aparecerá la tarjeta
   "Ideas con IA" en Inicio.

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

## Próximos pasos con IA

- Análisis de fotos de comida y de etiquetas (Gemini acepta imágenes): las
  pantallas ya existen en `/escanear/foto` y `/escanear/etiqueta`.
- Menú semanal y recetas a partir de los macros objetivo.
