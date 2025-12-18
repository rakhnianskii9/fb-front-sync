import logger from '@/lib/logger';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchProjects,
  createProject,
  updateProject as updateProjectThunk,
  deleteProject as deleteProjectThunk,
  cloneProject as cloneProjectThunk,
  toggleProjectPin as toggleProjectPinThunk,
} from './projectsThunks';

export type ProjectStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold';

export interface Project {
  id: string;
  workspaceId: string;
  code?: number;
  name: string;
  description: string;
  createdAt: string;
  pinned?: boolean;
  tags?: string[];
  status?: ProjectStatus;
}

interface ProjectsState {
  projects: Project[];
  currentProjectId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProjectsState = {
  projects: [],
  currentProjectId: null,
  loading: false,
  error: null,
};

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setProjects: (state, action: PayloadAction<Project[]>) => {
      state.projects = action.payload;
      state.loading = false;
      state.error = null;
    },
    setCurrentProject: (state, action: PayloadAction<string | null>) => {
      state.currentProjectId = action.payload;
    },
    // Локальное обновление тегов (затем можно вызвать updateProjectThunk для синхронизации с backend)
    updateProjectTags: (state, action: PayloadAction<{ id: string; tags: string[] }>) => {
      const project = state.projects.find(p => p.id === action.payload.id);
      if (project) {
        logger.log('📝 Before update:', { projectId: project.id, oldTags: project.tags, newTags: action.payload.tags });
        project.tags = action.payload.tags;
        logger.log('✅ After update:', { projectId: project.id, tags: project.tags });
      } else {
        logger.error('❌ Project not found:', action.payload.id);
      }
    },
    // Локальное обновление статуса (затем можно вызвать updateProjectThunk для синхронизации с backend)
    updateProjectStatus: (state, action: PayloadAction<{ id: string; status: ProjectStatus }>) => {
      const project = state.projects.find(p => p.id === action.payload.id);
      if (project) {
        project.status = action.payload.status;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    resetProjectsState: () => ({
      projects: [],
      currentProjectId: null,
      loading: false,
      error: null,
    }),
  },
  extraReducers: (builder) => {
    // Fetch Projects
    builder.addCase(fetchProjects.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchProjects.fulfilled, (state, action) => {
      state.loading = false;
      state.projects = action.payload;
      state.error = null;
    });
    builder.addCase(fetchProjects.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to load projects';
    });

    // Create Project
    builder.addCase(createProject.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createProject.fulfilled, (state, action) => {
      state.loading = false;
      state.projects.unshift(action.payload);
      state.error = null;
    });
    builder.addCase(createProject.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to create project';
    });

    // Update Project
    builder.addCase(updateProjectThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateProjectThunk.fulfilled, (state, action) => {
      state.loading = false;
      const index = state.projects.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.projects[index] = action.payload;
      }
      state.error = null;
    });
    builder.addCase(updateProjectThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to update project';
    });

    // Delete Project
    builder.addCase(deleteProjectThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteProjectThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.projects = state.projects.filter(p => p.id !== action.payload);
      if (state.currentProjectId === action.payload) {
        state.currentProjectId = null;
      }
      state.error = null;
    });
    builder.addCase(deleteProjectThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to delete project';
    });

    // Clone Project
    builder.addCase(cloneProjectThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(cloneProjectThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.projects.unshift(action.payload);
      state.error = null;
    });
    builder.addCase(cloneProjectThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to clone project';
    });

    // Toggle Pin
    builder.addCase(toggleProjectPinThunk.pending, (state) => {
      state.error = null;
    });
    builder.addCase(toggleProjectPinThunk.fulfilled, (state, action) => {
      const index = state.projects.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.projects[index] = action.payload;
      }
      state.error = null;
    });
    builder.addCase(toggleProjectPinThunk.rejected, (state, action) => {
      state.error = action.payload || 'Failed to toggle pin';
    });
  },
});

export const {
  setProjects,
  setCurrentProject,
  updateProjectTags,
  updateProjectStatus,
  clearError,
  resetProjectsState,
} = projectsSlice.actions;

// Экспортируем thunks для использования в компонентах
export {
  fetchProjects,
  createProject,
  updateProjectThunk as updateProject,
  deleteProjectThunk as deleteProject,
  cloneProjectThunk as cloneProject,
  toggleProjectPinThunk as toggleProjectPin,
};

export default projectsSlice.reducer;
