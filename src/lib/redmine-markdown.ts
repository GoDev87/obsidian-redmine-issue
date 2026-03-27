import { RedmineAttachment } from '../interfaces/redmine'

const HEADING_PATTERN = /^h([1-6])\.\s+(.*)$/
const BLOCKQUOTE_PATTERN = /^bq\.\s+(.*)$/
const CODE_BLOCK_PATTERN = /^bc\.\s*(.*)$/
const BULLET_LIST_PATTERN = /^(\*+)\s+(.*)$/
const ORDERED_LIST_PATTERN = /^(#+)\s+(.*)$/
const REDMINE_LINK_PATTERN = /"([^"\n]+)":((?:https?:\/\/|mailto:)[^\s<]+)/g
const ATTACHMENT_LINK_PATTERN = /attachment:(?:"([^"\n]+)"|([^\s]+))/g
const IMAGE_ATTACHMENT_PATTERN = /!(?:[<>])?([^!\n(]+?)(?:\(([^)\n]*)\))?!/g

export function convertRedmineTextToMarkdown(
  text: string,
  attachments: RedmineAttachment[] = []
): string {
  if (!text) {
    return ''
  }

  const lines = text.split(/\r?\n/)
  const attachmentMap = buildAttachmentMap(attachments)

  return lines.map((line) => convertLine(line, attachmentMap)).join('\n')
}

function convertLine(
  line: string,
  attachmentMap: Map<string, RedmineAttachment>
): string {
  if (!line.trim()) {
    return ''
  }

  const headingMatch = line.match(HEADING_PATTERN)
  if (headingMatch) {
    const level = Number(headingMatch[1])
    return `${'#'.repeat(level)} ${convertInline(headingMatch[2].trim(), attachmentMap)}`
  }

  const blockquoteMatch = line.match(BLOCKQUOTE_PATTERN)
  if (blockquoteMatch) {
    return `> ${convertInline(blockquoteMatch[1].trim(), attachmentMap)}`
  }

  const codeBlockMatch = line.match(CODE_BLOCK_PATTERN)
  if (codeBlockMatch) {
    const code = codeBlockMatch[1]
    return ['```', code, '```'].join('\n')
  }

  const bulletListMatch = line.match(BULLET_LIST_PATTERN)
  if (bulletListMatch) {
    const depth = bulletListMatch[1].length - 1
    return `${'  '.repeat(depth)}- ${convertInline(bulletListMatch[2].trim(), attachmentMap)}`
  }

  const orderedListMatch = line.match(ORDERED_LIST_PATTERN)
  if (orderedListMatch) {
    const depth = orderedListMatch[1].length - 1
    return `${'  '.repeat(depth)}1. ${convertInline(orderedListMatch[2].trim(), attachmentMap)}`
  }

  return convertInline(line, attachmentMap)
}

function convertInline(
  text: string,
  attachmentMap: Map<string, RedmineAttachment>
): string {
  return text
    .replace(
      IMAGE_ATTACHMENT_PATTERN,
      (match, rawFilename: string, rawAltText?: string) => {
        const filename = rawFilename.trim()
        const attachment = findAttachment(filename, attachmentMap)
        if (!attachment) {
          return match
        }

        const altText = (rawAltText || filename).trim()
        return `![${escapeMarkdownText(altText)}](${attachment.resolvedUrl || attachment.contentUrl})`
      }
    )
    .replace(
      ATTACHMENT_LINK_PATTERN,
      (match, quotedFilename?: string, plainFilename?: string) => {
        const filename = (quotedFilename || plainFilename || '').trim()
        const attachment = findAttachment(filename, attachmentMap)
        if (!attachment) {
          return match
        }

        return `[${escapeMarkdownText(filename)}](${attachment.resolvedUrl || attachment.contentUrl})`
      }
    )
    .replace(REDMINE_LINK_PATTERN, '[$1]($2)')
    .replace(/(^|[\s(])\*([^\s*][^*]*?)\*(?=$|[\s).,;:!?])/g, '$1**$2**')
    .replace(/(^|[\s(])_([^\s_][^_]*?)_(?=$|[\s).,;:!?])/g, '$1*$2*')
    .replace(/(^|[\s(])-([^\s-][^-]*?)-(?=$|[\s).,;:!?])/g, '$1~~$2~~')
    .replace(/@([^@\n]+)@/g, '`$1`')
}

function escapeMarkdownText(text: string): string {
  return text.replace(/[[\]]/g, '\\$&')
}

function buildAttachmentMap(
  attachments: RedmineAttachment[]
): Map<string, RedmineAttachment> {
  const attachmentMap = new Map<string, RedmineAttachment>()

  attachments.forEach((attachment) => {
    getAttachmentLookupKeys(attachment).forEach((key) => {
      if (!attachmentMap.has(key)) {
        attachmentMap.set(key, attachment)
      }
    })
  })

  return attachmentMap
}

function findAttachment(
  filename: string,
  attachmentMap: Map<string, RedmineAttachment>
): RedmineAttachment | undefined {
  for (const key of getFilenameVariants(filename)) {
    const attachment = attachmentMap.get(key)
    if (attachment) {
      return attachment
    }
  }

  return undefined
}

function getAttachmentLookupKeys(attachment: RedmineAttachment): string[] {
  const keys = new Set<string>()

  getFilenameVariants(attachment.filename).forEach((key) => keys.add(key))

  const urlBasename = getUrlBasename(attachment.resolvedUrl || attachment.contentUrl)
  if (urlBasename) {
    getFilenameVariants(urlBasename).forEach((key) => keys.add(key))
  }

  return [...keys]
}

function getFilenameVariants(filename: string): string[] {
  const variants = new Set<string>()
  const trimmedFilename = filename.trim()
  if (!trimmedFilename) {
    return []
  }

  variants.add(trimmedFilename)

  const decodedFilename = safeDecodeURIComponent(trimmedFilename)
  variants.add(decodedFilename)

  variants.add(encodeURIComponent(trimmedFilename))
  variants.add(encodeURIComponent(decodedFilename))

  return [...variants]
}

function getUrlBasename(url: string): string {
  if (!url) {
    return ''
  }

  const sanitizedUrl = url.split('?')[0].split('#')[0]
  const parts = sanitizedUrl.split('/')
  return parts[parts.length - 1] || ''
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
