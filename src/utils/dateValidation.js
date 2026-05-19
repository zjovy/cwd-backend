const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(str) {
  if (!YYYY_MM_DD.test(str)) return false;
  const d = new Date(str + 'T00:00:00');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
}

// Returns an error string or null
export function validateDateRange(startDate, endDate) {
  if (startDate !== undefined && !isValidDate(startDate))
    return 'startDate must be a valid YYYY-MM-DD date';
  if (endDate !== undefined && !isValidDate(endDate))
    return 'endDate must be a valid YYYY-MM-DD date';
  if (startDate && endDate && startDate > endDate)
    return 'startDate must not be after endDate';
  return null;
}
