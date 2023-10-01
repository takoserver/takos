import { Handler } from "$fresh/server.ts";
import { ShorthandPropertyAssignment } from "https://deno.land/x/ts_morph@17.0.1/ts_morph.js";
const hoge = ["ika","tako","peni","takos","takoyaki","ikayaki","okonomiyaki","shirasu","sushi","yakiniku"];
export const handler: Handler = () => {
  const index = Math.floor(Math.random() * 10);
  return Response.json({ 
    food: hoge[index],
    age: 15,
    FirstName: "Shota",
    SecondName: "Tomiyama"
  });
};