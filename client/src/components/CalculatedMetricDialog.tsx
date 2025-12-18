import { useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { metricCategories, Metric } from "@/data/metrics";
import { Plus, WrapText, Search } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addCalculatedMetric } from "@/store/slices/calculatedMetricsSlice";
import { useToast } from "@/hooks/use-toast";

interface CalculatedMetricDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CalculatedMetricDialog({ open, onOpenChange }: CalculatedMetricDialogProps) {
  const dispatch = useAppDispatch();
  const currentProjectId = useAppSelector((state) => state.projects.currentProjectId);
  const { toast } = useToast();
  
  const [metricName, setMetricName] = useState("");
  const [format, setFormat] = useState<"number" | "currency">("number");
  const [currency, setCurrency] = useState("USD");
  const [formula, setFormula] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const metricsByCategory = useMemo(() => {
    const grouped: Record<string, Array<Metric & { categoryName: string; subcategoryName?: string }>> = {};
    
    metricCategories.forEach((category) => {
      if (category.id === 'calculated') return;
      
      const categoryKey = category.name;
      if (!grouped[categoryKey]) grouped[categoryKey] = [];

      if (category.subcategories) {
        category.subcategories.forEach((subcategory) => {
          subcategory.metrics.forEach((metric) => {
            grouped[categoryKey].push({
              ...metric,
              categoryName: category.name,
              subcategoryName: subcategory.name,
            });
          });
        });
      } else if (category.metrics) {
        category.metrics.forEach((metric) => {
          grouped[categoryKey].push({
            ...metric,
            categoryName: category.name,
          });
        });
      }
    });
    return grouped;
  }, []);

  const allMetrics = useMemo(() => {
    return Object.values(metricsByCategory).flat();
  }, [metricsByCategory]);

  const filteredMetricsByCategory = useMemo(() => {
    if (!searchValue) return metricsByCategory;
    
    const search = searchValue.toLowerCase();
    const filtered: typeof metricsByCategory = {};
    
    Object.entries(metricsByCategory).forEach(([category, metrics]) => {
      const matchingMetrics = metrics.filter(
        (metric) =>
          metric.name.toLowerCase().includes(search) ||
          metric.categoryName.toLowerCase().includes(search) ||
          metric.subcategoryName?.toLowerCase().includes(search)
      );
      if (matchingMetrics.length > 0) {
        filtered[category] = matchingMetrics;
      }
    });
    
    return filtered;
  }, [metricsByCategory, searchValue]);

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newFormula = formula.substring(0, start) + text + formula.substring(end);
    setFormula(newFormula);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const addMetric = (metric: Metric & { categoryName: string; subcategoryName?: string }) => {
    insertAtCursor(`{${metric.id}}`);
    setSearchOpen(false);
    setSearchValue("");
  };

  const addOperator = (operator: string) => {
    insertAtCursor(` ${operator} `);
  };

  const addNumber = () => {
    const num = prompt("Enter a number:");
    if (num && !isNaN(Number(num))) {
      insertAtCursor(num);
    }
  };

  const addBrackets = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formula.substring(start, end);

