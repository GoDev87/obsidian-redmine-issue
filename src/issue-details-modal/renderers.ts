import removeAccents from 'remove-accents'
import { MarkdownRenderer, Notice, setIcon } from 'obsidian'
import { appendStatusBadge } from '../lib/status-badge'
import { convertRedmineTextToMarkdown } from '../lib/redmine-markdown'
import { RedmineAttachment, RedmineIssue, RedmineJournal } from '../interfaces/redmine'
import { IssueDetailsModalContext } from './types'

export async function renderIssueContent(
  context: IssueDetailsModalContext,
  issue: RedmineIssue,
  attachments: RedmineAttachment[]
): Promise<void> {
  const issueUrl = context.getIssueUrl(issue.id.toString())

  context.contentEl.createEl('h2', {
    text: `${issue.id} ${issue.subject}`,
    cls: ['redmine-issue-modal-title']
  })

  renderLinkRow(context, issueUrl)
  renderMetadata(context, issue)
  await renderTabs(context, issue, attachments)
}

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

function renderLinkRow(context: IssueDetailsModalContext, issueUrl: string): void {
  const linkRow = context.contentEl.createDiv({ cls: ['redmine-issue-modal-link-row'] })
  linkRow.createEl('a', {
    text: 'Open In Redmine',
    href: issueUrl,
    cls: ['external-link'],
    attr: {
      rel: 'noopener',
      target: '_blank'
    }
  })

  const copyButton = linkRow.createEl('button', {
    cls: ['redmine-issue-modal-copy-link'],
    attr: {
      type: 'button',
      'aria-label': 'Copy Redmine issue URL'
    }
  })
  setIcon(copyButton, 'copy')
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(issueUrl)
      new Notice('Redmine issue URL copied')
    } catch {
      new Notice('Unable to copy Redmine issue URL')
    }
  })
}

function renderMetadata(context: IssueDetailsModalContext, issue: RedmineIssue): void {
  const section = context.createSection('Details')
  const grid = section.createDiv({ cls: ['redmine-issue-modal-grid'] })
  const priorityName = issue.priority?.name

  context.addGridField(grid, 'Project', issue.project.name)
  context.addGridField(grid, 'Tracker', issue.tracker?.name)
  context.addGridField(grid, 'Status', issue.status?.name, {
    renderValue: (container, value) => appendStatusBadge(container, value)
  })
  context.addGridField(grid, 'Priority', priorityName, {
    valueClasses: [
      'redmine-priority',
      `redmine-priority-${removeAccents(priorityName ?? '').toLowerCase()}`
    ]
  })
  context.addGridField(grid, 'Assigned To', issue.assignedTo?.name)
  context.addGridField(grid, 'Author', issue.author?.name)
  context.addGridField(grid, 'Category', issue.category?.name)
  context.addGridField(grid, 'Version', issue.fixedVersion?.name)
  context.addGridField(grid, 'Created', context.formatDate(issue.createdOn))
  context.addGridField(grid, 'Last Update', context.formatDate(issue.updatedOn))
}

async function renderTabs(
  context: IssueDetailsModalContext,
  issue: RedmineIssue,
  attachments: RedmineAttachment[]
): Promise<void> {
  const section = context.createSection('Content')
  const tabs = [
    {
      key: 'description',
      label: 'Description',
      render: async (container: HTMLDivElement) => renderDescription(context, issue.description, attachments, container)
    },
    {
      key: 'history',
      label: 'History',
      render: async (container: HTMLDivElement) => renderHistory(context, issue.journals, container)
    },
    {
      key: 'attachments',
      label: 'Attachments',
      render: async (container: HTMLDivElement) => renderAttachmentsList(context, attachments, container)
    }
  ]

  const tabList = section.createDiv({ cls: ['redmine-issue-modal-tabs'] })
  const panelHost = section.createDiv({ cls: ['redmine-issue-modal-tab-panels'] })
  const panels = new Map<string, HTMLDivElement>()
  const buttons = new Map<string, HTMLButtonElement>()

  tabs.forEach((tab) => {
    const button = tabList.createEl('button', {
      text: tab.label,
      cls: ['redmine-issue-modal-tab'],
      attr: { type: 'button' }
    })
    const panel = panelHost.createDiv({ cls: ['redmine-issue-modal-tab-panel'] })

    buttons.set(tab.key, button)
    panels.set(tab.key, panel)

    button.addEventListener('click', () => {
      buttons.forEach((tabButton, key) => {
        const isActive = key === tab.key
        tabButton.toggleClass('is-active', isActive)
        tabButton.setAttribute('aria-selected', isActive ? 'true' : 'false')
        panels.get(key)?.toggleClass('is-active', isActive)
      })
    })
  })

  for (const tab of tabs) {
    const panel = panels.get(tab.key)
    if (panel) {
      await tab.render(panel)
    }
  }

  buttons.get(tabs[0].key)?.click()
}

async function renderDescription(
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

function renderAttachmentsList(
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

async function renderHistory(
  context: IssueDetailsModalContext,
  journals: RedmineJournal[],
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
        convertRedmineTextToMarkdown(journal.notes),
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
