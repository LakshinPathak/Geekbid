import type { Document, Filter } from "mongodb";
import { ObjectId } from "mongodb";

/**
 * Lookup by ObjectId string. `ObjectId.isValid()` returns false for
 * non-string/object input too (not just malformed strings) — previously,
 * anything that failed that check fell through to `{ _id: id }` using the
 * RAW, unvalidated input as the Mongo filter. If `id` were ever an object
 * like `{"$ne": null}` (e.g. smuggled through a JSON body), that becomes a
 * NoSQL query-injection primitive that can match an arbitrary document
 * instead of failing "not found". Throw instead so callers get a clean
 * not-found/error path rather than an injectable filter.
 */
export function idFilter(id: string): Filter<Document> {
  if (typeof id === "string" && ObjectId.isValid(id)) {
    return { _id: new ObjectId(id) };
  }
  throw new Error("Invalid id");
}

/** `$or` of id filters for a list of string ids. */
export function idsOrFilter(ids: string[]): Filter<Document> {
  return { $or: ids.map(idFilter) };
}
