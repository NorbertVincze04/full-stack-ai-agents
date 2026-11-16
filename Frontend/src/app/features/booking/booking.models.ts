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

export interface MyBooking {
  date: string;
  desk: string | null;
}
