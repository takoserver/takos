import { generateServerKey, signData, verifyData } from "@takos/takos-encrypt-ink";
import serverKey from "../models/serverKey.ts";
import otherServerKey from "../models/otherServerKey.ts";
import env from "./env.ts";

async function requesterServer(
    server: string,
    type: string,
    request: string
) {
    let key = await serverKey.findOne({}).sort({ timestamp: -1 });
    if (!key || new Date(new Date(key.expire).getTime() - 24 * 60 * 60 * 1000) < new Date()) {
        const newKey = generateServerKey();
        key = await serverKey.create({
            public: newKey.public,
            private: newKey.private,
        });
    }
    const signature = signData(request, key.private);
    const response = await fetch(`https://${server}/takos/v2/server`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            type,
            query: {
                signature,
                request,
                keyTimestamp: key.timestamp,
                keyExpire: key.expire,
                serverDomain: env["DOMAIN"],
            }
        }),
    });
    return await response.json();
}

async function verifyDataServer(
    body:{
        signature: string
        request: string
        keyTimestamp: string
        keyExpire: string
        serverDomain: string
    }
): Promise<[boolean, any]> {
    const cacheKey = await otherServerKey.findOne({
        domain: body.serverDomain,
        timestamp: body.keyTimestamp,
    })
    if (!cacheKey) {
        const latestKey = await (await fetch(`https://${body.serverDomain}/takos/v2/server`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                type: "getServerKey",
                query: {}
            }),
        })).json();
        if (!latestKey.pubKey) {
            return [false, null];
        }
        const verify = verifyData(body.request, body.signature, latestKey.pubKey);
        if (!verify) {
            return [false, null];
        }
        await otherServerKey.create({
            public: latestKey.pubKey,
            domain: body.serverDomain,
            timestamp: latestKey.timestamp,
            expire: latestKey.expire,
        })
        return [true, JSON.parse(body.request)];
    } else {
        if(new Date(cacheKey.expire) < new Date()) {
            return [false, JSON.parse(body.request)];
        }
        const verify = verifyData(body.request, body.signature, cacheKey.public);
        if (!verify) {
            return [false, null];
        }
        return [true, JSON.parse(body.request)];
    }
}

export { requesterServer, verifyDataServer };