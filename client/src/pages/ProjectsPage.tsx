import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen, Search, Pin, X, Trash2, ExternalLink, Copy, Tag, ChevronDown, ChevronRight, Clock, PlayCircle, CheckCircle, XCircle, FileText, MoreVertical, PinOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setCurrentProject,
  updateProjectTags as updateProjectTagsAction,
  updateProjectStatus,
  fetchProjects,
  createProject,
  updateProject,
  deleteProject as deleteProjectAction,
  cloneProject as cloneProjectAction,
  toggleProjectPin,
  type ProjectStatus,
} from "@/store/slices/projectsSlice";
import { fetchReportsByProject, deleteReportThunk, toggleReportPinThunk, updateReportThunk } from "@/store/slices/reportsThunks";
import { setCurrentReport } from "@/store/slices/reportsSlice";
import { SyncStatusBadge } from "@/components/ReportSyncStatus";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReportStatus } from "@/store/slices/reportsSlice";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ProjectsPage() {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const projects = useAppSelector(state => state.projects.projects);
  const loading = useAppSelector(state => state.projects.loading);
  const error = useAppSelector(state => state.projects.error);
  const currentProjectId = useAppSelector(state => state.projects.currentProjectId);
  const activeWorkspaceId = useAppSelector(state => state.user.currentUser?.activeWorkspaceId);

  const [searchQuery, setSearchQuery] = useState("");
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [tagsProjectId, setTagsProjectId] = useState<string>("");
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState("");
  
  // Report tags dialog state
  const [reportTagsDialogOpen, setReportTagsDialogOpen] = useState(false);
  const [tagsReportId, setTagsReportId] = useState<string>("");
  const [tagsReportProjectId, setTagsReportProjectId] = useState<string>("");
  const [editingReportTags, setEditingReportTags] = useState<string[]>([]);
  const [editReportTagInput, setEditReportTagInput] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [editingCardProjectId, setEditingCardProjectId] = useState<string>("");
  const [editedCardProjectName, setEditedCardProjectName] = useState("");
  
  // Состояние для раскрытых проектов (папок)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [loadedReports, setLoadedReports] = useState<Set<string>>(new Set());
  
  // Состояние для диалога создания отчёта
  const [createReportDialogOpen, setCreateReportDialogOpen] = useState(false);
  const [selectedProjectForReport, setSelectedProjectForReport] = useState<string>("");
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  
  // Селектор для отчётов каждого проекта
  const allReports = useAppSelector(state => state.reports.reports);

  // Загрузить проекты при монтировании или смене workspace
  useEffect(() => {
    if (activeWorkspaceId) {
      dispatch(fetchProjects());
    }
  }, [dispatch, activeWorkspaceId]);

  // Показать ошибки через toast
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isSearchOpen && searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchOpen]);

  const generateUniqueProjectName = () => {
    const baseName = "New Project";
    const existingNames = projects.map(p => p.name);
    
    if (!existingNames.includes(baseName)) {
      return baseName;
    }
    
    let counter = 1;
    while (existingNames.includes(`${baseName} ${counter}`)) {
      counter++;
    }
    
    return `${baseName} ${counter}`;
  };

  const handleStartCreateProject = async () => {
    const generatedName = generateUniqueProjectName();
    
    try {
      const resultAction = await dispatch(createProject({
        name: generatedName,
        description: "",
        tags: [],
      }));

      if (createProject.fulfilled.match(resultAction)) {
        const newProject = resultAction.payload;
        dispatch(setCurrentProject(newProject.id));
        
        // Загружаем отчёты для нового проекта (бэкенд создаёт дефолтный отчёт)
        const reportsResult = await dispatch(fetchReportsByProject({ projectId: newProject.id }));
        
        // Автоматически выбираем первый (дефолтный) отчёт
        if (fetchReportsByProject.fulfilled.match(reportsResult) && reportsResult.payload.reports.length > 0) {
          dispatch(setCurrentReport(reportsResult.payload.reports[0].id));
        }
        
        toast({
          title: "Success",
          description: "Project created",
        });
        
        navigate('/selection');
      } else {
        throw new Error('Failed to create project');
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    }
  };

  const handleOpenProject = (id: string) => {
    dispatch(setCurrentProject(id));
    navigate('/selection');
  };

  // Раскрытие/сворачивание проекта (папки)
  const handleToggleProject = async (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
      // Загружаем отчёты при первом раскрытии
      if (!loadedReports.has(projectId)) {
        await dispatch(fetchReportsByProject({ projectId }));
        setLoadedReports(prev => new Set(prev).add(projectId));
      }
    }
    setExpandedProjects(newExpanded);
  };

  // Получение отчётов для проекта
  const getProjectReports = (projectId: string) => {
    return allReports[projectId] || [];
  };

  // Иконка статуса отчёта по аналогии с заметками
  const getReportStatusIcon = (status?: ReportStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'syncing':
      case 'extending':
        return <PlayCircle className="w-4 h-4 text-blue-500" />;
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleEditTagsClick = (projectId: string, currentTags: string[]) => {
    setTagsProjectId(projectId);
    setEditingTags(currentTags || []);
    setEditTagInput("");
    setTagsDialogOpen(true);
  };

  const handleAddEditTag = () => {
    const tag = editTagInput.trim();
    if (tag && !editingTags.includes(tag)) {
      setEditingTags([...editingTags, tag]);
      setEditTagInput("");
    }
  };

  const handleRemoveEditTag = (tagToRemove: string) => {
    setEditingTags(editingTags.filter(tag => tag !== tagToRemove));
  };

  const handleEditTagsSubmit = async () => {
    if (tagsProjectId) {
      try {
        await dispatch(updateProject({
          id: tagsProjectId,
          updates: { tags: editingTags }
        }));

        toast({
          title: "Success",
          description: "Tags updated",
        });
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to update tags",
          variant: "destructive",
        });
      }

      setTagsDialogOpen(false);
      setTagsProjectId("");
      setEditingTags([]);
      setEditTagInput("");
    }
  };

  const handleEditTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEditTag();
    }
  };

  // Report tags handlers
  const handleEditReportTagsClick = (projectId: string, reportId: string, currentTags: string[]) => {
    setTagsReportProjectId(projectId);
    setTagsReportId(reportId);
    setEditingReportTags(currentTags || []);
    setEditReportTagInput("");
    setReportTagsDialogOpen(true);
  };

  const handleAddEditReportTag = () => {
    const tag = editReportTagInput.trim();
    if (tag && !editingReportTags.includes(tag)) {
      setEditingReportTags([...editingReportTags, tag]);
      setEditReportTagInput("");
    }
  };

  const handleRemoveEditReportTag = (tagToRemove: string) => {
    setEditingReportTags(editingReportTags.filter(tag => tag !== tagToRemove));
  };

  const handleEditReportTagsSubmit = async () => {
    if (tagsReportId && tagsReportProjectId) {
      try {
        await dispatch(updateReportThunk({
          projectId: tagsReportProjectId,
          reportId: tagsReportId,
          updates: { tags: editingReportTags }
        })).unwrap();

        toast({
          title: "Success",
          description: "Report tags updated",
        });
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to update report tags",
          variant: "destructive",
        });
      }

      setReportTagsDialogOpen(false);
      setTagsReportId("");
      setTagsReportProjectId("");
      setEditingReportTags([]);
      setEditReportTagInput("");
    }
  };

  const handleEditReportTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEditReportTag();
    }
  };

  const handleStartEditingCardProjectName = (projectId: string, projectName: string) => {
    setEditingCardProjectId(projectId);
    setEditedCardProjectName(projectName);
  };

  const handleSaveCardProjectName = async () => {
    if (!editingCardProjectId || !editedCardProjectName.trim()) {
      setEditingCardProjectId("");
      return;
    }

    const trimmedName = editedCardProjectName.trim();
    
    try {
      await dispatch(updateProject({ 
        id: editingCardProjectId, 
        updates: { name: trimmedName } 
      }));
      
      toast({
        title: "Success",
        description: "Project name updated",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update project name",
        variant: "destructive",
      });
    }
    
    setEditingCardProjectId("");
  };

  const handleCardProjectNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveCardProjectName();
    } else if (e.key === 'Escape') {
      setEditingCardProjectId("");
    }
  };

  // Открытие диалога создания отчёта
  const handleOpenCreateReportDialog = () => {
    setSelectedProjectForReport("");
    setProjectSearchQuery("");
    setCreateReportDialogOpen(true);
  };

  // Создание отчёта в выбранном проекте
  const handleCreateReportInProject = () => {
    if (!selectedProjectForReport) {
      toast({
        title: "Error",
        description: "Please select a project",
        variant: "destructive",
      });
      return;
    }
    
    dispatch(setCurrentProject(selectedProjectForReport));
    setCreateReportDialogOpen(false);
    navigate('/selection');
  };

  // Фильтрация проектов по текущему workspace (защита от показа проектов из другого workspace)
  const workspaceProjects = activeWorkspaceId 
    ? projects.filter(p => p.workspaceId === activeWorkspaceId)
    : projects;

  // Фильтрация проектов в диалоге
  const filteredProjectsForDialog = workspaceProjects.filter(project =>
    project.name.toLowerCase().includes(projectSearchQuery.toLowerCase())
  );


  const filteredProjects = workspaceProjects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
    <div className="flex flex-col h-full bg-background">
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-display-lg text-foreground">Projects</h1>
              <p className="text-body-sm text-muted-foreground mt-1" data-testid="text-projects-page-subtitle">Select or create</p>
            </div>
            <div className="flex items-center gap-2" ref={searchContainerRef}>
              {!isSearchOpen && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSearchOpen(true)}
                  data-testid="button-toggle-search"
                >
                  <Search className="w-4 h-4" />
                </Button>
              )}
              <div className="flex items-center justify-end overflow-hidden transition-all duration-300" style={{ width: isSearchOpen ? '320px' : '0px' }}>
                <Input
                  type="search"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                  data-testid="input-search-projects"
                />
              </div>
              <Button
                onClick={handleOpenCreateReportDialog}
                size="default"
                variant="outline"
                data-testid="button-create-report"
              >
                <FileText className="w-4 h-4 mr-2" />
                Create Report
              </Button>
              <Button
                onClick={handleStartCreateProject}
                size="default"
                disabled={loading}
                data-testid="button-create-project"
              >
                <Plus className="w-4 h-4 mr-2" />
                {loading ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-body">Loading projects...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-body">
                    {searchQuery ? 'No projects found matching your search.' : 'No projects yet. Create your first project to get started.'}
                  </p>
                </div>
              ) : (
                filteredProjects.map((project) => (
                <Card key={project.id} data-testid={`project-card-${project.id}`} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Заголовок проекта (папки) */}
                    <div 
                      className="flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleToggleProject(project.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Иконка раскрытия */}
                        <button className="p-1 rounded hover:bg-muted">
                          {expandedProjects.has(project.id) ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        
                        {/* Иконка папки */}
                        <FolderOpen className="w-5 h-5 text-primary flex-shrink-0" />
                        
                        {/* Название проекта */}
                        <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                          {editingCardProjectId === project.id ? (
                            <Input
                              type="text"
                              value={editedCardProjectName}
                              onChange={(e) => setEditedCardProjectName(e.target.value)}
                              onBlur={handleSaveCardProjectName}
                              onKeyDown={handleCardProjectNameKeyDown}
                              autoFocus
                              className="text-h3 font-semibold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
                              data-testid={`input-project-name-${project.id}`}
                            />
                          ) : (
                            <h3 
                              className="text-h3 text-foreground cursor-pointer hover:text-foreground/80 truncate" 
                              onClick={() => handleStartEditingCardProjectName(project.id, project.name)}
                              data-testid={`text-project-name-${project.id}`}
                            >
                              {project.name}
                            </h3>
                          )}
                          <p className="text-body-sm text-muted-foreground">
                            {new Date(project.createdAt).toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })}
                            <span className="ml-2 text-muted-foreground/60 font-mono text-[10px]" title={`Project ID: ${project.id}`}>
                              #{project.code || project.id.slice(0, 8)}
                            </span>
                          </p>
                        </div>
                      </div>
                      
                      {/* Меню действий проекта (3 точки) */}
                      <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="p-2 rounded hover:bg-muted transition-colors"
                              data-testid={`button-menu-project-${project.id}`}
                            >
                              <MoreVertical className="w-4 h-4 text-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  await dispatch(toggleProjectPin(project.id));
                                } catch (err) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to toggle pin",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              data-testid={`menu-pin-project-${project.id}`}
                              className="cursor-pointer"
                            >
                              <Pin className={`w-4 h-4 mr-2 ${project.pinned ? 'text-primary' : ''}`} />
                              {project.pinned ? 'Unpin' : 'Pin'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleEditTagsClick(project.id, project.tags || [])}
                              data-testid={`menu-tags-project-${project.id}`}
                              className="cursor-pointer"
                            >
                              <Tag className="w-4 h-4 mr-2" />
                              Tags
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                dispatch(cloneProjectAction(project.id))
                                  .unwrap()
                                  .then(() => {
                                    toast({ title: "Success", description: "Project cloned" });
                                  })
                                  .catch(() => {
                                    toast({ title: "Error", description: "Failed to clone", variant: "destructive" });
                                  });
                              }}
                              data-testid={`menu-clone-project-${project.id}`}
                              className="cursor-pointer"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Clone
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive cursor-pointer"
                              onClick={() => {
                                if (confirm(`Delete "${project.name}"?`)) {
                                  dispatch(deleteProjectAction(project.id))
                                    .unwrap()
                                    .then(() => {
                                      toast({ title: "Success", description: "Project deleted" });
                                    })
                                    .catch(() => {
                                      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
                                    });
                                }
                              }}
                              data-testid={`menu-delete-project-${project.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    {/* Теги проекта */}
                    {project.tags && project.tags.length > 0 && (
                      <div className="px-4 pb-2 flex flex-wrap gap-2">
                        {project.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="gap-1" data-testid={`project-tag-${index}`}>
                            {tag}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newTags = project.tags?.filter(t => t !== tag) || [];
                                dispatch(updateProjectTagsAction({ id: project.id, tags: newTags }));
                                toast({ title: "Success", description: "Tag removed" });
                              }}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Список отчётов внутри проекта (раскрывающаяся часть) */}
                    {expandedProjects.has(project.id) && (
                      <div className="border-t border-border bg-muted/20">
                        {(() => {
                          const reports = getProjectReports(project.id);
                          if (reports.length === 0) {
                            return (
                              <div className="px-6 py-4 text-center text-muted-foreground text-body-sm">
                                No reports yet
                              </div>
                            );
                          }
                          return reports.map((report: any) => (
                            <div
                              key={report.id}
                              className="flex items-center justify-between gap-4 px-6 py-3 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/50 last:border-b-0"
                              onClick={() => {
                                dispatch(setCurrentProject(project.id));
                                navigate('/analytics');
                              }}
                              data-testid={`report-item-${report.id}`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {/* Иконка статуса отчёта */}
                                {getReportStatusIcon(report.status)}
                                
                                <div className="flex-1 min-w-0">
                                  <p className="text-body text-foreground truncate">{report.name}</p>
                                  <p className="text-body-sm text-muted-foreground">
                                    {report.updatedAt 
                                      ? new Date(report.updatedAt).toLocaleString('en-US', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: false
                                        })
                                      : 'Recently'
                                    }
                                    <span className="ml-2 text-muted-foreground/60 font-mono text-[10px]" title={`Report ID: ${report.id}`}>
                                      #{report.code || report.id.slice(0, 8)}
                                    </span>
                                  </p>

                                  {Array.isArray(report.tags) && report.tags.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {report.tags.map((tag: string, index: number) => (
                                        <Badge
                                          key={`${tag}-${index}`}
                                          variant="secondary"
                                          className="px-2 py-0 text-[11px] leading-5"
                                          data-testid={`report-tag-${report.id}-${index}`}
                                        >
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Бейдж статуса */}
                              {report.status && report.status !== 'ready' && (
                                <SyncStatusBadge status={report.status} syncProgress={report.syncProgress} />
                              )}
                              
                              {/* Панель действий для отчёта (иконки: Delete, Tags, Clone, Open, Pin) */}
                              <TooltipProvider delayDuration={300}>
                                <div className="flex gap-1 items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {/* Delete */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm(`Delete report "${report.name}"?`)) {
                                            dispatch(deleteReportThunk(report.id))
                                              .unwrap()
                                              .then(() => {
                                                toast({ title: "Success", description: "Report deleted" });
                                              })
                                              .catch(() => {
                                                toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
                                              });
                                          }
                                        }}
                                        className="p-2 rounded hover:bg-muted transition-colors"
                                        data-testid={`button-delete-report-${report.id}`}
                                      >
                                        <Trash2 className="w-4 h-4 text-destructive hover:text-destructive/80" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete</TooltipContent>
                                  </Tooltip>
                                  
                                  {/* Tags */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditReportTagsClick(project.id, report.id, report.tags || []);
                                        }}
                                        className="p-2 rounded hover:bg-muted transition-colors"
                                        data-testid={`button-tags-report-${report.id}`}
                                      >
                                        <Tag className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Tags</TooltipContent>
                                  </Tooltip>
                                  
                                  {/* Clone */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // TODO: handleCloneReport(report.id);
                                        }}
                                        className="p-2 rounded hover:bg-muted transition-colors"
                                        data-testid={`button-clone-report-${report.id}`}
                                      >
                                        <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Clone</TooltipContent>
                                  </Tooltip>
                                  
                                  {/* Open */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          dispatch(setCurrentProject(project.id));
                                          navigate('/analytics');
                                        }}
                                        className="p-2 rounded hover:bg-muted transition-colors"
                                        data-testid={`button-open-report-${report.id}`}
                                      >
                                        <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Open</TooltipContent>
                                  </Tooltip>
                                  
                                  {/* Pin */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          dispatch(toggleReportPinThunk({ projectId: project.id, reportId: report.id }));
                                        }}
                                        className="p-2 rounded hover:bg-muted transition-colors"
                                        data-testid={`button-pin-report-${report.id}`}
                                      >
                                        <Pin className={`w-4 h-4 ${report.pinned ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>{report.pinned ? 'Unpin' : 'Pin'}</TooltipContent>
                                  </Tooltip>
                                </div>
                              </TooltipProvider>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={tagsDialogOpen} onOpenChange={setTagsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tags</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input
              value={editTagInput}
              onChange={(e) => setEditTagInput(e.target.value)}
              onKeyDown={handleEditTagKeyDown}
              placeholder="Add tag and press Enter"
              data-testid="input-edit-tag"
            />
            {editingTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {editingTags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="gap-1" data-testid={`edit-tag-${index}`}>
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveEditTag(tag)}
                      className="ml-1 hover:text-destructive"
                      data-testid={`button-remove-edit-tag-${index}`}
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
              onClick={() => setTagsDialogOpen(false)}
              data-testid="button-cancel-edit-tags"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditTagsSubmit}
              data-testid="button-submit-edit-tags"
            >
              Save Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования тегов отчёта */}
      <Dialog open={reportTagsDialogOpen} onOpenChange={setReportTagsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Report Tags</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input
              value={editReportTagInput}
              onChange={(e) => setEditReportTagInput(e.target.value)}
              onKeyDown={handleEditReportTagKeyDown}
              placeholder="Add tag and press Enter"
              data-testid="input-edit-report-tag"
            />
            {editingReportTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {editingReportTags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="gap-1" data-testid={`edit-report-tag-${index}`}>
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveEditReportTag(tag)}
                      className="ml-1 hover:text-destructive"
                      data-testid={`button-remove-edit-report-tag-${index}`}
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
              onClick={() => setReportTagsDialogOpen(false)}
              data-testid="button-cancel-edit-report-tags"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditReportTagsSubmit}
              data-testid="button-submit-edit-report-tags"
            >
              Save Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог создания отчёта с выбором проекта */}
      <Dialog open={createReportDialogOpen} onOpenChange={setCreateReportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Report</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-body-sm text-muted-foreground">
              Select a project where the report will be created
            </p>
            
            {/* Поиск проектов */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search projects..."
                value={projectSearchQuery}
                onChange={(e) => setProjectSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-projects-dialog"
              />
            </div>
            
            {/* Список проектов */}
            <div className="max-h-[300px] overflow-y-auto border rounded-md">
              {filteredProjectsForDialog.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-body-sm">
                  {projectSearchQuery ? 'No projects found' : 'No projects yet'}
                </div>
              ) : (
                filteredProjectsForDialog.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProjectForReport(project.id)}
                    className={`flex items-center gap-3 p-3 cursor-pointer border-b last:border-b-0 transition-colors ${
                      selectedProjectForReport === project.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                    data-testid={`project-option-${project.id}`}
                  >
                    <FolderOpen className={`w-5 h-5 flex-shrink-0 ${
                      selectedProjectForReport === project.id ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-body truncate ${
                        selectedProjectForReport === project.id ? 'text-primary font-medium' : 'text-foreground'
                      }`}>
                        {project.name}
                      </p>
                      <p className="text-body-sm text-muted-foreground">
                        {new Date(project.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    {project.pinned && (
                      <Pin className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                    {selectedProjectForReport === project.id && (
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateReportDialogOpen(false)}
              data-testid="button-cancel-create-report"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateReportInProject}
              disabled={!selectedProjectForReport}
              data-testid="button-confirm-create-report"
            >
              <FileText className="w-4 h-4 mr-2" />
              Create Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
