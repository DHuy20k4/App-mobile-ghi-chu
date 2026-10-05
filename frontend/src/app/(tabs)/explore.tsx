import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { DailyTask } from '../../types/task';
import { taskService } from '../../services/taskService';

function ExploreScreen() {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Task Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newReminder, setNewReminder] = useState('08:00');

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await taskService.getAllTasks();
      setTasks(data);
    } catch {
      console.error('Error loading tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  const handleCreateTask = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhiệm vụ');
      return;
    }

    try {
      await taskService.createTask(newTitle.trim(), newReminder);
      setNewTitle('');
      setModalVisible(false);
      loadTasks();
    } catch {
      Alert.alert('Lỗi', 'Không thể tạo nhiệm vụ');
    }
  };

  const handleToggleTask = async (task: DailyTask) => {
    try {
      const { completedToday, newStreak } = await taskService.toggleTaskCompletion(task.id);
      loadTasks();

      if (completedToday && newStreak > 1) {
        Alert.alert('🔥 Tuyệt vời!', `Bạn đã duy trì chuỗi ${newStreak} ngày liên tiếp! Tiếp tục phát huy nhé!`);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái nhiệm vụ');
    }
  };

  const handleDeleteTask = (task: DailyTask) => {
    Alert.alert('Xóa nhiệm vụ', `Bạn có chắc muốn xóa "${task.title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await taskService.deleteTask(task.id);
          loadTasks();
        },
      },
    ]);
  };

  // Tính tổng số streak tối đa của các task
  const maxStreak = tasks.reduce((max, t) => Math.max(max, t.currentStreak || 0), 0);
  const completedTodayCount = tasks.filter((t) => t.completedToday).length;

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Nhiệm Vụ Hàng Ngày</Text>
          <Text style={styles.subtitle}>
            Hoàn thành: {completedTodayCount}/{tasks.length} nhiệm vụ hôm nay
          </Text>
        </View>

        {maxStreak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakCount}>{maxStreak}</Text>
            <Text style={styles.streakLabel}>ngày</Text>
          </View>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#ff9500" />
        </View>
      ) : tasks.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text style={styles.emptyTitle}>Chưa có nhiệm vụ hàng ngày</Text>
          <Text style={styles.emptySubtitle}>
            Tạo nhiệm vụ lặp lại hàng ngày để xây dựng thói quen tốt!
          </Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.taskCard, item.completedToday && styles.taskCardCompleted]}
              onPress={() => handleToggleTask(item)}
              onLongPress={() => handleDeleteTask(item)}
              activeOpacity={0.7}
            >
              <View style={styles.checkboxContainer}>
                <View style={[styles.checkbox, item.completedToday && styles.checkboxChecked]}>
                  {item.completedToday && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </View>

              <View style={styles.taskInfo}>
                <Text
                  style={[styles.taskTitle, item.completedToday && styles.taskTitleCompleted]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                {item.reminderTime && (
                  <Text style={styles.taskReminder}>⏰ Nhắc lúc {item.reminderTime}</Text>
                )}
              </View>

              <View style={styles.taskRight}>
                {(item.currentStreak ?? 0) > 0 ? (
                  <View style={styles.taskStreakBadge}>
                    <Text style={styles.taskStreakEmoji}>🔥</Text>
                    <Text style={styles.taskStreakText}>{item.currentStreak}</Text>
                  </View>
                ) : (
                  <View style={styles.taskStreakBadgeInactive}>
                    <Text style={styles.taskStreakTextInactive}>0</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* FAB Add Task */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Modal Add Task */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nhiệm Vụ Hàng Ngày Mới</Text>

            <Text style={styles.inputLabel}>Tên nhiệm vụ</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ví dụ: Tập thể dục 30 phút, Đọc sách..."
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />

            <Text style={styles.inputLabel}>Giờ nhắc nhở (HH:mm)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="08:00"
              value={newReminder}
              onChangeText={setNewReminder}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleCreateTask}>
                <Text style={styles.saveBtnText}>Tạo nhiệm vụ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default ExploreScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#ff9500',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  streakBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  streakCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 2,
  },
  streakLabel: {
    fontSize: 11,
    color: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 90,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  taskCardCompleted: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  taskReminder: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  taskRight: {
    marginLeft: 8,
  },
  taskStreakBadge: {
    backgroundColor: '#fff7ed',
    borderColor: '#ffedd5',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskStreakEmoji: {
    fontSize: 12,
    marginRight: 2,
  },
  taskStreakText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ea580c',
  },
  taskStreakBadgeInactive: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taskStreakTextInactive: {
    fontSize: 12,
    color: '#9ca3af',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ff9500',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: '#fff',
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    fontSize: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f0f0f0',
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#ff9500',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
