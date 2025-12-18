// Тип для payload элемента
interface TooltipPayload {
  value?: number | string;
  name?: string;
  color?: string;
  fill?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
}

interface SmartTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  formatNumber?: (value: number) => string;
}

// Metrics with their abbreviations
const METRIC_SHORTCUTS: Record<string, string> = {
  'Impressions': 'Imp',
  'Reach': 'Rch',
  'Clicks': 'Clk',
  'CTR': 'CTR',
  'Spend': 'Spd',
  'CPC': 'CPC',
  'Conversions': 'Cnv',
  'Cost per Conversion': 'CpC',
  'Frequency': 'Frq',
};

// Compact number formatting WITHOUT spaces (K, M)
function formatCompact(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 10000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(0) + 'K';
  }
  if (value >= 10) {
    return value.toFixed(0);
  }
  return value.toFixed(1);
}

function getShortLabel(fullName: string): string {
  // Remove "(Prev.)" if present
  const baseName = fullName.replace(/\s*\(Prev\.\)\s*/i, '').trim();
  return METRIC_SHORTCUTS[baseName] || baseName.slice(0, 3);
}

export function SmartTooltip({ 
  active, 
  payload,
  formatNumber = formatCompact
}: SmartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const date = (payload[0]?.payload as Record<string, unknown>)?.date as string | undefined;
  
  // Group metrics: main and (Prev.)
  const rows: Array<{ label: string; valueA?: string; valueB?: string; colorA?: string; colorB?: string; labelColor?: string }> = [];
  const processedLabels = new Set<string>();
  
  payload.forEach((entry) => {
    const entryName = entry.name || '';
    const isPrev = entryName.includes('(Prev.)');
    const baseName = entryName.replace(/\s*\(Prev\.\)\s*/i, '').trim();
    const shortLabel = getShortLabel(baseName);
    
    if (!processedLabels.has(baseName)) {
      processedLabels.add(baseName);
      
      // Find pair (main and Prev if exists)
      const mainEntry = payload.find((e) => !(e.name || '').includes('(Prev.)') && (e.name || '').trim() === baseName);
      const prevEntry = payload.find((e) => (e.name || '').includes('(Prev.)') && (e.name || '').replace(/\s*\(Prev\.\)\s*/i, '').trim() === baseName);
      
      rows.push({
        label: shortLabel,
        valueA: mainEntry && typeof mainEntry.value === 'number' ? formatNumber(mainEntry.value) : undefined,
        valueB: prevEntry && typeof prevEntry.value === 'number' ? formatNumber(prevEntry.value) : undefined,
        colorA: mainEntry?.color,
        colorB: prevEntry?.color,
        labelColor: mainEntry?.color, // Use main line color for label
      });
    }
  });

  const hasComparison = rows.some(r => r.valueB !== undefined);

  return (
    <div 
      className="rounded border border-border/60 bg-background/25 dark:bg-background/25 shadow-lg backdrop-blur-sm"
      style={{
        padding: '2px 3px',
        fontSize: '9px',
        minWidth: hasComparison ? '105px' : '65px'
      }}
      data-testid="smart-tooltip"
    >
      <div className="text-[9px] font-semibold text-muted-foreground mb-1 text-center border-b border-border/30 pb-0.5">
        {date}
      </div>
      
      {hasComparison ? (
        <table className="w-full border-collapse" style={{ fontSize: '9px' }}>
          <thead>
            <tr className="text-[8px] font-bold text-muted-foreground">
              <th className="text-left py-0.5"></th>
              <th className="text-right py-0.5 px-1 border-l border-border/30">A</th>
              <th className="text-right py-0.5 px-1 border-l border-border/30">B</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-border/20">
                <td className="font-semibold py-0.5 pr-1" style={{ color: row.labelColor }}>
                  {row.label}:
                </td>
                <td className="font-mono font-bold tabular-nums text-right py-0.5 px-1 border-l border-border/30">
                  {row.valueA || '-'}
                </td>
                <td className="font-mono font-bold tabular-nums text-right py-0.5 px-1 border-l border-border/30">
                  {row.valueB || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="space-y-0.5 pt-1">
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2">
              <span className="font-semibold" style={{ color: row.labelColor }}>
                {row.label}:
              </span>
              <span className="font-mono font-bold tabular-nums">
                {row.valueA}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
