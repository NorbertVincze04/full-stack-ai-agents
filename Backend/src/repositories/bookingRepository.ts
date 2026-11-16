import { DEFAULT_DB_SCHEMA, parseDbSchema } from "../config/dbSchema.ts";
import type { Queryable } from "./userRepository.ts";

export interface BookingRepository {
  // A duplicate (date, user) or (date, desk) rejects with pg 23505 (constraint tells which);
  // an unknown user_id or desk with pg 23503 (constraint tells which).
  create(userId: string, date: string, desk: string): Promise<{ date: string; desk: string }>;
  // Deletes only the caller's row; resolves false when nothing matched.
  delete(userId: string, date: string): Promise<boolean>;
  // Own bookings with date >= from, ascending; desk is null for legacy bookings.
  listByUser(userId: string, from: string): Promise<Array<{ date: string; desk: string | null }>>;
}

function bookingsTable(schema: string): string {
  const name = parseDbSchema(schema);
  return name === DEFAULT_DB_SCHEMA ? "public.bookings" : `"${name}".bookings`;
}

// to_char avoids the pg driver turning a `date` into a time-zone dependent JS Date.
const DATE_TEXT = "to_char(booking_date, 'YYYY-MM-DD')";

export function createBookingRepository(
  db: Queryable,
  schema: string = DEFAULT_DB_SCHEMA,
): BookingRepository {
  const table = bookingsTable(schema);
  const users = schema === DEFAULT_DB_SCHEMA ? "public.users" : `"${parseDbSchema(schema)}".users`;
  const insertQuery = `INSERT INTO ${table} (user_id, booking_date, booking_desk, user_name) VALUES ($1, $2, $3, (SELECT full_name FROM ${users} WHERE id = $1)) RETURNING ${DATE_TEXT} AS date, booking_desk AS desk`;
  const deleteQuery = `DELETE FROM ${table} WHERE booking_date = $1 AND user_id = $2 RETURNING id`;
  const listQuery = `SELECT ${DATE_TEXT} AS date, booking_desk AS desk FROM ${table} WHERE user_id = $1 AND booking_date >= $2 ORDER BY booking_date`;
  return {
    async create(userId, date, desk) {
      const result = await db.query(insertQuery, [userId, date, desk]);
      return { date: result.rows[0].date as string, desk: result.rows[0].desk as string };
    },
    async delete(userId, date) {
      const result = await db.query(deleteQuery, [date, userId]);
      return result.rows.length > 0;
    },
    async listByUser(userId, from) {
      const result = await db.query(listQuery, [userId, from]);
      return result.rows.map((row) => ({
        date: row.date as string,
        desk: (row.desk as string | null) ?? null,
      }));
    },
  };
}

// Used when createApp() gets no repository (e.g. tests that do not touch bookings).
export const unconfiguredBookingRepository: BookingRepository = {
  async create() {
    throw new Error("Booking repository is not configured");
  },
  async delete() {
    throw new Error("Booking repository is not configured");
  },
  async listByUser() {
    throw new Error("Booking repository is not configured");
  },
};
