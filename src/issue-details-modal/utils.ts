export function formatDate(value: string): string {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

export function formatFileSize(size: number): string {
  if (!size) {
    return ''
  }

  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function formatJournalDetail(label: string, oldValue: string, newValue: string): string {
  const normalizedLabel = label || 'Field'
  const previousValue = oldValue || 'empty'
  const nextValue = newValue || 'empty'

  if (oldValue && newValue) {
    return `${normalizedLabel}: ${previousValue} -> ${nextValue}`
  }

  if (newValue) {
    return `${normalizedLabel}: set to ${nextValue}`
  }

  if (oldValue) {
    return `${normalizedLabel}: cleared (was ${previousValue})`
  }

  return `${normalizedLabel}: updated`
}
