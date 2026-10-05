import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Note } from '../types/note';

interface NoteCardProps {
  note: Note;
  notebookName?: string;
  isGrid: boolean;
  isMultiSelect: boolean;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onTogglePin?: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  notebookName,
  isGrid,
  isMultiSelect,
  isSelected,
  onPress,
  onLongPress,
  onTogglePin,
}) => {
  const formattedDate = new Date(note.updatedAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isGrid ? styles.gridCard : styles.listCard,
        isSelected && styles.selectedCard,
        note.isPinned && styles.pinnedCard,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        {isMultiSelect && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}

        <Text style={styles.title} numberOfLines={1}>
          {note.isPrivate ? '🔒 ' : ''}
          {note.title || 'Ghi chú không tiêu đề'}
        </Text>

        {note.isPinned && (
          <TouchableOpacity onPress={onTogglePin}>
            <Text style={styles.pinIcon}>📌</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.content} numberOfLines={isGrid ? 3 : 2}>
        {note.isPrivate ? '• Nội dung được bảo mật bằng PIN •' : note.content || 'Chưa có nội dung'}
      </Text>

      <View style={styles.cardFooter}>
        <Text style={styles.date}>{formattedDate}</Text>
        {notebookName ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {notebookName}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  gridCard: {
    width: '48%',
  },
  listCard: {
    width: '100%',
  },
  selectedCard: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
    borderWidth: 2,
  },
  pinnedCard: {
    backgroundColor: '#fffdf5',
    borderColor: '#ffe8a3',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  pinIcon: {
    fontSize: 14,
  },
  content: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  date: {
    fontSize: 11,
    color: '#999',
  },
  badge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: 90,
  },
  badgeText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
});
