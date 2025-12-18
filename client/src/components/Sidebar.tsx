import { useState, useEffect, useRef, useMemo, useCallback, startTransition, memo } from "react";
import logger from "@/lib/logger";
import { LayoutDashboard, Users, Megaphone, Layers, Image, FileText, Pin, ChevronRight, ChevronDown, MoreVertical, FilePlus, X, BarChart3, DollarSign, Video, Target, Heart, Link, MousePointerClick, ShoppingCart, UserPlus, Sparkles, Gauge, ChevronLeft, MessageSquare, Share2, SquareFunction, Plus, MoreHorizontal, Trash2, RotateCcw, Contact } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import ReportSelector from "./ReportSelector";
import MetricPresetToolbar from "./MetricPresetToolbar";
import CalculatedMetricDialog from "./CalculatedMetricDialog";
import { SyncStatusBadge } from "./ReportSyncStatus";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  setCurrentProject,
  toggleProjectPin as toggleProjectPinAction,
  deleteProject as deleteProjectAction,
  cloneProject as cloneProjectAction,
  updateProject,
  updateProjectTags as updateProjectTagsAction,
} from "@/store/slices/projectsSlice";
import { updateReport, deleteReport } from "@/store/slices/reportsSlice";
import { updateReportThunk, deleteReportThunk, createReportThunk, touchReportThunk } from "@/store/slices/reportsThunks";
import {
  selectCurrentProjectId,
  selectProjects,
  selectCurrentProject,
  selectCurrentProjectReports,
  selectCurrentReportId,
  selectCurrentReport,
  selectAccounts,
  selectAvailableMetricIds,
} from "@/store/selectors";
import { selectActiveWorkspace } from "@/store/slices/userSlice";
import { metricCategories, MetricCategory, formatMetricName, findMetricCategory } from "@/data/metrics";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Форматирование относительного времени
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

import type { ReportStatus } from "@/store/slices/reportsSlice";

interface Report {
  id: string;
  code?: number;
  name: string;
  updated: string;
  pinned: boolean;
  tags?: string[];
  status?: ReportStatus;
  syncProgress?: number;
  deletedAt?: string;
  daysUntilHardDelete?: number;
  canRestore?: boolean;
}

interface SidebarProps {
  selectedProject?: string;
  onNavItemClick?: (itemId: string) => void;
  hideProjects?: boolean;
  showMetricCategories?: boolean;
  selectedMetricCategory?: string;
  onMetricCategorySelect?: (categoryId: string) => void;
  selectedMetrics?: string[];
  onToggleMetric?: (metricId: string) => void;
  isHidden?: boolean;
}