    if (selectedText) {
      // Wrap selected text in parentheses
      const newFormula = formula.substring(0, start) + `(${selectedText})` + formula.substring(end);
      setFormula(newFormula);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 1, start + 1 + selectedText.length);
      }, 0);
    } else {
      // Insert empty parentheses and place cursor between them
      const newFormula = formula.substring(0, start) + "()" + formula.substring(end);
      setFormula(newFormula);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 1, start + 1);
      }, 0);
    }
  };

  const validateFormula = (value: string): boolean => {
    // Allowed: digits, dot (for decimals), operators, parentheses, spaces, and {metric_id}
    // First remove all valid {metric_id} tokens
    const withoutMetrics = value.replace(/\{[a-z_][a-z0-9_]*\}/gi, '');
    // Check that only digits, dot, operators, parentheses and spaces remain
    const allowedPattern = /^[\d+\-*/(). ]*$/;
    return allowedPattern.test(withoutMetrics);
  };

  const handleFormulaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (validateFormula(newValue)) {
      setFormula(newValue);
    }
  };

  const validateBrackets = (value: string): boolean => {
    const stack: string[] = [];
    for (const char of value) {
      if (char === '(') {
        stack.push(char);
      } else if (char === ')') {
        if (stack.length === 0) {
          return false; // Closing parenthesis without opening
        }
        stack.pop();
      }
    }
    return stack.length === 0; // All parentheses closed
  };

  const handleSave = () => {
    if (!metricName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a metric name",
        variant: "destructive",
      });
      return;
    }
    if (!formula.trim()) {
      toast({
        title: "Error",
        description: "Please enter a formula",
        variant: "destructive",
      });
      return;
    }
    if (!currentProjectId) {
      toast({
        title: "Error",
        description: "Please select a project",
        variant: "destructive",
      });
      return;
    }

    if (!validateBrackets(formula)) {
      toast({
        title: "Error",
        description: "Invalid order or unbalanced parentheses in formula",
        variant: "destructive",
      });
      return;
    }

    const newMetric = {
      id: `metric_${Date.now()}`,
      name: metricName,
      format,
      currency: format === 'currency' ? currency : undefined,
      formula,
      projectId: currentProjectId,
      createdAt: new Date().toISOString(),
    };

    dispatch(addCalculatedMetric(newMetric));

    toast({
      title: "Metric Created",
      description: `"${metricName}" was saved successfully`,
    });

    onOpenChange(false);
    setMetricName("");
    setFormula("");
    setFormat("number");
    setCurrency("USD");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-calculated-metric">
        <DialogHeader>
          <DialogTitle>Create Calculated Metric</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="metric-name">Metric Name</Label>
            <Input
              id="metric-name"
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
              placeholder="For example: ROI, Custom CTR..."
              data-testid="input-metric-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Select value={format} onValueChange={(value: "number" | "currency") => setFormat(value)}>
                <SelectTrigger id="format" data-testid="select-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {format === 'currency' && (
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency" data-testid="select-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="RUB">RUB (₽)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="formula">Formula</Label>
            <Textarea
              ref={textareaRef}
              id="formula"
              value={formula}
              onChange={handleFormulaChange}
              placeholder="For example: ({spend} / {conversions}) * 100"
              className="font-mono min-h-[120px]"
              data-testid="textarea-formula"
            />
            <p className="text-xs text-muted-foreground">
              💡 Use {'{metric_id}'} to insert metrics. Supported operators: +, -, *, /, parentheses ()
            </p>

            <div className="flex flex-wrap gap-2">
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-add-metric">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Metric
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0 bg-white" align="start" side="bottom">
                  <div className="p-3 border-b bg-white">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search metric..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        className="pl-9 bg-white"
                        data-testid="input-search-metric"
                      />
                    </div>
                  </div>
                  <ScrollArea className="h-[400px] bg-white px-4">
                      {Object.entries(filteredMetricsByCategory).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No metrics found
                        </p>
                      ) : (
                        Object.entries(filteredMetricsByCategory).map(([categoryName, metrics]) => {
                          // Group by subcategory for proper rendering
                          const category = metricCategories.find(c => c.name === categoryName);
                          
                          if (category?.subcategories) {
                            return (
                              <div key={categoryName} className="mb-6 last:mb-0">
                                <h3 className="text-sm font-semibold mb-3 px-3">
                                  {categoryName}
                                </h3>
                                {category.subcategories.map((subcategory, index) => {
                                  const subcatMetrics = metrics.filter(m => m.subcategoryName === subcategory.name);
                                  if (subcatMetrics.length === 0) return null;
                                  
                                  return (
                                    <div key={`${categoryName}-subcategory-${index}`} className="mb-4 last:mb-0">
                                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-3">
                                        {subcategory.name}
                                      </h4>
                                      <div className="flex flex-col">
                                        {subcatMetrics.map((metric) => (
                                          <div key={metric.id} className="flex items-center space-x-2 px-3 py-2">
                                            <Checkbox
                                              id={`calc-${metric.id}`}
                                              checked={false}
                                              onCheckedChange={() => addMetric(metric)}
                                              data-testid={`checkbox-metric-${metric.id}`}
                                            />
                                            <label
                                              htmlFor={`calc-${metric.id}`}
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
                                })}
                              </div>
                            );
                          } else {
                            return (
                              <div key={categoryName} className="mb-6 last:mb-0">
                                <h3 className="text-sm font-semibold mb-3 px-3">
                                  {categoryName}
                                </h3>
                                <div className="flex flex-col">
                                  {metrics.map((metric) => (
                                    <div key={metric.id} className="flex items-center space-x-2 px-3 py-2">
                                      <Checkbox
                                        id={`calc-${metric.id}`}
                                        checked={false}
                                        onCheckedChange={() => addMetric(metric)}
                                        data-testid={`checkbox-metric-${metric.id}`}
                                      />
                                      <label
                                        htmlFor={`calc-${metric.id}`}
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
                        })
                      )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              <Button variant="outline" size="sm" onClick={addNumber} data-testid="button-add-number">
                <Plus className="w-4 h-4 mr-1" />
                Number
              </Button>

              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addOperator('+')}
                  data-testid="button-operator-add"
                >
                  +
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addOperator('-')}
                  data-testid="button-operator-subtract"
                >
                  -
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addOperator('*')}
                  data-testid="button-operator-multiply"
                >
                  ×
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addOperator('/')}
                  data-testid="button-operator-divide"
                >
                  ÷
                </Button>
              </div>

              <Button variant="outline" size="sm" onClick={addBrackets} data-testid="button-add-parentheses">
                <WrapText className="w-4 h-4 mr-1" />
                ( )
              </Button>
            </div>
          </div>

          <div className="bg-muted/30 p-4 rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Total available metrics:</strong> {allMetrics.length}
            </p>
            <p className="text-xs text-muted-foreground">
              Select a metric from the list, it will be inserted as {'{metric_id}'}. Use mathematical operators to create the formula.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
