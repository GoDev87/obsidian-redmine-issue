import { App } from 'obsidian'
import RedmineIssuePlugin from '../main'

export interface GridFieldOptions {
  valueClasses?: string[]
  renderValue?: (container: HTMLDivElement, value: string) => void
}

export interface IssueDetailsModalContext {
  app: App
  plugin: RedmineIssuePlugin
  contentEl: HTMLElement
  objectUrls: string[]
  createSection(title: string): HTMLDivElement
  addGridField(
    container: HTMLDivElement,
    label: string,
    value?: string,
    options?: GridFieldOptions
  ): HTMLDivElement | void
  formatDate(value: string): string
  formatFileSize(size: number): string
  formatJournalDetail(label: string, oldValue: string, newValue: string): string
  getIssueUrl(issueId: string): string
}
