import { Hono } from "hono";
import { array, z } from "zod";
import { Singlend } from "@evex/singlend";
import { cors } from "hono/cors";
import serverKey from "../../models/serverKey.ts";
import { verifyData } from "@takos/takos-encrypt-ink";
import { verifyDataServer } from "../../utils/requesterServer.ts";
import requestDB from "../../models/request.ts";
import { splitUserName } from "../../utils/utils.ts";
import { getTimestampFromUUIDv7 } from "../../utils/uuidToTimeStamp.ts";
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
        request: z.string(),
        keyTimestamp: z.string(),
        keyExpire: z.string(),
        serverDomain: z.string(),
    }),
    async (query, next, error) => {
        const verify = await verifyDataServer(query);
        if(verify[0]) {
            return next({
                request: verify[1],
                serverDomain: query.serverDomain,
            });
        }
        return error("error", 500);
    },
    (singlend) =>{
        singlend.on(
            "requestFriend",
            z.object({}),
            async (query, value, ok) => {
                if(await requestDB.findOne({
                    sender: value.request.sender,
                    receiver: value.request.receiver,
                    type: "friendRequest",
                })) {
                    return ok("already requested");
                }
                const { domain: userDoamin } = splitUserName(value.request.requestid)
                const { domain: idDomain, userName: uuidv7 } = splitUserName(value.request.id)
                const serverDomain = query.serverDomain;
                if(userDoamin !== serverDomain || idDomain !== serverDomain) {
                    return ok("not same domain");
                }
                const timestamp = new Date(getTimestampFromUUIDv7(uuidv7)).getTime();
                if(timestamp < new Date().getTime() - 5 * 60 * 1000) {
                    return ok("timeout");
                }
                await requestDB.create({
                    id: value.request.id,
                    sender: value.request.sender,
                    receiver: value.request.receiver,
                    type: "friendRequest",
                    query: value.request.query,
                });
                return ok({
                    status: true,
                });
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