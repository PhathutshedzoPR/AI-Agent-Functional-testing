export interface IIdGenerator {
  /** A new unique identifier (a UUID in production). */
  next(): string;
}
