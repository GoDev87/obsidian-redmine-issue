import removeAccents from 'remove-accents'
import { MarkdownRenderer, Modal, Notice, setIcon } from 'obsidian'
import RedmineIssuePlugin from './main'
import { appendStatusBadge } from './lib/status-badge'
import { RedmineAttachment, RedmineIssue, RedmineJournal, RedmineJournalDetail } from './interfaces/redmine'
import { convertRedmineTextToMarkdown } from './lib/redmine-markdown'

export default class IssueDetailsModal extends Modal {
  plugin: RedmineIssuePlugin
  issueId: string
  objectUrls: string[] = []

  constructor(plugin: RedmineIssuePlugin, issueId: string) {
    super(plugin.app)
    this.plugin = plugin
    this.issueId = issueId
  }

  async onOpen(): Promise<void> {
    this.modalEl.addClass('redmine-issue-modal-shell')
    this.titleEl.setText(`Redmine Issue #${this.issueId}`)
    this.contentEl.empty()
    this.contentEl.addClass('redmine-issue-modal')
    this.contentEl.createDiv({
      text: 'Loading...',
      cls: ['redmine-issue-modal-loading']
    })

    let issue: RedmineIssue
    try {
      issue = await this.plugin.redmineClient.getIssueDetails(this.issueId)
    } catch (error) {
      this.contentEl.empty()
      this.contentEl.createEl('h2', {
        text: error instanceof Error ? error.message : String(error)
      }).addClass('in-error')
      return
    }

    await this.renderIssue(issue)
  }

  async renderIssue(issue: RedmineIssue): Promise<void> {
    this.contentEl.empty()
    const attachments = await this.resolveAttachments(issue.attachments)
    const issueUrl = this.getIssueUrl(issue.id.toString())

    this.contentEl.createEl('h2', {
      text: `${issue.id} ${issue.subject}`,
      cls: ['redmine-issue-modal-title']
    })

    const linkRow = this.contentEl.createDiv({ cls: ['redmine-issue-modal-link-row'] })
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

    this.renderMetadata(issue)
    await this.renderTabs(issue, attachments)
  }

  renderMetadata(issue: RedmineIssue): void {
    const section = this.createSection('Details')
    const grid = section.createDiv({ cls: ['redmine-issue-modal-grid'] })
    const priorityName = issue.priority?.name

    this.addGridField(grid, 'Project', issue.project.name)
    this.addGridField(grid, 'Tracker', issue.tracker?.name)
    this.addGridField(grid, 'Status', issue.status?.name, {
      renderValue: (container, value) => appendStatusBadge(container, value)
    })
    this.addGridField(grid, 'Priority', priorityName, {
      valueClasses: [
        'redmine-priority',
        `redmine-priority-${removeAccents(priorityName ?? '').toLowerCase()}`
      ]
    })
    this.addGridField(grid, 'Assigned To', issue.assignedTo?.name)
    this.addGridField(grid, 'Author', issue.author?.name)
    this.addGridField(grid, 'Category', issue.category?.name)
    this.addGridField(grid, 'Version', issue.fixedVersion?.name)
    this.addGridField(grid, 'Created', this.formatDate(issue.createdOn))
    this.addGridField(grid, 'Last Update', this.formatDate(issue.updatedOn))
  }

  async renderTabs(issue: RedmineIssue, attachments: RedmineAttachment[]): Promise<void> {
    const section = this.createSection('Content')
    const tabs = [
      {
        key: 'description',
        label: 'Description',
        render: async (container: HTMLDivElement) => this.renderDescription(issue.description, attachments, container)
      },
      {
        key: 'history',
        label: 'History',
        render: async (container: HTMLDivElement) => this.renderHistory(issue.journals, container)
      },
      {
        key: 'attachments',
        label: 'Attachments',
        render: async (container: HTMLDivElement) => this.renderAttachments(attachments, container)
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

    const defaultButton = buttons.get(tabs[0].key)
    defaultButton?.click()
  }

  async renderDescription(
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
      this.app,
      convertRedmineTextToMarkdown(description, attachments),
      body,
      '',
      this.plugin
    )
  }

  renderAttachments(attachments: RedmineAttachment[], container: HTMLDivElement): void {
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
        this.formatFileSize(attachment.filesize),
        attachment.contentType,
        attachment.author?.name ? `by ${attachment.author.name}` : '',
        this.formatDate(attachment.createdOn)
      ].filter(Boolean)
      details.setText(parts.join(' • '))
    })
  }

  async renderHistory(journals: RedmineJournal[], container: HTMLDivElement): Promise<void> {
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
        text: this.formatDate(journal.createdOn),
        cls: ['redmine-issue-modal-history-date']
      })

      if (journal.notes) {
        const notes = entry.createDiv({ cls: ['redmine-issue-modal-history-notes'] })
        await MarkdownRenderer.render(
          this.app,
          convertRedmineTextToMarkdown(journal.notes),
          notes,
          '',
          this.plugin
        )
      }

      if (journal.details.length) {
        const detailsList = entry.createEl('ul', { cls: ['redmine-issue-modal-history-details'] })
        journal.details.forEach((detail) => {
          detailsList.createEl('li', {
            text: this.formatJournalDetail(detail)
          })
        })
      }
    }
  }

  async resolveAttachments(attachments: RedmineAttachment[]): Promise<RedmineAttachment[]> {
    return Promise.all(
      attachments.map(async (attachment) => {
        try {
          const resolvedUrl = await this.plugin.redmineClient.resolveAttachmentUrl(attachment)
          this.objectUrls.push(resolvedUrl)
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

  createSection(title: string): HTMLDivElement {
    const section = this.contentEl.createDiv({ cls: ['redmine-issue-modal-section'] })
    section.createEl('h3', {
      text: title,
      cls: ['redmine-issue-modal-section-title']
    })
    return section
  }

  formatJournalDetail(detail: RedmineJournalDetail): string {
    const label = detail.name || detail.property || 'Field'
    const oldValue = detail.oldValue || 'empty'
    const newValue = detail.newValue || 'empty'

    if (detail.oldValue && detail.newValue) {
      return `${label}: ${oldValue} -> ${newValue}`
    }

    if (detail.newValue) {
      return `${label}: set to ${newValue}`
    }

    if (detail.oldValue) {
      return `${label}: cleared (was ${oldValue})`
    }

    return `${label}: updated`
  }

  addGridField(
    container: HTMLDivElement,
    label: string,
    value?: string,
    options?: {
      valueClasses?: string[]
      renderValue?: (container: HTMLDivElement, value: string) => void
    }
  ): HTMLDivElement | void {
    if (!value) {
      return
    }

    const row = container.createDiv({ cls: ['redmine-issue-modal-field'] })
    row.createDiv({
      text: label,
      cls: ['redmine-issue-modal-field-label']
    })
    const valueContainer = row.createDiv({
      cls: ['redmine-issue-modal-field-value', ...(options?.valueClasses ?? [])]
    })

    if (options?.renderValue) {
      options.renderValue(valueContainer, value)
      return valueContainer
    }

    valueContainer.setText(value)
    return valueContainer
  }

  formatDate(value: string): string {
    if (!value) {
      return ''
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return value
    }

    return date.toLocaleString()
  }

  formatFileSize(size: number): string {
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

  getIssueUrl(issueId: string): string {
    return `https://${this.plugin.settings.host}/issues/${issueId}`
  }

  onClose(): void {
    this.modalEl.removeClass('redmine-issue-modal-shell')
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url))
    this.objectUrls = []
  }
}
