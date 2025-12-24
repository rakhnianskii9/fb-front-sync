import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import ObjectSelectionPanel from "@/components/ObjectSelectionPanel";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateSelections } from "@/store/slices/reportsSlice";
import { createReportThunk, updateReportThunk } from "@/store/slices/reportsThunks";
import { generateSmartReportName } from "@/lib/generateSmartReportName";
import { fetchAdAccounts } from "@/store/slices/accountsThunks";
import { fetchCampaigns } from "@/store/slices/campaignsThunks";
import { fetchAdSets } from "@/store/slices/adsetsThunks";
import { fetchAds } from "@/store/slices/adsThunks";
import { fetchCreatives } from "@/store/slices/creativesThunks";
import { clearCampaigns } from "@/store/slices/campaignsSlice";
import { clearAdSets } from "@/store/slices/adsetsSlice";
import { clearAds } from "@/store/slices/adsSlice";
import { clearCreatives } from "@/store/slices/creativesSlice";
import type { Report } from "@/store/slices/reportsSlice";
import { useWorkspace } from "@/hooks/useWorkspace";
import { CreateReportDialog } from "@/components/CreateReportDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  selectCurrentProjectId,
  selectCurrentProject,
  selectCurrentProjectReports,
  selectCurrentReport,
  selectAccounts,
  selectAccountsLoading,
  selectAccountsError,
  selectCampaigns,
  selectCampaignsLoading,
  selectCampaignsError,
  selectAdSets,
  selectAdSetsLoading,
  selectAdSetsError,
  selectAds,
  selectAdsLoading,
  selectAdsError,
  selectCreatives,
  selectCreativesLoading,
  selectCreativesError,
} from "@/store/selectors";

