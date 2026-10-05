import { getDB } from './database';

const BACKEND_URL = 'http://localhost:5001/api'; // Thay IP máy tính khi chạy thiết bị thật

export const syncService = {
  /**
   * Đẩy toàn bộ dữ liệu local SQLite đã thay đổi lên SQL Server
   */
  async pushAllData(accessToken: string, lastSyncAt?: string): Promise<string | null> {
    const db = getDB();

    // 1. Notebooks local
    let nbQuery = `SELECT * FROM Notebooks`;
    const nbParams: any[] = [];
    if (lastSyncAt) {
      nbQuery += ` WHERE updatedAt > ?`;
      nbParams.push(lastSyncAt);
    }
    const localNotebooks = await db.getAllAsync<any>(nbQuery, nbParams);

    // 2. Notes local
    let noteQuery = `SELECT * FROM Notes`;
    const noteParams: any[] = [];
    if (lastSyncAt) {
      noteQuery += ` WHERE updatedAt > ?`;
      noteParams.push(lastSyncAt);
    }
    const localNotes = await db.getAllAsync<any>(noteQuery, noteParams);

    // 3. DailyTasks local
    let taskQuery = `SELECT * FROM DailyTasks`;
    const taskParams: any[] = [];
    if (lastSyncAt) {
      taskQuery += ` WHERE updatedAt > ?`;
      taskParams.push(lastSyncAt);
    }
    const localTasks = await db.getAllAsync<any>(taskQuery, taskParams);

    // 4. TaskCompletions local
    let compQuery = `SELECT * FROM TaskCompletions`;
    const compParams: any[] = [];
    if (lastSyncAt) {
      compQuery += ` WHERE updatedAt > ?`;
      compParams.push(lastSyncAt);
    }
    const localCompletions = await db.getAllAsync<any>(compQuery, compParams);

    if (
      localNotebooks.length === 0 &&
      localNotes.length === 0 &&
      localTasks.length === 0 &&
      localCompletions.length === 0
    ) {
      return null;
    }

    const payload = {
      notebooks: localNotebooks.map((r) => ({
        id: r.id,
        name: r.name,
        isDeleted: Boolean(r.isDeleted),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      notes: localNotes.map((r) => ({
        id: r.id,
        notebookId: r.notebookId,
        title: r.title,
        content: r.content,
        isPrivate: Boolean(r.isPrivate),
        isPinned: Boolean(r.isPinned),
        isTrashed: Boolean(r.isTrashed),
        isDeleted: Boolean(r.isDeleted),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      tasks: localTasks.map((r) => ({
        id: r.id,
        title: r.title,
        reminderTime: r.reminderTime,
        lastCompletionDate: r.lastCompletionDate,
        isDeleted: Boolean(r.isDeleted),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      completions: localCompletions.map((r) => ({
        id: r.id,
        taskId: r.taskId,
        completionDate: r.completionDate,
        completedAt: r.completedAt,
        updatedAt: r.updatedAt,
        isDeleted: Boolean(r.isDeleted),
      })),
    };

    const response = await fetch(`${BACKEND_URL}/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Push sync failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.server_timestamp;
  },

  /**
   * Kéo toàn bộ dữ liệu thay đổi từ SQL Server về cập nhật local SQLite
   */
  async pullAllData(accessToken: string, lastSyncAt?: string): Promise<string> {
    const db = getDB();
    const sinceParam = lastSyncAt ? encodeURIComponent(lastSyncAt) : '';

    const response = await fetch(`${BACKEND_URL}/sync/pull?since=${sinceParam}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Pull sync failed: ${response.statusText}`);
    }

    const data = await response.json();
    const { notebooks = [], notes = [], tasks = [], completions = [], server_timestamp } = data;

    // 1. Sync Notebooks local SQLite
    for (const nb of notebooks) {
      if (nb.isDeleted) {
        await db.runAsync(`DELETE FROM Notebooks WHERE id = ?;`, [nb.id]);
      } else {
        const existing = await db.getFirstAsync<any>(`SELECT id FROM Notebooks WHERE id = ?;`, [nb.id]);
        if (existing) {
          await db.runAsync(`UPDATE Notebooks SET name = ?, isDeleted = 0, updatedAt = ? WHERE id = ?;`, [
            nb.name,
            nb.updatedAt,
            nb.id,
          ]);
        } else {
          await db.runAsync(
            `INSERT INTO Notebooks (id, name, isDeleted, createdAt, updatedAt) VALUES (?, ?, 0, ?, ?);`,
            [nb.id, nb.name, nb.createdAt, nb.updatedAt]
          );
        }
      }
    }

    // 2. Sync Notes local SQLite
    for (const note of notes) {
      if (note.isDeleted) {
        await db.runAsync(`DELETE FROM Notes WHERE id = ?;`, [note.id]);
      } else {
        const existing = await db.getFirstAsync<any>(`SELECT id FROM Notes WHERE id = ?;`, [note.id]);
        if (existing) {
          await db.runAsync(
            `UPDATE Notes SET title = ?, content = ?, notebookId = ?, isPrivate = ?, isPinned = ?, isTrashed = ?, isDeleted = 0, updatedAt = ? WHERE id = ?;`,
            [
              note.title,
              note.content,
              note.notebookId || null,
              note.isPrivate ? 1 : 0,
              note.isPinned ? 1 : 0,
              note.isTrashed ? 1 : 0,
              note.updatedAt,
              note.id,
            ]
          );
        } else {
          await db.runAsync(
            `INSERT INTO Notes (id, notebookId, title, content, isPrivate, isPinned, isTrashed, isDeleted, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?);`,
            [
              note.id,
              note.notebookId || null,
              note.title,
              note.content,
              note.isPrivate ? 1 : 0,
              note.isPinned ? 1 : 0,
              note.isTrashed ? 1 : 0,
              note.createdAt,
              note.updatedAt,
            ]
          );
        }
      }
    }

    // 3. Sync DailyTasks local SQLite
    for (const t of tasks) {
      if (t.isDeleted) {
        await db.runAsync(`DELETE FROM DailyTasks WHERE id = ?;`, [t.id]);
      } else {
        const existing = await db.getFirstAsync<any>(`SELECT id FROM DailyTasks WHERE id = ?;`, [t.id]);
        if (existing) {
          await db.runAsync(
            `UPDATE DailyTasks SET title = ?, reminderTime = ?, lastCompletionDate = ?, isDeleted = 0, updatedAt = ? WHERE id = ?;`,
            [t.title, t.reminderTime || null, t.lastCompletionDate || null, t.updatedAt, t.id]
          );
        } else {
          await db.runAsync(
            `INSERT INTO DailyTasks (id, title, reminderTime, lastCompletionDate, isDeleted, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, 0, ?, ?);`,
            [t.id, t.title, t.reminderTime || null, t.lastCompletionDate || null, t.createdAt, t.updatedAt]
          );
        }
      }
    }

    // 4. Sync TaskCompletions local SQLite (xử lý Undo)
    for (const c of completions) {
      if (c.isDeleted) {
        await db.runAsync(`UPDATE TaskCompletions SET isDeleted = 1, updatedAt = ? WHERE id = ?;`, [
          c.updatedAt,
          c.id,
        ]);
      } else {
        const existing = await db.getFirstAsync<any>(`SELECT id FROM TaskCompletions WHERE id = ?;`, [c.id]);
        if (existing) {
          await db.runAsync(
            `UPDATE TaskCompletions SET completedAt = ?, isDeleted = 0, updatedAt = ? WHERE id = ?;`,
            [c.completedAt, c.updatedAt, c.id]
          );
        } else {
          await db.runAsync(
            `INSERT INTO TaskCompletions (id, taskId, completionDate, completedAt, updatedAt, isDeleted)
             VALUES (?, ?, ?, ?, ?, 0);`,
            [c.id, c.taskId, c.completionDate, c.completedAt, c.updatedAt]
          );
        }
      }
    }

    return server_timestamp;
  },
};
