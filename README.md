# Obsidian Redmine Issue Plugin

An [Obsidian.md](https://obsidian.md/) plugin that show Redmine issue details.

## Requirements

- A Redmine instance endpoint
- A personal API access key (My account > API access key > Show)

## Installation

Download zip archive from [GitHub releases page](https://github.com/daaru00/obsidian-redmine-issue/releases) and extract it into `<vault>/.obsidian/plugins` directory.

## Configurations

In order to show issues details the plugin need to be configured with `host` and `API access key` configuration.

![credentials settings](./doc/imgs/redmine-credentials-settings.png)

## Usage

Add this code block where you want to show the issue widget:
````makrdown
```redmine
12345
```
````

or add multiple ids, one for each line, to show a grid of widgets:
````makrdown
```redmine
12345
12346
12347
12348
12349
12340
```
````

Open the preview mode to see issue's details:

![issue details](./doc/gifs/redmine-details.gif)
