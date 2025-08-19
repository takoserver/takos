import { assertEquals } from "@std/assert/mod.ts";
import mongoose from "mongoose";
import { MongoMemoryServer } from "npm:mongodb-memory-server";
import { MongoDB } from "./mongo.ts";
import { connectDatabase } from "../../shared/db.ts";
import ChatroomMember from "../models/takos/chatroom_member.ts";

Deno.test("メンバーに紐づくチャットルームを取得できる", async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  const env = { MONGO_URI: uri, ACTIVITYPUB_DOMAIN: "example.com" };
  await connectDatabase(env);
  await ChatroomMember.create([
    { roomId: "room1", member: "alice", status: "joined" },
    { roomId: "room2", member: "alice", status: "invited" },
    { roomId: "room3", member: "bob", status: "joined" },
  ]);
  const db = new MongoDB(env);
  const rooms = await db.listChatroomsByMember("alice");
  rooms.sort((a, b) => a.id.localeCompare(b.id));
  assertEquals(rooms, [
    { id: "room1", status: "joined" },
    { id: "room2", status: "invited" },
  ]);
  await mongoose.disconnect();
  await mongod.stop();
});
