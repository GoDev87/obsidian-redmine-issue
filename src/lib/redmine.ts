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
  updatedAt: string;
}

export interface RedmineProject {
  id: string;
  name: string;
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
    const res = await this.queueApi('GET', join('issues', issueId + '.json'))
    res.issue = res.issue || {}

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
      updatedAt: res.issue.updated_on || ''
    }
  }
}
