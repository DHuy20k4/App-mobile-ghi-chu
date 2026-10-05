import React from 'react';
import { TextInput, StyleSheet } from 'react-native';

interface NoteInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const NoteInput: React.FC<NoteInputProps> = ({ value, onChangeText, placeholder }) => {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      multiline
    />
  );
};

const styles = StyleSheet.create({
  input: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    fontSize: 16,
  },
});
