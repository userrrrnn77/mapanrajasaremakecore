// src/utils/attendanceHelper.ts

import type { Dayjs } from "dayjs";

/**
 * 🔥 SHIFT TYPES
 */
export type ShiftKey = "pagi" | "siang" | "malam";

export interface ShiftTime {
  hour: number;
  minute: number;
  endHour?: number;
  endMinute?: number;
  penaltyPerMinute?: number;
}

export type ShiftConfigs = Record<ShiftKey, ShiftTime>;

export interface AttendancePenaltyResult {
  lateMinutes: number;
  penalty: number;
}

export const calculateAttendancePenalty = (
  nowJakarta: Dayjs,
  currentShift: ShiftKey,
  shiftConfigs: ShiftConfigs,
): AttendancePenaltyResult => {
  const shiftConfig = shiftConfigs[currentShift];

  if (!shiftConfig || typeof shiftConfig.hour === "undefined") {
    console.log("Config kaga ketemu buat shift:", currentShift);
    return { lateMinutes: 0, penalty: 0 };
  }

  const expectedStart = nowJakarta
    .clone()
    .hour(shiftConfig.hour)
    .minute(shiftConfig.minute)
    .second(0)
    .millisecond(0);

  let lateMinutes = nowJakarta.diff(expectedStart, "minute");

  console.log(
    `Check-in: ${nowJakarta.format("HH:mm")}, Start: ${expectedStart.format(
      "HH:mm",
    )}, Selisih: ${lateMinutes}`,
  );

  if (lateMinutes < 0) lateMinutes = 0;

  const penaltyPerMinute = shiftConfig.penaltyPerMinute ?? 500;
  const penalty = lateMinutes > 0 ? lateMinutes * penaltyPerMinute : 0;

  return { lateMinutes, penalty };
};

export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};
