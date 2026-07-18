import type { Document, Filter } from "mongodb";
import { ObjectId } from "mongodb";

/** Lookup by ObjectId string, or fall back to raw string `_id` (seed/legacy). */
export function idFilter(id: string): Filter<Document> {
  if (ObjectId.isValid(id)) {
    return { _id: new ObjectId(id) };
  }
  return { _id: id } as unknown as Filter<Document>;
}

/** `$or` of id filters for a list of string ids. */
export function idsOrFilter(ids: string[]): Filter<Document> {
  return { $or: ids.map(idFilter) };
}
