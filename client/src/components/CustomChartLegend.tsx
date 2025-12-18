import { CHART_COLORS } from "./ChartWidgets";

interface CustomChartLegendProps {
  metricKeys: string[];
  metricLabels: Record<string, string>;
  showComparison?: boolean;
  colors?: string[];
}

export function CustomChartLegend({ 
  metricKeys, 
  metricLabels, 
  showComparison = false,
  colors = CHART_COLORS 
}: CustomChartLegendProps) {
  const displayMetrics = metricKeys.slice(0, 5);

  return (
    <div className="flex items-center justify-center gap-x-2 text-xs mt-3 px-2">
      {displayMetrics.map((key, idx) => {
        const color = colors[idx % colors.length];
        const metricName = metricLabels[key] || key;

        return (
          <div key={key} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1 min-w-0 flex-shrink-0">
              {showComparison ? (
                <>
                  <div className="flex items-center gap-2 w-full justify-center">
                    <span className="text-[10px] font-medium text-foreground">A</span>
                    <span className="text-[10px] font-medium text-foreground">B</span>
                  </div>
                  <div className="flex items-center gap-2 w-full justify-center">
                    <svg width="14" height="2" className="shrink-0">
                      <line 
                        x1="0" 
                        y1="1" 
                        x2="14" 
                        y2="1" 
                        stroke={color} 
                        strokeWidth="2"
                        strokeDasharray="3 2"
                      />
                    </svg>
                    <svg width="14" height="2" className="shrink-0">
                      <line 
                        x1="0" 
                        y1="1" 
                        x2="14" 
                        y2="1" 
                        stroke={color} 
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center w-full">
                  <svg width="16" height="2">
                    <line 
                      x1="0" 
                      y1="1" 
                      x2="16" 
                      y2="1" 
                      stroke={color} 
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              )}
              
              <span className="text-[10px] text-foreground font-medium text-center truncate max-w-[80px]" title={metricName}>
                {metricName}
              </span>
            </div>
            {idx < displayMetrics.length - 1 && (
              <div className="text-muted-foreground/30 text-sm">|</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
