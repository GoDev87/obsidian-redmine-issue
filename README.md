# Obsidian Redmine Issue Plugin

An [Obsidian.md](https://obsidian.md/) plugin that show Redmine issue details.

## Requirements

- A Redmine instance endpoint
- A personal API access key (My account > API access key > Show)

## Installation

1. Clone this repository into the `<vault>/.obsidian/plugins` directory.
2. Go inside the plugin directory and run `npm install` to install dependencies.
3. Run `npm run build` to build the plugin.
4. Enable the plugin in Obsidian settings.

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

Open the preview mode to see issue's details
