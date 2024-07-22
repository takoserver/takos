//フレンド申請を承認する
// POST /api/v2/client/friends/accept/friend
// { friendid: string}
// -> { status: boolean }
import friends from "../../../../../../models/friends.ts";
import users from "../../../../../../models/users.ts";