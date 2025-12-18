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

export interface MetricPresetsState {
  presets: MetricPreset[];
  currentPresetId: string | null;
}

function getProjectKey(projectId: string): string {
  return `metricPresets-${projectId}`;
}

export function getMetricPresetsState(projectId: string): MetricPresetsState {
  try {
    const data = localStorage.getItem(getProjectKey(projectId));
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading metric presets state:', error);
  }
  
  return {
    presets: [],
    currentPresetId: null,
  };
}

export function saveMetricPresetsState(projectId: string, state: MetricPresetsState): void {
  try {
    localStorage.setItem(getProjectKey(projectId), JSON.stringify(state));
  } catch (error) {
    console.error('Error saving metric presets state:', error);
  }
}

export function getMetricPresets(projectId: string): MetricPreset[] {
  const state = getMetricPresetsState(projectId);
  return state.presets;
}

export function getMetricPreset(projectId: string, presetId: string): MetricPreset | null {
  const state = getMetricPresetsState(projectId);
  return state.presets.find(p => p.id === presetId) || null;
}

export function createMetricPreset(projectId: string, selectedMetrics: string[], name?: string): MetricPreset {
  const state = getMetricPresetsState(projectId);
  
  const baseName = name || 'New Preset';
  let presetName = baseName;
  let counter = 1;
  
  while (state.presets.some(p => p.name === presetName)) {
    presetName = `${baseName} ${counter}`;
    counter++;
  }
  
  const preset: MetricPreset = {
    id: `preset-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name: presetName,
    projectId,
    selectedMetrics: [...selectedMetrics],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pinned: false,
    tags: [],
  };
  
  state.presets.unshift(preset);
  state.currentPresetId = preset.id;
  saveMetricPresetsState(projectId, state);
  
  return preset;
}

export function updateMetricPreset(
  projectId: string,
  presetId: string,
  updates: Partial<MetricPreset>
): void {
  const state = getMetricPresetsState(projectId);
  const index = state.presets.findIndex(p => p.id === presetId);
  
  if (index !== -1) {
    state.presets[index] = {
      ...state.presets[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveMetricPresetsState(projectId, state);
  }
}

export function deleteMetricPreset(projectId: string, presetId: string): void {
  const state = getMetricPresetsState(projectId);
  state.presets = state.presets.filter(p => p.id !== presetId);
  
  if (state.currentPresetId === presetId) {
    state.currentPresetId = state.presets.length > 0 ? state.presets[0].id : null;
  }
  
  saveMetricPresetsState(projectId, state);
}

export function setCurrentMetricPreset(projectId: string, presetId: string | null): void {
  const state = getMetricPresetsState(projectId);
  state.currentPresetId = presetId;
  saveMetricPresetsState(projectId, state);
}
