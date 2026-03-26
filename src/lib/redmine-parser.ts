/* eslint-disable @typescript-eslint/no-explicit-any */
import { RedmineIssue } from '../interfaces/redmine'

export function parseIssueDetails(issue: any): RedmineIssue {
  const source = issue || {}

  return {
    id: source.id || '',
    project: {
      id: source.project?.id || '',
      name: source.project?.name || ''
    },
    tracker: {
      id: source.tracker?.id || '',
      name: source.tracker?.name || ''
    },
    status: {
      id: source.status?.id || '',
      name: source.status?.name || '',
      isClosed: source.status?.is_closed || false
    },
    priority: {
      id: source.priority?.id || '',
      name: source.priority?.name || ''
    },
    author: {
      id: source.author?.id || '',
      name: source.author?.name || ''
    },
    assignedTo: {
      id: source.assigned_to?.id || '',
      name: source.assigned_to?.name || ''
    },
    category: {
      id: source.category?.id || '',
      name: source.category?.name || ''
    },
    fixedVersion: {
      id: source.fixed_version?.id || '',
      name: source.fixed_version?.name || ''
    },
    parent: {
      id: source.parent?.id || ''
    },
    subject: source.subject || '',
    description: source.description || '',
    startDate: source.start_date || '',
    dueDate: source.due_date || '',
    doneRatio: source.done_ratio || 0,
    isPrivate: source.is_private || false,
    estimatedHours: source.estimated_hours || 0,
    totalEstimatedHours: source.total_estimated_hours || 0,
    spentHours: source.spent_hours || 0,
    totalSpentHours: source.total_spent_hours || 0,
    customFields: (source.custom_fields || []).map((field: any) => ({
      id: field.id || '',
      name: field.name || '',
      multiple: field.multiple || false,
      value: field.value || ''
    })),
    createdOn: source.created_on || '',
    updatedOn: source.updated_on || '',
    closedOn: source.closed_on || '',
    changesets: (source.changesets || []).map((changeset: any) => ({
      revision: changeset.revision || '',
      user: {
        id: changeset.user?.id || '',
        name: changeset.user?.name || ''
      },
      comments: changeset.comments || '',
      committedOn: changeset.committed_on || ''
    })),
    children: (source.children || []).map((child: any) => ({
      id: child.id || '',
      tracker: {
        id: child.tracker?.id || '',
        name: child.tracker?.name || ''
      },
      subject: child.subject || ''
    })),
    attachments: (source.attachments || []).map((attachment: any) => ({
      id: attachment.id || '',
      filename: attachment.filename || '',
      filesize: attachment.filesize || 0,
      contentType: attachment.content_type || '',
      description: attachment.description || '',
      contentUrl: attachment.content_url || '',
      thumbnailUrl: attachment.thumbnail_url || '',
      author: {
        id: attachment.author?.id || '',
        name: attachment.author?.name || ''
      },
      createdOn: attachment.created_on || ''
    })),
    relations: (source.relations || []).map((relation: any) => ({
      id: relation.id || '',
      issueId: relation.issue_id || '',
      issueToId: relation.issue_to_id || '',
      relationType: relation.relation_type || '',
      delay: relation.delay || 0
    })),
    journals: (source.journals || []).map((journal: any) => ({
      id: journal.id || '',
      user: {
        id: journal.user?.id || '',
        name: journal.user?.name || ''
      },
      notes: journal.notes || '',
      createdOn: journal.created_on || '',
      updatedOn: journal.updated_on || '',
      updatedBy: {
        id: journal.updated_by?.id || '',
        name: journal.updated_by?.name || ''
      },
      privateNotes: journal.private_notes || false,
      details: (journal.details || []).map((detail: any) => ({
        property: detail.property || '',
        name: detail.name || '',
        oldValue: detail.old_value || '',
        newValue: detail.new_value || ''
      }))
    })),
    watchers: (source.watchers || []).map((watcher: any) => ({
      id: watcher.id || '',
      name: watcher.name || ''
    })),
    allowed_statuses: (source.allowed_statuses || []).map((status: any) => ({
      id: status.id || '',
      name: status.name || '',
      isClosed: status.is_closed || false
    }))
  }
}
