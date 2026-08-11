// Normalize a status value into a CSS-friendly class name.
// Converts underscores/spaces to dashes so `in_progress` -> `in-progress`.
export function statusClass(status) {
  return String(status ?? '')
    .toLowerCase()
    .replace(/[ _]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Title-case a snake/space separated value: `in_progress` -> `In Progress`.
export function titleCase(value) {
  return String(value ?? '')
    .split(/[_ ]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
