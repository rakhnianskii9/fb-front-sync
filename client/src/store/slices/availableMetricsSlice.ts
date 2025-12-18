import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AvailableMetricsState {
  // Множество метрик, которые реально есть в загруженных данных
  metricIds: string[];
}

const initialState: AvailableMetricsState = {
  metricIds: [],
};

const availableMetricsSlice = createSlice({
  name: 'availableMetrics',
  initialState,
  reducers: {
    // Устанавливает список доступных метрик из загруженных данных
    setAvailableMetrics: (state, action: PayloadAction<string[]>) => {
      state.metricIds = action.payload;
    },
    // Очищает список при смене проекта/репорта
    clearAvailableMetrics: (state) => {
      state.metricIds = [];
    },
  },
});

export const { setAvailableMetrics, clearAvailableMetrics } = availableMetricsSlice.actions;

export default availableMetricsSlice.reducer;
