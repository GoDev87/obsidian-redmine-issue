# Obsidian Redmine Issue Plugin

An [Obsidian.md](https://obsidian.md/) plugin to display Redmine issues directly inside your notes.

## Features

- Render one or many Redmine issues from a markdown code block
- Accept raw issue IDs or full Redmine issue URLs
- Query Redmine with a `redmine-query` block
- Open a detailed issue modal from each issue card
- Render Redmine Textile content as Markdown in description, comments, and history
- Display attachments, comments, history, related issues, watchers, changesets, custom fields, progress, spent hours, due date, and more
- Open related issues in another Obsidian modal
- Show a lock icon when a related issue is not accessible
- Copy the Redmine issue URL from the issue modal
- Insert issues from the command palette into the current note

## Requirements

- A Redmine instance host
- A personal API access key: `My account -> API access key -> Show`

## Installation

1. Clone this repository into `<vault>/.obsidian/plugins`.
2. Go into the plugin directory and run `npm install`.
3. Run `npm run build`.
4. Enable the plugin in Obsidian settings.

## Configuration

Configure the plugin with:

- `Redmine host`
- `API access key`

You can also test the credentials from the plugin settings tab.

![credentials settings](./doc/imgs/redmine-credentials-settings.png)

## Usage

### Issue Blocks

Render one issue:

````markdown
```redmine
12345
```
````

Render multiple issues:

````markdown
```redmine
12345
12346
12347
```
````

You can also use full Redmine issue URLs:

````markdown
```redmine
https://redmine.example.com/issues/12345
https://redmine.example.com/issues/12346
```
````

### Query Blocks

Render issues from Redmine filters:

````markdown
```redmine-query
project=APP
assigned_to=me
status=open
limit=10
```
````

Example with more filters:

````markdown
```redmine-query
project=APP
assigned_to=me
status=open
tracker=Bug
priority=High
sort=updated_on:desc
limit=10
```
````

Supported query keys:

- `project`, `project_id`
- `subproject`, `subproject_id`
- `assigned_to`, `assignee`, `assigned_to_id`
- `author`, `author_id`
- `status`, `status_id`
- `tracker`, `tracker_id`
- `priority`, `priority_id`
- `category`, `category_id`
- `fixed_version`, `fixed_version_id`, `version`
- `subject`
- `created_on`, `updated_on`, `start_date`, `due_date`
- `limit`, `offset`, `sort`

Notes:

- `assigned_to=me` and `author=me` are supported
- project, tracker, priority, status, and version names are resolved automatically when possible

## Issue Modal

Click an issue card to open the detailed modal.

The modal includes:

- `Details` section with core fields, custom fields, progress, spent hours, due date, and timestamps
- `Description` tab
- `Comments` tab
- `History` tab
- `Attachments` tab
- `Related` tab with parent issue, children, relations, watchers, and changesets

Related issues can be opened in another Obsidian modal. If a related issue is not accessible, the plugin shows a lock icon instead of an interactive link.

## Command Palette

None for now

## Notes

- Issue widgets are rendered in preview mode
- The plugin currently expects the configured Redmine host and API key to allow issue access through the Redmine REST API
