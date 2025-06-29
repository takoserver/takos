(function () {
  try {
    const extensionId = "__EXTENSION_ID__";

    const pending = new Map();
    let seq = 0;
    const requestHandlers = new Map();

    const worker = new Worker("/api/extensions/" + extensionId + "/client.js", {
      type: "module",
    });

    function callWorker(type, name, payload) {
      return new Promise((resolve) => {
        const id = ++seq;
        pending.set(id, resolve);
        worker.postMessage({ id, type, name, payload });
      });
    }

    worker.onmessage = (ev) => {
      const { id, type, name, payload, result } = ev.data || {};
      if (id && pending.has(id)) {
        pending.get(id)(result);
        pending.delete(id);
      } else if (type === "request" && name) {
        const handler = requestHandlers.get(name);
        Promise.resolve(handler?.(payload)).then((res) => {
          if (id) worker.postMessage({ id, result: res });
        });
      }
    };

    window.addEventListener("message", (ev) => {
      if (ev.data && ev.data.target === "takos-worker") {
        worker.postMessage(ev.data.payload);
      }
    });

    window.takos = {
      extensions: {
        get: (extId) => ({
          identifier: extId,
          request: (name, payload) =>
            callWorker("extension", `${extId}:${name}`, payload),
        }),
        onRequest: (name, handler) => {
          requestHandlers.set(name, handler);
          return () => requestHandlers.delete(name);
        },
      },
      events: {
        request: (name, payload) => callWorker("event", name, payload),
        onRequest: (name, handler) => {
          requestHandlers.set(name, handler);
          return () => requestHandlers.delete(name);
        },
      },
    };

    console.log("Takos object initialized for extension:", extensionId);
  } catch (e) {
    console.error("Failed to initialize takos object:", e);
    // Fallback basic takos object
    window.takos = {
      extensions: {
        get: () => {
          console.error("Extension system not available");
          return {
            identifier: "",
            request: () =>
              Promise.reject(new Error("Extension system not available")),
          };
        },
        onRequest: () => () => {},
      },
      events: {
        request: () => {
          console.error("Event system not available");
          return Promise.resolve();
        },
      },
    };
  }
})();
