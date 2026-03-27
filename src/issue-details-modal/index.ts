import { Modal } from 'obsidian'
import RedmineIssuePlugin from '../main'
import { RedmineIssue } from '../interfaces/redmine'
import { GridFieldOptions } from './types'
import { formatDate, formatFileSize, formatJournalDetail } from './utils'
import { renderIssueContent, resolveAttachments } from './renderers'

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
    const attachments = await resolveAttachments(this, issue.attachments)
    await renderIssueContent(this, issue, attachments)
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
    options?: GridFieldOptions
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
    return formatDate(value)
  }

  formatFileSize(size: number): string {
    return formatFileSize(size)
  }

  formatJournalDetail(label: string, oldValue: string, newValue: string): string {
    return formatJournalDetail(label, oldValue, newValue)
  }

  getIssueUrl(issueId: string): string {
    return `https://${this.plugin.settings.host}/issues/${issueId}`
  }

  openIssue(issueId: string): void {
    new IssueDetailsModal(this.plugin, issueId).open()
  }

  onClose(): void {
    this.modalEl.removeClass('redmine-issue-modal-shell')
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url))
    this.objectUrls = []
  }
}
