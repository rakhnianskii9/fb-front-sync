import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PixelEvent {
  event: string;
  tz: string;
  status: 'active' | 'inactive' | 'paused';
  inUse: boolean;
  integration: string;
  quality: number;
  total: number;
}

export interface Pixel {
  pixel_id: string;
  name: string;
  datasets: number;
  created_time: string;
  updatedAt: string;
  events?: PixelEvent[];
}

export interface DatasetInfo {
  id: string;
  icon: string;
  label: string;
  value: string;
  isLink?: boolean;
  status?: 'active' | 'inactive' | null;
}

export interface PixelTestEventResult {
  eventId?: string;
  facebookEventId?: string;
  emqScore?: number;
  warnings: string[];
  eventSourceUrl: string;
}

export interface PixelTestEventState {
  status: 'idle' | 'loading' | 'success' | 'error';
  result: PixelTestEventResult | null;
  error: string | null;
}

export interface PixelsState {
  pixels: Pixel[];
  datasetInfo: DatasetInfo[];
  lastSync: string | null;
  testEvent: PixelTestEventState;
}

const initialTestEventState = (): PixelTestEventState => ({
  status: 'idle',
  result: null,
  error: null,
});

const initialState: PixelsState = {
  pixels: [],
  datasetInfo: [],
  lastSync: null,
  testEvent: initialTestEventState(),
};

const pixelsSlice = createSlice({
  name: 'pixels',
  initialState,
  reducers: {
    setPixels: (state, action: PayloadAction<Pixel[]>) => {
      state.pixels = action.payload;
      state.lastSync = new Date().toISOString();
    },
    addPixel: (state, action: PayloadAction<Pixel>) => {
      state.pixels.push(action.payload);
    },
    updatePixel: (state, action: PayloadAction<{ pixel_id: string; updates: Partial<Pixel> }>) => {
      const index = state.pixels.findIndex(p => p.pixel_id === action.payload.pixel_id);
      if (index !== -1) {
        state.pixels[index] = { ...state.pixels[index], ...action.payload.updates };
      }
    },
    deletePixel: (state, action: PayloadAction<string>) => {
      state.pixels = state.pixels.filter(p => p.pixel_id !== action.payload);
    },
    setDatasetInfo: (state, action: PayloadAction<DatasetInfo[]>) => {
      state.datasetInfo = action.payload;
    },
    updateDatasetInfo: (state, action: PayloadAction<{ id: string; updates: Partial<DatasetInfo> }>) => {
      const index = state.datasetInfo.findIndex(d => d.id === action.payload.id);
      if (index !== -1) {
        state.datasetInfo[index] = { ...state.datasetInfo[index], ...action.payload.updates };
      }
    },
    syncPixels: (state) => {
      state.lastSync = new Date().toISOString();
    },
    setTestEventLoading: (state) => {
      state.testEvent = {
        status: 'loading',
        result: null,
        error: null,
      };
    },
    setTestEventSuccess: (state, action: PayloadAction<PixelTestEventResult>) => {
      state.testEvent = {
        status: 'success',
        result: action.payload,
        error: null,
      };
    },
    setTestEventError: (state, action: PayloadAction<string>) => {
      state.testEvent = {
        status: 'error',
        result: null,
        error: action.payload,
      };
    },
    resetTestEventState: (state) => {
      state.testEvent = initialTestEventState();
    },
  },
});

export const {
  setPixels,
  addPixel,
  updatePixel,
  deletePixel,
  setDatasetInfo,
  updateDatasetInfo,
  syncPixels,
  setTestEventLoading,
  setTestEventSuccess,
  setTestEventError,
  resetTestEventState,
} = pixelsSlice.actions;

export const selectPixelsState = (state: { pixels: PixelsState }) => state.pixels;
export const selectPixelsTestEventState = (state: { pixels: PixelsState }) => state.pixels.testEvent;

export default pixelsSlice.reducer;
