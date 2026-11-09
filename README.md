# NutriTrack

PWA personal de nutrición, optimizada para iPhone. Sin cuentas: todos los datos viven en el dispositivo (IndexedDB).

## Stack

- Next.js 16 (App Router, Cache Components) + React 19 + TypeScript
- Tailwind CSS 4
- Dexie (IndexedDB) para almacenamiento local
- lucide-react para íconos

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # compilación de producción
npm run lint
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
  features/            Módulos por funcionalidad
    dashboard/  meals/  progress/  scanner/  settings/
  lib/
    db/                Esquema Dexie, hooks de lectura y repositorio de escritura
    nutrition/         Comidas, metas por defecto, totales
    server/            Código solo de servidor (claves API)
  types/               Tipos del dominio
```

## Variables de entorno

Copia `.env.example` a `.env.local`. Las claves API son **solo de servidor**: nunca uses el prefijo `NEXT_PUBLIC_` para ellas. En Vercel se configuran en *Settings → Environment Variables*.

## Despliegue

Conectado a Vercel: cada push a `main` publica una nueva versión automáticamente.
