import { RedmineAttachment, RedmineIssue } from '../interfaces/redmine'
import { IssueDetailsModalContext } from './types'
import { renderAttachmentsList } from './attachments-renderer'
import { renderComments, renderDescription, renderHistory } from './content-renderers'
import { renderRelated } from './related-renderer'

export async function renderTabs(
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
      key: 'comments',
      label: `Comments (${issue.journals.filter((journal) => journal.notes).length})`,
      render: async (container: HTMLDivElement) => renderComments(context, issue.journals, attachments, container)
    },
    {
      key: 'history',
      label: 'History',
      render: async (container: HTMLDivElement) => renderHistory(context, issue.journals, attachments, container)
    },
    {
      key: 'attachments',
      label: `Attachments (${attachments.length})`,
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
