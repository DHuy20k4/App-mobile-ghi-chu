import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Note, Notebook } from '../../types/note';
import { noteService } from '../../services/noteService';
import { notebookService } from '../../services/notebookService';
import { matchVietnameseSearch } from '../../utils/stringUtils';
import { NoteCard } from '../../components/NoteCard';
import { SidebarDrawer, FilterCategory } from '../../components/SidebarDrawer';
import { PinModal } from '../../components/PinModal';

export default function NotesScreen() {
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [filterTitle, setFilterTitle] = useState('Tất cả Ghi chú');
  const [searchQuery, setSearchQuery] = useState('');

  // UI Modes
  const [isGrid, setIsGrid] = useState(true);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Private Note PIN Modal
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const loadedNotebooks = await notebookService.getAllNotebooks();
      setNotebooks(loadedNotebooks);

      let loadedNotes: Note[] = [];
      if (activeFilter === 'trash') {
        loadedNotes = await noteService.getTrashNotes();
      } else if (activeFilter === 'private') {
        loadedNotes = await noteService.getPrivateNotes();
      } else if (activeFilter === 'all') {
        loadedNotes = await noteService.getAllActiveNotes();
      } else {
        // notebookId
        loadedNotes = await noteService.getAllActiveNotes(activeFilter);
      }

      setNotes(loadedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Lọc tìm kiếm không dấu
  const filteredNotes = notes.filter(
    (n) =>
      matchVietnameseSearch(n.title, searchQuery) ||
      (!n.isPrivate && matchVietnameseSearch(n.content, searchQuery))
  );

  const handleNotePress = (note: Note) => {
    if (isMultiSelect) {
      toggleSelectId(note.id);
      return;
    }

    if (note.isPrivate) {
      setPendingNoteId(note.id);
      setPinModalVisible(true);
    } else {
      router.push({ pathname: '/notes/[id]', params: { id: note.id } });
    }
  };

  const handlePinSuccess = () => {
    setPinModalVisible(false);
    if (pendingNoteId) {
      const id = pendingNoteId;
      setPendingNoteId(null);
      router.push({ pathname: '/notes/[id]', params: { id } });
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleTogglePin = async (id: string) => {
    await noteService.togglePinNote(id);
    loadData();
  };

  // Multi-select actions
  const handleBatchTrash = async () => {
    Alert.alert('Xác nhận', `Chuyển ${selectedIds.length} ghi chú vào Thùng rác?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Chuyển',
        onPress: async () => {
          await noteService.batchMoveToTrash(selectedIds);
          setSelectedIds([]);
          setIsMultiSelect(false);
          loadData();
        },
      },
    ]);
  };

  const handleBatchRestore = async () => {
    await noteService.batchRestoreFromTrash(selectedIds);
    setSelectedIds([]);
    setIsMultiSelect(false);
    loadData();
  };

  const handleBatchDeletePermanent = async () => {
    Alert.alert('Cảnh báo xóa vĩnh viễn', `Xóa vĩnh viễn ${selectedIds.length} ghi chú?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa vĩnh viễn',
        style: 'destructive',
        onPress: async () => {
          await noteService.batchDeletePermanently(selectedIds);
          setSelectedIds([]);
          setIsMultiSelect(false);
          loadData();
        },
      },
    ]);
  };

  const notebookMap = new Map(notebooks.map((nb) => [nb.id, nb.name]));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setIsDrawerOpen(true)}>
          <Text style={styles.iconText}>☰</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {filterTitle}
        </Text>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setIsGrid((prev) => !prev)}
        >
          <Text style={styles.iconText}>{isGrid ? '📜' : '🔲'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconBtn, isMultiSelect && styles.activeIconBtn]}
          onPress={() => {
            setIsMultiSelect((prev) => !prev);
            setSelectedIds([]);
          }}
        >
          <Text style={styles.iconText}>☑️</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm gần đúng (ví dụ: ghi chu)..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Multi-Select Action Bar */}
      {isMultiSelect && (
        <View style={styles.multiSelectBar}>
          <Text style={styles.multiSelectCount}>
            Đã chọn: {selectedIds.length}
          </Text>
          <View style={styles.multiSelectActions}>
            {activeFilter === 'trash' ? (
              <>
                <TouchableOpacity style={styles.actionBtn} onPress={handleBatchRestore}>
                  <Text style={styles.actionBtnText}>↩️ Khôi phục</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.dangerBtn]}
                  onPress={handleBatchDeletePermanent}
                >
                  <Text style={[styles.actionBtnText, { color: '#fff' }]}>🔥 Xóa hẳn</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, styles.dangerBtn]}
                onPress={handleBatchTrash}
              >
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>🗑️ Thùng rác</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Notes List / Grid */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ flex: 1 }} />
      ) : filteredNotes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyText}>Chưa có ghi chú nào</Text>
        </View>
      ) : (
        <FlatList
          key={isGrid ? 'grid' : 'list'}
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          numColumns={isGrid ? 2 : 1}
          columnWrapperStyle={isGrid ? styles.row : undefined}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              notebookName={item.notebookId ? notebookMap.get(item.notebookId) : undefined}
              isGrid={isGrid}
              isMultiSelect={isMultiSelect}
              isSelected={selectedIds.includes(item.id)}
              onPress={() => handleNotePress(item)}
              onLongPress={() => {
                setIsMultiSelect(true);
                toggleSelectId(item.id);
              }}
              onTogglePin={() => handleTogglePin(item.id)}
            />
          )}
        />
      )}

      {/* Floating Action Button (FAB) */}
      {activeFilter !== 'trash' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push({ pathname: '/notes/[id]', params: { id: 'new' } })}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* Sidebar Drawer */}
      <SidebarDrawer
        visible={isDrawerOpen}
        activeFilter={activeFilter}
        notebooks={notebooks}
        onSelectFilter={(filter, title) => {
          setActiveFilter(filter);
          setFilterTitle(title);
          setIsDrawerOpen(false);
          setSelectedIds([]);
          setIsMultiSelect(false);
        }}
        onClose={() => setIsDrawerOpen(false)}
        onRefreshNotebooks={loadData}
      />

      {/* PIN Verification Modal */}
      <PinModal
        visible={pinModalVisible}
        onSuccess={handlePinSuccess}
        onCancel={() => {
          setPinModalVisible(false);
          setPendingNoteId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 44,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 50,
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
  },
  activeIconBtn: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  iconText: {
    fontSize: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  clearSearch: {
    fontSize: 14,
    color: '#999',
    padding: 4,
  },
  multiSelectBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e6f2ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  multiSelectCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  multiSelectActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  dangerBtn: {
    backgroundColor: '#ff3b30',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  row: {
    justifyContent: 'space-between',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 999,
  },
  fabIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
    marginTop: -2,
  },
});
