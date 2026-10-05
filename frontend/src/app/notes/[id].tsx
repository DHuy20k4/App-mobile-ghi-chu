import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Notebook } from '../../types/note';
import { noteService } from '../../services/noteService';
import { notebookService } from '../../services/notebookService';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const isNew = id === 'new';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [notebookId, setNotebookId] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isTrashed, setIsTrashed] = useState(false);

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const safeNavigateBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/notes');
    }
  }, [router]);

  const loadNotebooks = useCallback(async () => {
    const list = await notebookService.getAllNotebooks();
    setNotebooks(list);
  }, []);

  const loadNoteDetails = useCallback(
    async (noteId: string) => {
      try {
        setLoading(true);
        const note = await noteService.getNoteById(noteId);
        if (note) {
          setTitle(note.title);
          setContent(note.content);
          setNotebookId(note.notebookId || null);
          setIsPrivate(note.isPrivate);
          setIsPinned(note.isPinned);
          setIsTrashed(note.isTrashed);
        } else {
          Alert.alert('Lỗi', 'Không tìm thấy ghi chú');
          safeNavigateBack();
        }
      } catch {
        console.error('Error fetching note details');
      } finally {
        setLoading(false);
      }
    },
    [safeNavigateBack]
  );

  useFocusEffect(
    useCallback(() => {
      void loadNotebooks();
      if (!isNew && id) {
        void loadNoteDetails(id);
      }
    }, [id, isNew, loadNotebooks, loadNoteDetails])
  );

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      safeNavigateBack();
      return;
    }

    try {
      setSaving(true);
      if (isNew) {
        await noteService.createNote({
          title: title.trim() || 'Ghi chú mới',
          content: content.trim(),
          notebookId,
          isPrivate,
          isPinned,
        });
      } else if (id) {
        await noteService.updateNote(id, {
          title: title.trim() || 'Ghi chú mới',
          content: content.trim(),
          notebookId,
          isPrivate,
          isPinned,
        });
      }
      safeNavigateBack();
    } catch (err: any) {
      console.error('Save note error:', err);
      Alert.alert('Lỗi', 'Không thể lưu ghi chú');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveToTrash = async () => {
    if (!id || isNew) return;
    Alert.alert('Xác nhận', 'Chuyển ghi chú này vào Thùng rác?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Chuyển',
        onPress: async () => {
          await noteService.moveToTrash(id);
          safeNavigateBack();
        },
      },
    ]);
  };

  const handleRestore = async () => {
    if (!id) return;
    await noteService.restoreFromTrash(id);
    setIsTrashed(false);
    Alert.alert('Thành công', 'Đã khôi phục ghi chú');
  };

  const handleDeletePermanent = async () => {
    if (!id) return;
    Alert.alert('Cảnh báo', 'Xóa vĩnh viễn ghi chú này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa vĩnh viễn',
        style: 'destructive',
        onPress: async () => {
          await noteService.deletePermanently(id);
          safeNavigateBack();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header Controls */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleSave}>
          <Text style={styles.backText}>‹ Quay lại</Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionIcon, isPinned && styles.activeActionIcon]}
            onPress={() => setIsPinned((prev) => !prev)}
          >
            <Text style={styles.actionIconText}>📌</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionIcon, isPrivate && styles.activeActionIcon]}
            onPress={() => setIsPrivate((prev) => !prev)}
          >
            <Text style={styles.actionIconText}>🔒</Text>
          </TouchableOpacity>

          {!isNew && (
            <TouchableOpacity
              style={styles.actionIcon}
              onPress={isTrashed ? handleDeletePermanent : handleMoveToTrash}
            >
              <Text style={styles.actionIconText}>{isTrashed ? '🔥' : '🗑️'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? '...' : 'Lưu'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notebook Selector Chips */}
      <View style={styles.notebookBar}>
        <Text style={styles.notebookLabel}>Sổ tay:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.notebookChips}>
          <TouchableOpacity
            style={[styles.chip, notebookId === null && styles.activeChip]}
            onPress={() => setNotebookId(null)}
          >
            <Text style={[styles.chipText, notebookId === null && styles.activeChipText]}>
              Không thuộc sổ tay
            </Text>
          </TouchableOpacity>

          {notebooks.map((nb) => (
            <TouchableOpacity
              key={nb.id}
              style={[styles.chip, notebookId === nb.id && styles.activeChip]}
              onPress={() => setNotebookId(nb.id)}
            >
              <Text style={[styles.chipText, notebookId === nb.id && styles.activeChipText]}>
                📁 {nb.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Trash Warning Banner */}
      {isTrashed && (
        <View style={styles.trashBanner}>
          <Text style={styles.trashBannerText}>⚠️ Ghi chú đang nằm trong Thùng rác</Text>
          <TouchableOpacity onPress={handleRestore}>
            <Text style={styles.restoreText}>Khôi phục ngay</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Editor Body */}
      <ScrollView style={styles.editorContainer} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.titleInput}
          placeholder="Tiêu đề..."
          placeholderTextColor="#999"
          value={title}
          onChangeText={setTitle}
          multiline
        />

        <TextInput
          style={styles.contentInput}
          placeholder="Viết nội dung ghi chú ở đây..."
          placeholderTextColor="#aaa"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 44,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeActionIcon: {
    backgroundColor: '#ffe8a3',
  },
  actionIconText: {
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  notebookBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  notebookLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginRight: 8,
  },
  notebookChips: {
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
  },
  activeChip: {
    backgroundColor: '#007AFF',
  },
  chipText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  activeChipText: {
    color: '#fff',
  },
  trashBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  trashBannerText: {
    fontSize: 13,
    color: '#856404',
  },
  restoreText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  editorContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    padding: 0,
  },
  contentInput: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    minHeight: 300,
    padding: 0,
  },
});
