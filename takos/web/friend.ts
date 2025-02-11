import {
  generateDeviceKey,
  isValidIdentityKeyPublic,
  keyHash,
  verifyMasterKey,
} from "@takos/takos-encrypt-ink";
import shareAccountKey from "../models/shareAccountKey.ts";
import app from "../userInfo.ts";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import Session from "../models/sessions.ts";
import IdentityKey from "../models/identityKey.ts";
import { load } from "@std/dotenv";
import friends from "../models/friends.ts";
import { fff } from "../utils/foundationReq.ts";
import Request from "../models/request.ts";
import { uuidv7 } from "npm:uuidv7@^1.0.2";

const env = await load();

app.post(
  "request",
  zValidator(
    "json",
    z.object({
      userName: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { userName } = c.req.valid("json");
    const name = userName.split("@")[0];
    const domain = userName.split("@")[1];
    if (!name || !domain) {
      return c.json({ message: "Invalid userName" }, 400);
    }
    if (name === user.userName && domain === env["domain"]) {
      return c.json({ message: "Invalid userName" }, 400);
    }
    const isFriend = await friends.findOne({
      userName: user.userName + "@" + env["domain"],
      friendName: userName,
    });
    if (isFriend) {
      return c.json({ message: "Already friend" }, 400);
    }
    if (domain !== env["domain"]) {
      const result = await fff(
        JSON.stringify({
          event: "t.friend.request",
          eventId: uuidv7(),
          payload: {
            userId: user.userName + "@" + env["domain"],
            friendId: userName,
          },
        }),
        [domain],
      );
      if (!Array.isArray(result) || result[0].status !== 200) {
        console.log(result);
        return c.json({ message: "Invalid userName" }, 400);
      }
      const res = await result[0].json();
      if (res.error) {
        return c.json({ message: "Invalid userName" }, 400);
      }
      await Request.create({
        type: "friend",
        sender: user.userName + "@" + env["domain"],
        receiver: userName,
        local: false,
        query: {},
      });
      return c.json({ message: "Request sent" });
    }
    if (domain === env["domain"]) {
      await Request.create({
        type: "friend",
        sender: user.userName + "@" + env["domain"],
        receiver: userName,
        local: true,
        query: {},
      });
      return c.json({ message: "Request sent" });
    }
  },
);

app.get(
  "/request",
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const limit = c.req.query("limit");
    const befor = c.req.query("befor");
    if (limit && befor) {
      const requests = await Request.find({
        receiver: user.userName + "@" + env["domain"],
        timestamp: { $lt: new Date(befor) },
      }).sort({ timestamp: -1 }).limit(Number(limit));
      return c.json({ requests });
    }
    const requests = await Request.find({
      receiver: user.userName + "@" + env["domain"],
    }).sort({ timestamp: -1 }).limit(limit ? Number(limit) : 10);
    return c.json({ requests });
  },
);

app.post(
  "/accept",
  zValidator(
    "json",
    z.object({
      id: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { id } = c.req.valid("json");
    const request = await Request.findOne({
      id: id,
      receiver: user.userName + "@" + env["domain"],
    });
    if (!request) {
      return c.json({ message: "Invalid request" }, 400);
    }
    if (request.type === "friend") {
      if (!request.local) {
        if (
          await friends.findOne({
            userName: request.sender,
            friendName: request.receiver,
          })
        ) {
          return c.json({ message: "Already friend" }, 400);
        }
        const res = await fff(
          JSON.stringify({
            event: "t.friend.accept",
            eventId: uuidv7(),
            payload: {
              userId: request.receiver,
              friendId: request.sender,
            }
          }),
          [request.sender.split("@")[1]],
        );
        if (!Array.isArray(res) || res[0].status !== 200) {
          return c.json({ message: "Invalid request" }, 400);
        }
        await friends.create({
          userName: request.receiver,
          friendId: request.sender,
        });
        await Request.deleteOne({ id: id });
        return c.json({ message: "Request accepted" });
      } else {
        await friends.create({
          userName: request.receiver,
          friendId: request.sender,
        });
        await Request.deleteOne({ id: id });
        return c.json({ message: "Request accepted" });
      }
    }
  },
);

app.get("/list", async (c) => {
  const user = c.get("user");
  const befor = c.req.query("befor");
  if (!user) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  let friendsList;
  if (befor) {
    friendsList = await friends.find({
      userName: user.userName + "@" + env["domain"],
      timestamp: { $lt: new Date(befor) },
    }).sort({ timestamp: -1 }).limit(10);
  } else {
    friendsList = await friends.find({
      userName: user.userName + "@" + env["domain"],
    }).limit(10);
  }
  return c.json(friendsList.map((friend) => friend.friendId));
});

export default app;
