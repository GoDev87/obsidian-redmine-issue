import { RedmineAttachment } from '../interfaces/redmine'
import { IssueDetailsModalContext } from './types'

export async function resolveAttachments(
  context: IssueDetailsModalContext,
  attachments: RedmineAttachment[]
): Promise<RedmineAttachment[]> {
  return Promise.all(
    attachments.map(async (attachment) => {
      try {
        const resolvedUrl = await context.plugin.redmineClient.resolveAttachmentUrl(attachment)
        context.objectUrls.push(resolvedUrl)
        return {
          ...attachment,
          resolvedUrl
        }
      } catch {
        return attachment
      }
    })
  )
}

export function renderAttachmentsList(
  context: IssueDetailsModalContext,
  attachments: RedmineAttachment[],
  container: HTMLDivElement
): void {
  if (!attachments.length) {
    container.createDiv({
      text: 'No attachments',
      cls: ['redmine-issue-modal-empty']
    })
    return
  }

  const list = container.createDiv({ cls: ['redmine-issue-modal-attachments'] })
  attachments.forEach((attachment) => {
    const row = list.createDiv({ cls: ['redmine-issue-modal-attachment'] })
    row.createEl('a', {
      text: attachment.filename,
      href: attachment.resolvedUrl || attachment.contentUrl,
      cls: ['external-link'],
      attr: {
        download: attachment.filename,
        rel: 'noopener',
        target: '_blank'
      }
    })

    const details = row.createDiv({ cls: ['redmine-issue-modal-attachment-details'] })
    const parts = [
      context.formatFileSize(attachment.filesize),
      attachment.contentType,
      attachment.author?.name ? `by ${attachment.author.name}` : '',
      context.formatDate(attachment.createdOn)
    ].filter(Boolean)
    details.setText(parts.join(' • '))
  })
}
