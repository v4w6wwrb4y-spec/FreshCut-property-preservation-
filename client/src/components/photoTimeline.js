// SQLite datetime('now') values are UTC, but do not include a timezone.
export function photoDate(value) {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function groupPhotos(photos, order = "newest") {
  const direction = order === "oldest" ? 1 : -1;
  const sorted = photos.map((photo) => ({ photo, date: photoDate(photo.captured_at) }))
    .sort((a, b) => {
      if (!a.date && b.date) return 1;
      if (a.date && !b.date) return -1;
      return direction * ((a.date - b.date) || (a.photo.id - b.photo.id));
    });
  const groups = new Map();
  for (const entry of sorted) {
    const { date } = entry;
    const key = date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : "undated";
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: date ? date.toLocaleDateString(undefined, {
          weekday: "long", month: "long", day: "numeric", year: "numeric",
        }) : "Date unavailable",
        entries: [],
      });
    }
    groups.get(key).entries.push(entry);
  }
  return [...groups.values()];
}
