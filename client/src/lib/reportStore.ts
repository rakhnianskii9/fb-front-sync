/**
 * Centralized storage for all project and report data
 * Replaces scattered localStorage keys with a single source of truth
 */

export type TabType = 'campaigns' | 'adsets' | 'ads' | 'creatives';

export interface Report {
  id: string;
  code?: number;
  name: string;
  projectId: string;
  selections: {
    accounts: string[];
    campaigns: string[];
    adsets: string[];
    ads: string[];
    creatives: string[];
  };
  activeTab: TabType;
  selectedMetrics: string[];
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  tags: string[];
}

export interface ProjectState {
  reports: Report[];
  currentReportId: string | null;
}

// Key for storing project state
function getProjectKey(projectId: string): string {
  return `projectState-${projectId}`;
}

// Get project state
export function getProjectState(projectId: string): ProjectState {
  try {
    const data = localStorage.getItem(getProjectKey(projectId));
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading project state:', error);
  }
  
  return {
    reports: [],
    currentReportId: null,
  };
}

// Save project state
export function saveProjectState(projectId: string, state: ProjectState): void {
  try {
    localStorage.setItem(getProjectKey(projectId), JSON.stringify(state));
  } catch (error) {
    console.error('Error saving project state:', error);
  }
}

// Get all reports for a project
export function getReports(projectId: string): Report[] {
  const state = getProjectState(projectId);
  return state.reports;
}

// Get report by ID
export function getReport(projectId: string, reportId: string): Report | null {
  const state = getProjectState(projectId);
  return state.reports.find(r => r.id === reportId) || null;
}

// Get current report
export function getCurrentReport(projectId: string): Report | null {
  const state = getProjectState(projectId);
  if (!state.currentReportId) return null;
  return getReport(projectId, state.currentReportId);
}

// Create new report
export function createReport(projectId: string, name?: string): Report {
  const state = getProjectState(projectId);
  
  // Generate unique name if not provided
  const baseName = name || 'New Report';
  let reportName = baseName;
  let counter = 1;
  
  while (state.reports.some(r => r.name === reportName)) {
    reportName = `${baseName} ${counter}`;
    counter++;
  }
  
  const newReport: Report = {
    id: `report-${Date.now()}`,
    name: reportName,
    projectId,
    selections: {
      accounts: [],
      campaigns: [],
      adsets: [],
      ads: [],
      creatives: [],
    },
    activeTab: 'campaigns',
    selectedMetrics: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pinned: false,
    tags: [],
  };
  
  state.reports.unshift(newReport);
  state.currentReportId = newReport.id;
  saveProjectState(projectId, state);
  
  return newReport;
}

// Update report
export function updateReport(projectId: string, reportId: string, updates: Partial<Report>): Report | null {
  const state = getProjectState(projectId);
  const index = state.reports.findIndex(r => r.id === reportId);
  
  if (index === -1) return null;
  
  state.reports[index] = {
    ...state.reports[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  saveProjectState(projectId, state);
  return state.reports[index];
}

// Delete report
export function deleteReport(projectId: string, reportId: string): boolean {
  const state = getProjectState(projectId);
  const index = state.reports.findIndex(r => r.id === reportId);
  
  if (index === -1) return false;
  
  state.reports.splice(index, 1);
  
  // If deleting current report, reset currentReportId
  if (state.currentReportId === reportId) {
    state.currentReportId = state.reports.length > 0 ? state.reports[0].id : null;
  }
  
  saveProjectState(projectId, state);
  return true;
}

// Set current report
export function setCurrentReport(projectId: string, reportId: string | null): void {
  const state = getProjectState(projectId);
  state.currentReportId = reportId;
  saveProjectState(projectId, state);
}

// Update report selections
export function updateSelections(
  projectId: string, 
  reportId: string, 
  selections: Report['selections']
): Report | null {
  return updateReport(projectId, reportId, { selections });
}

// Update report metrics
export function updateMetrics(
  projectId: string,
  reportId: string,
  metrics: string[]
): Report | null {
  return updateReport(projectId, reportId, { selectedMetrics: metrics });
}

// Update active tab
export function updateActiveTab(
  projectId: string,
  reportId: string,
  tab: TabType
): Report | null {
  return updateReport(projectId, reportId, { activeTab: tab });
}

// Toggle report pin
export function toggleReportPin(projectId: string, reportId: string): Report | null {
  const report = getReport(projectId, reportId);
  if (!report) return null;
  
  return updateReport(projectId, reportId, { pinned: !report.pinned });
}

// Update report tags
export function updateReportTags(projectId: string, reportId: string, tags: string[]): Report | null {
  return updateReport(projectId, reportId, { tags });
}

// Clear all project data
export function clearProjectData(projectId: string): void {
  localStorage.removeItem(getProjectKey(projectId));
  
  // Clear old keys for migration
  const oldKeys = [
    `selections-${projectId}`,
    `currentReport-${projectId}`,
    `reports-${projectId}`,
    `fullReports-${projectId}`,
    `activeColumn-${projectId}`,
  ];
  
  oldKeys.forEach(key => localStorage.removeItem(key));
}

// Migrate old data to new structure
export function migrateOldData(projectId: string): void {
  // Check if new data already exists
  const existing = getProjectState(projectId);
  if (existing.reports.length > 0) {
    return; // Already migrated
  }
  
  // Try to load old data
  try {
    const oldReportsData = localStorage.getItem(`reports-${projectId}`);
    const oldFullReportsData = localStorage.getItem(`fullReports-${projectId}`);
    const oldCurrentReportData = localStorage.getItem(`currentReport-${projectId}`);
    
    const newState: ProjectState = {
      reports: [],
      currentReportId: null,
    };
    
    // Load full reports
    if (oldFullReportsData) {
      const fullReports = JSON.parse(oldFullReportsData);
      Object.values(fullReports).forEach((oldReport: any) => {
        const report: Report = {
          id: oldReport.id || `report-${Date.now()}-${Math.random()}`,
          name: oldReport.name || 'Unnamed Report',
          projectId,
          selections: oldReport.selections || {
            accounts: [],
            campaigns: [],
            adsets: [],
            ads: [],
            creatives: [],
          },
          activeTab: 'campaigns',
          selectedMetrics: [],
          createdAt: oldReport.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pinned: false,
          tags: [],
        };
        newState.reports.push(report);
      });
    }
    
    // Load metadata from old reports list
    if (oldReportsData) {
      const oldReports = JSON.parse(oldReportsData);
      oldReports.forEach((meta: any) => {
        const existing = newState.reports.find(r => r.id === meta.id);
        if (existing) {
          existing.pinned = meta.pinned || false;
          existing.tags = meta.tags || [];
        }
      });
    }
    
    // Set current report
    if (oldCurrentReportData) {
      const currentReport = JSON.parse(oldCurrentReportData);
      newState.currentReportId = currentReport.id;
      
      // If current report not in list, add it
      if (!newState.reports.find(r => r.id === currentReport.id)) {
        const report: Report = {
          id: currentReport.id,
          name: currentReport.name || 'Current Report',
          projectId,
          selections: currentReport.selections || {
            accounts: [],
            campaigns: [],
            adsets: [],
            ads: [],
            creatives: [],
          },
          activeTab: 'campaigns',
          selectedMetrics: [],
          createdAt: currentReport.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pinned: false,
          tags: [],
        };
        newState.reports.unshift(report);
      }
    }
    
    // Save migrated data
    if (newState.reports.length > 0) {
      saveProjectState(projectId, newState);
    }
  } catch (error) {
    console.error('Error migrating old data:', error);
  }
}
