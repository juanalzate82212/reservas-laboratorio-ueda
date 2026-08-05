import type { ReservationStatus } from "@prisma/client";

/*
 * Forma que devuelve GET /api/admin/reservations. Los campos de fecha llegan
 * como string ISO (serialización JSON), no como Date — a diferencia del tipo
 * que usa Prisma en el servidor.
 */
export interface AdminReservation {
  id: string;
  code: string;
  status: ReservationStatus;
  startsAt: string;
  endsAt: string;
  requesterName: string;
  requesterRole: string;
  requesterDocId: string;
  requesterEmail: string;
  academicProgram: string;
  activityType: string;
  activityTypeOther: string | null;
  attendees: number;
  adminNote: string | null;
  createdAt: string;
  room: { id: string; name: string; slug: string };
}
