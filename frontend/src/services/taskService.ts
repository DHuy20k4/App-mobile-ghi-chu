import { getDB } from './database';
import { DailyTask } from '../types/task';
import { generateUUID } from '../utils/uuid';
import { getLocalDateString, getDaysDifference, addDaysToDateString } from '../utils/dateUtils';
import { notificationService } from './notificationService';

export const taskService = {
  /**
   * Thuật toán tính toán Streak chuỗi ngày hoàn thành động từ bảng TaskCompletions
   */
  async calculateStreakForTask(taskId: string): Promise<{ currentStreak: number; completedToday: boolean }> {
    const db = getDB();
    const today = getLocalDateString();

    const completions = await db.getAllAsync<any>(
      `SELECT completionDate FROM TaskCompletions 
       WHERE taskId = ? AND isDeleted = 0 
       ORDER BY completionDate DESC;`,
      [taskId]
    );

    if (completions.length === 0) {
      return { currentStreak: 0, completedToday: false };
    }

    const completedDatesSet = new Set(completions.map((c) => c.completionDate));
    const completedToday = completedDatesSet.has(today);
    const lastCompletionDate = completions[0].completionDate;

    const daysDiff = getDaysDifference(lastCompletionDate, today);

    // Nếu khoảng cách ngày gần nhất đến hôm nay >= 2 ngày và hôm nay chưa làm -> Ngắt chuỗi (Streak = 0)
    if (daysDiff >= 2 && !completedToday) {
      return { currentStreak: 0, completedToday: false };
    }

    // Đếm số ngày liên tục lùi dần từ lastCompletionDate
    let streakCount = 0;
    let checkDate = lastCompletionDate;

    while (completedDatesSet.has(checkDate)) {
      streakCount++;
      checkDate = addDaysToDateString(checkDate, -1);
    }

    return { currentStreak: streakCount, completedToday };
  },

  async getAllTasks(): Promise<DailyTask[]> {
    const db = getDB();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM DailyTasks WHERE isDeleted = 0 ORDER BY createdAt DESC;`
    );

    const tasks: DailyTask[] = [];

    for (const r of rows) {
      const { currentStreak, completedToday } = await this.calculateStreakForTask(r.id);
      tasks.push({
        id: r.id,
        userId: r.userId,
        title: r.title,
        reminderTime: r.reminderTime,
        lastCompletionDate: r.lastCompletionDate,
        isDeleted: Boolean(r.isDeleted),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        currentStreak,
        completedToday,
      });
    }

    return tasks;
  },

  async createTask(title: string, reminderTime?: string | null): Promise<DailyTask> {
    const db = getDB();
    const id = generateUUID();
    const now = new Date().toISOString();
    const formattedReminder = reminderTime || null;

    await db.runAsync(
      `INSERT INTO DailyTasks (id, title, reminderTime, lastCompletionDate, isDeleted, createdAt, updatedAt)
       VALUES (?, ?, ?, NULL, 0, ?, ?);`,
      [id, title, formattedReminder, now, now]
    );

    // Đăng ký lịch nhắc nhở cục bộ offline
    if (formattedReminder) {
      await notificationService.scheduleTaskNotification({ id, title, reminderTime: formattedReminder });
    }

    return {
      id,
      title,
      reminderTime: formattedReminder,
      lastCompletionDate: null,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      currentStreak: 0,
      completedToday: false,
    };
  },

  async updateTask(id: string, title: string, reminderTime?: string | null): Promise<void> {
    const db = getDB();
    const now = new Date().toISOString();
    const formattedReminder = reminderTime || null;

    await db.runAsync(
      `UPDATE DailyTasks SET title = ?, reminderTime = ?, updatedAt = ? WHERE id = ?;`,
      [title, formattedReminder, now, id]
    );

    if (formattedReminder) {
      await notificationService.scheduleTaskNotification({ id, title, reminderTime: formattedReminder });
    } else {
      await notificationService.cancelTaskNotification(id);
    }
  },

  /**
   * Đánh dấu hoàn thành hoặc Hủy hoàn thành (Undo) nhiệm vụ trong ngày hôm nay
   */
  async toggleTaskCompletion(taskId: string): Promise<{ completedToday: boolean; newStreak: number }> {
    const db = getDB();
    const today = getLocalDateString();
    const now = new Date().toISOString();

    const existing = await db.getFirstAsync<any>(
      `SELECT * FROM TaskCompletions WHERE taskId = ? AND completionDate = ?;`,
      [taskId, today]
    );

    if (existing && existing.isDeleted === 0) {
      // TH1: Đã hoàn thành hôm nay -> Undo tick (Đánh dấu isDeleted = 1)
      await db.runAsync(
        `UPDATE TaskCompletions SET isDeleted = 1, updatedAt = ? WHERE id = ?;`,
        [now, existing.id]
      );

      // Cập nhật lại lastCompletionDate từ các bản ghi active còn lại
      const latestActive = await db.getFirstAsync<any>(
        `SELECT completionDate FROM TaskCompletions WHERE taskId = ? AND isDeleted = 0 ORDER BY completionDate DESC LIMIT 1;`,
        [taskId]
      );

      const newLastDate = latestActive ? latestActive.completionDate : null;
      await db.runAsync(
        `UPDATE DailyTasks SET lastCompletionDate = ?, updatedAt = ? WHERE id = ?;`,
        [newLastDate, now, taskId]
      );
    } else if (existing && existing.isDeleted === 1) {
      // TH2: Bản ghi cũ bị Undo -> Re-activate lại bản ghi (isDeleted = 0)
      await db.runAsync(
        `UPDATE TaskCompletions SET isDeleted = 0, completedAt = ?, updatedAt = ? WHERE id = ?;`,
        [now, now, existing.id]
      );

      await db.runAsync(
        `UPDATE DailyTasks SET lastCompletionDate = ?, updatedAt = ? WHERE id = ?;`,
        [today, now, taskId]
      );
    } else {
      // TH3: Tạo mới bản ghi hoàn thành hôm nay
      const completionId = generateUUID();
      await db.runAsync(
        `INSERT INTO TaskCompletions (id, taskId, completionDate, completedAt, updatedAt, isDeleted)
         VALUES (?, ?, ?, ?, ?, 0);`,
        [completionId, taskId, today, now, now]
      );

      await db.runAsync(
        `UPDATE DailyTasks SET lastCompletionDate = ?, updatedAt = ? WHERE id = ?;`,
        [today, now, taskId]
      );
    }

    const { currentStreak, completedToday } = await this.calculateStreakForTask(taskId);
    return { completedToday, newStreak: currentStreak };
  },

  async deleteTask(id: string): Promise<void> {
    const db = getDB();
    const now = new Date().toISOString();
    // Soft delete for sync tombstone
    await db.runAsync(
      `UPDATE DailyTasks SET isDeleted = 1, updatedAt = ? WHERE id = ?;`,
      [now, id]
    );

    // Hủy lịch nhắc nhở
    await notificationService.cancelTaskNotification(id);
  },
};

