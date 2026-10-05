import { Platform } from 'react-native';

export interface AppDatabase {
  execAsync(sql: string): Promise<void>;
  getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>;
  getFirstAsync<T = any>(sql: string, params?: any[]): Promise<T | null>;
  runAsync(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowId: number }>;
}

let db: AppDatabase | null = null;

// Storage mô phỏng trên Web khi chạy trình duyệt
const webStore: {
  Notebooks: any[];
  Notes: any[];
  DailyTasks: any[];
  TaskCompletions: any[];
} = {
  Notebooks: [],
  Notes: [],
  DailyTasks: [],
  TaskCompletions: [],
};

const createWebMockDB = (): AppDatabase => ({
  execAsync: async () => {},

  getAllAsync: async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
    if (sql.includes('FROM Notebooks')) {
      return (webStore.Notebooks.filter((nb) => !nb.isDeleted) as unknown) as T[];
    }
    if (sql.includes('FROM Notes')) {
      let items = [...webStore.Notes];
      if (sql.includes('isTrashed = 0 AND isDeleted = 0')) {
        items = items.filter((n) => !n.isTrashed && !n.isDeleted);
      } else if (sql.includes('isTrashed = 1 AND isDeleted = 0')) {
        items = items.filter((n) => n.isTrashed && !n.isDeleted);
      } else if (sql.includes('isPrivate = 1')) {
        items = items.filter((n) => n.isPrivate && !n.isTrashed && !n.isDeleted);
      }
      if (params.length > 0 && sql.includes('notebookId = ?')) {
        items = items.filter((n) => n.notebookId === params[0]);
      }
      return (items as unknown) as T[];
    }
    if (sql.includes('FROM DailyTasks')) {
      return (webStore.DailyTasks.filter((t) => !t.isDeleted) as unknown) as T[];
    }
    if (sql.includes('FROM TaskCompletions')) {
      let items = [...webStore.TaskCompletions];
      if (params.length > 0) {
        items = items.filter((c) => c.taskId === params[0] && !c.isDeleted);
      }
      return (items as unknown) as T[];
    }
    return [];
  },

  getFirstAsync: async <T = any>(sql: string, params: any[] = []): Promise<T | null> => {
    if (sql.includes('FROM Notes WHERE id = ?')) {
      const item = webStore.Notes.find((n) => n.id === params[0] && !n.isDeleted);
      return ((item as unknown) as T) || null;
    }
    if (sql.includes('FROM TaskCompletions WHERE taskId = ? AND completionDate = ?')) {
      const item = webStore.TaskCompletions.find(
        (c) => c.taskId === params[0] && c.completionDate === params[1]
      );
      return ((item as unknown) as T) || null;
    }
    const list = await createWebMockDB().getAllAsync<T>(sql, params);
    return list.length > 0 ? list[0] : null;
  },

  runAsync: async (sql: string, params: any[] = []) => {
    if (sql.includes('INSERT INTO Notebooks')) {
      webStore.Notebooks.push({
        id: params[0],
        name: params[1],
        isDeleted: 0,
        createdAt: params[2],
        updatedAt: params[3],
      });
    } else if (sql.includes('INSERT INTO Notes')) {
      webStore.Notes.push({
        id: params[0],
        notebookId: params[1],
        title: params[2],
        content: params[3],
        isPrivate: params[4],
        isPinned: params[5],
        isTrashed: 0,
        isDeleted: 0,
        createdAt: params[6],
        updatedAt: params[7],
      });
    } else if (sql.includes('UPDATE Notes SET title = ?')) {
      const idx = webStore.Notes.findIndex((n) => n.id === params[6]);
      if (idx !== -1) {
        webStore.Notes[idx] = {
          ...webStore.Notes[idx],
          title: params[0],
          content: params[1],
          notebookId: params[2],
          isPrivate: params[3],
          isPinned: params[4],
          updatedAt: params[5],
        };
      }
    } else if (sql.includes('UPDATE Notes SET isTrashed = ?')) {
      const idx = webStore.Notes.findIndex((n) => n.id === params[2]);
      if (idx !== -1) {
        webStore.Notes[idx].isTrashed = params[0];
        webStore.Notes[idx].updatedAt = params[1];
      }
    } else if (sql.includes('UPDATE Notes SET isDeleted = 1')) {
      const idx = webStore.Notes.findIndex((n) => n.id === params[1]);
      if (idx !== -1) {
        webStore.Notes[idx].isDeleted = 1;
        webStore.Notes[idx].updatedAt = params[0];
      }
    } else if (sql.includes('INSERT INTO DailyTasks')) {
      webStore.DailyTasks.push({
        id: params[0],
        title: params[1],
        reminderTime: params[2],
        lastCompletionDate: null,
        isDeleted: 0,
        createdAt: params[3],
        updatedAt: params[4],
      });
    } else if (sql.includes('INSERT INTO TaskCompletions')) {
      webStore.TaskCompletions.push({
        id: params[0],
        taskId: params[1],
        completionDate: params[2],
        completedAt: params[3],
        updatedAt: params[4],
        isDeleted: 0,
      });
    }
    return { changes: 1, lastInsertRowId: 1 };
  },
});

export const getDB = (): AppDatabase => {
  if (!db) {
    if (Platform.OS === 'web') {
      db = createWebMockDB();
    } else {
      const SQLite = require('expo-sqlite');
      db = SQLite.openDatabaseSync('noteapp.db') as unknown as AppDatabase;
    }
  }
  return db;
};

export const initDatabase = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    return; // Trên Web sử dụng bộ nhớ mô phỏng webStore
  }

  const database = getDB();
  await database.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS Notebooks (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT,
      name TEXT NOT NULL,
      isDeleted INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Notes (
      id TEXT PRIMARY KEY NOT NULL,
      notebookId TEXT,
      userId TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      isPrivate INTEGER DEFAULT 0,
      isPinned INTEGER DEFAULT 0,
      isTrashed INTEGER DEFAULT 0,
      isDeleted INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (notebookId) REFERENCES Notebooks(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS DailyTasks (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT,
      title TEXT NOT NULL,
      reminderTime TEXT,
      lastCompletionDate TEXT,
      isDeleted INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS TaskCompletions (
      id TEXT PRIMARY KEY NOT NULL,
      taskId TEXT NOT NULL,
      completionDate TEXT NOT NULL,
      completedAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      isDeleted INTEGER DEFAULT 0,
      FOREIGN KEY (taskId) REFERENCES DailyTasks(id) ON DELETE CASCADE,
      UNIQUE(taskId, completionDate)
    );
  `);
};
