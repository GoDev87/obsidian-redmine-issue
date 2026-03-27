import { Notice, setIcon } from 'obsidian'
import { IssueDetailsModalContext } from './types'

export function renderHeader(context: IssueDetailsModalContext, issueId: string, subject: string): void {
  const issueUrl = context.getIssueUrl(issueId)

  context.contentEl.createEl('h2', {
    text: `${issueId} ${subject}`,
    cls: ['redmine-issue-modal-title']
  })

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
