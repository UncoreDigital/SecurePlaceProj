// Certificate dates are carried as ISO "YYYY-MM-DD" everywhere: in the DB
// (issue_date DATE), in CertificateCreator's form state, and in CertItem.
// Never round-trip them through `new Date()` — an ISO date string parses as UTC
// midnight and shifts a day in any timezone behind UTC. Split the string instead.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type DateParts = { year: number; month: number; day: number };

/** Parses "YYYY-MM-DD", returning null unless it names a real calendar date. */
export function parseIsoDate(value?: string): DateParts | null {
  const match = ISO_DATE.exec((value ?? "").trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return null;

  // Day 0 of the next month is the last day of this one.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return null;

  return { year, month, day };
}

export function isValidIsoDate(value?: string): boolean {
  return parseIsoDate(value) !== null;
}

function ordinalSuffix(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) return "th";
  return ["th", "st", "nd", "rd"][day % 10] ?? "th";
}

/** "2026-07-16" -> "16/07/2026". Returns "" for anything unparseable. */
export function formatDateForDisplay(value?: string): string {
  const parts = parseIsoDate(value);
  if (!parts) return "";
  const { year, month, day } = parts;
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

/** "2026-07-16" -> "16th of July 2026", as printed on the certificate. */
export function formatDateForCertificate(value?: string): string {
  const parts = parseIsoDate(value);
  if (!parts) return "";
  const { year, month, day } = parts;
  return `${day}${ordinalSuffix(day)} of ${MONTHS[month - 1]} ${year}`;
}
