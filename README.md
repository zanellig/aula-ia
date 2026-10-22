# Aula IA

Reescritura de [krew-prueba-tecnica](https://github.com/zanellig/krew-prueba-tecnica) para que cargue más rápido: Astro con islas de Preact en lugar de TanStack Start. El backend de Convex es el mismo.

Las páginas públicas se sirven desde la caché del CDN y casi no llevan JavaScript. Lo que depende del usuario (sesión, reservas) se dibuja en el navegador.

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
