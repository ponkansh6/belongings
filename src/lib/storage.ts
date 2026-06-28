import { AppData, Checklist } from "./types";
import { SEED_CHECKLISTS } from "./seed";

const STORAGE_KEY = "belongings-checker";
const CURRENT_VERSION = 1;

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getDefaultData(): AppData {
  return {
    version: CURRENT_VERSION,
    checklists: SEED_CHECKLISTS.map((cl) => ({
      ...cl,
      items: cl.items.map((item) => ({ ...item })),
    })),
  };
}

export function loadChecklists(): Checklist[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData().checklists;

    const data: AppData = JSON.parse(raw);

    // Validate structure: checklists must be an array
    if (!Array.isArray(data.checklists)) {
      return getDefaultData().checklists;
    }

    // Migration for future versions
    if (data.version < CURRENT_VERSION) {
      // Future: migrate data from data.version -> CURRENT_VERSION
      data.version = CURRENT_VERSION;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    return data.checklists;
  } catch {
    return getDefaultData().checklists;
  }
}

export function saveChecklists(checklists: Checklist[]): boolean {
  try {
    const data: AppData = { version: CURRENT_VERSION, checklists };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Failed to save checklists:", e);
    return false;
  }
}

export function createChecklist(name: string): Checklist {
  return {
    id: generateId(),
    name,
    items: [],
  };
}

export function createItem(label: string): { id: string; label: string; checked: boolean } {
  return { id: generateId(), label, checked: false };
}

// Collapse toggle persistence
export const COLLAPSED_KEY = "belongings-collapsed";

export function loadCollapsedIds(): string[] {
  try {
    const saved = localStorage.getItem(COLLAPSED_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveCollapsedIds(ids: string[]): boolean {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(ids));
    return true;
  } catch (e) {
    console.error("Failed to save collapsed ids:", e);
    return false;
  }
}
