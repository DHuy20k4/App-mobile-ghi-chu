export const noteService = {
  getAllNotes: async () => {
    return [];
  },
  getNoteById: async (id: string) => {
    return { id, title: 'Sample Note', content: 'Sample Content' };
  },
  createNote: async (data: any) => {
    return { id: 'new-id', ...data };
  },
};
