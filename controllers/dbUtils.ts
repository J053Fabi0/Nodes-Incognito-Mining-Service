import {
  Filter,
  ObjectId,
  Document,
  Collection,
  FindOptions,
  UpdateFilter,
  CountOptions,
  InsertOptions,
  UpdateOptions,
  DeleteOptions,
  InsertDocument,
  AggregateOptions,
  AggregatePipeline,
} from "mongo/mod.ts";
import CommonCollection from "../types/collections/commonCollection.type.ts";

export type InsertDoc<T = CommonCollection> = InsertDocument<
  Omit<T, keyof CommonCollection> & { createdAt?: Date; modifiedAt?: Date; _id: ObjectId }
>;

type UnPromisify<T> = T extends Promise<infer U> ? U : T;
type DocumentOfCollection<T extends Collection<CommonCollection>> = Exclude<
  UnPromisify<ReturnType<T["findAndModify"]>>,
  undefined
>;

type ProjectionValues = boolean | 1 | 0;

/** given a collection, return a type that has a projection property */
export type Projection<Collection extends CommonCollection> = {
  [key in keyof Collection]?: ProjectionValues;
};

type OnlyTruthy<P extends { [key in keyof P]?: boolean | 0 | 1 }> = {
  [K in keyof P]: P[K] extends 1 | true ? K : never;
}[keyof P];

/** given a collection and a projection of that collection, returns the collection projected */
export type Projected<C extends CommonCollection, P extends Projection<C> | undefined> = P extends Projection<C>
  ? Pick<C, Extract<OnlyTruthy<P>, keyof C>>
  : C;

/** FindOptions with a well typed projection option */
type FindOptionsExtended<C extends Collection<CommonCollection>> = Omit<FindOptions, "projection"> & {
  projection?: Projection<DocumentOfCollection<C>>;
};

export function find<C extends Collection<CommonCollection>>(collection: C) {
  return function <O extends FindOptionsExtended<C>>(filter?: Filter<DocumentOfCollection<C>>, options?: O) {
    return collection.find(filter, options).toArray() as Promise<
      O extends { projection: Projection<DocumentOfCollection<C>> }
        ? Projected<DocumentOfCollection<C>, O["projection"]>[]
        : DocumentOfCollection<C>[]
    >;
  };
}

export function findOne<C extends Collection<CommonCollection>>(collection: C) {
  return function <O extends FindOptionsExtended<C>>(filter?: Filter<DocumentOfCollection<C>>, options?: O) {
    return collection.findOne(filter, options).then((v) => v ?? null) as Promise<
      | (O extends { projection: Projection<DocumentOfCollection<C>> }
          ? Projected<DocumentOfCollection<C>, O["projection"]>
          : DocumentOfCollection<C>)
      | null
    >;
  };
}

export function findById<C extends Collection<CommonCollection>>(collection: C) {
  return function <O extends FindOptionsExtended<C>>(id: string | ObjectId, options?: O) {
    return collection
      .findOne({ _id: typeof id === "string" ? new ObjectId(id) : id }, options)
      .then((v) => v ?? null) as Promise<
      | (O extends { projection: Projection<DocumentOfCollection<C>> }
          ? Projected<DocumentOfCollection<C>, O["projection"]>
          : DocumentOfCollection<C>)
      | null
    >;
  };
}

export function insertOne<C extends Collection<CommonCollection>>(collection: C) {
  return async (doc: InsertDoc<DocumentOfCollection<C>>, options?: InsertOptions) => {
    // set createdAt and modifiedAt if they are not present
    const date = new Date();
    if (!doc.createdAt || typeof doc.createdAt !== "object" || !(doc.createdAt instanceof Date))
      doc.createdAt = date;
    if (!doc.modifiedAt || typeof doc.modifiedAt !== "object" || !(doc.modifiedAt instanceof Date))
      doc.modifiedAt = date;

    const _id = await collection.insertOne(doc as InsertDocument<CommonCollection>, options);

    return Object.assign({ _id }, doc as Required<typeof doc>);
  };
}

