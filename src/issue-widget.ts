import RedmineIssuePlugin from './main'
import IssueDetailsModal from './issue-details-modal'
import { appendStatusBadge } from './lib/status-badge'
import { RedmineIssue } from './interfaces/redmine'

export default class IssueWidget {
  el: HTMLElement;
  plugin: RedmineIssuePlugin;
  redmineIssueKey = '';
  issue?: RedmineIssue;

  constructor(plugin: RedmineIssuePlugin, el: HTMLElement) {
    this.plugin = plugin
    this.el = el
    this.el.addEventListener('refresh', this.loadIssue.bind(this))
    this.el.addEventListener('click', this.onClick.bind(this))
    this.el.addClass('loading')
  }

  getIssueIdentifier(): string {
    return this.redmineIssueKey
  }

  setIssueIdentifier(redmineIssueKey: string): IssueWidget {
    this.el.empty()
    this.el.innerHTML = 'loading..'

    this.redmineIssueKey = redmineIssueKey
    this.loadIssue()

    return this
  }

  async loadIssue(): Promise<void> {
    try {
      this.issue = await this.plugin.redmineClient.getIssueDetails(this.redmineIssueKey)
      // console.log('Loaded issue details', this.issue)
    } catch (error) {
      this.el.innerHTML = error instanceof Error ? error.message : String(error)
      this.el.addClass('in-error')
      return
    } finally {
      this.el.removeClass('loading')
    }
    this.el.removeClass('in-error')

    this.el.empty()
    this.showIssueDetails()
  }

  showIssueDetails(): void {
    if (!this.issue) {
      return
    }

    this.el.createDiv({
      text: `${this.issue.subject}`,
      cls: ['redmine-issue-title']
    })

    if (this.issue.description) {
      this.el.createDiv({
        text: this.issue.description,
        cls: ['redmine-issue-description']
      })
    }

    const subheader = this.el.createDiv({ cls: ['redmine-issue-details'] })
    subheader.createSpan({
      text: `${this.issue.id}`
    })
    subheader.createSpan({
      text: `${this.issue.project.name}`
    })
    if (this.issue.status) {
      appendStatusBadge(subheader, this.issue.status.name)
    }
    subheader.createEl('a', {
      attr: {
        rel: 'noopener',
        target: '_blank',
        href: `https://${this.plugin.settings.host}/issues/${this.issue.id.toString()}`,
      },
      cls: ['external-link']
    })

    const meta = this.el.createDiv({ cls: ['redmine-issue-meta'] })
    this.addMetaField(meta, 'Assigned', this.issue.assignedTo?.name)
    this.addMetaField(meta, 'Updated', this.formatUpdatedAt(this.issue.updatedOn))
    this.addMetaField(meta, 'Priority', this.issue.priority?.name)
    // this.addStatusField(meta, 'Status', this.issue.status)
  }

  onClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('a')) {
      return
    }

    if (!this.issue?.id) {
      return
    }

    new IssueDetailsModal(this.plugin, this.issue.id.toString()).open()
  }

  addMetaField(container: HTMLDivElement, label: string, value?: string): void {
    if (!value) {
      return
    }

    const row = container.createDiv({ cls: ['redmine-issue-meta-row'] })
    row.createSpan({
      text: `${label}: `,
      cls: ['redmine-issue-meta-label']
    })
    row.createSpan({
      text: value,
      cls: ['redmine-issue-meta-value']
    })
  }

  addStatusField(container: HTMLDivElement, label: string, value: string): void {
    if (!value) {
      return
    }

    const row = container.createDiv({ cls: ['redmine-issue-meta-row'] })
    row.createSpan({
      text: `${label}: `,
      cls: ['redmine-issue-meta-label']
    })

    const valueContainer = row.createSpan({
      cls: ['redmine-issue-meta-value']
    })
    appendStatusBadge(valueContainer, value)
  }

  formatUpdatedAt(updatedAt: string): string {
    if (!updatedAt) {
      return ''
    }

    const date = new Date(updatedAt)
    if (Number.isNaN(date.getTime())) {
      return updatedAt
    }

    return date.toLocaleString()
  }
}
