# Vite + Deno + Solid + TypeScript

## Running

You need to have Deno v1.28.0 or later installed to run this repo.

Start a dev server:

```
$ deno task dev
```

The development server proxies API requests to `localhost:8000`. To allow
Mastodon and other ActivityPub clients to reach your backend while using the
Vite dev server, the proxy is also configured for `/.well-known`, `/users` and
`/inbox` paths.

## Deploy

Build production assets:

```
$ deno task build
```

## Notes

- You need to use `.mjs` or `.mts` extension for the `vite.config.[ext]` file.

## Papercuts

Currently there's a "papercut" for Deno users:

- peer dependencies need to be referenced in `vite.config.js` - in this example
  it is only `solid-js` package that needs to be referenced
