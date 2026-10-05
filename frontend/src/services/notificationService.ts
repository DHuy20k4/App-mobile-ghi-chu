import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

let NotificationsModule: typeof import('expo-notifications') | null = null;
let isModuleLoaded = false;

function getNotifications(): typeof import('expo-notifications') | null {
  if (Platform.OS === 'web') return null;

  // Kiểm tra xem ứng dụng có đang chạy trên Android Expo Go hay không
  try {
    const isExpoGo =
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
      (Constants as any).appOwnership === 'expo';

    // Trên Android Expo Go, bỏ qua nạp expo-notifications để tránh lỗi DevicePushTokenAutoRegistration.fx.js
    if (isExpoGo && Platform.OS === 'android') {
      return null;
    }
  } catch {
    // Bỏ qua lỗi truy vấn Constants
  }

  if (!isModuleLoaded) {
    try {
      NotificationsModule = require('expo-notifications');
      if (NotificationsModule?.setNotificationHandler) {
        NotificationsModule.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      }
    } catch {
      NotificationsModule = null;
    }
    isModuleLoaded = true;
  }

  return NotificationsModule;
}

export const notificationService = {
  /**
   * Kiểm tra xem ứng dụng có đang chạy trong Expo Go hay không
   */
  isExpoGo(): boolean {
    try {
      return (
        Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
        (Constants as any).appOwnership === 'expo'
      );
    } catch {
      return false;
    }
  },

  /**
   * Xin quyền gửi thông báo từ Hệ điều hành (Android / iOS)
   * Tự động xử lý an toàn cho Expo Go (Expo SDK 53+ giới hạn Push Remote trên Expo Go)
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    const Notifications = getNotifications();
    if (!Notifications) return false;

    // Tránh gọi requestPermissions gây ra cảnh báo Push Notification trên Android Expo Go
    if (this.isExpoGo() && Platform.OS === 'android') {
      console.log('[NotificationService] Expo Go Android detected: Skipping remote notification request.');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('daily-tasks', {
          name: 'Nhắc nhở Nhiệm vụ hàng ngày',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });
      }

      return true;
    } catch (error: any) {
      console.log('[NotificationService] Request permission bypassed safely:', error?.message || error);
      return false;
    }
  },

  /**
   * Đăng ký Lịch nhắc nhở hàng ngày cho một nhiệm vụ theo giờ đặt trước (Ví dụ: "08:30")
   */
  async scheduleTaskNotification(task: {
    id: string;
    title: string;
    reminderTime?: string | null;
  }): Promise<string | null> {
    if (Platform.OS === 'web') return null;
    if (!task.reminderTime) return null;

    const Notifications = getNotifications();
    if (!Notifications) return null;

    const parts = task.reminderTime.split(':');
    if (parts.length !== 2) return null;

    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    if (isNaN(hour) || isNaN(minute)) return null;

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      // Hủy lịch cũ nếu có
      await this.cancelTaskNotification(task.id);

      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier: task.id,
        content: {
          title: '⏰ Nhắc nhở Nhiệm vụ hàng ngày',
          body: `Đừng quên hoàn thành: "${task.title}" để giữ chuỗi Streak nhé! 🔥`,
          sound: true,
          data: { taskId: task.id },
        },
        trigger: {
          hour,
          minute,
          repeats: true,
          channelId: 'daily-tasks',
        },
      });

      console.log(`[NotificationService] Scheduled notification for task ${task.id} at ${hour}:${minute}`);
      return notificationId;
    } catch (error: any) {
      console.log('[NotificationService] Schedule notification bypassed safely:', error?.message || error);
      return null;
    }
  },

  /**
   * Hủy lịch nhắc nhở của một nhiệm vụ
   */
  async cancelTaskNotification(taskId: string): Promise<void> {
    if (Platform.OS === 'web') return;

    const Notifications = getNotifications();
    if (!Notifications) return;

    try {
      await Notifications.cancelScheduledNotificationAsync(taskId);
      console.log(`[NotificationService] Cancelled notification for task ${taskId}`);
    } catch {
      // Bỏ qua nếu chưa tồn tại
    }
  },
};
