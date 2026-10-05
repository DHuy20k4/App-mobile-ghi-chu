import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { Notebook } from '../types/note';
import { notebookService } from '../services/notebookService';

export type FilterCategory = 'all' | 'private' | 'trash' | string; // string is notebookId

interface SidebarDrawerProps {
  visible: boolean;
  activeFilter: FilterCategory;
  notebooks: Notebook[];
  onSelectFilter: (filter: FilterCategory, title: string) => void;
  onClose: () => void;
  onRefreshNotebooks: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  visible,
  activeFilter,
  notebooks,
  onSelectFilter,
  onClose,
  onRefreshNotebooks,
}) => {
  const [isAddingNotebook, setIsAddingNotebook] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');

  const handleAddNotebook = async () => {
    if (!newNotebookName.trim()) return;
    try {
      await notebookService.createNotebook(newNotebookName.trim());
      setNewNotebookName('');
      setIsAddingNotebook(false);
      onRefreshNotebooks();
    } catch {
      Alert.alert('Lỗi', 'Không thể tạo sổ tay');
    }
  };

  const handleDeleteNotebook = async (id: string, name: string) => {
    Alert.alert(
      'Xóa Sổ tay',
      `Bạn có chắc muốn xóa sổ tay "${name}"? Các ghi chú bên trong sẽ chuyển về trạng thái không thuộc sổ tay nào.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            await notebookService.deleteNotebook(id);
            onRefreshNotebooks();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.drawer} onStartShouldSetResponder={() => true}>
          <Text style={styles.headerTitle}>📂 Quản lý Sổ tay</Text>

          {/* Menu cố định */}
          <TouchableOpacity
            style={[styles.menuItem, activeFilter === 'all' && styles.activeItem]}
            onPress={() => onSelectFilter('all', 'Tất cả Ghi chú')}
          >
            <Text style={styles.menuText}>📝 Tất cả Ghi chú</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, activeFilter === 'private' && styles.activeItem]}
            onPress={() => onSelectFilter('private', 'Ghi chú riêng tư')}
          >
            <Text style={styles.menuText}>🔒 Ghi chú riêng tư</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, activeFilter === 'trash' && styles.activeItem]}
            onPress={() => onSelectFilter('trash', 'Thùng rác')}
          >
            <Text style={styles.menuText}>🗑️ Thùng rác</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Danh sách Sổ tay */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>SỔ TAY CỦA BẠN</Text>
            <TouchableOpacity onPress={() => setIsAddingNotebook(true)}>
              <Text style={styles.addText}>+ Tạo mới</Text>
            </TouchableOpacity>
          </View>

          {isAddingNotebook && (
            <View style={styles.addForm}>
              <TextInput
                style={styles.input}
                placeholder="Tên sổ tay..."
                value={newNotebookName}
                onChangeText={setNewNotebookName}
                autoFocus
              />
              <View style={styles.addFormButtons}>
                <TouchableOpacity
                  style={[styles.smallBtn, styles.cancelBtn]}
                  onPress={() => setIsAddingNotebook(false)}
                >
                  <Text style={styles.smallBtnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smallBtn, styles.saveBtn]} onPress={handleAddNotebook}>
                  <Text style={[styles.smallBtnText, { color: '#fff' }]}>Lưu</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <FlatList
            data={notebooks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[styles.menuItem, activeFilter === item.id && styles.activeItem]}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => onSelectFilter(item.id, `Sổ tay: ${item.name}`)}
                >
                  <Text style={styles.menuText}>📁 {item.name}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleDeleteNotebook(item.id, item.name)}>
                  <Text style={styles.deleteIcon}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row',
  },
  drawer: {
    width: '80%',
    maxWidth: 300,
    backgroundColor: '#fff',
    height: '100%',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1a1a1a',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  activeItem: {
    backgroundColor: '#e6f2ff',
  },
  menuText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888',
    letterSpacing: 1,
  },
  addText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  addForm: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 36,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  addFormButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelBtn: {
    backgroundColor: '#eee',
  },
  saveBtn: {
    backgroundColor: '#007AFF',
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteIcon: {
    color: '#999',
    fontSize: 16,
    padding: 4,
  },
});
