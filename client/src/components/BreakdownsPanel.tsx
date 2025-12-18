import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BreakdownType } from "@/store/slices/reportsSlice";

interface BreakdownOption {
  id: BreakdownType;
  label: string;
}

interface BreakdownCategory {
  name: string;
  options: BreakdownOption[];
}

const BREAKDOWN_CATEGORIES: BreakdownCategory[] = [
  {
    name: 'Demographics',
    options: [
      { id: 'age', label: 'Age' },
      { id: 'gender', label: 'Gender' },
    ],
  },
  {
    name: 'Geography',
    options: [
      { id: 'country', label: 'Country' },
      { id: 'region', label: 'Region' },
      { id: 'dma', label: 'DMA' },
    ],
  },
  {
    name: 'Devices & Platforms',
    options: [
      { id: 'device_platform', label: 'Device Platform' },
      { id: 'publisher_platform', label: 'Publisher Platform' },
      { id: 'platform_position', label: 'Placement' },
      { id: 'impression_device', label: 'Impression Device' },
    ],
  },
  {
    name: 'Products',
    options: [
      { id: 'product_id', label: 'Product ID' },
    ],
  },
  {
    name: 'Time',
    options: [
      { id: 'hourly_stats_aggregated_by_advertiser_time_zone', label: 'Hourly (Advertiser TZ)' },
      { id: 'hourly_stats_aggregated_by_audience_time_zone', label: 'Hourly (Audience TZ)' },
    ],
  },
];

interface BreakdownsPanelProps {
  selectedBreakdowns: BreakdownType[];
  onChange: (breakdowns: BreakdownType[]) => void;
}

export function BreakdownsPanel({ selectedBreakdowns, onChange }: BreakdownsPanelProps) {
  // Get selected value for a category
  const getSelectedForCategory = (category: BreakdownCategory): string => {
    const categoryIds = category.options.map(opt => opt.id);
    const selected = selectedBreakdowns.find(id => categoryIds.includes(id));
    return selected || 'none';
  };

  // Handle selection change for a category
  const handleCategoryChange = (category: BreakdownCategory, value: string) => {
    const categoryIds = category.options.map(opt => opt.id);
    
    // Remove any existing selection from this category
    const withoutCategory = selectedBreakdowns.filter(id => !categoryIds.includes(id));
    
    // Add new selection if not "none"
    if (value === 'none') {
      onChange(withoutCategory);
    } else {
      onChange([...withoutCategory, value as BreakdownType]);
    }
  };

  return (
    <div className="flex items-center gap-2.5 px-6 py-3 border-b border-border" data-testid="breakdowns-panel">
      {BREAKDOWN_CATEGORIES.map((category) => (
        <div key={category.name} className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground text-right" style={{ minWidth: '100px', maxWidth: '100px', lineHeight: '1.2' }}>
            {category.name}
          </span>
          <Select
            value={getSelectedForCategory(category)}
            onValueChange={(value) => handleCategoryChange(category, value)}
          >
            <SelectTrigger 
              className="w-[117px] h-8 text-sm" 
              data-testid={`select-breakdown-${category.name.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-')}`}
            >
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="none" data-testid={`breakdown-option-none-${category.name}`}>
                None
              </SelectItem>
              {category.options.map((option) => (
                <SelectItem 
                  key={option.id} 
                  value={option.id}
                  data-testid={`breakdown-option-${option.id}`}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
