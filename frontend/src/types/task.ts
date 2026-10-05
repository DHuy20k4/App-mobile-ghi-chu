export interface DailyTask {
  id: string;
  userId?: string | null;
  title: string;
  reminderTime?: string | null; // e.g. "08:30"
  lastCompletionDate?: string | null; // "YYYY-MM-DD"
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  // Dynamic fields
  currentStreak?: number;
  completedToday?: boolean;
}

export interface TaskCompletion {
  id: string;
  taskId: string;
  completionDate: string; // "YYYY-MM-DD"
  completedAt: string; // ISO string
  updatedAt: string;
  isDeleted: boolean;
}
