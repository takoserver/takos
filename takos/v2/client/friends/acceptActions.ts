import type { Context } from "hono";
import Request from "@/models/requests.ts";
import User from "@/models/users.ts";
import friends from "@/models/friends.ts";
import { load } from "@std/dotenv";
const env = await load();
import { splitUserName } from "@/utils/utils.ts";
export async function acceptFriendRequest(
  c: Context,
  requestResult: {
    requesterId: string;
    targetName: string;
    request: any;
    type: "friend" | "group";
    uuid: string;
  },
) {
    const { requesterId, targetName } = requestResult;
    const { userName: requesterName, domain: requesterDomain } = splitUserName(requesterId);
    if(requesterDomain !== env["DOMAIN"]) return c.json({ status: false, message: {
        error: "developing",
    } }, 400);
    await friends.create({
        userName: requesterName,
        friendId: targetName,
    });
    await friends.create({
        userName: targetName,
        friendId: requesterName,
    });
    await Request.deleteOne({ uuid: requestResult.uuid });
    return c.json({ status: true });
}

