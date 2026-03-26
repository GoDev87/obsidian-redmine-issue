import { Modal } from 'obsidian'
import RedmineIssuePlugin from './main'
import { appendStatusBadge } from './lib/status-badge'
import { RedmineAttachment, RedmineIssue } from './interfaces/redmine'

export default class IssueDetailsModal extends Modal {
  plugin: RedmineIssuePlugin
  issueId: string

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

    this.renderIssue(issue)
  }

  renderIssue(issue: RedmineIssue): void {
    this.contentEl.empty()

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
    this.renderDescription(issue.description)
    this.renderAttachments(issue.attachments)
  }

  renderMetadata(issue: RedmineIssue): void {
    const section = this.createSection('Details')
    const grid = section.createDiv({ cls: ['redmine-issue-modal-grid'] })

    this.addGridField(grid, 'Project', issue.project.name)
    this.addGridField(grid, 'Tracker', issue.tracker?.name)
    this.addStatusGridField(grid, 'Status', issue.status?.name)
    this.addGridField(grid, 'Priority', issue.priority?.name)
    this.addGridField(grid, 'Assigned To', issue.assignedTo?.name)
    this.addGridField(grid, 'Author', issue.author?.name)
    this.addGridField(grid, 'Category', issue.category?.name)
    this.addGridField(grid, 'Version', issue.fixedVersion?.name)
    this.addGridField(grid, 'Created', this.formatDate(issue.createdOn))
    this.addGridField(grid, 'Last Update', this.formatDate(issue.updatedOn))
  }

  renderDescription(description: string): void {
    const section = this.createSection('Description')
    const body = section.createDiv({ cls: ['redmine-issue-modal-description'] })

    if (!description) {
      body.setText('No description')
      return
    }

    description.split(/\r?\n/).forEach((line, index) => {
      if (index > 0) {
        body.createEl('br')
      }
      this.appendLinkifiedText(body, line)
    })
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
        href: attachment.contentUrl,
        cls: ['external-link'],
        attr: {
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

  createSection(title: string): HTMLDivElement {
    const section = this.contentEl.createDiv({ cls: ['redmine-issue-modal-section'] })
    section.createEl('h3', {
      text: title,
      cls: ['redmine-issue-modal-section-title']
    })
    return section
  }

  addGridField(container: HTMLDivElement, label: string, value?: string): void {
    if (!value) {
      return
    }

    const row = container.createDiv({ cls: ['redmine-issue-modal-field'] })
    row.createDiv({
      text: label,
      cls: ['redmine-issue-modal-field-label']
    })
    row.createDiv({
      text: value,
      cls: ['redmine-issue-modal-field-value']
    })
  }

  addStatusGridField(container: HTMLDivElement, label: string, value?: string): void {
    if (!value) {
      return
    }

    const row = container.createDiv({ cls: ['redmine-issue-modal-field'] })
    row.createDiv({
      text: label,
      cls: ['redmine-issue-modal-field-label']
    })
    const valueContainer = row.createDiv({
      cls: ['redmine-issue-modal-field-value']
    })
    appendStatusBadge(valueContainer, value)
  }

  appendLinkifiedText(container: HTMLDivElement, text: string): void {
    const urlRegex = /https?:\/\/[^\s)]+/g
    let lastIndex = 0

    let match: RegExpExecArray | null
    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[0]
      const startIndex = match.index
      if (startIndex > lastIndex) {
        container.appendText(text.slice(lastIndex, startIndex))
      }

      container.createEl('a', {
        text: url,
        href: url,
        cls: ['external-link'],
        attr: {
          rel: 'noopener',
          target: '_blank'
        }
      })
      lastIndex = startIndex + url.length
    }

    if (lastIndex < text.length) {
      container.appendText(text.slice(lastIndex))
    }
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
  }
}
