import type { Context } from "hono";
import Request from "@/models/requests.ts";
import friends from "@/models/friends.ts";
import { load } from "@std/dotenv";
const env = await load();
import { splitUserName } from "@/utils/utils.ts";
import sendRequests from "@/models/sendRequests.ts";
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
}