export function insertMany<C extends Collection<CommonCollection>>(collection: C) {
  return async (docs: InsertDoc<DocumentOfCollection<C>>[], options?: InsertOptions) => {
    // set createdAt and modifiedAt if they are not present
    const date = new Date();
    for (const doc of docs) {
      if (!doc.createdAt || typeof doc.createdAt !== "object" || !(doc.createdAt instanceof Date))
        doc.createdAt = date;
      if (!doc.modifiedAt || typeof doc.modifiedAt !== "object" || !(doc.modifiedAt instanceof Date))
        doc.modifiedAt = date;
    }

    const { insertedIds } = await collection.insertMany(docs as InsertDocument<CommonCollection>[], options);

    return insertedIds.map((id, i) => Object.assign({ _id: id }, docs[i] as Required<(typeof docs)[number]>));
  };
}

export function count<C extends Collection<CommonCollection>>(collection: C) {
  return (filter?: Filter<DocumentOfCollection<C>>, options?: CountOptions) =>
    collection.countDocuments(filter, options);
}

function addTimestamps(update: UpdateFilter<CommonCollection>) {
  if (update.$set && !update.$set.modifiedAt) update.$set.modifiedAt = new Date();
  else if (!update.$set) update.$set = { modifiedAt: new Date() };
}

export function updateOne<C extends Collection<CommonCollection>>(collection: C) {
  return (
    filter: Filter<DocumentOfCollection<C>>,
    update: UpdateFilter<DocumentOfCollection<C>>,
    options?: UpdateOptions
  ) => {
    addTimestamps(update);
    return collection.updateOne(filter, update, options);
  };
}

export function updateMany<C extends Collection<CommonCollection>>(collection: C) {
  return (
    filter: Filter<DocumentOfCollection<C>>,
    update: UpdateFilter<DocumentOfCollection<C>>,
    options?: UpdateOptions
  ) => {
    addTimestamps(update);
    return collection.updateMany(filter, update, options);
  };
}

export function deleteOne<T extends Collection<CommonCollection>>(collection: T) {
  return (filter: Filter<DocumentOfCollection<T>>, options?: DeleteOptions) =>
    collection.deleteOne(filter, options);
}

export function deleteMany<T extends Collection<CommonCollection>>(collection: T) {
  return (filter: Filter<DocumentOfCollection<T>>, options?: DeleteOptions) =>
    collection.deleteMany(filter, options);
}

export interface AggregateOptionsExtended<C extends CommonCollection, P extends Projection<C>>
  extends AggregateOptions {
  skip?: number;
  limit?: number;
  /**
   * The sort is done before the projection.
   */
  sort?: Document;
  projection?: P;
}
export function aggregate<T extends Collection<CommonCollection>>(collection: T) {
  return (
    pipeline: AggregatePipeline<DocumentOfCollection<T>> | AggregatePipeline<DocumentOfCollection<T>>[],
    options?: AggregateOptionsExtended<DocumentOfCollection<T>, Projection<DocumentOfCollection<T>>>
  ) => {
    const finalPipeline = pipeline instanceof Array ? pipeline : [pipeline];

    const sort = options?.sort;
    if (sort) {
      delete options?.sort;
      finalPipeline.push({ $sort: sort });
    }

    const projection = options?.projection;
    if (projection) {
      delete options?.projection;
      finalPipeline.push({ $project: projection });
    }

    const skip = options?.skip;
    if (typeof skip === "number") {
      delete options?.skip;
      finalPipeline.push({ $skip: skip });
    }

    const limit = options?.limit;
    if (typeof limit === "number") {
      delete options?.limit;
      finalPipeline.push({ $limit: limit });
    }

    return collection.aggregate(finalPipeline, options).toArray();
  };
}
