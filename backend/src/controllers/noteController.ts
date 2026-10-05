import { Request, Response, NextFunction } from 'express';
import { noteService } from '../services/noteService';

export const getNotes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notes = await noteService.getAllNotes();
    res.json(notes);
  } catch (error) {
    next(error);
  }
};

export const getNoteById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const note = await noteService.getNoteById(req.params.id);
    res.json(note);
  } catch (error) {
    next(error);
  }
};

export const createNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const note = await noteService.createNote(req.body);
    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
};
