import { Response } from 'express';
import mssql from 'mssql';
import { getPool } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

interface ClientNotebook {
  id: string;
  name: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClientNote {
  id: string;
  notebookId?: string | null;
  title: string;
  content: string;
  isPrivate: boolean;
  isPinned: boolean;
  isTrashed: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClientTask {
  id: string;
  title: string;
  reminderTime?: string | null;
  lastCompletionDate?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClientCompletion {
  id: string;
  taskId: string;
  completionDate: string;
  completedAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export const pushFullSync = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { notebooks = [], notes = [], tasks = [], completions = [] } = req.body;
    const pool = await getPool();
    const serverNow = new Date().toISOString();

    // 1. Sync Notebooks
    for (const nb of notebooks as ClientNotebook[]) {
      const existing = await pool
        .request()
        .input('id', mssql.UniqueIdentifier, nb.id)
        .input('userId', mssql.UniqueIdentifier, userId)
        .query('SELECT Id, UpdatedAt FROM Notebooks WHERE Id = @id AND UserId = @userId');

      if (existing.recordset.length === 0) {
        await pool
          .request()
          .input('id', mssql.UniqueIdentifier, nb.id)
          .input('userId', mssql.UniqueIdentifier, userId)
          .input('name', mssql.NVarChar, nb.name)
          .input('isDeleted', mssql.Bit, nb.isDeleted ? 1 : 0)
          .input('createdAt', mssql.DateTime2, nb.createdAt)
          .input('updatedAt', mssql.DateTime2, serverNow)
          .query(`
            INSERT INTO Notebooks (Id, UserId, Name, IsDeleted, CreatedAt, UpdatedAt)
            VALUES (@id, @userId, @name, @isDeleted, @createdAt, @updatedAt)
          `);
      } else {
        const serverUpdatedAt = new Date(existing.recordset[0].UpdatedAt).getTime();
        const clientUpdatedAt = new Date(nb.updatedAt).getTime();

        if (clientUpdatedAt >= serverUpdatedAt) {
          await pool
            .request()
            .input('id', mssql.UniqueIdentifier, nb.id)
            .input('userId', mssql.UniqueIdentifier, userId)
            .input('name', mssql.NVarChar, nb.name)
            .input('isDeleted', mssql.Bit, nb.isDeleted ? 1 : 0)
            .input('updatedAt', mssql.DateTime2, serverNow)
            .query(`
              UPDATE Notebooks 
              SET Name = @name, IsDeleted = @isDeleted, UpdatedAt = @updatedAt
              WHERE Id = @id AND UserId = @userId
            `);
        }
      }
    }

    // 2. Sync Notes
    for (const note of notes as ClientNote[]) {
      const existing = await pool
        .request()
        .input('id', mssql.UniqueIdentifier, note.id)
        .input('userId', mssql.UniqueIdentifier, userId)
        .query('SELECT Id, UpdatedAt FROM Notes WHERE Id = @id AND UserId = @userId');

      if (existing.recordset.length === 0) {
        await pool
          .request()
          .input('id', mssql.UniqueIdentifier, note.id)
          .input('notebookId', mssql.UniqueIdentifier, note.notebookId || null)
          .input('userId', mssql.UniqueIdentifier, userId)
          .input('title', mssql.NVarChar, note.title)
          .input('content', mssql.NVarChar, note.content)
          .input('isPrivate', mssql.Bit, note.isPrivate ? 1 : 0)
          .input('isPinned', mssql.Bit, note.isPinned ? 1 : 0)
          .input('isTrashed', mssql.Bit, note.isTrashed ? 1 : 0)
          .input('isDeleted', mssql.Bit, note.isDeleted ? 1 : 0)
          .input('createdAt', mssql.DateTime2, note.createdAt)
          .input('updatedAt', mssql.DateTime2, serverNow)
          .query(`
            INSERT INTO Notes (Id, NotebookId, UserId, Title, Content, IsPrivate, IsPinned, IsTrashed, IsDeleted, CreatedAt, UpdatedAt)
            VALUES (@id, @notebookId, @userId, @title, @content, @isPrivate, @isPinned, @isTrashed, @isDeleted, @createdAt, @updatedAt)
          `);
      } else {
        const serverUpdatedAt = new Date(existing.recordset[0].UpdatedAt).getTime();
        const clientUpdatedAt = new Date(note.updatedAt).getTime();

        if (clientUpdatedAt >= serverUpdatedAt) {
          await pool
            .request()
            .input('id', mssql.UniqueIdentifier, note.id)
            .input('notebookId', mssql.UniqueIdentifier, note.notebookId || null)
            .input('userId', mssql.UniqueIdentifier, userId)
            .input('title', mssql.NVarChar, note.title)
            .input('content', mssql.NVarChar, note.content)
            .input('isPrivate', mssql.Bit, note.isPrivate ? 1 : 0)
            .input('isPinned', mssql.Bit, note.isPinned ? 1 : 0)
            .input('isTrashed', mssql.Bit, note.isTrashed ? 1 : 0)
            .input('isDeleted', mssql.Bit, note.isDeleted ? 1 : 0)
            .input('updatedAt', mssql.DateTime2, serverNow)
            .query(`
              UPDATE Notes 
              SET Title = @title, Content = @content, NotebookId = @notebookId, 
                  IsPrivate = @isPrivate, IsPinned = @isPinned, IsTrashed = @isTrashed, 
                  IsDeleted = @isDeleted, UpdatedAt = @updatedAt
              WHERE Id = @id AND UserId = @userId
            `);
        }
      }
    }

    // 3. Sync DailyTasks
    for (const t of tasks as ClientTask[]) {
      const existing = await pool
        .request()
        .input('id', mssql.UniqueIdentifier, t.id)
        .input('userId', mssql.UniqueIdentifier, userId)
        .query('SELECT Id, UpdatedAt FROM DailyTasks WHERE Id = @id AND UserId = @userId');

      if (existing.recordset.length === 0) {
        await pool
          .request()
          .input('id', mssql.UniqueIdentifier, t.id)
          .input('userId', mssql.UniqueIdentifier, userId)
          .input('title', mssql.NVarChar, t.title)
          .input('reminderTime', mssql.VarChar, t.reminderTime || null)
          .input('lastCompletionDate', mssql.Date, t.lastCompletionDate || null)
          .input('isDeleted', mssql.Bit, t.isDeleted ? 1 : 0)
          .input('createdAt', mssql.DateTime2, t.createdAt)
          .input('updatedAt', mssql.DateTime2, serverNow)
          .query(`
            INSERT INTO DailyTasks (Id, UserId, Title, ReminderTime, LastCompletionDate, IsDeleted, CreatedAt, UpdatedAt)
            VALUES (@id, @userId, @title, @reminderTime, @lastCompletionDate, @isDeleted, @createdAt, @updatedAt)
          `);
      } else {
        const serverUpdatedAt = new Date(existing.recordset[0].UpdatedAt).getTime();
        const clientUpdatedAt = new Date(t.updatedAt).getTime();

        if (clientUpdatedAt >= serverUpdatedAt) {
          await pool
            .request()
            .input('id', mssql.UniqueIdentifier, t.id)
            .input('userId', mssql.UniqueIdentifier, userId)
            .input('title', mssql.NVarChar, t.title)
            .input('reminderTime', mssql.VarChar, t.reminderTime || null)
            .input('lastCompletionDate', mssql.Date, t.lastCompletionDate || null)
            .input('isDeleted', mssql.Bit, t.isDeleted ? 1 : 0)
            .input('updatedAt', mssql.DateTime2, serverNow)
            .query(`
              UPDATE DailyTasks 
              SET Title = @title, ReminderTime = @reminderTime, 
                  LastCompletionDate = @lastCompletionDate, IsDeleted = @isDeleted, UpdatedAt = @updatedAt
              WHERE Id = @id AND UserId = @userId
            `);
        }
      }
    }

    // 4. Sync TaskCompletions (Xử lý Undo tick `IsDeleted = 1`)
    for (const c of completions as ClientCompletion[]) {
      const existing = await pool
        .request()
        .input('id', mssql.UniqueIdentifier, c.id)
        .query('SELECT Id, UpdatedAt FROM TaskCompletions WHERE Id = @id');

      if (existing.recordset.length === 0) {
        await pool
          .request()
          .input('id', mssql.UniqueIdentifier, c.id)
          .input('taskId', mssql.UniqueIdentifier, c.taskId)
          .input('completionDate', mssql.Date, c.completionDate)
          .input('completedAt', mssql.DateTime2, c.completedAt)
          .input('isDeleted', mssql.Bit, c.isDeleted ? 1 : 0)
          .input('updatedAt', mssql.DateTime2, serverNow)
          .query(`
            INSERT INTO TaskCompletions (Id, TaskId, CompletionDate, CompletedAt, UpdatedAt, IsDeleted)
            VALUES (@id, @taskId, @completionDate, @completedAt, @updatedAt, @isDeleted)
          `);
      } else {
        const serverUpdatedAt = new Date(existing.recordset[0].UpdatedAt).getTime();
        const clientUpdatedAt = new Date(c.updatedAt).getTime();

        if (clientUpdatedAt >= serverUpdatedAt) {
          await pool
            .request()
            .input('id', mssql.UniqueIdentifier, c.id)
            .input('completedAt', mssql.DateTime2, c.completedAt)
            .input('isDeleted', mssql.Bit, c.isDeleted ? 1 : 0)
            .input('updatedAt', mssql.DateTime2, serverNow)
            .query(`
              UPDATE TaskCompletions 
              SET CompletedAt = @completedAt, IsDeleted = @isDeleted, UpdatedAt = @updatedAt
              WHERE Id = @id
            `);
        }
      }
    }

    res.json({
      message: 'Full push sync completed successfully',
      server_timestamp: serverNow,
    });
  } catch (error) {
    console.error('Full push sync error:', error);
    res.status(500).json({ message: 'Full push sync failed' });
  }
};

export const pullFullSync = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const sinceParam = req.query.since as string;
    const sinceDate = sinceParam ? new Date(sinceParam) : new Date(0);
    const serverNow = new Date().toISOString();

    const pool = await getPool();

    // 1. Pull Notebooks
    const notebooksRes = await pool
      .request()
      .input('userId', mssql.UniqueIdentifier, userId)
      .input('since', mssql.DateTime2, sinceDate)
      .query(`
        SELECT Id, UserId, Name, IsDeleted, CreatedAt, UpdatedAt
        FROM Notebooks WITH (INDEX(IX_Notebooks_UserId_UpdatedAt))
        WHERE UserId = @userId AND UpdatedAt > @since
        ORDER BY UpdatedAt ASC
      `);

    // 2. Pull Notes
    const notesRes = await pool
      .request()
      .input('userId', mssql.UniqueIdentifier, userId)
      .input('since', mssql.DateTime2, sinceDate)
      .query(`
        SELECT Id, NotebookId, UserId, Title, Content, IsPrivate, IsPinned, IsTrashed, IsDeleted, CreatedAt, UpdatedAt
        FROM Notes WITH (INDEX(IX_Notes_UserId_UpdatedAt))
        WHERE UserId = @userId AND UpdatedAt > @since
        ORDER BY UpdatedAt ASC
      `);

    // 3. Pull DailyTasks
    const tasksRes = await pool
      .request()
      .input('userId', mssql.UniqueIdentifier, userId)
      .input('since', mssql.DateTime2, sinceDate)
      .query(`
        SELECT Id, UserId, Title, ReminderTime, LastCompletionDate, IsDeleted, CreatedAt, UpdatedAt
        FROM DailyTasks WITH (INDEX(IX_DailyTasks_UserId_UpdatedAt))
        WHERE UserId = @userId AND UpdatedAt > @since
        ORDER BY UpdatedAt ASC
      `);

    // 4. Pull TaskCompletions (Bao gồm cả bản ghi IsDeleted = 1 để Undo)
    const completionsRes = await pool
      .request()
      .input('userId', mssql.UniqueIdentifier, userId)
      .input('since', mssql.DateTime2, sinceDate)
      .query(`
        SELECT tc.Id, tc.TaskId, tc.CompletionDate, tc.CompletedAt, tc.UpdatedAt, tc.IsDeleted
        FROM TaskCompletions tc WITH (INDEX(IX_TaskCompletions_TaskId_UpdatedAt))
        INNER JOIN DailyTasks dt ON tc.TaskId = dt.Id
        WHERE dt.UserId = @userId AND tc.UpdatedAt > @since
        ORDER BY tc.UpdatedAt ASC
      `);

    res.json({
      notebooks: notebooksRes.recordset.map((r) => ({
        id: r.Id,
        userId: r.UserId,
        name: r.Name,
        isDeleted: Boolean(r.IsDeleted),
        createdAt: r.CreatedAt,
        updatedAt: r.UpdatedAt,
      })),
      notes: notesRes.recordset.map((r) => ({
        id: r.Id,
        notebookId: r.NotebookId,
        userId: r.UserId,
        title: r.Title,
        content: r.Content,
        isPrivate: Boolean(r.IsPrivate),
        isPinned: Boolean(r.IsPinned),
        isTrashed: Boolean(r.IsTrashed),
        isDeleted: Boolean(r.IsDeleted),
        createdAt: r.CreatedAt,
        updatedAt: r.UpdatedAt,
      })),
      tasks: tasksRes.recordset.map((r) => ({
        id: r.Id,
        userId: r.UserId,
        title: r.Title,
        reminderTime: r.ReminderTime,
        lastCompletionDate: r.LastCompletionDate,
        isDeleted: Boolean(r.IsDeleted),
        createdAt: r.CreatedAt,
        updatedAt: r.UpdatedAt,
      })),
      completions: completionsRes.recordset.map((r) => ({
        id: r.Id,
        taskId: r.TaskId,
        completionDate: r.CompletionDate,
        completedAt: r.CompletedAt,
        updatedAt: r.UpdatedAt,
        isDeleted: Boolean(r.IsDeleted),
      })),
      server_timestamp: serverNow,
    });
  } catch (error) {
    console.error('Full pull sync error:', error);
    res.status(500).json({ message: 'Full pull sync failed' });
  }
};
