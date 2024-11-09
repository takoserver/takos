import { Hono } from "hono";
import { array, z } from "zod";
import { Singlend } from "@evex/singlend";
import { cors } from "hono/cors";
import serverKey from "../../models/serverKey.ts";
import { verifyData } from "@takos/takos-encrypt-ink";
const app = new Hono();
const singlend = new Singlend();



singlend.on(
    "getServerKey",
    z.object({}),
    async (_query, ok, error) => {
    const key = await serverKey.findOne({}).sort({ timestamp: -1 });
    if (!key) {
        return error("aaa", 500);
    }
      return ok({
        pubKey: key.public,
        expire: key.expire,
        timestamp: key.timestamp,
      });
    },
);

singlend.group(
    z.object({
        signature: z.string(),
        signedKeytimestamp: z.string(),
        request: z.string()
    }),
    async (query, next, error) => {
        const key = await serverKey.findOne({
            timestamp: query.signedKeytimestamp
        })
        if (!key) {
            return error("aaa", 500);
        }
        if(new Date(key.expire) < new Date()) {
            return error("aaa", 500);
        }
        if(!verifyData(query.request, query.signature, key.public)) {
            return error("aaa", 500);
        }
        const request = JSON.parse(query.request);
        return next({
            request
        });
    },
    (singlend) =>{
        singlend.on(
            "requestFriend",
            z.object({}),
            (query, value, ok) => {
                return ok("test");
            }
        )
        singlend.on(
            "acceptFriend",
            z.object({}),
            async (_query,value, ok, error) => {
            },
        );
        singlend.on(
            "rejectFriend",
            z.object({}),
            async (_query, value, ok, error) => {
            },
        );
        singlend.on(
            "inviteGroup",
            z.object({}),
            async (_query, value, ok, error) => {
            },
        );
        singlend.on(
            "acceptInviteGroup",
            z.object({}),
            async (_query, value, ok, error) => {
            },
        );
        singlend.on(
            "rejectInviteGroup",
            z.object({}),
            async (_query, value, ok, error) => {
            },
        );
        singlend.on(
            "leaveGroup",
            z.object({}),
            async (_query, value, ok, error) => {
            },
        );
        singlend.on(
            "kickGroup",
            z.object({}),
            async (_query, value, ok, error) => {
            },
        );
        return singlend
    }
)

app.post("/", singlend.handler());
export default app;