export default function SelectionPage() {
  const dispatch = useAppDispatch();
  const currentProjectId = useAppSelector(selectCurrentProjectId);
  const currentProject = useAppSelector(selectCurrentProject);
  const reports = useAppSelector(selectCurrentProjectReports);
  const currentReport = useAppSelector(selectCurrentReport);
  
  // Local selections state for new reports (before report is created)
  const [localSelections, setLocalSelections] = useState({
    accounts: [] as string[],
    campaigns: [] as string[],
    adsets: [] as string[],
    ads: [] as string[],
    creatives: [] as string[],
  });
  
  // Use local selections when no report exists, otherwise use report selections
  const selections = currentReport?.selections || localSelections;
  
  const accounts = useAppSelector(selectAccounts);
  const accountsLoading = useAppSelector(selectAccountsLoading);
  const accountsError = useAppSelector(selectAccountsError);
  const campaigns = useAppSelector(selectCampaigns);
  const campaignsLoading = useAppSelector(selectCampaignsLoading);
  const campaignsError = useAppSelector(selectCampaignsError);
  const adsets = useAppSelector(selectAdSets);
  const adsetsLoading = useAppSelector(selectAdSetsLoading);
  const adsetsError = useAppSelector(selectAdSetsError);
  const ads = useAppSelector(selectAds);
  const adsLoading = useAppSelector(selectAdsLoading);
  const adsError = useAppSelector(selectAdsError);
  const creatives = useAppSelector(selectCreatives);
  const creativesLoading = useAppSelector(selectCreativesLoading);
  const creativesError = useAppSelector(selectCreativesError);
  const { workspaceId } = useWorkspace();

  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeColumn, setActiveColumn] = useState<string>('accounts');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [showCreateReportDialog, setShowCreateReportDialog] = useState(false);
  const [isCreatingReport, setIsCreatingReport] = useState(false);

  // Валидация: кнопка активна если выбран хотя бы 1 креатив И его иерархия
  const canCreateReport = useMemo(() => {
    const hasCreatives = (selections.creatives?.length ?? 0) > 0;
    const hasAds = (selections.ads?.length ?? 0) > 0;
    const hasAdSets = (selections.adsets?.length ?? 0) > 0;
    const hasCampaigns = (selections.campaigns?.length ?? 0) > 0;
    const hasAccounts = (selections.accounts?.length ?? 0) > 0;
    
    return hasCreatives && hasAds && hasAdSets && hasCampaigns && hasAccounts;
  }, [selections]);

  // Smart report name generation - always generate for new report dialog
  const smartReportName = useMemo(() => {
    // Generate smart name based on selections
    // Note: selections.accounts contains Facebook IDs (act_xxx), accounts.id may be UUID
    // So we need to map by adAccountId for matching
    const accountInfos = accounts.map(a => ({ 
      id: a.adAccountId || a.id, // Use Facebook ID for matching
      name: a.name || a.adAccountId || 'Account' 
    }));
    const existingNames = reports.map(r => r.name);
    
    return generateSmartReportName(selections, accountInfos, existingNames);
  }, [selections, accounts, reports]);

  // Сохранение отчёта (обновление существующего или создание нового)
  const handleCreateReport = async (reportName: string) => {
    if (!currentProjectId || !workspaceId) return;
    
    setIsCreatingReport(true);
    try {
      // Дефолтные метрики для таблицы — синхронизированы с карточками (DashboardMetricCards)
      const defaultMetrics = [
        'impressions',
        'unique_clicks',
        'cost_per_unique_click',  // paired с unique_clicks в карточке
        'unique_ctr',
        'conversions',
        'cost_per_result',        // paired с conversions в карточке
        'spend',
      ];

      // Use current selections (from localSelections or currentReport.selections)
      const selectionsToSave = selections;

      // Если уже есть отчёт — обновляем его, иначе создаём новый
      if (currentReport) {
        await dispatch(updateReportThunk({
          projectId: currentProjectId,
          reportId: currentReport.id,
          updates: {
            name: reportName,
            selections: selectionsToSave,
            selectedMetrics: defaultMetrics,
          },
        })).unwrap();

        toast({
          title: "Report saved",
          description: `Report "${reportName}" saved. Starting data synchronization...`,
        });
      } else {
        await dispatch(createReportThunk({
          projectId: currentProjectId,
          name: reportName,
          selectedMetrics: defaultMetrics,
          activeTab: 'campaigns',
          selections: selectionsToSave,
        })).unwrap();

        // Clear local selections after report is created
        setLocalSelections({
          accounts: [],
          campaigns: [],
          adsets: [],
          ads: [],
          creatives: [],
        });

        toast({
          title: "Report created",
          description: `Report "${reportName}" created. Starting data synchronization...`,
        });
      }

      setShowCreateReportDialog(false);
      navigate('/analytics');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to save report",
        variant: "destructive",
      });
    } finally {
      setIsCreatingReport(false);
    }
  };

  useEffect(() => {
    if (!currentProjectId) {
      setActiveColumn('accounts');
      return;
    }
    setActiveColumn('accounts');
  }, [currentProjectId]);

  useEffect(() => {
    if (!currentProjectId || !workspaceId) {
      return;
    }
    dispatch(fetchAdAccounts());
  }, [dispatch, currentProjectId, workspaceId]);

  useEffect(() => {
    if (!currentProjectId || !workspaceId) {
      dispatch(clearCampaigns());
      dispatch(clearAdSets());
      dispatch(clearAds());
      dispatch(clearCreatives());
      return;
    }
  }, [dispatch, currentProjectId, workspaceId]);

  const selectedAccountIds = useMemo(() => selections.accounts ?? [], [selections.accounts]);
  const sortedAccountIds = useMemo(() => [...selectedAccountIds].sort(), [selectedAccountIds]);
  const selectedCampaignIds = useMemo(() => selections.campaigns ?? [], [selections.campaigns]);
  const sortedCampaignIds = useMemo(() => [...selectedCampaignIds].sort(), [selectedCampaignIds]);
  const selectedAdSetIds = useMemo(() => selections.adsets ?? [], [selections.adsets]);
  const sortedAdSetIds = useMemo(() => [...selectedAdSetIds].sort(), [selectedAdSetIds]);
  const selectedAdIds = useMemo(() => selections.ads ?? [], [selections.ads]);
  const sortedAdIds = useMemo(() => [...selectedAdIds].sort(), [selectedAdIds]);
  const selectedCreativeIds = useMemo(() => selections.creatives ?? [], [selections.creatives]);
  const sortedCreativeIds = useMemo(() => [...selectedCreativeIds].sort(), [selectedCreativeIds]);

  useEffect(() => {
    if (!currentProjectId || !workspaceId) {
      return;
    }

    if (sortedAccountIds.length === 0) {
      dispatch(clearCampaigns());
      dispatch(clearAdSets());
      dispatch(clearAds());
      dispatch(clearCreatives());
      return;
    }

    dispatch(fetchCampaigns({ adAccountIds: sortedAccountIds }));
  }, [dispatch, currentProjectId, sortedAccountIds.join('|'), workspaceId]);

  useEffect(() => {
    if (!currentProjectId || !workspaceId) {
      return;
    }

    if (sortedCampaignIds.length === 0) {
      dispatch(clearAdSets());
      dispatch(clearAds());
      dispatch(clearCreatives());
      return;
    }

    dispatch(fetchAdSets({ 
      adAccountIds: sortedAccountIds,
      campaignIds: sortedCampaignIds 
    }));
  }, [dispatch, currentProjectId, sortedCampaignIds.join('|'), sortedAccountIds.join('|'), workspaceId]);

  useEffect(() => {
    if (!currentProjectId || !workspaceId) {
      return;
    }

    if (sortedAdSetIds.length === 0) {
      dispatch(clearAds());
      dispatch(clearCreatives());
      return;
    }

    dispatch(fetchAds({ 
      adAccountIds: sortedAccountIds,
      campaignIds: sortedCampaignIds,
      adsetIds: sortedAdSetIds 
    }));
  }, [dispatch, currentProjectId, sortedAdSetIds.join('|'), sortedAccountIds.join('|'), sortedCampaignIds.join('|'), workspaceId]);

  // Загрузка креативов при выборе ads (5-й уровень иерархии)
  useEffect(() => {
    if (!currentProjectId || !workspaceId) {
      return;
    }

    if (sortedAdIds.length === 0) {
      dispatch(clearCreatives());
      return;
    }

    dispatch(fetchCreatives({ 
      adAccountIds: sortedAccountIds,
      adIds: sortedAdIds
    }));
  }, [dispatch, currentProjectId, sortedAdIds.join('|'), sortedAccountIds.join('|'), workspaceId]);

  // If there are selections, open next column
  useEffect(() => {
    setActiveColumn('accounts');
  }, [currentReport?.id]);

  if (!currentProjectId || !currentProject || !workspaceId) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="border-b border-border px-6 py-4">
          <h1 className="text-display-lg text-foreground">Selection</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-body text-muted-foreground mb-4">
              {!workspaceId
                ? 'No workspace selected. Open the menu and select a workspace.'
                : 'No project selected. Please select a project first.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const campaignItems = useMemo(
    () =>
      campaigns.map((campaign) => ({
        id: campaign.campaignId,
        name: campaign.name || campaign.campaignId || 'Untitled',
        subtitle: campaign.campaignId,
      })),
    [campaigns]
  );

  const adsetItems = useMemo(
    () =>
      adsets.map((adset) => ({
        id: adset.adsetId,
        name: adset.name || adset.adsetId || 'Untitled',
        subtitle: adset.adsetId,
      })),
    [adsets]
  );

  const adItems = useMemo(
    () =>
      ads.map((ad) => ({
        id: ad.adId,
        name: ad.name || ad.adId || 'Untitled',
        subtitle: ad.adId,
      })),
    [ads]
  );

  const creativeItems = useMemo(
    () =>
      creatives.map((creative) => ({
        id: creative.creativeId,
        name: creative.name || creative.title || creative.creativeId || 'Untitled',
        subtitle: creative.creativeId,
        thumbnail: creative.thumbnailUrl || creative.imageUrl || undefined,
      })),
    [creatives]
  );

  const handleStartEditing = () => {
    if (!currentReport) return;
    setEditedName(currentReport.name);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!currentProjectId || !currentReport || !editedName.trim()) {
      setIsEditingName(false);
      return;
    }

    if (editedName.trim() !== currentReport.name) {
      try {
        await dispatch(updateReportThunk({
          projectId: currentProjectId,
          reportId: currentReport.id,
          updates: { name: editedName.trim() },
        })).unwrap();

        toast({
          title: "Success",
          description: "Report name updated",
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.message || "Failed to update report name",
          variant: "destructive",
        });
      }
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  const handleSelectionChange = async (tabId: string, ids: string[]) => {
    if (!currentProjectId || !workspaceId) {
      toast({
        title: 'No workspace selected',
        description: 'Please select a workspace before continuing.',
        variant: 'destructive',
      });
      return;
    }
    
    // Calculate new selections with dependent clearing
    const currentSelections = currentReport?.selections ?? localSelections;
    const newSelections = { ...currentSelections, [tabId]: ids };
    
    // Clear dependent selections when parent changes
    if (tabId === 'accounts') {
      newSelections.campaigns = [];
      newSelections.adsets = [];
      newSelections.ads = [];
      newSelections.creatives = [];
    } else if (tabId === 'campaigns') {
      newSelections.adsets = [];
      newSelections.ads = [];
      newSelections.creatives = [];
    } else if (tabId === 'adsets') {
      newSelections.ads = [];
      newSelections.creatives = [];
    } else if (tabId === 'ads') {
      newSelections.creatives = [];
    }
    
    // If no report exists yet, just update local selections
    if (!currentReport) {
      setLocalSelections(newSelections);
      
      // Automatically open next column when selecting items
      if (ids.length > 0) {
        const nextColumn: Record<string, string> = {
          'accounts': 'campaigns',
          'campaigns': 'adsets',
          'adsets': 'ads',
          'ads': 'creatives'
        };
        
        if (nextColumn[tabId]) {
          setActiveColumn(nextColumn[tabId]);
        }
      }
      return;
    }

    // Report exists - update Redux and server
    const report = currentReport;

    dispatch(updateSelections({
      projectId: currentProjectId,
      reportId: report.id,
      selections: newSelections,
    }));

    try {
      await dispatch(updateReportThunk({
        projectId: currentProjectId,
        reportId: report.id,
        updates: { selections: newSelections },
      })).unwrap();
    } catch (error: any) {
      toast({
        title: 'Save error',
        description: error?.message || 'Failed to save selected items',
        variant: 'destructive',
      });
    }

    // Automatically open next column when selecting items
    if (ids.length > 0 && tabId !== 'accounts') {
      const nextColumn: Record<string, string> = {
        'accounts': 'campaigns',
        'campaigns': 'adsets',
        'adsets': 'ads',
        'ads': 'creatives'
      };
      
      if (nextColumn[tabId]) {
        setActiveColumn(nextColumn[tabId]);
      }
    }
  };

  const handleDone = () => {
    if (!currentProjectId || !currentReport) return;

    if (selections.accounts.length === 0) {
      toast({
        title: "Warning",
        description: "Please select at least one ad account",
        variant: "destructive",
      });
      return;
    }

    navigate('/analytics');
  };

  const handleBackToProjects = () => {
    navigate('/projects');
  };

  const shouldShowColumn = (columnId: string) => {
    if (columnId === 'accounts') return true;
    if (columnId === 'campaigns') return activeColumn === 'campaigns' || selections.accounts.length > 0;
    if (columnId === 'adsets') return activeColumn === 'adsets' || selections.campaigns.length > 0;
    if (columnId === 'ads') return activeColumn === 'ads' || selections.adsets.length > 0;
    if (columnId === 'creatives') return activeColumn === 'creatives' || selections.ads.length > 0;
    return false;
  };

  const handleNavItemClick = (itemId: string) => {
    if (itemId === 'dashboard') {
      setActiveColumn(itemId);
      return;
    }

    if (itemId === 'accounts') {
      setActiveColumn('accounts');
      return;
    }

    const prerequisites: Record<string, { ready: boolean; message: string }> = {
      campaigns: {
        ready: selections.accounts.length > 0,
        message: 'Select an ad account first',
      },
      adsets: {
        ready: selections.campaigns.length > 0,
        message: 'Select campaigns first',
      },
      ads: {
        ready: selections.adsets.length > 0,
        message: 'Select ad sets first',
      },
      creatives: {
        ready: selections.ads.length > 0,
        message: 'Select ads first',
      },
    };

    const constraint = prerequisites[itemId];
    if (constraint && !constraint.ready) {
      toast({
        title: 'Insufficient data',
        description: constraint.message,
        variant: 'destructive',
      });
      return;
    }

    setActiveColumn(itemId);
  };

  const accountItems = accounts.map((account) => ({
    id: account.id,
    name: account.name || account.adAccountId || 'Untitled',
    subtitle: account.adAccountId || account.dbId,
  }));

  const hasNoAccounts = !accountsLoading && !accountsError && accountItems.length === 0;

  const renderPlaceholderPanel = (message: string, action?: ReactNode) => (
    <div className="flex flex-col h-full border-r border-border w-80 flex-shrink-0 items-center justify-center text-center px-4">
      <p className="text-body text-muted-foreground">{message}</p>
      {action}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
        <div className="border-b border-border">
          <div className="px-6 py-4 flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/projects')}
              data-testid="button-back"
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 
                className="text-display-lg text-foreground" 
                data-testid="text-report-name"
              >
                Assets
              </h1>
              <p className="text-body-sm text-muted-foreground" data-testid="text-object-selection">Select objects to analyze</p>
            </div>
            
            {/* Sticky кнопка Save/Create Report - Report-First Architecture */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      onClick={() => setShowCreateReportDialog(true)}
                      disabled={!canCreateReport}
                      className="flex items-center gap-2"
                      data-testid="button-create-report"
                    >
                      <Plus className="w-4 h-4" />
                      {currentReport ? 'Save Report' : 'Create Report'}
                    </Button>
                  </div>
                </TooltipTrigger>
                {!canCreateReport && (
                  <TooltipContent>
                    <p>Select creatives and their entire hierarchy (ads, adsets, campaigns, accounts)</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Save/Create Report Dialog */}
        <CreateReportDialog
          open={showCreateReportDialog}
          onOpenChange={setShowCreateReportDialog}
          selections={selections}
          onConfirm={handleCreateReport}
          isLoading={isCreatingReport}
          defaultName={smartReportName}
        />
        
        <div className="flex-1 flex overflow-x-auto overflow-y-hidden min-w-0">
          {activeColumn === 'dashboard' ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-h2 text-foreground mb-2">Dashboard</h2>
                <p className="text-body text-muted-foreground">
                  Select a category from the sidebar to manage your objects
                </p>
              </div>
            </div>
          ) : (
            <>
              {shouldShowColumn('accounts') && (
                accountsLoading
                  ? renderPlaceholderPanel('Loading ad accounts...')
                  : accountsError
                    ? renderPlaceholderPanel(
                        'Failed to load ad accounts',
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => dispatch(fetchAdAccounts())}
                          className="mt-3"
                          data-testid="button-retry-load-accounts"
                        >
                          Retry
                        </Button>
                      )
                    : hasNoAccounts
                      ? renderPlaceholderPanel('No ad accounts found')
                      : (
                        <ObjectSelectionPanel
                          title="Ad Accounts"
                          count={accountItems.length}
                          items={accountItems}
                          selectedIds={selections.accounts}
                          onSelectionChange={(ids) => handleSelectionChange('accounts', ids)}
                        />
                      )
              )}

              {shouldShowColumn('campaigns') && (
                selections.accounts.length === 0
                  ? renderPlaceholderPanel('Select an ad account to see campaigns')
                  : campaignsLoading
                    ? renderPlaceholderPanel('Loading campaigns...')
                    : campaignsError
                      ? renderPlaceholderPanel(
                          'Failed to load campaigns',
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => dispatch(fetchCampaigns({ adAccountIds: sortedAccountIds }))}
                            className="mt-3"
                            data-testid="button-retry-load-campaigns"
                          >
                            Retry
                          </Button>
                        )
                      : campaignItems.length === 0
                        ? renderPlaceholderPanel('No campaigns found')
                        : (
                          <ObjectSelectionPanel
                            title="Campaigns"
                            count={campaignItems.length}
                            items={campaignItems}
                            selectedIds={selections.campaigns}
                            onSelectionChange={(ids) => handleSelectionChange('campaigns', ids)}
                          />
                        )
              )}

              {shouldShowColumn('adsets') && (
                selections.campaigns.length === 0
                  ? renderPlaceholderPanel('Select campaigns to see ad sets')
                  : adsetsLoading
                    ? renderPlaceholderPanel('Loading ad sets...')
                    : adsetsError
                      ? renderPlaceholderPanel(
                          'Failed to load ad sets',
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => dispatch(fetchAdSets({ campaignIds: sortedCampaignIds }))}
                            className="mt-3"
                            data-testid="button-retry-load-adsets"
                          >
                            Retry
                          </Button>
                        )
                      : adsetItems.length === 0
                        ? renderPlaceholderPanel('No ad sets found')
                        : (
                          <ObjectSelectionPanel
                            title="Ad Sets"
                            count={adsetItems.length}
                            items={adsetItems}
                            selectedIds={selections.adsets}
                            onSelectionChange={(ids) => handleSelectionChange('adsets', ids)}
                          />
                        )
              )}

              {shouldShowColumn('ads') && (
                selections.adsets.length === 0
                  ? renderPlaceholderPanel('Select ad sets to see ads')
                  : adsLoading
                    ? renderPlaceholderPanel('Loading ads...')
                    : adsError
                      ? renderPlaceholderPanel(
                          'Failed to load ads',
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => dispatch(fetchAds({ adsetIds: sortedAdSetIds }))}
                            className="mt-3"
                            data-testid="button-retry-load-ads"
                          >
                            Retry
                          </Button>
                        )
                      : adItems.length === 0
                        ? renderPlaceholderPanel('No ads found')
                        : (
                          <ObjectSelectionPanel
                            title="Ads"
                            count={adItems.length}
                            items={adItems}
                            selectedIds={selections.ads}
                            onSelectionChange={(ids) => handleSelectionChange('ads', ids)}
                          />
                        )
              )}

              {shouldShowColumn('creatives') && (
                selections.ads.length === 0
                  ? renderPlaceholderPanel('Select ads to see creatives')
                  : creativesLoading
                    ? renderPlaceholderPanel('Loading creatives...')
                    : creativesError
                      ? renderPlaceholderPanel(
                          'Failed to load creatives',
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => dispatch(fetchCreatives({ adAccountIds: sortedAccountIds, adIds: sortedAdIds }))}
                            className="mt-3"
                            data-testid="button-retry-load-creatives"
                          >
                            Retry
                          </Button>
                        )
                      : creativeItems.length === 0
                        ? renderPlaceholderPanel('No creatives found')
                        : (
                          <ObjectSelectionPanel
                            title="Creatives"
                            count={creativeItems.length}
                            items={creativeItems}
                            selectedIds={selections.creatives}
                            onSelectionChange={(ids) => handleSelectionChange('creatives', ids)}
                          />
                        )
              )}
            </>
          )}
        </div>
      </div>
  );
}
