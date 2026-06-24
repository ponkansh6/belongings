export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface Checklist {
  id: string;
  name: string;
  items: ChecklistItem[];
}

export interface AppData {
  version: number;
  checklists: Checklist[];
}
