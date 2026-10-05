export interface Note {
  id: string;
  notebookId?: string | null;
  userId?: string | null;
  title: string;
  content: string;
  isPrivate: boolean; // 0 or 1 in SQLite
  isPinned: boolean;
  isTrashed: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notebook {
  id: string;
  userId?: string | null;
  name: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}
