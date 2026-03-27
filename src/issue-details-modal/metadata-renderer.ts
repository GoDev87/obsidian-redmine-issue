import removeAccents from 'remove-accents'
import { appendStatusBadge } from '../lib/status-badge'
import { RedmineCustomField, RedmineIssue } from '../interfaces/redmine'
import { IssueDetailsModalContext } from './types'

export function renderMetadata(context: IssueDetailsModalContext, issue: RedmineIssue): void {
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
    if (!field.value || (Array.isArray(field.value) && field.value.length === 0)) {
      return
    }

    context.addGridField(grid, field.name, formatCustomFieldValue(field))
  })
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
