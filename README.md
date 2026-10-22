# Aula IA

Reescritura de [krew-prueba-tecnica](https://github.com/zanellig/krew-prueba-tecnica) para que cargue más rápido: Astro con islas de Preact en lugar de TanStack Start. El backend de Convex es el mismo.

**Demo:** https://aula-ia-clases.vercel.app (Vercel, con Convex de producción). Para reservar, creá una cuenta desde "Ingresar"; no hace falta verificar el email.

## Cómo está armado

- Las páginas públicas (`/` y `/profesores/<slug>`) se generan en el servidor sin mirar la sesión, y el CDN de Vercel las guarda: `Cache-Control: public, s-maxage=60, stale-while-revalidate=86400`. Como son iguales para todos, se pueden compartir.
- Lo que depende del usuario (la cuenta en el header, la reserva, "Mis clases") se dibuja en el navegador, en islas de Preact que hablan directo con Convex.
- La grilla de horarios del perfil se actualiza en vivo por el websocket de Convex. El cliente de Convex se carga después de mostrar la página.
- Better Auth corre dentro de Convex. `/api/auth/*` reenvía los pedidos a Convex para que la cookie de sesión quede en este dominio.

## Requisitos

- [Bun](https://bun.sh) 1.3 o superior
- Una cuenta de [Convex](https://convex.dev) es opcional. `convex dev` puede levantar un backend local sin cuenta.

## Instalación

```sh
git clone git@github.com:zanellig/aula-ia.git
cd aula-ia
bun install
```

1. Creá el deployment de Convex con `bunx convex dev --once`. El comando escribe `.env.local` con las URLs del deployment.

   El primer push falla con `Required environment variables are not set: BETTER_AUTH_SECRET, SITE_URL`. Es lo esperado: falta cargar las variables de Better Auth.

2. Cargá esas dos variables en el deployment:

   ```sh
   bunx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
   bunx convex env set SITE_URL http://localhost:4321
   ```

3. Corré `bun run dev` y abrí http://localhost:4321.

## Comandos

| Comando             | Qué hace                                                                             |
| ------------------- | ------------------------------------------------------------------------------------ |
| `bun run dev`       | Sube las funciones a Convex, corre el seed y levanta la app en http://localhost:4321 |
| `bun run test`      | Corre los tests del backend (vitest + convex-test)                                   |
| `bun run typecheck` | Chequeo de tipos con `astro check`                                                   |
| `bun run build`     | Build de producción para Vercel                                                      |
| `bun run e2e`       | Tests end-to-end con Playwright contra `astro dev` y el deployment de `.env.local`    |

`E2E_BASE_URL=https://aula-ia-clases.vercel.app bun run e2e` corre los mismos tests contra un deploy. Crean usuarios `e2e-*@example.com` en ese deployment.

## Deploy

La demo es el proyecto `aula-ia-clases` de Vercel, y el backend es el deployment de producción del proyecto `aula-ia` de Convex. Para replicarlo:

```sh
bunx convex env set --prod BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
bunx convex env set --prod SITE_URL https://<tu-dominio>.vercel.app
bunx convex deploy
bunx convex run --prod seed:run
```

En Vercel hay que cargar `CONVEX_URL` y `CONVEX_SITE_URL` con las URLs `.convex.cloud` y `.convex.site` del deployment de producción, y desplegar con `vercel deploy --prod`. `CONVEX_URL` queda dentro del JavaScript en el build, así que cambiarla pide un deploy nuevo. Los cambios en `convex/` se publican con `bunx convex deploy`, porque Vercel solo construye el frontend.
