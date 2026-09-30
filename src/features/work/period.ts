// "2022-10"–"2024-06" → "2022–2024"; an open or same-year period is one year.
export function yearRange({
  start,
  end
}: {
  start: string;
  end?: string;
}): string {
  const from = start.slice(0, 4);
  const to = end?.slice(0, 4);
  return to && to !== from ? `${from}–${to}` : from;
}
