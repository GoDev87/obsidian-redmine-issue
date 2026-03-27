/* eslint-disable @typescript-eslint/no-explicit-any */
import { requestUrl } from 'obsidian'
import RedmineIssuePluginSettings from '../settings'
import { RedmineAttachment, RedmineIssue, RedmineFullUser } from '../interfaces/redmine'
import { request } from 'https'
import { join } from 'path'
import { parseIssueDetails } from './redmine-parser'

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
            const message = resData || `Status code ${res.statusCode}`
            return reject(`Status code ${res.statusCode} for ${path}: ${message}`)
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
    return parseIssueDetails(res.issue)
  }

  async searchIssueIds(filters: Record<string, string>): Promise<string[]> {
    const normalizedFilters = await this.normalizeIssueFilters(filters)
    const query = new URLSearchParams()

    Object.entries(normalizedFilters).forEach(([key, value]) => {
      if (!value) {
        return
      }

      query.set(key, value)
    })

    const path = `issues.json${query.toString() ? `?${query.toString()}` : ''}`
    const res = await this.queueApi('GET', path)

    return (res.issues || [])
      .map((issue: { id?: string | number }) => issue.id)
      .filter((id: string | number | undefined): id is string | number => id !== undefined && id !== null)
      .map((id: string | number) => id.toString())
  }

  private async normalizeIssueFilters(filters: Record<string, string>): Promise<Record<string, string>> {
    const normalizedFilters = { ...filters }

    if (normalizedFilters.project_id && !this.isNumericFilterValue(normalizedFilters.project_id)) {
      normalizedFilters.project_id = await this.resolveProjectId(normalizedFilters.project_id)
    }

    if (normalizedFilters.assigned_to_id?.toLowerCase() === 'me') {
      normalizedFilters.assigned_to_id = await this.resolveCurrentUserId()
    }

    if (normalizedFilters.author_id?.toLowerCase() === 'me') {
      normalizedFilters.author_id = await this.resolveCurrentUserId()
    }

    if (normalizedFilters.tracker_id && !this.isNumericFilterValue(normalizedFilters.tracker_id)) {
      normalizedFilters.tracker_id = await this.resolveNamedValue(
        'trackers.json',
        'trackers',
        normalizedFilters.tracker_id
      )
    }

    if (normalizedFilters.priority_id && !this.isNumericFilterValue(normalizedFilters.priority_id)) {
      normalizedFilters.priority_id = await this.resolveNamedValue(
        'enumerations/issue_priorities.json',
        'issue_priorities',
        normalizedFilters.priority_id
      )
    }

    if (
      normalizedFilters.status_id &&
      !this.isNumericFilterValue(normalizedFilters.status_id) &&
      !['open', 'closed', '*'].includes(normalizedFilters.status_id.toLowerCase())
    ) {
      normalizedFilters.status_id = await this.resolveNamedValue(
        'issue_statuses.json',
        'issue_statuses',
        normalizedFilters.status_id
      )
    }

    if (
      normalizedFilters.fixed_version_id &&
      !this.isNumericFilterValue(normalizedFilters.fixed_version_id) &&
      normalizedFilters.project_id
    ) {
      normalizedFilters.fixed_version_id = await this.resolveNamedValue(
        `projects/${normalizedFilters.project_id}/versions.json`,
        'versions',
        normalizedFilters.fixed_version_id
      )
    }

    return normalizedFilters
  }

  private isNumericFilterValue(value: string): boolean {
    return /^\d+$/.test(value)
  }

  private async resolveProjectId(projectIdentifier: string): Promise<string> {
    const res = await this.queueApi('GET', `projects/${encodeURIComponent(projectIdentifier)}.json`)
    const projectId = res.project?.id

    if (!projectId) {
      throw new Error(`Unknown project: ${projectIdentifier}`)
    }

    return projectId.toString()
  }

  private async resolveCurrentUserId(): Promise<string> {
    const user = await this.getUser()

    if (!user.id) {
      throw new Error('Unable to resolve current Redmine user')
    }

    return user.id.toString()
  }

  private async resolveNamedValue(path: string, collectionKey: string, value: string): Promise<string> {
    const res = await this.queueApi('GET', path)
    const entry = (res[collectionKey] || []).find((item: { id?: string | number; name?: string }) =>
      this.matchesNamedValue(item.name, value)
    )

    if (!entry?.id) {
      throw new Error(`Unknown ${collectionKey.replace(/_/g, ' ')} value: ${value}`)
    }

    return entry.id.toString()
  }

  private matchesNamedValue(candidate: string | undefined, expected: string): boolean {
    if (!candidate) {
      return false
    }

    return candidate.trim().toLowerCase() === expected.trim().toLowerCase()
  }

  async resolveAttachmentUrl(attachment: RedmineAttachment): Promise<string> {
    return this.fetchAttachmentUrl(attachment)
  }

  private async fetchAttachmentUrl(attachment: RedmineAttachment): Promise<string> {
    const response = await requestUrl({
      url: attachment.contentUrl,
      method: 'GET',
      headers: {
        'X-Redmine-API-Key': this.settings.token
      }
    })

    const contentType = response.headers['content-type'] || attachment.contentType || 'application/octet-stream'
    const blob = new Blob([response.arrayBuffer], { type: contentType })
    return URL.createObjectURL(blob)
  }
}
