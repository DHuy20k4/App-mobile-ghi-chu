import { getDB } from './database';
import { Note } from '../types/note';
import { generateUUID } from '../utils/uuid';

const mapRowToNote = (r: any): Note => ({
  id: r.id,
  notebookId: r.notebookId,
  userId: r.userId,
  title: r.title,
  content: r.content,
  isPrivate: Boolean(r.isPrivate),
  isPinned: Boolean(r.isPinned),
  isTrashed: Boolean(r.isTrashed),
  isDeleted: Boolean(r.isDeleted),
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

export const noteService = {
  async getAllActiveNotes(notebookId?: string | null): Promise<Note[]> {
    const db = getDB();
    let query = `SELECT * FROM Notes WHERE isTrashed = 0 AND isDeleted = 0`;
    const params: any[] = [];

    if (notebookId) {
      query += ` AND notebookId = ?`;
      params.push(notebookId);
    }

    query += ` ORDER BY isPinned DESC, updatedAt DESC;`;
    const rows = await db.getAllAsync<any>(query, params);
    return rows.map(mapRowToNote);
  },

  async getTrashNotes(): Promise<Note[]> {
    const db = getDB();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM Notes WHERE isTrashed = 1 AND isDeleted = 0 ORDER BY updatedAt DESC;`
    );
    return rows.map(mapRowToNote);
  },

  async getPrivateNotes(): Promise<Note[]> {
    const db = getDB();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM Notes WHERE isPrivate = 1 AND isTrashed = 0 AND isDeleted = 0 ORDER BY isPinned DESC, updatedAt DESC;`
    );
    return rows.map(mapRowToNote);
  },

  async getNoteById(id: string): Promise<Note | null> {
    const db = getDB();
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM Notes WHERE id = ? AND isDeleted = 0;`,
      [id]
    );
    return row ? mapRowToNote(row) : null;
  },

  async createNote(data: {
    title: string;
    content: string;
    notebookId?: string | null;
    isPrivate?: boolean;
    isPinned?: boolean;
  }): Promise<Note> {
    const db = getDB();
    const id = generateUUID();
    const now = new Date().toISOString();

    const notebookId = data.notebookId || null;
    const isPrivate = data.isPrivate ? 1 : 0;
    const isPinned = data.isPinned ? 1 : 0;

    await db.runAsync(
      `INSERT INTO Notes (id, notebookId, title, content, isPrivate, isPinned, isTrashed, isDeleted, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?);`,
      [id, notebookId, data.title, data.content, isPrivate, isPinned, now, now]
    );

    return {
      id,
      notebookId,
      title: data.title,
      content: data.content,
      isPrivate: Boolean(isPrivate),
      isPinned: Boolean(isPinned),
      isTrashed: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
  },

  async updateNote(
    id: string,
    data: {
      title?: string;
      content?: string;
      notebookId?: string | null;
      isPrivate?: boolean;
      isPinned?: boolean;
    }
  ): Promise<void> {
    const db = getDB();
    const current = await this.getNoteById(id);
    if (!current) return;

    const now = new Date().toISOString();
    const title = data.title !== undefined ? data.title : current.title;
    const content = data.content !== undefined ? data.content : current.content;
    const notebookId = (data.notebookId !== undefined ? data.notebookId : current.notebookId) ?? null;
    const isPrivate = data.isPrivate !== undefined ? (data.isPrivate ? 1 : 0) : (current.isPrivate ? 1 : 0);
    const isPinned = data.isPinned !== undefined ? (data.isPinned ? 1 : 0) : (current.isPinned ? 1 : 0);

    await db.runAsync(
      `UPDATE Notes SET title = ?, content = ?, notebookId = ?, isPrivate = ?, isPinned = ?, updatedAt = ? WHERE id = ?;`,
      [title, content, notebookId, isPrivate, isPinned, now, id]
    );
  },

  async togglePinNote(id: string): Promise<boolean> {
    const note = await this.getNoteById(id);
    if (!note) return false;
    const newPinned = !note.isPinned;
    await this.updateNote(id, { isPinned: newPinned });
    return newPinned;
  },

  async moveToTrash(id: string): Promise<void> {
    const db = getDB();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE Notes SET isTrashed = 1, updatedAt = ? WHERE id = ?;`,
      [now, id]
    );
  },

  async restoreFromTrash(id: string): Promise<void> {
    const db = getDB();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE Notes SET isTrashed = 0, updatedAt = ? WHERE id = ?;`,
      [now, id]
    );
  },

  async deletePermanently(id: string): Promise<void> {
    const db = getDB();
    const now = new Date().toISOString();
    // Soft delete tombstone for incremental sync
    await db.runAsync(
      `UPDATE Notes SET isDeleted = 1, updatedAt = ? WHERE id = ?;`,
      [now, id]
    );
  },

  // Multi-select batch operations
  async batchMoveToTrash(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = getDB();
    const now = new Date().toISOString();
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE Notes SET isTrashed = 1, updatedAt = ? WHERE id IN (${placeholders});`,
      [now, ...ids]
    );
  },

  async batchRestoreFromTrash(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = getDB();
    const now = new Date().toISOString();
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE Notes SET isTrashed = 0, updatedAt = ? WHERE id IN (${placeholders});`,
      [now, ...ids]
    );
  },

  async batchDeletePermanently(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = getDB();
    const now = new Date().toISOString();
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE Notes SET isDeleted = 1, updatedAt = ? WHERE id IN (${placeholders});`,
      [now, ...ids]
    );
  },
};
