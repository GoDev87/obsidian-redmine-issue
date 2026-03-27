import { setIcon } from 'obsidian'
import { appendStatusBadge } from '../lib/status-badge'
import { RedmineChangeset, RedmineIssue, RedmineRelation, RedmineWatcher } from '../interfaces/redmine'
import { IssueDetailsModalContext } from './types'

export async function renderRelated(
  context: IssueDetailsModalContext,
  issue: RedmineIssue,
  container: HTMLDivElement
): Promise<void> {
  const relatedIssues = await resolveRelatedIssues(context, issue)

  renderIssueLinksSection(
    context,
    container,
    'Parent Issue',
    issue.parent?.id ? [{ id: issue.parent.id, subject: '' }] : [],
    (item) => createIssueLink(context, item.id, item.subject, relatedIssues.get(item.id))
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
      relatedIssues.get(child.id)
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
      return createIssueLink(context, relatedIssueId, label, relatedIssues.get(relatedIssueId))
    }
  )
  renderTextListSection(container, 'Watchers', issue.watchers, (watcher) => watcher.name)
  renderChangesetsSection(context, container, issue.changesets)
}

async function resolveRelatedIssues(
  context: IssueDetailsModalContext,
  issue: RedmineIssue
): Promise<Map<string, RedmineIssue | null>> {
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

  const entries = await Promise.all(
    [...relatedIds].map(async (issueId) => {
      try {
        const relatedIssue = await context.plugin.redmineClient.getIssueDetails(issueId)
        return [issueId, relatedIssue] as const
      } catch {
        return [issueId, null] as const
      }
    })
  )

  return new Map(entries)
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

function createIssueLink(
  context: IssueDetailsModalContext,
  issueId: string,
  extraText: string,
  relatedIssue: RedmineIssue | null | undefined
): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.classList.add('redmine-issue-modal-related-link')

  const label = `#${issueId}${extraText ? ` ${extraText}` : ''}`

  if (relatedIssue) {
    const link = document.createElement('a')
    link.textContent = label
    link.href = context.getIssueUrl(issueId)
    link.classList.add('external-link')
    link.addEventListener('click', (event) => {
      event.preventDefault()
      context.openIssue(issueId)
    })
    wrapper.appendChild(link)

    const meta = document.createElement('div')
    meta.classList.add('redmine-issue-modal-related-summary')

    if (relatedIssue.status?.name) {
      appendStatusBadge(meta, relatedIssue.status.name)
    }

    if (relatedIssue.assignedTo?.name) {
      const assignee = document.createElement('span')
      assignee.classList.add('redmine-issue-modal-related-summary-text')
      assignee.textContent = relatedIssue.assignedTo.name
      meta.appendChild(assignee)
    }

    if (typeof relatedIssue.doneRatio === 'number' && !Number.isNaN(relatedIssue.doneRatio)) {
      const progress = document.createElement('span')
      progress.classList.add('redmine-issue-modal-related-summary-text')
      progress.textContent = `${relatedIssue.doneRatio}%`
      meta.appendChild(progress)
    }

    if (meta.childNodes.length > 0) {
      wrapper.appendChild(meta)
    }

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
