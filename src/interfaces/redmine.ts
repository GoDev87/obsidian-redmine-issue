/* REDMINE ISSUE */
export interface RedmineIssue {
  id: string;
  project: RedmineProject;
  tracker: RedmineTracker;
  status: RedmineStatus;
  priority: RedminePriority;
  author: RedmineUser;
  assignedTo: RedmineUser; // assigned_to
  category: RedmineCategory;
  fixedVersion: RedmineVersion; // fixed_version
  parent: RedmineParent;
  subject: string;
  description: string;
  startDate: string; // start_date
  dueDate: string; // due_date
  doneRatio: number; // done_ratio
  isPrivate: boolean; // is_private
  estimatedHours: number; // estimated_hours
  totalEstimatedHours: number; // total_estimated_hours
  spentHours: number; // spent_hours
  totalSpentHours: number; // total_spent_hours
  customFields: RedmineCustomField[];
  createdOn: string; // created_on
  updatedOn: string; // updated_on
  closedOn: string; // closed_on
  changesets: RedmineChangeset[];
  children: RedmineIssueChild[];
  attachments: RedmineAttachment[];
  relations: RedmineRelation[];
  journals: RedmineJournal[];
  watchers: RedmineWatcher[];
  allowed_statuses: RedmineAllowedStatus[];
}

export interface RedmineProject {
  id: string;
  name: string;
}

export interface RedmineTracker {
  id: string;
  name: string;
}

export interface RedmineStatus {
  id: string;
  name: string;
  isClosed: boolean; // is_closed
}

export interface RedminePriority {
  id: string;
  name: string;
}

export interface RedmineUser {
  id: string;
  name: string;
}

export interface RedmineCategory {
  id: string;
  name: string;
}

export interface RedmineVersion {
  id: string;
  name: string;
}

export interface RedmineParent {
  id: string;
}

export interface RedmineCustomField {
  id: string;
  name: string;
  multiple: boolean;
  value: string;
}

export interface RedmineAttachment {
  id: string;
  filename: string;
  filesize: number;
  contentType: string; // content_type
  description: string;
  contentUrl: string; // content_url
  thumbnailUrl: string; // thumbnail_url
  author: RedmineUser;
  createdOn: string; // created_on
}

export interface RedmineChangeset {
  revision: string;
  user: RedmineUser;
  comments: string;
  committedOn: string; // committed_on
}

export interface RedmineIssueChild {
  id: string;
  tracker: RedmineTracker;
  subject: string;
}

export interface RedmineRelation {
  id: string;
  issueId: string; // issue_id
  issueToId: string; // issue_to_id
  relationType: string; // relation_type
  delay: number;
}

export interface RedmineJournal {
  id: string;
  user: RedmineUser;
  notes: string;
  createdOn: string; // created_on
  updatedOn: string; // updated_on
  updatedBy: RedmineUser;
  privateNotes: boolean; // private_notes
  details: RedmineJournalDetail[];
}

export interface RedmineJournalDetail {
  property: string;
  name: string;
  oldValue: string; // old_value
  newValue: string; // new_value
}

export interface RedmineWatcher {
  id: string;
  name: string;
}

export interface RedmineAllowedStatus {
  id: string;
  name: string;
  isClosed: boolean; // is_closed
}


/* REDMINE USER */
export interface RedmineFullUser {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  login: string;
  mail: string;
}