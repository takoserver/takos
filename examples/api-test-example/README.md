# API Test Example Extension

This example demonstrates basic usage of the Takos v3 APIs.

## Build

```bash
cd examples/api-test-example
deno task build
```

After building, install the generated `.takopack` file in Takos and open the UI page.

The UI allows you to:

- Call a server function (`ping`)
- Write and read values via the KV API
- Send a simple ActivityPub Note

Results appear in the output panel.
