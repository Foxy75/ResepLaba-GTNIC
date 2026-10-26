export const rupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));

export const numberId = (value: number, digits = 0) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(value);

export const dateId = (day: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${day}T00:00:00Z`));

export const shortDayId = (day: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${day}T00:00:00Z`));

export const weekdayId = (day: string) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${day}T00:00:00Z`));

export const timeId = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));

export const dateTimeId = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
