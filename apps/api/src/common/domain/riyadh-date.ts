const RIYADH_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Today's date in Riyadh as YYYY-MM-DD (the platform's day, whatever the server's clock zone). */
export const todayInRiyadh = (now: Date = new Date()): string => RIYADH_DATE.format(now);
