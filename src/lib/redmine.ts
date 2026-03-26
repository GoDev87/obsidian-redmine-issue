/* eslint-disable @typescript-eslint/no-explicit-any */
import RedmineIssuePluginSettings from '../settings'
import { RedmineIssue, RedmineFullUser } from '../interfaces/redmine'
import { request } from 'https'
import { join } from 'path'

export default class RedmineClient {
  settings: RedmineIssuePluginSettings
  queue: Promise<any>

  constructor(settings: RedmineIssuePluginSettings) {
    this.settings = settings
    this.queue = Promise.resolve()
  }

  async callApi(method: string, path: string, data: any = {}): Promise<any> {
    const options = {
      hostname: this.settings.host,
      port: 443,
      path: join('/', path),
      method: method,
      headers: {
        'X-Redmine-API-Key': this.settings.token,
        'Content-Type': 'application/json'
      }
    }

    return new Promise((resolve, reject) => {
      let resData = ''

      const req = request(options, (res: any) => {
        res.on('data', (chunk: any) => {
          resData += chunk
        })

        res.on('error', (error: any) => {
          reject(error)
        })

        res.on('end', () => {
          resData = resData.trim()

          if (res.statusCode < 200 || res.statusCode > 299) {
            return reject(resData || `Status code ${res.statusCode}`)
          }

          resolve(resData ? JSON.parse(resData) : '')
        })
      })
      
      req.on('error', (error: any) => {
        reject(error)
      })

      if (['POST', 'PUT'].includes(method.toLocaleUpperCase()) && data) {
        req.write(JSON.stringify(data))
      }

      req.end()
    })    
  }

  async queueApi(method: string, path: string, data: any = {}): Promise<any> {
    return await this.queue.then(() => this.callApi(method, path, data))
  }

  async getUser(): Promise<RedmineFullUser> {
    const res = await this.callApi('GET', join('users', 'current.json'))
    res.user = res.user || {}

    return {
      id: res.user.id,
      name: res.user.login,
      firstName: res.user.firstname,
      lastName: res.user.lastname,
      login: res.user.login,
      mail: res.user.login
    }
  }

  async getIssueDetails(issueId: string): Promise<RedmineIssue> {
    const res = await this.queueApi('GET', `issues/${issueId}.json?include=attachments,journals,relations,children,watchers,changesets,allowed_statuses`)
    console.log(res)

    // this.queueApi('GET', `enumerations/issue_priorities.json`).then((resp) => {
    //   console.log(resp)
    // })

    res.issue = res.issue || {}

    return {
      id: res.issue.id,
      project: {
        id: res.issue.project?.id || '',
        name: res.issue.project?.name || ''
      },
      tracker: {
        id: res.issue.tracker?.id || '',
        name: res.issue.tracker?.name || ''
      },
      status: {
        id: res.issue.status?.id || '',
        name: res.issue.status?.name || '',
        isClosed: res.issue.status?.is_closed || false
      },
      priority: {
        id: res.issue.priority?.id || '',
        name: res.issue.priority?.name || ''
      },
      author: {
        id: res.issue.author?.id || '',
        name: res.issue.author?.name || ''
      },
      assignedTo: {
        id: res.issue.assigned_to?.id || '',
        name: res.issue.assigned_to?.name || ''
      },
      category: {
        id: res.issue.category?.id || '',
        name: res.issue.category?.name || ''
      },
      fixedVersion: {
        id: res.issue.fixed_version?.id || '',
        name: res.issue.fixed_version?.name || ''
      },
      parent: {
        id: res.issue.parent?.id || ''
      },
      subject: res.issue.subject || '',
      description: res.issue.description || '',
      startDate: res.issue.start_date || '',
      dueDate: res.issue.due_date || '',
      doneRatio: res.issue.done_ratio || 0,
      isPrivate: res.issue.is_private || false,
      estimatedHours: res.issue.estimated_hours || 0,
      totalEstimatedHours: res.issue.total_estimated_hours || 0,
      spentHours: res.issue.spent_hours || 0,
      totalSpentHours: res.issue.total_spent_hours || 0,
      customFields: (res.issue.custom_fields || []).map((field: any) => ({
        id: field.id || '',
        name: field.name || '',
        multiple: field.multiple || false,
        value: field.value || ''
      })),
      createdOn: res.issue.created_on || '',
      updatedOn: res.issue.updated_on || '',
      closedOn: res.issue.closed_on || '',
      changesets: (res.issue.changesets || []).map((changeset: any) => ({
        revision: changeset.revision || '',
        user: {
          id: changeset.user?.id || '',
          name: changeset.user?.name || ''
        },
        comments: changeset.comments || '',
        committedOn: changeset.committed_on || ''
      })),
      children: (res.issue.children || []).map((child: any) => ({
        id: child.id || '',
        tracker: {
          id: child.tracker?.id || '',
          name: child.tracker?.name || ''
        },
        subject: child.subject || ''
      })),
      attachments: (res.issue.attachments || []).map((attachment: any) => ({
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
      relations: (res.issue.relations || []).map((relation: any) => ({
        id: relation.id || '',
        issueId: relation.issue_id || '',
        issueToId: relation.issue_to_id || '',
        relationType: relation.relation_type || '',
        delay: relation.delay || 0
      })),
      journals: (res.issue.journals || []).map((journal: any) => ({
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
      watchers: (res.issue.watchers || []).map((watcher: any) => ({
        id: watcher.id || '',
        name: watcher.name || ''
      })),
      allowed_statuses: (res.issue.allowed_statuses || []).map((status: any) => ({
        id: status.id || '',
        name: status.name || '',
        isClosed: status.is_closed || false
      }))
    } as RedmineIssue
  }
}
