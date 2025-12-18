import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MetricPreset {
  id: string;
  name: string;
  projectId: string;
  selectedMetrics: string[];
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  tags: string[];
}

interface MetricPresetsState {
  presets: Record<string, MetricPreset[]>; // projectId -> presets[]
  currentPresetId: string | null;
}

const initialState: MetricPresetsState = {
  presets: {},
  currentPresetId: null,
};

const metricPresetsSlice = createSlice({
  name: 'metricPresets',
  initialState,
  reducers: {
    setMetricPresets: (state, action: PayloadAction<{ projectId: string; presets: MetricPreset[] }>) => {
      state.presets[action.payload.projectId] = action.payload.presets;
    },
    addMetricPreset: (state, action: PayloadAction<MetricPreset>) => {
      const projectId = action.payload.projectId;
      if (!state.presets[projectId]) {
        state.presets[projectId] = [];
      }
      state.presets[projectId].unshift(action.payload);
      state.currentPresetId = action.payload.id;
    },
    updateMetricPreset: (state, action: PayloadAction<{ projectId: string; presetId: string; updates: Partial<MetricPreset> }>) => {
      const presets = state.presets[action.payload.projectId];
      if (presets) {
        const index = presets.findIndex(p => p.id === action.payload.presetId);
        if (index !== -1) {
          presets[index] = {
            ...presets[index],
            ...action.payload.updates,
            updatedAt: new Date().toISOString(),
          };
        }
      }
    },
    deleteMetricPreset: (state, action: PayloadAction<{ projectId: string; presetId: string }>) => {
      const presets = state.presets[action.payload.projectId];
      if (presets) {
        state.presets[action.payload.projectId] = presets.filter(p => p.id !== action.payload.presetId);
        if (state.currentPresetId === action.payload.presetId) {
          const remaining = state.presets[action.payload.projectId];
          state.currentPresetId = remaining.length > 0 ? remaining[0].id : null;
        }
      }
    },
    setCurrentMetricPreset: (state, action: PayloadAction<string | null>) => {
      state.currentPresetId = action.payload;
    },
    toggleMetricPresetPin: (state, action: PayloadAction<{ projectId: string; presetId: string }>) => {
      const presets = state.presets[action.payload.projectId];
      if (presets) {
        const preset = presets.find(p => p.id === action.payload.presetId);
        if (preset) {
          preset.pinned = !preset.pinned;
          preset.updatedAt = new Date().toISOString();
        }
      }
    },
    duplicateMetricPreset: (state, action: PayloadAction<{ projectId: string; presetId: string }>) => {
      const presets = state.presets[action.payload.projectId];
      if (presets) {
        const preset = presets.find(p => p.id === action.payload.presetId);
        if (preset) {
          const duplicate: MetricPreset = {
            ...preset,
            id: `preset-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: `${preset.name} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            pinned: false,
          };
          state.presets[action.payload.projectId].unshift(duplicate);
        }
      }
    },
  },
});

export const {
  setMetricPresets,
  addMetricPreset,
  updateMetricPreset,
  deleteMetricPreset,
  setCurrentMetricPreset,
  toggleMetricPresetPin,
  duplicateMetricPreset,
} = metricPresetsSlice.actions;

export default metricPresetsSlice.reducer;
