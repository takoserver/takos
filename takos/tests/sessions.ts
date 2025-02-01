/*
const response = await fetch("http://localhost:8000/sessions/register/temp",{
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        email: "shoutatomiyama0614@gmail.com"
    }),
})

console.log(await response.json());
*/

import { uuidv7 } from "npm:uuidv7@^1.0.2";

const response = await fetch("http://localhost:8000/sessions/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    userName: "tako",
    password: "takagaki0614",
    sessionUUID: uuidv7(),
  }),
});

console.log(await response.json());

//"c46aba64031b9988f43d9ab1185d686f"
