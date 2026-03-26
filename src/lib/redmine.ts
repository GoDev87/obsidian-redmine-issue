/* eslint-disable @typescript-eslint/no-explicit-any */
import RedmineIssuePluginSettings from '../settings'
import { RedmineIssue, RedmineFullUser } from '../interfaces/redmine'
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

    return parseIssueDetails(res.issue)
  }
}
