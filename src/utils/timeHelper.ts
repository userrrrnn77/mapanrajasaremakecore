// src\utils\timeHelper.js
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.tz.setDefault("Asia/Jakarta");

export const getNowJakarta = () => {
  return dayjs.tz();
};

export const getShiftBasedDayKey = (
  shiftStartHour: any,
  shiftStartMinute: any,
) => {
  const now = getNowJakarta();

  let shiftStartDate = now
    .clone()
    .hour(shiftStartHour)
    .minute(shiftStartMinute)
    .second(0)
    .millisecond(0);

  const isNightShift = shiftStartHour >= 18;

  if (isNightShift && now.isBefore(shiftStartDate)) {
    return shiftStartDate.subtract(1, "day").format("YYYY-MM-DD");
  }

  return shiftStartDate.format("YYYY-MM-DD");
};

export const toUTCFile = (dayjsObj: any) => {
  return dayjsObj.toDate();
};
