export default interface IssuePluginSettings {
	token: string;
	host: string;
}

export const DEFAULT_SETTINGS: IssuePluginSettings = {
	token: '',
	host: ''
}
