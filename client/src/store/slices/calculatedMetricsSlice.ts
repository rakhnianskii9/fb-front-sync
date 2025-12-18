import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CalculatedMetric {
  id: string;
  name: string;
  format: 'number' | 'currency';
  currency?: string;
  formula: string;
  projectId: string;
  createdAt: string;
}

interface CalculatedMetricsState {
  metrics: Record<string, CalculatedMetric[]>; // projectId -> metrics[]
}

const initialState: CalculatedMetricsState = {
  metrics: {},
};

const calculatedMetricsSlice = createSlice({
  name: 'calculatedMetrics',
  initialState,
  reducers: {
    addCalculatedMetric: (state, action: PayloadAction<CalculatedMetric>) => {
      const projectId = action.payload.projectId;
      if (!state.metrics[projectId]) {
        state.metrics[projectId] = [];
      }
      state.metrics[projectId].unshift(action.payload);
    },
    deleteCalculatedMetric: (state, action: PayloadAction<{ projectId: string; metricId: string }>) => {
      const metrics = state.metrics[action.payload.projectId];
      if (metrics) {
        state.metrics[action.payload.projectId] = metrics.filter(m => m.id !== action.payload.metricId);
      }
    },
    updateCalculatedMetric: (state, action: PayloadAction<{ projectId: string; metricId: string; updates: Partial<CalculatedMetric> }>) => {
      const metrics = state.metrics[action.payload.projectId];
      if (metrics) {
        const index = metrics.findIndex(m => m.id === action.payload.metricId);
        if (index !== -1) {
          metrics[index] = {
            ...metrics[index],
            ...action.payload.updates,
          };
        }
      }
    },
  },
});

export const {
  addCalculatedMetric,
  deleteCalculatedMetric,
  updateCalculatedMetric,
} = calculatedMetricsSlice.actions;

export default calculatedMetricsSlice.reducer;
