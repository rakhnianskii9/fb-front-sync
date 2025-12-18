import { useState, useEffect, useMemo, memo } from "react";
import logger from "@/lib/logger";
import { ZoomIn, X, Filter } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ObjectItem {
  id: string;
  name: string;
  subtitle?: string;
  imageUrl?: string;
}

interface ObjectSelectionPanelProps {
  title: string;
  count: number;
  items: ObjectItem[];
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

type SortDirection = 'asc' | 'desc';
type TextConditionOperator = 'contains' | 'not-contains' | 'equal';

type ColumnSort = {
  direction: SortDirection;
};

type TextCondition = {
  type: 'text';
  operator: TextConditionOperator;
  values: string[];  // Массив значений для множественного выбора
};

interface FilterMenuProps {
  currentSort: ColumnSort | null;
  currentCondition: TextCondition | null;
  onApplySort: (sort: ColumnSort | null) => void;
  onApplyCondition: (condition: TextCondition | null) => void;
  onClose?: () => void;
}

function FilterMenu({ currentSort, currentCondition, onApplySort, onApplyCondition, onClose }: FilterMenuProps) {
  const [sortDirection, setSortDirection] = useState<SortDirection | null>(currentSort?.direction || null);
  const [conditionOperator, setConditionOperator] = useState<string | null>(
    currentCondition ? currentCondition.operator : null
  );
  // Массив значений для contains/not-contains
  const [filterValues, setFilterValues] = useState<string[]>(
    currentCondition?.values || []
  );
  const [inputValue, setInputValue] = useState<string>('');

  const handleApplySort = () => {
    if (sortDirection) {
      onApplySort({ direction: sortDirection });
    } else {
      onApplySort(null);
    }
  };

  const handleApplyCondition = () => {
    if (conditionOperator && filterValues.length > 0) {
      onApplyCondition({ type: 'text', operator: conditionOperator as TextConditionOperator, values: filterValues });
    } else {
      onApplyCondition(null);
    }
  };

  const handleReset = () => {
    setSortDirection(null);
    setConditionOperator(null);
    setFilterValues([]);
    setInputValue('');
    onApplySort(null);
    onApplyCondition(null);
  };

  // Добавить значение в список (по Enter или кнопке)
  const handleAddValue = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !filterValues.includes(trimmed)) {
      setFilterValues([...filterValues, trimmed]);
      setInputValue('');
    }
  };

  // Удалить значение из списка
  const handleRemoveValue = (value: string) => {
    setFilterValues(filterValues.filter(v => v !== value));
  };

  // Обработка Enter в поле ввода
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddValue();
    }
  };

  const needsInput = conditionOperator && conditionOperator !== '';
  const isMultiValue = conditionOperator === 'contains' || conditionOperator === 'not-contains';

  return (
    <div className="w-72 p-3 space-y-3">
      <div className="space-y-2 pb-2 border-b border-border">
        <div className="text-sm font-medium">Sort</div>
        <div className="flex gap-1">
          <button
            onClick={() => setSortDirection(sortDirection === 'desc' ? null : 'desc')}
            className={`flex-1 px-2.5 py-1.5 text-sm text-center rounded-md transition-colors ${
              sortDirection === 'desc'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted border border-input'
            }`}
            data-testid="button-sort-desc"
          >
            Z→A
          </button>
          <button
            onClick={() => setSortDirection(sortDirection === 'asc' ? null : 'asc')}
            className={`flex-1 px-2.5 py-1.5 text-sm text-center rounded-md transition-colors ${
              sortDirection === 'asc'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted border border-input'
            }`}
            data-testid="button-sort-asc"
          >
            A→Z
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="text-sm font-medium">Conditions</div>
        <Select
          value={conditionOperator || ''}
          onValueChange={(value) => {
            setConditionOperator(value);
            // Сбрасываем значения при смене оператора
            setFilterValues([]);
            setInputValue('');
          }}
        >
          <SelectTrigger className="w-full" data-testid="select-condition">
            <SelectValue placeholder="Select condition" />
          </SelectTrigger>
          <SelectContent position="popper" className="z-[200] bg-background">
            <SelectItem value="contains" data-testid="option-condition-contains">Contains</SelectItem>
            <SelectItem value="not-contains" data-testid="option-condition-not-contains">Does not contain</SelectItem>
            <SelectItem value="equal" data-testid="option-condition-equal">Equal to</SelectItem>
          </SelectContent>
        </Select>
        
        {needsInput && (
          <div className="space-y-2">
            <Input
              placeholder={isMultiValue ? "Add value and press Enter" : "Enter text"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm"
              data-testid="input-filter-value"
            />
            
            {/* Показываем теги только для contains/not-contains */}
            {isMultiValue && filterValues.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {filterValues.map((value, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary" 
                    className="text-xs px-2 py-0.5 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleRemoveValue(value)}
                  >
                    {value}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Для equal - просто добавляем одно значение при вводе */}
            {conditionOperator === 'equal' && inputValue.trim() && (
              <div className="text-xs text-muted-foreground">
                Press Apply to filter by "{inputValue}"
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-1.5 pt-2">
        <Button size="sm" variant="outline" onClick={handleReset} className="flex-1 h-8 text-sm" data-testid="button-reset-filter">
          Reset
        </Button>
        <Button 
          size="sm" 
          onClick={() => {
            // Для equal добавляем одно значение из инпута
            if (conditionOperator === 'equal' && inputValue.trim()) {
              setFilterValues([inputValue.trim()]);
              onApplyCondition({ type: 'text', operator: 'equal', values: [inputValue.trim()] });
            } else {
              handleApplyCondition();
            }
            handleApplySort();
            onClose?.();
          }} 
          className="flex-1 h-8 text-sm"
          data-testid="button-apply-filter"
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

function ObjectSelectionPanelInner({
  title,
  count,
  items,
  selectedIds = [],
  onSelectionChange
}: ObjectSelectionPanelProps) {
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<ColumnSort | null>(null);
  const [condition, setCondition] = useState<TextCondition | null>(null);

  // Synchronize localSelectedIds with props when parent state changes
  useEffect(() => {
    setLocalSelectedIds(selectedIds);
  }, [selectedIds]);

  // Apply filtering and sorting to items
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Apply text condition (теперь с массивом значений)
    if (condition && condition.values.length > 0) {
      result = result.filter(item => {
        const searchText = `${item.name} ${item.subtitle || ''}`.toLowerCase();
        
        switch (condition.operator) {
          case 'contains':
            // Любое из значений должно содержаться (OR логика)
            return condition.values.some(val => searchText.includes(val.toLowerCase()));
          case 'not-contains':
            // Ни одно из значений не должно содержаться (AND логика)
            return condition.values.every(val => !searchText.includes(val.toLowerCase()));
          case 'equal':
            // Точное совпадение с любым из значений
            return condition.values.some(val => item.name.toLowerCase() === val.toLowerCase());
          default:
            return true;
        }
      });
    }

    // Apply sorting
    if (sort) {
      result.sort((a, b) => {
        const aVal = a.name.toLowerCase();
        const bVal = b.name.toLowerCase();
        
        if (sort.direction === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    return result;
  }, [items, sort, condition]);

  const handleToggle = (id: string) => {
    const newSelection = localSelectedIds.includes(id)
      ? localSelectedIds.filter(i => i !== id)
      : [...localSelectedIds, id];
    setLocalSelectedIds(newSelection);
    onSelectionChange?.(newSelection);
    logger.log(`Selection changed for ${title}:`, newSelection);
  };

  const handleSelectAll = () => {
    const newSelection = localSelectedIds.length === filteredAndSortedItems.length ? [] : filteredAndSortedItems.map(i => i.id);
    setLocalSelectedIds(newSelection);
    onSelectionChange?.(newSelection);
    logger.log(`Select all toggled for ${title}:`, newSelection);
  };

  const handleUnselectAll = () => {
    setLocalSelectedIds([]);
    onSelectionChange?.([]);
    logger.log(`Unselect all for ${title}`);
  };

  const hasFilter = sort || condition;

  return (
    <div className="flex flex-col h-full border-r border-border w-80 flex-shrink-0">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-h2 font-medium text-foreground">
              {title}
            </h2>
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <button 
                  className={`p-1 hover:bg-muted rounded ${hasFilter ? 'text-primary' : 'text-muted-foreground'} hover:text-foreground transition-colors`}
                  data-testid={`button-filter-${title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Filter className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto" align="start" sideOffset={5}>
                <FilterMenu
                  currentSort={sort}
                  currentCondition={condition}
                  onApplySort={setSort}
                  onApplyCondition={setCondition}
                  onClose={() => setFilterOpen(false)}
                />
              </PopoverContent>
            </Popover>
          </div>
          <span className="bg-muted text-muted-foreground px-2.5 py-1 rounded-md text-body-sm font-medium">
            {filteredAndSortedItems.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredAndSortedItems.map((item) => (
          <div
            key={item.id}
            className="w-full flex items-start gap-3 p-3 rounded-md hover-elevate active-elevate-2"
            data-testid={`item-${item.id}`}
          >
            <Checkbox
              checked={localSelectedIds.includes(item.id)}
              onCheckedChange={() => handleToggle(item.id)}
              className="mt-0.5 cursor-pointer"
              data-testid={`checkbox-item-${item.id}`}
            />
            {item.imageUrl && (
              <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-muted group">
                <img 
                  src={item.imageUrl} 
                  alt={item.name}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => handleToggle(item.id)}
                  data-testid={`img-item-${item.id}`}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomedImage(item.imageUrl || null);
                  }}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  data-testid={`button-zoom-${item.id}`}
                >
                  <ZoomIn className="w-5 h-5 text-white" />
                </button>
              </div>
            )}
            <div 
              onClick={() => handleToggle(item.id)}
              className="flex-1 min-w-0 cursor-pointer"
              data-testid={`button-toggle-item-${item.id}`}
            >
              <p className="text-body text-foreground font-medium">{item.name}</p>
              {item.subtitle && (
                <p className="text-body-sm text-muted-foreground">ID: {item.subtitle}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredAndSortedItems.length > 0 && (
        <div className="p-4 border-t border-border">
          {localSelectedIds.length === filteredAndSortedItems.length ? (
            <Button
              onClick={handleUnselectAll}
              variant="outline"
              className="w-full"
              data-testid="button-unselect-all"
            >
              Unselect All
            </Button>
          ) : (
            <Button
              onClick={handleSelectAll}
              variant="outline"
              className="w-full"
              data-testid="button-select-all"
            >
              Select All
            </Button>
          )}
        </div>
      )}
      
      <Dialog open={!!zoomedImage} onOpenChange={(open) => !open && setZoomedImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-transparent border-0">
          <div 
            className="relative w-full h-full flex items-center justify-center"
            onClick={() => setZoomedImage(null)}
          >
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors z-10"
              data-testid="button-close-zoom"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            {zoomedImage && (
              <img
                src={zoomedImage}
                alt="Preview"
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Мемоизированный ObjectSelectionPanel — предотвращает лишние ре-рендеры
const ObjectSelectionPanel = memo(ObjectSelectionPanelInner);
ObjectSelectionPanel.displayName = 'ObjectSelectionPanel';

export default ObjectSelectionPanel;
