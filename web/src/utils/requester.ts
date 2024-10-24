export function requester(domain: string, type: string, body: Object) {
  return fetch(`https://${domain}/takos/v2/client`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: type,
      query: body,
    }),
  });
}
