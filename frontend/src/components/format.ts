const dateTime = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });

export function formatDate(iso: string | null): string {
  return iso ? dateTime.format(new Date(iso)) : '—';
}
