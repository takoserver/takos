### /api/extensions/:id/ui

GET request to retrieve the HTML UI for the specified extension. The response
body contains the HTML with a helper script that exposes the parent window's
`takos` API. Intended for loading the UI within a sandboxed `<iframe>`.

### extensions:list event

Returns a list of installed extensions.

```json
[
  {
    "identifier": "com.example.demo",
    "name": "Demo Extension",
    "version": "1.0.0",
    "icon": "/path/icon.png"
  }
]
```
