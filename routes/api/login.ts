import { Handler } from "$fresh/server.ts";
const hoge = ["ika","tako","peni","takos","takoyaki","ikayaki","okonomiyaki","shirasu","sushi","yakiniku"];
export const handler: Handler = (req, ctx) => {
  const index = Math.floor(Math.random() * 10);
  return Response.json({ food: hoge[index] });
};