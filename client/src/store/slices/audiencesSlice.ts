import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Audience {
  id: string;
  audience_id: string;
  name: string;
  type: 'custom' | 'lookalike' | 'saved';
  subtype: string;
  size: number;
  approximate_count: string;
  status: 'active' | 'inactive' | 'paused';
  delivery_status: string;
  createdAt: string;
  updatedAt: string;
}

interface AudiencesState {
  audiences: Audience[];
  lastSync: string | null;
}

const initialState: AudiencesState = {
  audiences: [
    { id: '23847658901234567', audience_id: '23847658901234567', name: 'Website Visitors - Last 30 Days', type: 'custom', subtype: 'Custom', size: 45000, approximate_count: '~45,000', status: 'active', delivery_status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '23847658901234568', audience_id: '23847658901234568', name: 'Purchasers Lookalike (1%)', type: 'lookalike', subtype: 'Lookalike', size: 2100000, approximate_count: '~2,100,000', status: 'active', delivery_status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '23847658901234569', audience_id: '23847658901234569', name: 'Cart Abandoners', type: 'custom', subtype: 'Custom', size: 12500, approximate_count: '~12,500', status: 'inactive', delivery_status: 'inactive', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '23847658901234570', audience_id: '23847658901234570', name: 'Email List - Newsletter Subscribers', type: 'custom', subtype: 'Custom', size: 87300, approximate_count: '~87,300', status: 'active', delivery_status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ],
  lastSync: null,
};

const audiencesSlice = createSlice({
  name: 'audiences',
  initialState,
  reducers: {
    setAudiences: (state, action: PayloadAction<Audience[]>) => {
      state.audiences = action.payload;
      state.lastSync = new Date().toISOString();
    },
    addAudience: (state, action: PayloadAction<Audience>) => {
      state.audiences.push(action.payload);
    },
    updateAudience: (state, action: PayloadAction<{ id: string; updates: Partial<Audience> }>) => {
      const index = state.audiences.findIndex(a => a.id === action.payload.id);
      if (index !== -1) {
        state.audiences[index] = { ...state.audiences[index], ...action.payload.updates };
      }
    },
    deleteAudience: (state, action: PayloadAction<string>) => {
      state.audiences = state.audiences.filter(a => a.id !== action.payload);
    },
    syncAudiences: (state) => {
      state.lastSync = new Date().toISOString();
    },
  },
});

export const {
  setAudiences,
  addAudience,
  updateAudience,
  deleteAudience,
  syncAudiences,
} = audiencesSlice.actions;

export default audiencesSlice.reducer;
