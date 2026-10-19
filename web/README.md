# bigfive-web

Website for five factor model of personality based on work from [IPIP-NEO-PI](https://github.com/kholia/IPIP-NEO-PI).

Fork of [rubynor/bigfive-web](https://github.com/rubynor/bigfive-web) (MIT license), original project by Jonas Enge and contributors. Tests and evaluation are gathered from [ipip.ori.org](http://ipip.ori.org).

The frontend is written in [nodejs](https://nodejs.org) using the
[Next.js](https://nextjs.org/) framework. Results are saved to a [mongodb](https://www.mongodb.com/) database.

## Configuration

See `.env.example`. `DB_URL` is only needed at runtime (the build does not require it); `NEXT_PUBLIC_SITE_URL` is read at build time.

## Build and deployment

The app builds to a Next.js standalone output and ships with a `Dockerfile` (health check on `/api/health`).

```
docker build --build-arg NEXT_PUBLIC_SITE_URL=https://example.org -t bigfive-web .
docker run -p 3000:3000 --env-file .env bigfive-web
```

## Checks

```
pnpm typecheck
pnpm lint
pnpm build
pnpm audit --prod
```

## License

Licensed under the [MIT license](../LICENSE).
