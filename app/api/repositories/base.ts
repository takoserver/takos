import type {
  Document,
  FilterQuery,
  Model,
  PipelineStage,
  SortOrder,
  UpdateQuery,
} from "mongoose";

export default class BaseRepository<T extends Document> {
  constructor(protected model: Model<T>) {}

  async create(data: Record<string, unknown>, env?: Record<string, string>) {
    const doc = new this.model(data);
    if (env) {
      (doc as unknown as { $locals?: { env?: Record<string, string> } })
        .$locals = { env };
    }
    await doc.save();
    return doc as T;
  }

  async find(
    filter: FilterQuery<T>,
    sort?: Record<string, SortOrder>,
    limit?: number,
  ) {
    const query = this.model.find(filter).sort(sort ?? {});
    if (typeof limit === "number") query.limit(limit);
    return await query.lean<T[]>();
  }

  async findOne(filter: FilterQuery<T>) {
    return await this.model.findOne(filter).lean<T | null>();
  }

  async findById(id: string) {
    return await this.model.findById(id).lean<T | null>();
  }

  async update(filter: FilterQuery<T>, update: UpdateQuery<T>) {
    return await this.model.findOneAndUpdate(filter, update, { new: true });
  }

  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options = {},
  ) {
    return await this.model.updateOne(filter, update, options);
  }

  async delete(filter: FilterQuery<T>) {
    return await this.model.findOneAndDelete(filter);
  }

  async deleteMany(filter: FilterQuery<T>) {
    return await this.model.deleteMany(filter);
  }

  async aggregate(pipeline: PipelineStage[]) {
    return await this.model.aggregate(pipeline).exec();
  }
}
