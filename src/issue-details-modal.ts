import removeAccents from 'remove-accents'
import { MarkdownRenderer, Modal } from 'obsidian'
import RedmineIssuePlugin from './main'
import { appendStatusBadge } from './lib/status-badge'
import { RedmineAttachment, RedmineIssue } from './interfaces/redmine'
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

    this.contentEl.createEl('h2', {
      text: `${issue.id} ${issue.subject}`,
      cls: ['redmine-issue-modal-title']
    })

    const linkRow = this.contentEl.createDiv({ cls: ['redmine-issue-modal-link-row'] })
    linkRow.createEl('a', {
      text: 'Open In Redmine',
      href: `https://${this.plugin.settings.host}/issues/${issue.id.toString()}`,
      cls: ['external-link'],
      attr: {
        rel: 'noopener',
        target: '_blank'
      }
    })

    this.renderMetadata(issue)
    await this.renderDescription(issue.description, attachments)
    this.renderAttachments(attachments)
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

  async renderDescription(
    description: string,
    attachments: RedmineAttachment[]
  ): Promise<void> {
    const section = this.createSection('Description')
    const body = section.createDiv({ cls: ['redmine-issue-modal-description'] })

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

  renderAttachments(attachments: RedmineAttachment[]): void {
    const section = this.createSection('Attachments')

    if (!attachments.length) {
      section.createDiv({
        text: 'No attachments',
        cls: ['redmine-issue-modal-empty']
      })
      return
    }

    const list = section.createDiv({ cls: ['redmine-issue-modal-attachments'] })
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

  onClose(): void {
    this.modalEl.removeClass('redmine-issue-modal-shell')
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url))
    this.objectUrls = []
  }
}
