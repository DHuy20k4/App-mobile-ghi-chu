import { useState } from 'react';
import { Note } from '../types/note';

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  return { notes, setNotes };
};
