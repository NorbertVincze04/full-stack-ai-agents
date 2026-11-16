import { DEFAULT_DB_SCHEMA, parseDbSchema } from "../config/dbSchema.ts";
import type { Queryable } from "./userRepository.ts";

export interface Desk {
  id: string;
  label: string;
  row: number;
  col: number;
}

export interface DeskAvailability {
  id: string;
  booked: boolean;
  bookedBy?: string;
}

export interface DeskRepository {
  // All desks ordered by grid position.
  list(): Promise<Desk[]>;
  // All desks with the booking state on `date` (YYYY-MM-DD); bookedBy is the booker's full_name only.
  availability(date: string): Promise<DeskAvailability[]>;
}

function qualify(schema: string, table: string): string {
  const name = parseDbSchema(schema);
  return name === DEFAULT_DB_SCHEMA ? `public.${table}` : `"${name}".${table}`;
}

export function createDeskRepository(
  db: Queryable,
  schema: string = DEFAULT_DB_SCHEMA,
): DeskRepository {
  const desks = qualify(schema, "desks");
  const bookings = qualify(schema, "bookings");
  const users = qualify(schema, "users");
  const listQuery = `SELECT id, label, grid_row, grid_col FROM ${desks} ORDER BY grid_row, grid_col`;
  const availabilityQuery = `SELECT d.id, b.id IS NOT NULL AS booked, u.full_name AS booked_by FROM ${desks} d LEFT JOIN ${bookings} b ON b.booking_desk = d.id AND b.booking_date = $1 LEFT JOIN ${users} u ON u.id = b.user_id ORDER BY d.grid_row, d.grid_col`;
  return {
    async list() {
      const result = await db.query(listQuery, []);
      return result.rows.map((row) => ({
        id: row.id as string,
        label: row.label as string,
        row: Number(row.grid_row),
        col: Number(row.grid_col),
      }));
    },
    async availability(date) {
      const result = await db.query(availabilityQuery, [date]);
      return result.rows.map((row) => {
        const booked = row.booked === true;
        const bookedBy = row.booked_by;
        return booked && typeof bookedBy === "string"
          ? { id: row.id as string, booked, bookedBy }
          : { id: row.id as string, booked };
      });
    },
  };
}

// Used when createApp() gets no repository (e.g. tests that do not touch desks).
export const unconfiguredDeskRepository: DeskRepository = {
  async list() {
    throw new Error("Desk repository is not configured");
  },
  async availability() {
    throw new Error("Desk repository is not configured");
  },
};
