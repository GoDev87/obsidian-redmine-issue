import removeAccents from 'remove-accents'
import { MarkdownRenderer, Notice, setIcon } from 'obsidian'
import { appendStatusBadge } from '../lib/status-badge'
import { convertRedmineTextToMarkdown } from '../lib/redmine-markdown'
import {
  RedmineAttachment,
  RedmineChangeset,
  RedmineCustomField,
  RedmineIssue,
  RedmineIssueChild,
  RedmineJournal,
  RedmineRelation,
  RedmineWatcher
} from '../interfaces/redmine'
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
  context.addGridField(grid, 'Progress', formatDoneRatio(issue.doneRatio))
  context.addGridField(grid, 'Estimated Hours', formatHours(issue.totalEstimatedHours || issue.estimatedHours))
  context.addGridField(grid, 'Spent Hours', formatHours(issue.totalSpentHours || issue.spentHours))
  context.addGridField(grid, 'Due Date', context.formatDate(issue.dueDate))
  context.addGridField(grid, 'Created', context.formatDate(issue.createdOn))
  context.addGridField(grid, 'Last Update', context.formatDate(issue.updatedOn))
  context.addGridField(grid, 'Closed', context.formatDate(issue.closedOn))
  issue.customFields.forEach((field) => {
    // Skip empty custom fields
    if (!field.value || (Array.isArray(field.value) && field.value.length === 0)) {
      return
    }

    context.addGridField(grid, field.name, formatCustomFieldValue(field))
  })
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
    },
    {
      key: 'related',
      label: 'Related',
      render: async (container: HTMLDivElement) => renderRelated(context, issue, container)
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

async function renderRelated(
  context: IssueDetailsModalContext,
  issue: RedmineIssue,
  container: HTMLDivElement
): Promise<void> {
  const relatedAccess = await resolveRelatedIssueAccess(context, issue)

  renderIssueLinksSection(
    context,
    container,
    'Parent Issue',
    issue.parent?.id ? [{ id: issue.parent.id, subject: '' }] : [],
    (item) => createIssueLink(context, item.id, item.subject, relatedAccess.get(item.id) !== false)
  )
  renderIssueLinksSection(
    context,
    container,
    'Children',
    issue.children,
    (child) => createIssueLink(
      context,
      child.id,
      `[${child.tracker?.name || 'Issue'}] ${child.subject}`,
      relatedAccess.get(child.id) !== false
    )
  )
  renderIssueLinksSection(
    context,
    container,
    'Relations',
    issue.relations,
    (relation) => {
      const relatedIssueId = relation.issueToId || relation.issueId
      const label = [relation.relationType || 'relates', relation.delay ? `delay ${relation.delay}` : '']
        .filter(Boolean)
        .join(' • ')
      return createIssueLink(context, relatedIssueId, label, relatedAccess.get(relatedIssueId) !== false)
    }
  )
  renderTextListSection(container, 'Watchers', issue.watchers, (watcher) => watcher.name)
  renderChangesetsSection(context, container, issue.changesets)
}

function renderIssueLinksSection<T>(
  context: IssueDetailsModalContext,
  container: HTMLDivElement,
  title: string,
  items: T[],
  createLink: (item: T) => HTMLElement
): void {
  const section = container.createDiv({ cls: ['redmine-issue-modal-subsection'] })
  section.createEl('h4', {
    text: title,
    cls: ['redmine-issue-modal-subsection-title']
  })

  if (!items.length) {
    section.createDiv({
      text: `No ${title.toLowerCase()}`,
      cls: ['redmine-issue-modal-empty']
    })
    return
  }

  const list = section.createDiv({ cls: ['redmine-issue-modal-related-list'] })
  items.forEach((item) => {
    const row = list.createDiv({ cls: ['redmine-issue-modal-related-item'] })
    row.appendChild(createLink(item))
  })
}

function renderTextListSection<T>(
  container: HTMLDivElement,
  title: string,
  items: T[],
  getLabel: (item: T) => string
): void {
  const section = container.createDiv({ cls: ['redmine-issue-modal-subsection'] })
  section.createEl('h4', {
    text: title,
    cls: ['redmine-issue-modal-subsection-title']
  })

  if (!items.length) {
    section.createDiv({
      text: `No ${title.toLowerCase()}`,
      cls: ['redmine-issue-modal-empty']
    })
    return
  }

  const list = section.createDiv({ cls: ['redmine-issue-modal-chip-list'] })
  items.forEach((item) => {
    list.createSpan({
      text: getLabel(item),
      cls: ['redmine-issue-modal-chip']
    })
  })
}

function renderChangesetsSection(
  context: IssueDetailsModalContext,
  container: HTMLDivElement,
  changesets: RedmineChangeset[]
): void {
  const section = container.createDiv({ cls: ['redmine-issue-modal-subsection'] })
  section.createEl('h4', {
    text: 'Changesets',
    cls: ['redmine-issue-modal-subsection-title']
  })

  if (!changesets.length) {
    section.createDiv({
      text: 'No changesets',
      cls: ['redmine-issue-modal-empty']
    })
    return
  }

  const list = section.createDiv({ cls: ['redmine-issue-modal-related-list'] })
  changesets.forEach((changeset) => {
    const row = list.createDiv({ cls: ['redmine-issue-modal-related-item'] })
    row.createDiv({
      text: `r${changeset.revision}`,
      cls: ['redmine-issue-modal-related-title']
    })
    row.createDiv({
      text: [changeset.user?.name, context.formatDate(changeset.committedOn)].filter(Boolean).join(' • '),
      cls: ['redmine-issue-modal-related-meta']
    })

    if (changeset.comments) {
      row.createDiv({
        text: changeset.comments,
        cls: ['redmine-issue-modal-related-meta']
      })
    }
  })
}

async function resolveRelatedIssueAccess(
  context: IssueDetailsModalContext,
  issue: RedmineIssue
): Promise<Map<string, boolean>> {
  const relatedIds = new Set<string>()

  if (issue.parent?.id) {
    relatedIds.add(issue.parent.id)
  }

  issue.children.forEach((child) => relatedIds.add(child.id))
  issue.relations.forEach((relation) => {
    const relatedIssueId = relation.issueToId || relation.issueId
    if (relatedIssueId) {
      relatedIds.add(relatedIssueId)
    }
  })

  const accessEntries = await Promise.all(
    [...relatedIds].map(async (issueId) => {
      try {
        await context.plugin.redmineClient.getIssueDetails(issueId)
        return [issueId, true] as const
      } catch {
        return [issueId, false] as const
      }
    })
  )

  return new Map(accessEntries)
}

function createIssueLink(
  context: IssueDetailsModalContext,
  issueId: string,
  extraText: string,
  isAccessible: boolean
): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.classList.add('redmine-issue-modal-related-link')

  const label = `#${issueId}${extraText ? ` ${extraText}` : ''}`

  if (isAccessible) {
    const link = document.createElement('a')
    link.textContent = label
    link.href = context.getIssueUrl(issueId)
    link.target = '_blank'
    link.rel = 'noopener'
    link.classList.add('external-link')
    wrapper.appendChild(link)
    return wrapper
  }

  const text = document.createElement('span')
  text.textContent = label
  text.classList.add('redmine-issue-modal-related-link-text')
  wrapper.appendChild(text)

  const icon = document.createElement('span')
  icon.classList.add('redmine-issue-modal-related-lock')
  icon.setAttribute('aria-label', 'Access denied')
  icon.setAttribute('title', 'You do not have access to this related issue')
  setIcon(icon, 'lock')
  wrapper.appendChild(icon)

  return wrapper
}

function formatDoneRatio(doneRatio: number): string | undefined {
  if (typeof doneRatio !== 'number' || Number.isNaN(doneRatio)) {
    return undefined
  }

  return `${doneRatio}%`
}

function formatHours(hours: number): string | undefined {
  if (!hours) {
    return undefined
  }

  return `${hours} h`
}

function formatCustomFieldValue(field: RedmineCustomField): string {
  if (Array.isArray(field.value)) {
    return field.value.join(', ') || 'Empty'
  }

  return field.value || 'Empty'
}
