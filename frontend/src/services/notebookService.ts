import { getDB } from './database';
import { Notebook } from '../types/note';
import { generateUUID } from '../utils/uuid';

export const notebookService = {
  async getAllNotebooks(): Promise<Notebook[]> {
    const db = getDB();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM Notebooks WHERE isDeleted = 0 ORDER BY createdAt DESC;`
    );
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.name,
      isDeleted: Boolean(r.isDeleted),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  },

  async createNotebook(name: string): Promise<Notebook> {
    const db = getDB();
    const id = generateUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO Notebooks (id, name, isDeleted, createdAt, updatedAt) VALUES (?, ?, 0, ?, ?);`,
      [id, name, now, now]
    );

    return {
      id,
      name,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
  },

  async updateNotebook(id: string, name: string): Promise<void> {
    const db = getDB();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE Notebooks SET name = ?, updatedAt = ? WHERE id = ?;`,
      [name, now, id]
    );
  },

  async deleteNotebook(id: string): Promise<void> {
    const db = getDB();
    const now = new Date().toISOString();
    // Soft delete notebook and unassign notes
    await db.runAsync(
      `UPDATE Notebooks SET isDeleted = 1, updatedAt = ? WHERE id = ?;`,
      [now, id]
    );
    await db.runAsync(
      `UPDATE Notes SET notebookId = NULL, updatedAt = ? WHERE notebookId = ?;`,
      [now, id]
    );
  },
};
