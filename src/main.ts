import { Plugin } from 'obsidian'
import './lib/icons'
import RedmineClient from './lib/redmine'
import RedmineIssuePluginSettings, { DEFAULT_SETTINGS } from './settings'
import RedmineIssueSettingTab from './settings-tab'
import IssueWidget from './issue-widget'

// https://d-yoshi.github.io/redmine-openapi/#tag/Issues/operation/getIssue

export default class RedmineIssuePlugin extends Plugin {
	settings = DEFAULT_SETTINGS as RedmineIssuePluginSettings
	redmineClient!: RedmineClient
	issuesWidgets: IssueWidget[] = []

	async onload(): Promise<void> {
		await this.loadSettings()
		this.addSettingTab(new RedmineIssueSettingTab(this.app, this))

		this.initRedmineClient()
		
		this.registerMarkdownCodeBlockProcessor('redmine', this.issueBlockProcessor.bind(this))
		this.registerMarkdownCodeBlockProcessor('redmine-query', this.issueQueryBlockProcessor.bind(this))

		this.addCommand({
			id: 'app:refresh-redmine-issues',
			name: 'Refresh Redmine issues',
			callback: this.refreshData.bind(this),
			hotkeys: []
		})
	}

	initRedmineClient(): void {
		this.redmineClient = new RedmineClient(this.settings)
		this.refreshData()
	}

	refreshData(): void {
		document.querySelectorAll('.redmine-issue').forEach(issue => issue.dispatchEvent(new CustomEvent('refresh')))
	}

	async issueBlockProcessor(content: string, el: HTMLElement): Promise<void> {
		el.empty()
		const issueIds = content
			.split(/\r?\n/)
			.map(identifier => this.normalizeIssueIdentifier(identifier))
			.filter((identifier): identifier is string => Boolean(identifier))
		this.renderIssueGrid(issueIds, el)
	}

	async issueQueryBlockProcessor(content: string, el: HTMLElement): Promise<void> {
		el.empty()
		el.setText('Loading...')

		try {
			const filters = this.parseIssueQuery(content)
			const issueIds = await this.redmineClient.searchIssueIds(filters)

			el.empty()

			if (!issueIds.length) {
				el.createDiv({
					text: 'No issues found',
					cls: ['redmine-issue-query-empty']
				})
				return
			}

			this.renderIssueGrid(issueIds, el)
		} catch (error) {
			el.empty()
			el.createDiv({
				text: error instanceof Error ? error.message : String(error),
				cls: ['redmine-issue-query-empty', 'in-error']
			})
		}
	}

	renderIssueGrid(issueIds: string[], el: HTMLElement): void {
		const container = el.createDiv()
		container.addClass('redmine-issues-grid')

		for (const key of issueIds) {
			const issueWidgetContainer = container.createDiv()
			issueWidgetContainer.addClass('redmine-issue-grid-item')
		
			const issueWidget = issueWidgetContainer.createDiv()
			issueWidget.addClass('redmine-issue')
			issueWidget.dataset.identifier = key
			issueWidget.dataset.type = 'redmine'

			new IssueWidget(this, issueWidget)
				.setIssueIdentifier(key)
		}
	}

	normalizeIssueIdentifier(identifier: string): string | null {
		const trimmedIdentifier = identifier.trim()
		if (!trimmedIdentifier) {
			return null
		}

		const issueUrlMatch = trimmedIdentifier.match(/\/issues\/(\d+)(?:[/?#]|$)/)
		if (issueUrlMatch) {
			return issueUrlMatch[1]
		}

		return trimmedIdentifier
	}

	parseIssueQuery(content: string): Record<string, string> {
		const keyMap: Record<string, string> = {
			project: 'project_id',
			project_id: 'project_id',
			subproject: 'subproject_id',
			subproject_id: 'subproject_id',
			tracker: 'tracker_id',
			tracker_id: 'tracker_id',
			assigned_to: 'assigned_to_id',
			assignee: 'assigned_to_id',
			assigned_to_id: 'assigned_to_id',
			author: 'author_id',
			author_id: 'author_id',
			status: 'status_id',
			status_id: 'status_id',
			priority: 'priority_id',
			priority_id: 'priority_id',
			category: 'category_id',
			category_id: 'category_id',
			fixed_version: 'fixed_version_id',
			fixed_version_id: 'fixed_version_id',
			version: 'fixed_version_id',
			subject: 'subject',
			created_on: 'created_on',
			updated_on: 'updated_on',
			start_date: 'start_date',
			due_date: 'due_date',
			limit: 'limit',
			offset: 'offset',
			sort: 'sort'
		}

		return content
			.split(/\r?\n/)
			.map(line => line.trim())
			.filter(line => line.length > 0)
			.reduce((filters, line) => {
				const separatorIndex = line.indexOf('=')
				if (separatorIndex === -1) {
					throw new Error(`Invalid query line: ${line}`)
				}

				const rawKey = line.slice(0, separatorIndex).trim()
				const value = line.slice(separatorIndex + 1).trim()
				const mappedKey = keyMap[rawKey]

				if (!mappedKey) {
					throw new Error(`Unsupported query key: ${rawKey}`)
				}

				if (!value) {
					throw new Error(`Missing value for query key: ${rawKey}`)
				}

				filters[mappedKey] = value
				return filters
			}, {} as Record<string, string>)
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings)

		this.initRedmineClient()
	}
}
