export function appendStatusBadge(container: HTMLElement, status: string): void {
  if (!status) {
    return
  }

  const normalizedStatus = normalizeStatus(status)
  const badgeClass = getBadgeClass(normalizedStatus)

  container.createSpan({
    text: status,
    cls: ['redmine-status-badge', badgeClass]
  })
}

function normalizeStatus(status: string): string {
  return status
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getBadgeClass(status: string): string {
  const knownStatuses = new Set([
    'new',
    'open',
    'in-progress',
    'progress',
    'feedback',
    'needs-feedback',
    'resolved',
    'closed',
    'rejected',
    'blocked'
  ])

  if (knownStatuses.has(status)) {
    return `redmine-status-badge-${status}`
  }

  return 'redmine-status-badge-default'
}
