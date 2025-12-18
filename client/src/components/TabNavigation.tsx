import logger from '@/lib/logger';
interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="border-b border-border bg-background">
      <div className="flex gap-1 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              onTabChange(tab.id);
              logger.log('Tab changed to:', tab.id);
            }}
            className={`
              relative px-4 py-3 text-label font-medium rounded-t-md transition-colors
              ${activeTab === tab.id
                ? 'text-primary bg-card'
                : 'text-muted-foreground hover-elevate'
              }
            `}
            data-testid={`tab-${tab.id}`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="ml-2 text-body-sm text-muted-foreground">
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
