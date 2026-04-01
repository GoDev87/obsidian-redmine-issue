import { MarkdownRenderer } from 'obsidian'
import { convertRedmineTextToMarkdown } from '../lib/redmine-markdown'
import { RedmineAttachment, RedmineJournal } from '../interfaces/redmine'
import { IssueDetailsModalContext } from './types'

export async function renderDescription(
  context: IssueDetailsModalContext,
  description: string,
  attachments: RedmineAttachment[],
  container: HTMLDivElement
): Promise<void> {
  const body = container.createDiv({ cls: ['redmine-issue-modal-description'] })

  if (!description) {
    body.setText('No description')
    return
  }

  await MarkdownRenderer.render(
    context.app,
    convertRedmineTextToMarkdown(description, attachments),
    body,
    '',
    context.plugin
  )
}

export async function renderComments(
  context: IssueDetailsModalContext,
  journals: RedmineJournal[],
  attachments: RedmineAttachment[],
  container: HTMLDivElement
): Promise<void> {
  const comments = journals.filter((journal) => journal.notes)

  if (!comments.length) {
    container.createDiv({
      text: 'No comments',
      cls: ['redmine-issue-modal-empty']
    })
    return
  }

  const list = container.createDiv({ cls: ['redmine-issue-modal-history'] })

  for (const comment of comments) {
    const entry = list.createDiv({ cls: ['redmine-issue-modal-history-entry'] })
    const header = entry.createDiv({ cls: ['redmine-issue-modal-history-header'] })
    header.createSpan({
      text: comment.user?.name || 'Unknown user',
      cls: ['redmine-issue-modal-history-author']
    })
    header.createSpan({
      text: context.formatDate(comment.createdOn),
      cls: ['redmine-issue-modal-history-date']
    })

    const notes = entry.createDiv({ cls: ['redmine-issue-modal-history-notes'] })
    await MarkdownRenderer.render(
      context.app,
      convertRedmineTextToMarkdown(comment.notes, attachments),
      notes,
      '',
      context.plugin
    )
  }
}

export async function renderHistory(
  context: IssueDetailsModalContext,
  journals: RedmineJournal[],
  attachments: RedmineAttachment[],
  container: HTMLDivElement
): Promise<void> {
  if (!journals.length) {
    container.createDiv({
      text: 'No history',
      cls: ['redmine-issue-modal-empty']
    })
    return
  }

  const list = container.createDiv({ cls: ['redmine-issue-modal-history'] })

  for (const journal of journals) {
    const entry = list.createDiv({ cls: ['redmine-issue-modal-history-entry'] })
    const header = entry.createDiv({ cls: ['redmine-issue-modal-history-header'] })
    header.createSpan({
      text: journal.user?.name || 'Unknown user',
      cls: ['redmine-issue-modal-history-author']
    })
    header.createSpan({
      text: context.formatDate(journal.createdOn),
      cls: ['redmine-issue-modal-history-date']
    })

    if (journal.notes) {
      const notes = entry.createDiv({ cls: ['redmine-issue-modal-history-notes'] })
      await MarkdownRenderer.render(
        context.app,
        convertRedmineTextToMarkdown(journal.notes, attachments),
        notes,
        '',
        context.plugin
      )
    }

    if (journal.details.length) {
      const detailsList = entry.createEl('ul', { cls: ['redmine-issue-modal-history-details'] })
      journal.details.forEach((detail) => {
        detailsList.createEl('li', {
          text: context.formatJournalDetail(detail.name || detail.property || 'Field', detail.oldValue, detail.newValue)
        })
      })
    }
  }
}
