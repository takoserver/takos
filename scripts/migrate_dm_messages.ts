import mongoose from "mongoose";
import { loadConfig } from "../app/shared/config.ts";
import { connectDatabase } from "../app/shared/db.ts";
import DMMessage from "../app/api/models/takos/dm_message.ts";

const encryptedMessageSchema = new mongoose.Schema({
  from: String,
  to: [String],
  content: String,
  createdAt: Date,
});

const EncryptedMessage = mongoose.model(
  "EncryptedMessage",
  encryptedMessageSchema,
);

async function main() {
  const env = await loadConfig();
  await connectDatabase(env);
  const list = await EncryptedMessage.find().lean<{
    from: string;
    to: string[];
    content: string;
    createdAt?: Date;
  }[]>();
  for (const msg of list) {
    if (!msg.to || msg.to.length === 0) continue;
    const doc = new DMMessage({
      from: msg.from,
      to: msg.to[0],
      content: msg.content,
      createdAt: msg.createdAt,
    });
    if (env["DB_MODE"] === "host") {
      (doc as unknown as { $locals?: { env?: Record<string, string> } })
        .$locals = { env };
    }
    await doc.save();
  }
  console.log(`${list.length} 件のメッセージを移行しました`);
}

if (import.meta.main) {
  main().catch((e) => console.error(e));
}
