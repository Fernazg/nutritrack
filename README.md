# NutriTrack

PWA personal de nutrición, optimizada para iPhone. Sin cuentas: todos los datos viven en el dispositivo (IndexedDB).

## Stack

- Next.js 16 (App Router, Cache Components) + React 19 + TypeScript
- Tailwind CSS 4
- Dexie (IndexedDB) para almacenamiento local
- lucide-react para íconos
- @zxing/browser para leer códigos de barras
- Open Food Facts (datos abiertos, ODbL) para productos envasados
- Vitest para pruebas unitarias

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # compilación de producción
npm run lint
npm test         # pruebas unitarias (Vitest)
```

## Estructura

```
src/
  app/                 Rutas (App Router), manifest, íconos
    (tabs)/            Pantallas con navegación inferior
  components/
    layout/            Navegación inferior
    pwa/               Service worker e ícono
    ui/                Componentes reutilizables (Card, Sheet, Field…)
  app/api/             Rutas del backend: /alimentos (Open Food Facts) e /ia (opcional)
  features/            Módulos por funcionalidad
    activity/  ai/  dashboard/  foods/  meals/  progress/  scanner/  settings/  water/
  lib/
    db/                Esquema Dexie (v3), hooks de lectura y repositorio de escritura
    nutrition/         Lógica pura y testeada: energía (BMR/TDEE), porciones, estadísticas, actividad
    server/            Código solo de servidor: Open Food Facts y proveedor de IA
  types/               Tipos del dominio
```

## Variables de entorno

Copia `.env.example` a `.env.local`. Las claves API son **solo de servidor**: nunca uses el prefijo `NEXT_PUBLIC_` para ellas. En Vercel se configuran en *Settings → Environment Variables*.

## Despliegue

Conectado a Vercel: cada push a `main` publica una nueva versión automáticamente.

## Documentación

- [docs/INVESTIGACION.md](docs/INVESTIGACION.md): fuentes de los cálculos y decisiones.
- [docs/IA.md](docs/IA.md): cómo activar la IA gratuita (opcional).
- [docs/INFORME-NOCTURNO.md](docs/INFORME-NOCTURNO.md): informe de la jornada del 9-nov-2026.