function SidebarInner({ 
  selectedProject, 
  onNavItemClick,
  hideProjects = false,
  showMetricCategories = false,
  selectedMetricCategory,
  onMetricCategorySelect,
  selectedMetrics = [],
  onToggleMetric,
  isHidden = false
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentProjectId = useAppSelector(selectCurrentProjectId);
  const projects = useAppSelector(selectProjects);
  const currentProject = useAppSelector(selectCurrentProject);
  const activeWorkspace = useAppSelector(selectActiveWorkspace);
  const reportsFromRedux = useAppSelector(selectCurrentProjectReports);
  const currentReportId = useAppSelector(selectCurrentReportId);
  const currentReport = useAppSelector(selectCurrentReport);
  const accounts = useAppSelector(selectAccounts);
  const availableMetricIds = useAppSelector(selectAvailableMetricIds);
  const currentSelections = currentReport?.selections;
  const accountsCount = accounts.length;
  const campaignsCount = currentSelections?.campaigns.length ?? 0;
  const adsetsCount = currentSelections?.adsets.length ?? 0;
  const adsCount = currentSelections?.ads.length ?? 0;
  const creativesCount = currentSelections?.creatives.length ?? 0;
  const calculatedMetrics = useAppSelector((state) => 
    currentProjectId ? state.calculatedMetrics.metrics[currentProjectId] || [] : []
  );
  const displayProjectName = selectedProject || currentProject?.name || "Assets";
  
  const handleToggleMetric = (metricId: string) => {
    if (!currentProjectId || !currentReport) return;

    const newMetrics = currentReport.selectedMetrics.includes(metricId)
      ? currentReport.selectedMetrics.filter(id => id !== metricId)
      : [...currentReport.selectedMetrics, metricId];

    // Сначала обновляем локально для мгновенного UI-отклика
    dispatch(updateReport({
      projectId: currentProjectId,
      reportId: currentReport.id,
      updates: { selectedMetrics: newMetrics },
    }));
    
    // Затем сохраняем на бэкенд
    dispatch(updateReportThunk({
      projectId: currentProjectId,
      reportId: currentReport.id,
      updates: { selectedMetrics: newMetrics },
    }));
  };
  
  const getActiveSection = () => {
    if (location.pathname === '/' || location.pathname === '/projects') return 'projects';
    if (location.pathname === '/selection') return 'selection';
    if (location.pathname === '/analytics') return 'analytics';
    if (location.pathname === '/settings') return 'settings';
    return 'projects';
  };
  
  const [activeSection, setActiveSection] = useState(getActiveSection());
  
  useEffect(() => {
    setActiveSection(getActiveSection());
  }, [location.pathname]);
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    accounts: false,
    campaigns: false,
    adsets: false,
    ads: false,
    creatives: false,
    reports: true,
  });

  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const isCancelledRef = useRef(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [selectedReportForTags, setSelectedReportForTags] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const { toast } = useToast();
  const [editingReportId, setEditingReportId] = useState<string>("");
  const [editedReportName, setEditedReportName] = useState("");
  
  // Report-First Architecture: табы Active/Deleted
  const [reportsTab, setReportsTab] = useState<'active' | 'deleted'>('active');
  const [deletedReports, setDeletedReports] = useState<Report[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string>("");
  const [editedProjectName, setEditedProjectName] = useState("");
  const [isProjectTagDialogOpen, setIsProjectTagDialogOpen] = useState(false);
  const [selectedProjectForTags, setSelectedProjectForTags] = useState<string | null>(null);
  const [editingProjectTags, setEditingProjectTags] = useState<string[]>([]);
  const [projectTagInput, setProjectTagInput] = useState("");
  
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    setTimeout(() => localStorage.setItem('sidebar-collapsed', String(isCollapsed)), 0);
  }, [isCollapsed]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const shouldBeCollapsed = isHidden || isCollapsed;

  // Преобразуем отчёты из Redux в формат для отображения
  const reportsForDisplay = useMemo(() => {
    if (!reportsFromRedux || reportsFromRedux.length === 0) return [];
    return reportsFromRedux.map(report => ({
      id: report.id,
      name: report.name,
      updated: report.updatedAt ? formatRelativeTime(new Date(report.updatedAt)) : 'Recently',
      pinned: report.pinned ?? false,
      tags: report.tags ?? [],
      status: report.status,
      syncProgress: report.syncProgress,
    }));
  }, [reportsFromRedux]);

  // Фильтруем категории метрик по доступным в загруженных данных
  // Если данные не загружены (availableMetricIds пуст), показываем все метрики
  const availableMetricIdsSet = useMemo(
    () => new Set(availableMetricIds),
    [availableMetricIds]
  );

  /**
   * Проверяет, доступна ли метрика — только прямое совпадение с данными из БД.
   * Бэкенд уже делает flatten, поэтому actions_link_click приходит как отдельная метрика.
   */
  const isMetricAvailable = useCallback((metricId: string): boolean => {
    return availableMetricIdsSet.has(metricId);
  }, [availableMetricIdsSet]);

  // Собираем ID всех базовых метрик из категорий (для справки)
  const predefinedMetricIds = useMemo(() => {
    const ids = new Set<string>();
    metricCategories.forEach(category => {
      if (category.subcategories) {
        category.subcategories.forEach(sub => {
          sub.metrics.forEach(m => ids.add(m.id));
        });
      }
      if (category.metrics) {
        category.metrics.forEach(m => ids.add(m.id));
      }
    });
    return ids;
  }, []);

  // Фильтруем категории — показываем только те метрики, которые реально есть в данных
  // Бэкенд делает flatten, поэтому динамические метрики (actions_link_click и т.д.) 
  // добавляются в соответствующие категории по patterns
  const filteredMetricCategories = useMemo(() => {
    // Если данные не загружены — показываем все базовые метрики
    if (availableMetricIds.length === 0) return metricCategories;
    
    // Группируем динамические метрики по категориям через patterns
    const dynamicByCategory: Record<string, Record<string, Array<{ id: string; name: string }>>> = {};
    
    availableMetricIds.forEach(metricId => {
      // Пропускаем базовые метрики — они уже есть в категориях
      if (predefinedMetricIds.has(metricId)) return;
      
      // Ищем подходящую категорию по паттернам
      const match = findMetricCategory(metricId);
      if (match) {
        if (!dynamicByCategory[match.categoryId]) {
          dynamicByCategory[match.categoryId] = {};
        }
        if (!dynamicByCategory[match.categoryId][match.subcategoryName]) {
          dynamicByCategory[match.categoryId][match.subcategoryName] = [];
        }
        dynamicByCategory[match.categoryId][match.subcategoryName].push({
          id: metricId,
          name: formatMetricName(metricId),
        });
      }
    });

    return metricCategories.map(category => {
      if (category.id === 'calculated') return category;
      
      if (category.subcategories) {
        const filteredSubcategories = category.subcategories
          .map(subcategory => {
            // Базовые метрики — фильтруем по availableMetricIds
            const baseMetrics = subcategory.metrics.filter(m => isMetricAvailable(m.id));
            // Динамические метрики из БД для этой субкатегории
            const dynamicMetrics = dynamicByCategory[category.id]?.[subcategory.name] || [];
            
            return {
              ...subcategory,
              metrics: [...baseMetrics, ...dynamicMetrics],
            };
          })
          .filter(subcategory => subcategory.metrics.length > 0);
        
        return {
          ...category,
          subcategories: filteredSubcategories,
        };
      } else if (category.metrics) {
        return {
          ...category,
          metrics: category.metrics.filter(m => isMetricAvailable(m.id)),
        };
      }
      return category;
    }).filter(category => {
      if (category.id === 'calculated') return true;
      if (category.subcategories) return category.subcategories.length > 0;
      if (category.metrics) return category.metrics.length > 0;
      return false;
    });
  }, [availableMetricIds, predefinedMetricIds, isMetricAvailable]);

  // allMetricCategories теперь просто filteredMetricCategories
  const allMetricCategories = filteredMetricCategories;

  // Получить все ID метрик в категории (для определения активности)
  const getCategoryMetricIds = useCallback((category: MetricCategory): string[] => {
    const ids: string[] = [];
    if (category.subcategories) {
      category.subcategories.forEach(subcat => {
        subcat.metrics.forEach(m => ids.push(m.id));
      });
    }
    if (category.metrics) {
      category.metrics.forEach(m => ids.push(m.id));
    }
    return ids;
  }, []);

  // Проверить, содержит ли категория хотя бы одну выбранную метрику
  const isCategoryActive = useCallback((category: MetricCategory): boolean => {
    const selectedMetrics = currentReport?.selectedMetrics || [];
    if (selectedMetrics.length === 0) return false;
    const categoryMetricIds = getCategoryMetricIds(category);
    return categoryMetricIds.some(id => selectedMetrics.includes(id));
  }, [currentReport?.selectedMetrics, getCategoryMetricIds]);

  // Используем реальные отчёты из Redux
  const reports = reportsForDisplay;

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  const handleTogglePin = useCallback((reportId: string) => {
    if (!currentProjectId) return;
    const report = reportsFromRedux?.find(r => r.id === reportId);
    if (!report) return;
    
    // Обновляем локально
    dispatch(updateReport({
      projectId: currentProjectId,
      reportId,
      updates: { pinned: !report.pinned },
    }));
    
    // Сохраняем на бэкенд
    dispatch(updateReportThunk({
      projectId: currentProjectId,
      reportId,
      updates: { pinned: !report.pinned },
    }));
  }, [currentProjectId, reportsFromRedux, dispatch]);

  const handleCloneReport = useCallback((reportId: string) => {
    if (!currentProjectId) return;
    const reportToClone = reportsFromRedux?.find(r => r.id === reportId);
    if (!reportToClone) return;
    
    dispatch(createReportThunk({
      projectId: currentProjectId,
      name: `${reportToClone.name} (Clone)`,
      selectedMetrics: reportToClone.selectedMetrics,
      selections: reportToClone.selections,
      // tags пока не поддерживаются при создании — добавятся через update
    }));
    
    toast({
      title: "Report cloned",
      description: `Created copy of "${reportToClone.name}"`,
    });
  }, [currentProjectId, reportsFromRedux, dispatch, toast]);

  const handleDeleteReport = useCallback((reportId: string) => {
    if (!currentProjectId) return;
    
    // Удаляем локально
    dispatch(deleteReport({ projectId: currentProjectId, reportId }));
    
    // Удаляем на бэкенде
    dispatch(deleteReportThunk({ projectId: currentProjectId, reportId }));
    
    toast({
      title: "Report deleted",
      description: "Report has been removed",
    });
  }, [currentProjectId, dispatch, toast]);

  const handleRenameReport = useCallback((reportId: string, newName: string) => {
    if (!currentProjectId) return;
    
    // Обновляем локально
    dispatch(updateReport({
      projectId: currentProjectId,
      reportId,
      updates: { name: newName },
    }));
    
    // Сохраняем на бэкенд
    dispatch(updateReportThunk({
      projectId: currentProjectId,
      reportId,
      updates: { name: newName },
    }));
  }, [currentProjectId, dispatch]);

  const handleUpdateTags = useCallback((reportId: string, tags: string[]) => {
    if (!currentProjectId) return;
    
    // Обновляем локально
    dispatch(updateReport({
      projectId: currentProjectId,
      reportId,
      updates: { tags },
    }));
    
    // Сохраняем на бэкенд
    dispatch(updateReportThunk({
      projectId: currentProjectId,
      reportId,
      updates: { tags },
    }));
  }, [currentProjectId, dispatch]);

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !editingTags.includes(tag)) {
      setEditingTags([...editingTags, tag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditingTags(editingTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagsSubmit = () => {
    if (selectedReportForTags) {
      handleUpdateTags(selectedReportForTags, editingTags);
      setIsTagDialogOpen(false);
      setSelectedReportForTags(null);
      setEditingTags([]);
      setTagInput("");
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleOpenTagDialog = (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (report) {
      setSelectedReportForTags(reportId);
      setEditingTags(report.tags || []);
      setTagInput("");
      setIsTagDialogOpen(true);
    }
  };

  const handleAddProjectTag = () => {
    const tag = projectTagInput.trim();
    if (tag && !editingProjectTags.includes(tag)) {
      setEditingProjectTags([...editingProjectTags, tag]);
      setProjectTagInput("");
    }
  };

  const handleRemoveProjectTag = (tagToRemove: string) => {
    setEditingProjectTags(editingProjectTags.filter(tag => tag !== tagToRemove));
  };

  const handleProjectTagsSubmit = () => {
    if (selectedProjectForTags) {
      dispatch(updateProjectTagsAction({ id: selectedProjectForTags, tags: editingProjectTags }));
      setIsProjectTagDialogOpen(false);
      setSelectedProjectForTags(null);
      setEditingProjectTags([]);
      setProjectTagInput("");
      
      toast({
        title: "Success",
        description: "Project tags updated",
      });
    }
  };

  const handleProjectTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddProjectTag();
    }
  };


  const handleOpenProjectTagDialog = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setSelectedProjectForTags(projectId);
      setEditingProjectTags(project.tags || []);
      setProjectTagInput("");
      setIsProjectTagDialogOpen(true);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Assets', badge: null, subLabel: '' },
    { id: 'accounts', icon: Users, label: 'Ad Accounts', badge: accountsCount, subLabel: 'Advertising account' },
    { id: 'campaigns', icon: Megaphone, label: 'Campaigns', badge: campaignsCount, subLabel: 'Campaigns' },
    { id: 'adsets', icon: Layers, label: 'Ad Sets', badge: adsetsCount, subLabel: 'Ad groups' },
    { id: 'ads', icon: FileText, label: 'Ads', badge: adsCount, subLabel: 'Advertisements' },
    { id: 'creatives', icon: Image, label: 'Ad Creatives', badge: creativesCount, subLabel: 'Creatives' },
  ];

  // Show up to 3 reports: pinned first, then most recent
  // Фильтруем только активные отчёты (без deletedAt)
  const activeReports = reports.filter((r: Report) => !r.deletedAt);
  const pinnedReports = activeReports.filter((r: Report) => r.pinned);
  const unpinnedReports = activeReports.filter((r: Report) => !r.pinned);
  const recentReports = [...pinnedReports, ...unpinnedReports].slice(0, 3);

  // Report-First Architecture: загрузка удалённых отчётов
  const loadDeletedReports = useCallback(async () => {
    if (!activeWorkspace?.id || !currentProjectId) return;
    
    setLoadingDeleted(true);
    try {
      const response = await fetch(
        `/api/v1/facebook/ads/reports/deleted?workspaceId=${activeWorkspace.id}&projectId=${currentProjectId}`
      );
      if (response.ok) {
        const data = await response.json();
        setDeletedReports(data.reports.map((r: any) => ({
          id: r.id,
          name: r.name,
          updated: r.deletedAt ? formatRelativeTime(new Date(r.deletedAt)) : 'Recently',
          pinned: false,
          tags: [],
          status: 'deleted' as ReportStatus,
          daysUntilHardDelete: r.daysUntilHardDelete,
          canRestore: r.canRestore,
        })));
      }
    } catch (error) {
      logger.error('Failed to load deleted reports:', error);
    } finally {
      setLoadingDeleted(false);
    }
  }, [activeWorkspace?.id, currentProjectId]);

  // Загружаем deleted reports при переключении на таб
  useEffect(() => {
    if (reportsTab === 'deleted') {
      loadDeletedReports();
    }
  }, [reportsTab, loadDeletedReports]);

  // Восстановление отчёта
  const handleRestoreReport = async (reportId: string) => {
    if (!activeWorkspace?.id) return;
    
    try {
      const response = await fetch(`/api/v1/facebook/ads/reports/${reportId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: activeWorkspace.id }),
      });
      
      if (response.ok) {
        toast({
          title: "Report restored",
          description: "Report successfully restored",
        });
        setDeletedReports(prev => prev.filter(r => r.id !== reportId));
        // Reload active reports
        loadDeletedReports();
      } else {
        throw new Error('Failed to restore');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore report",
        variant: "destructive",
      });
    }
  };

  const handleStartEditing = () => {
    if (currentProject && !selectedProject) {
      setEditedName(currentProject.name);
      setIsEditingName(true);
      isCancelledRef.current = false;
    }
  };

  const handleSaveName = () => {
    if (isCancelledRef.current) {
      isCancelledRef.current = false;
      return;
    }
    
    if (currentProjectId && editedName.trim() && editedName.trim() !== currentProject?.name) {
      dispatch(updateProject({ id: currentProjectId, updates: { name: editedName.trim() } }));
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      isCancelledRef.current = true;
      setIsEditingName(false);
    }
  };

  const handleStartEditingReportName = (reportId: string, reportName: string) => {
    setEditingReportId(reportId);
    setEditedReportName(reportName);
  };

  const handleSaveReportName = () => {
    if (!editingReportId || !editedReportName.trim() || !currentProjectId) {
      setEditingReportId("");
      return;
    }

    const trimmedName = editedReportName.trim();
    
    // Обновляем через Redux
    dispatch(updateReport({
      projectId: currentProjectId,
      reportId: editingReportId,
      updates: { name: trimmedName },
    }));
    
    dispatch(updateReportThunk({
      projectId: currentProjectId,
      reportId: editingReportId,
      updates: { name: trimmedName },
    }));

    toast({
      title: "Success",
      description: "Report name updated",
    });

    setEditingReportId("");
  };

  const handleReportNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveReportName();
    } else if (e.key === 'Escape') {
      setEditingReportId("");
    }
  };

  const handleStartEditingProjectName = (projectId: string, projectName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(projectId);
    setEditedProjectName(projectName);
  };

  const handleSaveProjectName = () => {
    if (!editingProjectId || !editedProjectName.trim()) {
      setEditingProjectId("");
      return;
    }

    const trimmedName = editedProjectName.trim();
    dispatch(updateProject({ id: editingProjectId, updates: { name: trimmedName } }));
    
    toast({
      title: "Success",
      description: "Project name updated",
    });
    
    setEditingProjectId("");
  };

  const handleProjectNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveProjectName();
    } else if (e.key === 'Escape') {
      setEditingProjectId("");
    }
  };

  const recentProjects = projects.slice(0, 3);
  
  const handleSectionClick = useCallback((section: string) => {
    startTransition(() => {
      if (section === 'projects') {
        navigate('/projects');
      } else if (section === 'selection') {
        navigate('/selection');
      } else if (section === 'settings') {
        navigate('/settings');
      }
    });
  }, [navigate]);
  
  const pinnedProjects = projects.filter(p => p.pinned).slice(0, 3);
  const recentProjectsFiltered = pinnedProjects.length > 0 
    ? pinnedProjects 
    : projects.slice(0, 3);

  const generateUniqueReportName = () => {
    const baseName = "New Report";
    const existingNames = reports.map(r => r.name);
    
    if (!existingNames.includes(baseName)) {
      return baseName;
    }
    
    let counter = 1;
    while (existingNames.includes(`${baseName} ${counter}`)) {
      counter++;
    }
    
    return `${baseName} ${counter}`;
  };

  const handleCreateReport = () => {
    if (!currentProjectId) {
      toast({
        title: "Error",
        description: "Please select a project first.",
        variant: "destructive",
      });
      return;
    }

    // Check current report from Redux
    if (!currentReport || !currentReport.selections) {
      toast({
        title: "Error",
        description: "No selections found. Please go to Selection page first.",
        variant: "destructive",
      });
      return;
    }

    // Check that there is at least accounts
    const { selections } = currentReport;
    if (selections.accounts.length === 0) {
      toast({
        title: "Error",
        description: "No selections found. Please select at least one account.",
        variant: "destructive",
      });
      return;
    }

    // Report already created and stored in Redux, just navigate to analytics
    toast({
      title: "Success",
      description: "Report ready for analytics",
    });

    startTransition(() => {
      navigate('/analytics');
    });
  };

  const handleOpenReport = useCallback((reportId: string) => {
    if (!currentProjectId) {
      toast({
        title: "Error",
        description: "No project selected.",
        variant: "destructive",
      });
      return;
    }

    // Get report metadata
    const reportMeta = reports.find(r => r.id === reportId);
    if (!reportMeta) {
      toast({
        title: "Error",
        description: "Report not found.",
        variant: "destructive",
      });
      return;
    }

    // Get full report data
    const fullReportsKey = `fullReports-${currentProjectId}`;
    const fullReportsData = localStorage.getItem(fullReportsKey);
    
    let fullReports: Record<string, any> = {};
    if (fullReportsData) {
      try {
        fullReports = JSON.parse(fullReportsData);
      } catch {}
    }

    // Get or create report with empty selections for old reports
    let report = fullReports[reportId];
    if (!report) {
      // Create report structure for old reports without full data
      report = {
        id: reportId,
        name: reportMeta.name,
        projectId: currentProjectId,
        selections: {
          accounts: [],
          campaigns: [],
          adsets: [],
          ads: [],
          creatives: [],
        },
        createdAt: new Date().toISOString(),
      };
      // Save it for future use
      fullReports[reportId] = report;
      localStorage.setItem(fullReportsKey, JSON.stringify(fullReports));
    }

    // Set as current report
    localStorage.setItem(`currentReport-${currentProjectId}`, JSON.stringify(report));
    
    // Обновляем lastOpenedAt на сервере (fire-and-forget)
    dispatch(touchReportThunk({ reportId }));
    
    // Navigate to analytics
    startTransition(() => {
      navigate('/analytics');
    });
    
    toast({
      title: "Success",
      description: "Report opened successfully",
    });
  }, [currentProjectId, reports, navigate, toast]);


  const renderProjectsSection = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {recentProjectsFiltered.map((project) => (
          <div
            key={project.id}
            className="w-full flex items-start justify-between gap-2 px-3 py-2 rounded-md hover-elevate active-elevate-2 cursor-pointer"
            onClick={() => {
              dispatch(setCurrentProject(project.id));
              navigate('/selection');
            }}
            data-testid={`project-item-${project.id}`}
          >
            <div className="flex-1 min-w-0">
              {editingProjectId === project.id ? (
                <Input
                  type="text"
                  value={editedProjectName}
                  onChange={(e) => setEditedProjectName(e.target.value)}
                  onBlur={handleSaveProjectName}
                  onKeyDown={handleProjectNameKeyDown}
                  autoFocus
                  className="text-body font-medium border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
                  data-testid={`input-project-name-sidebar-${project.id}`}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <p 
                  className="text-body text-sidebar-foreground truncate cursor-pointer hover:text-sidebar-foreground/80"
                  onClick={(e) => handleStartEditingProjectName(project.id, project.name, e)}
                  data-testid={`text-project-name-sidebar-${project.id}`}
                >
                  {project.name}
                </p>
              )}
              {project.description && (
                <p className="text-body-sm text-muted-foreground truncate mt-1">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch(toggleProjectPinAction(project.id));
                }}
                className="p-1 rounded hover-elevate active-elevate-2"
                data-testid={`button-pin-project-${project.id}`}
              >
                <Pin className={`w-4 h-4 flex-shrink-0 ${project.pinned ? 'text-primary' : 'text-muted-foreground'}`} />
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded hover-elevate active-elevate-2"
                    data-testid={`button-more-project-${project.id}`}
                  >
                    <MoreVertical className="w-4 h-4 text-sidebar-foreground flex-shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  <div className="space-y-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(setCurrentProject(project.id));
                        navigate('/selection');
                      }}
                      className="w-full flex items-center px-3 py-2 text-body rounded-md hover-elevate active-elevate-2 text-left"
                      data-testid={`button-open-project-${project.id}`}
                    >
                      <span className="text-foreground">Open</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(cloneProjectAction(project.id));
                      }}
                      className="w-full flex items-center px-3 py-2 text-body rounded-md hover-elevate active-elevate-2 text-left"
                      data-testid={`button-clone-project-${project.id}`}
                    >
                      <span className="text-foreground">Clone</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newName = prompt('Enter new name:', project.name);
                        if (newName && newName.trim()) {
                          dispatch(updateProject({ id: project.id, updates: { name: newName.trim() } }));
                        }
                      }}
                      className="w-full flex items-center px-3 py-2 text-body rounded-md hover-elevate active-elevate-2 text-left"
                      data-testid={`button-rename-project-${project.id}`}
                    >
                      <span className="text-foreground">Rename</span>
                    </button>
                    <button
                      onClick={(e) => handleOpenProjectTagDialog(project.id, e)}
                      className="w-full flex items-center px-3 py-2 text-body rounded-md hover-elevate active-elevate-2 text-left"
                      data-testid={`button-assign-tags-project-${project.id}`}
                    >
                      <span className="text-foreground">Assign tags</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
                          dispatch(deleteProjectAction(project.id));
                        }
                      }}
                      className="w-full flex items-center px-3 py-2 text-body rounded-md hover-elevate active-elevate-2 text-left"
                      data-testid={`button-delete-project-${project.id}`}
                    >
                      <span className="text-destructive">Delete</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          ))}
        </div>
      </div>
    </div>
  );

  const getMetricIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      BarChart3,
      DollarSign,
      Video,
      Target,
      Heart,
      Link,
      MousePointerClick,
      ShoppingCart,
      UserPlus,
      Sparkles,
      Gauge,
      MessageSquare,
      Share2,
      SquareFunction,
      MoreHorizontal
    };
    return icons[iconName] || BarChart3;
  };

  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [isMenuHovered, setIsMenuHovered] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isCalculatedMetricDialogOpen, setIsCalculatedMetricDialogOpen] = useState(false);
  const [showSelectAllConfirm, setShowSelectAllConfirm] = useState(false);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  // Get all metric IDs from filtered categories (only available metrics)
  const getAllMetricIds = () => {
    const allMetrics: string[] = [];
    allMetricCategories.forEach((category) => {
      if (category.id === 'calculated') return; // Skip calculated metrics category
      
      if (category.subcategories) {
        category.subcategories.forEach((subcategory) => {
          subcategory.metrics.forEach((metric) => {
            allMetrics.push(metric.id);
          });
        });
      } else if (category.metrics) {
        category.metrics.forEach((metric) => {
          allMetrics.push(metric.id);
        });
      }
    });
    return allMetrics;
  };

  const handleSelectAllMetrics = () => {
    logger.log('[Sidebar] handleSelectAllMetrics called', { currentProjectId, currentReport: currentReport?.id });
    if (!currentProjectId || !currentReport) {
      console.warn('[Sidebar] handleSelectAllMetrics: missing projectId or report', { currentProjectId, currentReport });
      return;
    }

    const allMetrics = getAllMetricIds();
    logger.log('[Sidebar] getAllMetricIds returned', allMetrics.length, 'metrics');
    
    // Merge with existing selections to preserve calculated metrics
    const currentSelections = currentReport.selectedMetrics || [];
    const newSelections = Array.from(new Set([...currentSelections, ...allMetrics]));
    
    logger.log('[Sidebar] Dispatching updateReport with', newSelections.length, 'metrics');
    
    // Сначала обновляем локально для мгновенного UI-отклика
    dispatch(updateReport({
      projectId: currentProjectId,
      reportId: currentReport.id,
      updates: { selectedMetrics: newSelections },
    }));
    
    // Затем сохраняем на бэкенд
    dispatch(updateReportThunk({
      projectId: currentProjectId,
      reportId: currentReport.id,
      updates: { selectedMetrics: newSelections },
    }));

    toast({
      title: "All metrics selected",
      description: `${allMetrics.length} metrics have been added to your report`,
    });
    
    setShowSelectAllConfirm(false);
  };

  const handleClearAllMetrics = () => {
    if (!currentProjectId || !currentReport) return;

    // Сначала обновляем локально
    dispatch(updateReport({
      projectId: currentProjectId,
      reportId: currentReport.id,
      updates: { selectedMetrics: [] },
    }));
    
    // Затем сохраняем на бэкенд
    dispatch(updateReportThunk({
      projectId: currentProjectId,
      reportId: currentReport.id,
      updates: { selectedMetrics: [] },
    }));

    toast({
      title: "All metrics cleared",
      description: "All metrics have been removed from your report",
    });
  };

  const renderMetricCategoriesSection = () => {
    const allMetricIds = getAllMetricIds();
    const allMetricsCount = allMetricIds.length;
    const selectedMetrics = currentReport?.selectedMetrics || [];
    const allSelected = allMetricsCount > 0 && allMetricIds.every(id => selectedMetrics.includes(id));
    const selectedTotalCount = selectedMetrics.length;
    const selectedStandardCount = selectedMetrics.filter(id => allMetricIds.includes(id)).length;

    return (
      <div className="flex flex-col h-full relative">
        <div 
          className="flex-1 overflow-y-auto p-2"
        >
          <div className="px-3 py-2">
            <h3 className="text-h2 font-medium text-sidebar-foreground mb-2" data-testid="text-metrics-header">
              Metrics
            </h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (allMetricsCount > 50) {
                    setShowSelectAllConfirm(true);
                  } else {
                    handleSelectAllMetrics();
                  }
                }}
                className="flex-1 h-7 text-xs"
                disabled={allSelected}
                data-testid="button-select-all-metrics"
              >
                Select All ({allMetricsCount})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearAllMetrics}
                className="flex-1 h-7 text-xs"
                disabled={selectedTotalCount === 0}
                data-testid="button-clear-all-metrics"
              >
                Clear All
              </Button>
            </div>
            {selectedStandardCount > 0 && (
              <div className="mt-2 text-xs text-muted-foreground text-center">
                {selectedStandardCount} of {allMetricsCount} metrics selected
              </div>
            )}
          </div>
          <div className="space-y-1">
            {allMetricCategories.map((category) => {
              const IconComponent = getMetricIcon(category.icon);
              const isActive = isCategoryActive(category);
              const isHovered = hoveredCategory === category.id;
              
              return (
                <button
                  key={category.id}
                  onMouseEnter={() => {
                    if (hideTimerRef.current) {
                      clearTimeout(hideTimerRef.current);
                      hideTimerRef.current = null;
                    }
                    setHoveredCategory(category.id);
                    setIsMenuHovered(true);
                  }}
                  onMouseLeave={() => {
                    if (hideTimerRef.current) {
                      clearTimeout(hideTimerRef.current);
                    }
                    hideTimerRef.current = setTimeout(() => {
                      setIsMenuHovered(false);
                    }, 400);
                  }}
                  className="w-full flex items-start justify-between gap-2 px-3 py-2 rounded-md text-left cursor-pointer transition-colors hover-elevate active-elevate-2"
                  data-testid={`metric-category-${category.id}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <IconComponent className="w-5 h-5 flex-shrink-0 text-sidebar-foreground" />
                    <span 
                      className="text-body text-sidebar-foreground"
                      style={isHovered ? { color: 'rgb(31, 143, 255)', fontWeight: 600 } : undefined}
                    >
                      {category.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        
        {isMenuHovered && (
          <div
            className="fixed top-0 h-screen w-[600px] z-50 border-l flex flex-col"
            style={{ backgroundColor: '#eaecf0', left: '304px', borderLeftColor: '#d1d5db' }}
            onMouseEnter={() => {
              if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
                hideTimerRef.current = null;
              }
              setIsMenuHovered(true);
            }}
            onMouseLeave={() => {
              setIsMenuHovered(false);
            }}
            data-testid="metric-hover-panel"
          >
            <div 
              className="absolute top-[82px] left-0 right-0 h-px"
              style={{ backgroundColor: '#d1d5db' }}
            />
            <div className="px-4 pt-4 pb-2">
              <MetricPresetToolbar />
            </div>
            <div className="absolute top-[84px] left-0 right-0 bottom-0 px-4 pb-4 pt-0.5 overflow-y-auto">
              {hoveredCategory && (() => {
                const category = allMetricCategories.find((cat) => cat.id === hoveredCategory);
                if (!category) return null;

                // Special handling for calculated metrics category
                if (category.id === 'calculated') {
                  if (calculatedMetrics.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 px-6">
                        <SquareFunction className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-h3 font-medium text-sidebar-foreground mb-2">
                          Create Your Metric
                        </h3>
                        <p className="text-body-sm text-muted-foreground text-center mb-6">
                          Use standard metrics and mathematical operations to create your own calculated metrics
                        </p>
                        <Button
                          onClick={() => {
                            setIsCalculatedMetricDialogOpen(true);
                            setIsMenuHovered(false);
                            setHoveredCategory(null);
                          }}
                          data-testid="button-create-calculated-metric"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Metric
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div>
                      <div className="flex items-center justify-between mb-4 px-3">
                        <h3 className="text-h3 font-medium text-sidebar-foreground">
                          Calculated Metrics
                        </h3>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsCalculatedMetricDialogOpen(true);
                          }}
                          data-testid="button-add-calculated-metric"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {calculatedMetrics.map((metric) => (
                          <div key={metric.id} className="flex items-center space-x-2 px-3 py-2">
                            <Checkbox
                              id={`calc-metric-${metric.id}`}
                              checked={currentReport?.selectedMetrics?.includes(metric.id) || false}
                              onCheckedChange={() => handleToggleMetric(metric.id)}
                              data-testid={`checkbox-metric-${metric.id}`}
                            />
                            <label
                              htmlFor={`calc-metric-${metric.id}`}
                              className="text-body cursor-pointer select-none"
                              style={{ color: '#1c1b1f' }}
                              data-testid={`label-metric-${metric.id}`}
                            >
                              {metric.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                // Check if category has subcategories
                if (category.subcategories) {
                  return category.subcategories.map((subcategory, index) => (
                    <div key={`${hoveredCategory}-subcategory-${index}`} className={`mb-6 last:mb-0 ${index === 0 ? 'mt-4' : ''}`}>
                      <h3 className="text-h3 font-medium text-sidebar-foreground mb-3">
                        {subcategory.name}
                      </h3>
                      <div className="grid grid-cols-2 gap-1">
                        {subcategory.metrics.map((metric) => (
                          <div key={metric.id} className="flex items-center space-x-2 px-3 py-2">
                            <Checkbox
                              id={`${hoveredCategory}-${metric.id}`}
                              checked={currentReport?.selectedMetrics?.includes(metric.id) || false}
                              onCheckedChange={() => handleToggleMetric(metric.id)}
                              data-testid={`checkbox-metric-${metric.id}`}
                            />
                            <label
                              htmlFor={`${hoveredCategory}-${metric.id}`}
                              className="text-body cursor-pointer select-none"
                              style={{ color: '#1c1b1f' }}
                              data-testid={`label-metric-${metric.id}`}
                            >
                              {metric.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                } else if (category.metrics) {
                  // Render metrics directly if no subcategories
                  return (
                    <div className="grid grid-cols-2 gap-1">
                      {category.metrics.map((metric) => (
                        <div key={metric.id} className="flex items-center space-x-2 px-3 py-2">
                          <Checkbox
                            id={`${hoveredCategory}-${metric.id}`}
                            checked={currentReport?.selectedMetrics?.includes(metric.id) || false}
                            onCheckedChange={() => handleToggleMetric(metric.id)}
                            data-testid={`checkbox-metric-${metric.id}`}
                          />
                          <label
                            htmlFor={`${hoveredCategory}-${metric.id}`}
                            className="text-body cursor-pointer select-none"
                            style={{ color: '#1c1b1f' }}
                            data-testid={`label-metric-${metric.id}`}
                          >
                            {metric.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const renderSelectionSection = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <nav className="p-2">
          {navItems.map((item) => (
            <div key={item.id}>
              {'url' in item && typeof item.url === 'string' && item.url.length > 0 ? (
                <a
                  href={item.url}
                  className="w-full flex items-center px-3 py-2 rounded-md hover-elevate active-elevate-2 text-sidebar-foreground"
                  data-testid={`nav-${item.id}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {'icon' in item && item.icon && <item.icon className="w-5 h-5 flex-shrink-0" />}
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-body font-medium whitespace-nowrap">
                        {item.label}
                      </span>
                      {item.subLabel && <span className="text-body-sm text-muted-foreground whitespace-nowrap truncate">{item.subLabel}</span>}
                    </div>
                  </div>
                </a>
              ) : (
                <button
                  onClick={() => onNavItemClick?.(item.id)}
                  className="w-full flex items-center px-3 py-2 rounded-md hover-elevate active-elevate-2 text-sidebar-foreground"
                  data-testid={`nav-${item.id}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {'icon' in item && item.icon && <item.icon className="w-5 h-5 flex-shrink-0" />}
                    <div className="flex flex-col items-start min-w-0">
                      <span className={`${item.id === 'dashboard' ? 'text-h2' : 'text-body'} font-medium whitespace-nowrap`}>
                        {item.label}
                      </span>
                      {item.subLabel && <span className="text-body-sm text-muted-foreground whitespace-nowrap truncate">{item.subLabel}</span>}
                    </div>
                  </div>
                  {item.badge !== null && (
                    <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-body-sm font-medium min-w-[2.5rem] text-center ml-6 flex-shrink-0">
                      {item.badge}
                    </div>
                  )}
                </button>
              )}
            </div>
          ))}
        </nav>
      </div>
      
    </div>
  );
  
  const sections = [
    { id: 'projects', label: 'Projects' },
    { id: 'selection', label: 'New Report' },
    { id: 'settings', label: 'Settings' },
  ];
  
  const collapsedSections = sections.filter(s => s.id !== activeSection);

  return (
    <>
    {!isHidden && shouldBeCollapsed && (
      <button
        onClick={toggleCollapse}
        className="hidden md:flex absolute left-16 top-4 z-20 p-2 rounded-md bg-sidebar border border-sidebar-border hover:bg-sidebar-accent text-sidebar-foreground transition-all duration-200"
        data-testid="button-expand-sidebar"
        aria-label="Expand sidebar"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    )}
    <div className={`hidden md:flex bg-sidebar border-r border-sidebar-border h-screen flex-col flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${shouldBeCollapsed ? 'w-0' : 'w-60'}`}>
      <div className="px-6 py-4 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {isEditingName && currentProject ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={handleKeyDown}
              autoFocus
              className="text-display-lg text-sidebar-foreground font-medium bg-transparent border-b border-sidebar-foreground outline-none w-full"
              data-testid="input-project-name-edit"
            />
          ) : (
            <>
              <h1 
                onClick={handleStartEditing}
                className={`text-sidebar-foreground whitespace-nowrap overflow-hidden text-display-lg ${currentProject && !selectedProject ? 'cursor-pointer hover:opacity-80' : ''}`}
                data-testid="text-project-name"
              >
                {displayProjectName}
              </h1>
              <p className="text-body-sm text-muted-foreground" data-testid="text-your-project">{activeWorkspace?.name || 'Workspace'}</p>
            </>
          )}
        </div>
        {!isHidden && (
          <div className="flex items-center gap-1">
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground opacity-70 hover:opacity-100 transition-opacity"
              data-testid="button-toggle-sidebar"
              aria-label="Toggle sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto relative">
        <div className={`absolute inset-0 sidebar-content-transition ${activeSection === 'analytics' ? 'sidebar-content-visible' : 'sidebar-content-hidden'}`}>
          {renderMetricCategoriesSection()}
        </div>
        <div className={`absolute inset-0 sidebar-content-transition ${activeSection === 'projects' && !hideProjects ? 'sidebar-content-visible' : 'sidebar-content-hidden'}`}>
          {renderProjectsSection()}
        </div>
        <div className={`absolute inset-0 sidebar-content-transition ${activeSection === 'selection' ? 'sidebar-content-visible' : 'sidebar-content-hidden'}`}>
          {renderSelectionSection()}
        </div>
        <div className={`absolute inset-0 sidebar-content-transition ${activeSection === 'settings' ? 'sidebar-content-visible' : 'sidebar-content-hidden'}`}>
          <div className="p-2">
            <h3 className="text-h2 font-medium text-sidebar-foreground px-3 py-2">Choose Permissions</h3>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-sidebar-border space-y-2">
      </div>
    </div>
      
    <ReportSelector
      isOpen={isSelectorOpen}
      onClose={() => setIsSelectorOpen(false)}
      reports={reports}
      onTogglePin={handleTogglePin}
      onClone={handleCloneReport}
      onDelete={handleDeleteReport}
      onRename={handleRenameReport}
      onUpdateTags={handleUpdateTags}
      onOpenReport={handleOpenReport}
    />

    <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
      <DialogContent data-testid="dialog-edit-tags">
        <DialogHeader>
          <DialogTitle>Edit Tags</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add tag and press Enter"
            data-testid="input-tag"
          />
          {editingTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {editingTags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="gap-1" data-testid={`tag-${index}`}>
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-destructive"
                    data-testid={`button-remove-tag-${index}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsTagDialogOpen(false)}
            data-testid="button-cancel-tags"
          >
            Cancel
          </Button>
          <Button
            onClick={handleTagsSubmit}
            data-testid="button-submit-tags"
          >
            Save Tags
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={isProjectTagDialogOpen} onOpenChange={setIsProjectTagDialogOpen}>
      <DialogContent data-testid="dialog-edit-project-tags">
        <DialogHeader>
          <DialogTitle>Edit Project Tags</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Input
            value={projectTagInput}
            onChange={(e) => setProjectTagInput(e.target.value)}
            onKeyDown={handleProjectTagKeyDown}
            placeholder="Add tag and press Enter"
            data-testid="input-project-tag"
          />
          {editingProjectTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {editingProjectTags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="gap-1" data-testid={`project-tag-${index}`}>
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveProjectTag(tag)}
                    className="ml-1 hover:text-destructive"
                    data-testid={`button-remove-project-tag-${index}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsProjectTagDialogOpen(false)}
            data-testid="button-cancel-project-tags"
          >
            Cancel
          </Button>
          <Button
            onClick={handleProjectTagsSubmit}
            data-testid="button-submit-project-tags"
          >
            Save Tags
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <CalculatedMetricDialog
      open={isCalculatedMetricDialogOpen}
      onOpenChange={setIsCalculatedMetricDialogOpen}
    />

    <Dialog open={showSelectAllConfirm} onOpenChange={setShowSelectAllConfirm}>
      <DialogContent data-testid="dialog-select-all-metrics">
        <DialogHeader>
          <DialogTitle>Select All Metrics</DialogTitle>
          <DialogDescription>
            You are about to select {getAllMetricIds().length} metrics. This will add many columns to your table and may require horizontal scrolling.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowSelectAllConfirm(false)}
            data-testid="button-cancel-select-all"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSelectAllMetrics}
            data-testid="button-confirm-select-all"
          >
            Select All Metrics
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    </>
  );
}

// Мемоизированный Sidebar — предотвращает лишние ре-рендеры
const Sidebar = memo(SidebarInner);
Sidebar.displayName = 'Sidebar';

export default Sidebar;
