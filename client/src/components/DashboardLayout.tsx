import { ReactNode } from "react";
import IconSidebar from "./IconSidebar";
import Sidebar from "./Sidebar";
import ErrorBoundary from "./ErrorBoundary";

interface DashboardLayoutProps {
  children: ReactNode;
  onNavItemClick?: (itemId: string) => void;
  hideProjects?: boolean;
  showMetricCategories?: boolean;
  selectedMetricCategory?: string;
  onMetricCategorySelect?: (categoryId: string) => void;
  selectedMetrics?: string[];
  onToggleMetric?: (metricId: string) => void;
  hideSidebar?: boolean;
}

export default function DashboardLayout({ 
  children, 
  onNavItemClick,
  hideProjects = false,
  showMetricCategories = false,
  selectedMetricCategory,
  onMetricCategorySelect,
  selectedMetrics,
  onToggleMetric,
  hideSidebar = false
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <IconSidebar />
      <Sidebar 
        onNavItemClick={onNavItemClick}
        hideProjects={hideProjects}
        showMetricCategories={showMetricCategories}
        selectedMetricCategory={selectedMetricCategory}
        onMetricCategorySelect={onMetricCategorySelect}
        selectedMetrics={selectedMetrics}
        onToggleMetric={onToggleMetric}
        isHidden={hideSidebar}
      />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </div>
    </div>
  );
}
