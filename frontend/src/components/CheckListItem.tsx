import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface CheckListItemProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
}

export const CheckListItem: React.FC<CheckListItemProps> = ({ label, checked, onToggle }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onToggle}>
      <View style={[styles.checkbox, checked && styles.checked]} />
      <Text style={[styles.label, checked && styles.lineThrough]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 4,
    marginRight: 10,
  },
  checked: {
    backgroundColor: '#007AFF',
  },
  label: {
    fontSize: 16,
  },
  lineThrough: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
});
