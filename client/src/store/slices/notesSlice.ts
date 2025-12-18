import logger from '@/lib/logger';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Note } from '@shared/schema';
import fbAdsApi, { ApiNote, CreateNoteRequest, UpdateNoteRequest } from '../../api/fbAds';

interface NotesState {
  notes: Note[];
  loading: boolean;
  error: string | null;
}

/**
 * Маппер ApiNote → Note
 * API возвращает createdDate/updatedDate, а фронтенд-тип Note использует createdAt/updatedAt
 */
function mapApiNoteToNote(apiNote: ApiNote): Note {
  return {
    id: apiNote.id,
    projectId: apiNote.projectId,
    title: apiNote.title,
    description: apiNote.description,
    type: (apiNote.type as Note['type']) ?? 'user',
    priority: (apiNote.priority as Note['priority']) ?? 'none',
    status: (apiNote.status as Note['status']) ?? 'pending',
    tags: apiNote.tags ?? [],
    relatedTo: (apiNote.relatedTo ?? []).map(r => ({
      type: r.type as 'campaign' | 'adset' | 'ad' | 'creative',
      id: r.id,
      name: r.name,
    })),
    pinned: apiNote.pinned ?? false,
    aiInsights: apiNote.aiInsights,
    createdBy: apiNote.createdBy,
    createdAt: apiNote.createdDate, // API: createdDate → Frontend: createdAt
    updatedAt: apiNote.updatedDate, // API: updatedDate → Frontend: updatedAt
    deadline: apiNote.deadline,
    whatsappReminder: apiNote.whatsappReminder,
  };
}

const initialState: NotesState = {
  notes: [],
  loading: false,
  error: null,
};

export const fetchNotes = createAsyncThunk(
  'notes/fetchNotes',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      const apiNotes = await fbAdsApi.notes.getAll({ workspaceId });
      return apiNotes.map(mapApiNoteToNote);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch notes');
    }
  }
);

export const addNote = createAsyncThunk(
  'notes/addNote',
  async (data: CreateNoteRequest, { rejectWithValue }) => {
    try {
      const apiNote = await fbAdsApi.notes.create(data);
      return mapApiNoteToNote(apiNote);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create note');
    }
  }
);

export const updateNote = createAsyncThunk(
  'notes/updateNote',
  async ({ id, data }: { id: string; data: UpdateNoteRequest }, { rejectWithValue }) => {
    try {
      const apiNote = await fbAdsApi.notes.update(id, data);
      return mapApiNoteToNote(apiNote);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update note');
    }
  }
);

export const deleteNote = createAsyncThunk(
  'notes/deleteNote',
  async ({ id, workspaceId }: { id: string; workspaceId: string }, { rejectWithValue }) => {
    try {
      await fbAdsApi.notes.delete(id, workspaceId);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete note');
    }
  }
);

export const toggleNotePin = createAsyncThunk(
  'notes/toggleNotePin',
  async ({ id, workspaceId, pinned }: { id: string; workspaceId: string; pinned: boolean }, { rejectWithValue }) => {
    try {
      const apiNote = await fbAdsApi.notes.update(id, { workspaceId, pinned });
      return mapApiNoteToNote(apiNote);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to toggle pin');
    }
  }
);

export const duplicateNote = createAsyncThunk(
  'notes/duplicateNote',
  async ({ id, workspaceId }: { id: string; workspaceId: string }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { notes: NotesState };
      const note = state.notes.notes.find((n: Note) => n.id === id);
      if (!note) throw new Error('Note not found');

      const newNoteData: CreateNoteRequest = {
        workspaceId,
        projectId: note.projectId,
        title: `${note.title} (Copy)`,
        description: note.description,
        type: note.type,
        priority: note.priority,
        status: note.status,
        tags: note.tags,
        relatedTo: note.relatedTo,
        pinned: false,
        aiInsights: note.aiInsights
      };

      const apiNote = await fbAdsApi.notes.create(newNoteData);
      return mapApiNoteToNote(apiNote);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to duplicate note');
    }
  }
);

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Notes
      .addCase(fetchNotes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotes.fulfilled, (state, action) => {
        state.loading = false;
        state.notes = action.payload;
      })
      .addCase(fetchNotes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Add Note
      .addCase(addNote.pending, (state) => {
        state.error = null;
      })
      .addCase(addNote.fulfilled, (state, action) => {
        state.notes = [...state.notes, action.payload];
      })
      .addCase(addNote.rejected, (state, action) => {
        state.error = action.payload as string;
        logger.error('[NotesSlice] Failed to add note:', action.payload);
      })
      // Update Note & Toggle Pin
      .addCase(updateNote.fulfilled, (state, action) => {
        const index = state.notes.findIndex((n) => n.id === action.payload.id);
        if (index !== -1) {
          state.notes[index] = action.payload;
        }
      })
      .addCase(toggleNotePin.fulfilled, (state, action) => {
        const index = state.notes.findIndex((n) => n.id === action.payload.id);
        if (index !== -1) {
          state.notes[index] = action.payload;
        }
      })
      // Delete Note
      .addCase(deleteNote.fulfilled, (state, action) => {
        state.notes = state.notes.filter((n) => n.id !== action.payload);
      })
      // Duplicate Note
      .addCase(duplicateNote.fulfilled, (state, action) => {
        state.notes.push(action.payload);
      });
  },
});

export default notesSlice.reducer;
