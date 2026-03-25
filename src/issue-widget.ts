import RedmineIssuePlugin from './main'
import {RedmineIssue} from './lib/redmine'
import * as path from 'path'

export default class IssueWidget {
  el: HTMLElement;
  plugin: RedmineIssuePlugin;
  redmineIssueKey: string;
  issue: RedmineIssue;

  constructor(plugin: RedmineIssuePlugin, el: HTMLElement) {
    this.plugin = plugin
    this.el = el
    this.el.addEventListener('refresh', this.loadIssue.bind(this))
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
    } catch (error) {
      this.el.innerHTML = error.toString()
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
      subheader.createSpan({
        text: `${this.issue.status}`
      })
    }
    subheader.createEl('a', {
      attr: {
        rel: 'noopener',
        target: '_blank',
        href: path.join('https://'+this.plugin.settings.host, 'issues', this.issue.id.toString()),
      },
      cls: ['external-link']
    })
  }
}
