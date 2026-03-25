/* eslint-disable @typescript-eslint/no-explicit-any */
import RedmineIssuePluginSettings from '../settings'
import { request } from 'https'
import { join } from 'path'

export interface RedmineIssue {
  id: string;
  project: RedmineProject,
  subject: string;
  description: string;
  status: string;
  priority: string;
  assignee: string;
  author: string;
  tracker: string;
  category: string;
  fixedVersion: string;
  createdAt: string;
  updatedAt: string;
  lastUpdatedBy: string;
  attachments: RedmineAttachment[];
}

export interface RedmineProject {
  id: string;
  name: string;
}

export interface RedmineAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  createdAt: string;
  author: string;
  downloadUrl: string;
}

export interface RedmineUser {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  login: string;
  mail: string;
}

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

      const req = request(options, (res) => {
        res.on('data', (chunk) => {
          resData += chunk
        })

        res.on('error', (error) => {
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
      
      req.on('error', (error) => {
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

  async getUser(): Promise<RedmineUser> {
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
    const res = await this.queueApi('GET', `issues/${issueId}.json?include=attachments,journals`)
    res.issue = res.issue || {}
    const journals = Array.isArray(res.issue.journals) ? res.issue.journals : []
    const lastJournal = journals.length > 0 ? journals[journals.length - 1] : null

    return {
      id: res.issue.id,
      project: {
        id: res.issue.project.id,
        name: res.issue.project.name
      },
      subject: res.issue.subject,
      description: res.issue.description || '',
      status: res.issue.status?.name || '',
      priority: res.issue.priority?.name || '',
      assignee: res.issue.assigned_to?.name || '',
      author: res.issue.author?.name || '',
      tracker: res.issue.tracker?.name || '',
      category: res.issue.category?.name || '',
      fixedVersion: res.issue.fixed_version?.name || '',
      createdAt: res.issue.created_on || '',
      updatedAt: res.issue.updated_on || '',
      lastUpdatedBy: lastJournal?.user?.name || '',
      attachments: (res.issue.attachments || []).map((attachment: {
        id: any;
        filename: any;
        filesize: any;
        content_type: any;
        created_on: any;
        author?: { name?: any };
        content_url: any;
      }) => ({
        id: attachment.id,
        fileName: attachment.filename || '',
        fileSize: attachment.filesize || 0,
        contentType: attachment.content_type || '',
        createdAt: attachment.created_on || '',
        author: attachment.author?.name || '',
        downloadUrl: attachment.content_url || ''
      }))
    }
  }
}
