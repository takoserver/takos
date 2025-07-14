import FollowEdge from "../models/follow_edge.ts";
import type { PipelineStage } from "mongoose";

export async function getTimeline(
  tenantId: string,
  actorUri: string,
  limit = 40,
) {
  const pipeline: PipelineStage[] = [
    { $match: { tenant_id: tenantId } },
    {
      $lookup: {
        from: "objectstores",
        localField: "actor_id",
        foreignField: "actor_id",
        as: "objs",
      },
    },
    { $unwind: "$objs" },
    {
      $match: {
        $or: [
          { "objs.aud.to": actorUri },
          { "objs.aud.cc": actorUri },
          { "objs.aud.to": "https://www.w3.org/ns/activitystreams#Public" },
        ],
      },
    },
    { $sort: { "objs.created_at": -1 } },
    { $limit: limit },
  ];
  const result = await FollowEdge.aggregate(pipeline);
  return result.map((doc) => doc.objs);
}
