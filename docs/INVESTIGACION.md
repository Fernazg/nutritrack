# Investigación y decisiones (noviembre 2026)

Resumen de lo investigado durante la jornada del 9-nov-2026. Solo se registran
hallazgos con fuente; donde la fuente es interesada (blog de un competidor) se indica.

## 1. Apps de referencia

Fuentes revisadas: comparativas publicadas en el blog de Fitia (fuente interesada:
tómese como marketing), y comparativas de terceros. No se descargaron ni usaron
las apps; el análisis se limita a lo publicado.

| Tema | Lo que reportan las fuentes | Aplicación en NutriTrack |
|---|---|---|
| Base de datos | Fitia y Cronometer se describen con bases verificadas; MyFitnessPal con entradas de usuarios (grande pero sin verificar). | Open Food Facts (abierta) + alimentos propios guardados. Se muestra el origen de los datos. |
| Código de barras | Disponible en MyFitnessPal, Lose It!, Cronometer y YAZIO. | Escáner con cámara (ZXing) + ingreso manual del código. |
| Planificación | Fitia ofrece planes automáticos; MyFitnessPal lo reserva a su plan superior; Cronometer no lo tiene. | Pendiente (ver informe). |
| Registro rápido | Fitia destaca foto/voz/texto; otras requieren más pasos manuales. | Recientes, favoritos, porciones en un toque, "repetir comida del día anterior". Foto con IA preparada. |
| Micronutrientes | Cronometer es el más completo (80+ nutrientes). | Fuera de alcance por ahora (Open Food Facts trae algunos; no se muestran aún). |
| Agua | Las comparativas consultadas no lo cubrían. | Implementado igualmente (pedido explícito). |

Fuentes:
- https://fitia.app/learn/article/best-myfitnesspal-alternatives-2026/ (interesada)
- https://fitia.app/learn/article/fitia-vs-cronometer (interesada)
- https://techpoint.africa/guide/myfitnesspal-alternatives-accurate-tracking/
- https://thinkmobiles.com/blog/best-calorie-counting-apps

Oportunidades de diferenciación para un uso personal: sin cuentas ni anuncios,
datos 100 % locales con respaldo propio, comidas chilenas (once, colación),
transparencia de cálculos y origen de datos.

## 2. Cálculos nutricionales

- **Metabolismo basal**: ecuación de Mifflin-St Jeor (Mifflin et al., 1990).
  La revisión sistemática de Frankenfield, Roth-Yousey y Compher (J Am Diet Assoc
  2005;105:775-789) la identificó como la más probable de estimar el gasto en
  reposo dentro de ±10 %, advirtiendo errores individuales relevantes.
  https://pubmed.ncbi.nlm.nih.gov/15883556/
- **Gasto total (TDEE)**: BMR × factor de actividad estándar (1,2 a 1,9).
- **Déficit**: ritmo elegido × 7.700 kcal/kg ÷ 7, con dos salvaguardas:
  máximo 25 % del TDEE y mínimo de 1.200 kcal (mujer) / 1.500 kcal (hombre).
  7.700 kcal/kg es una aproximación clásica; la pérdida real se desacelera.
- **Proteína**: g/kg configurable (1,2 · 1,6 · 2,0 · 2,2; por defecto 1,6).
  La posición de la ISSN asocia 1,6–2,2 g/kg con entrenamiento de fuerza a la
  ganancia muscular, y rangos mayores a la retención de masa magra en déficit.
  https://pubmed.ncbi.nlm.nih.gov/28630601/ · https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0174-y
  Con IMC ≥ 30 se usa el peso correspondiente a IMC 25 como referencia
  (aproximación práctica, documentada en el código).
- **Grasa**: 25 % de las calorías. **Carbohidratos**: el resto.
- **Agua**: ~35 ml/kg/día redondeado a 250 ml (regla práctica; editable).

Todo se presenta como estimación, nunca como indicación médica.

## 3. Datos de alimentos: Open Food Facts

- API abierta y gratuita; datos bajo licencia ODbL (atribución + compartir igual).
- Piden un User-Agent descriptivo y moderar la tasa de consultas.
- Documentación: https://openfoodfacts.github.io/openfoodfacts-server/api/
- Condiciones: https://support.openfoodfacts.org/help/en-gb/12-api-data-reuse/94-are-there-conditions-to-use-the-api
- Durante la jornada el buscador clásico (`cgi/search.pl`) devolvió "temporarily
  unavailable"; se usa el buscador nuevo `search.openfoodfacts.org` (Search-a-licious),
  verificado con resultados chilenos (Colun).
- Las consultas pasan por rutas del servidor (`/api/alimentos/*`) que fijan el
  User-Agent y permiten caché en el CDN de Vercel (menos llamadas a OFF).

## 4. IA gratuita

- Google Gemini API tiene un plan gratuito en Google AI Studio, con límites por
  proyecto que Google muestra en la consola de AI Studio.
  https://ai.google.dev/gemini-api/docs/pricing · https://ai.google.dev/gemini-api/docs/rate-limits
- Advertencia de privacidad: en el plan gratuito, Google puede usar las
  solicitudes para mejorar sus productos. Por eso solo se envían macros
  restantes y la comida, nunca datos personales.
- Se dejó la integración lista y desactivada (ver `docs/IA.md`).
