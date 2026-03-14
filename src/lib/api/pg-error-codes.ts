/**
 * PostgreSQL error codes used in API route error handling.
 *
 * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
 */

/** Foreign key violation — the referenced row does not exist. */
export const PG_FOREIGN_KEY_VIOLATION = "23503";

/** Unique constraint violation — a row with the same key already exists. */
export const PG_UNIQUE_VIOLATION = "23505";
