import removeAccents from 'remove-accents'

export function appendStatusBadge(container: HTMLElement, status: string): void {
  if (!status) {
    return
  }

  const normalizedStatus = normalizeStatus(status)

  container.createSpan({
    text: status,
    cls: [
      'redmine-status-badge',
      `redmine-status-badge-${normalizedStatus}`
    ]
  })
}

function normalizeStatus(status: string): string {
  return removeAccents(status)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}