/**
 * HistogramWidget — Histogram/Distribution chart
 * 
 * Показывает распределение значений:
 * - Time to Convert (дни до конверсии)
 * - Touch Frequency (количество касаний)
 * - Spend Distribution
 * - CPR Distribution
 * 
 * ECharts: https://echarts.apache.org/examples/en/editor.html?c=bar-simple
 */

import { memo, useState, useMemo } from 'react';
import { WidgetWrapper } from './WidgetWrapper';
import { useWidgetCache, type WidgetRequest } from '@/hooks/useWidgetCache';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/formatters';

// Типы распределений
const DISTRIBUTION_TYPES = [
  { id: 'time_to_convert', label: 'Time to Convert', unit: 'days' },
  { id: 'touch_frequency', label: 'Touch Frequency', unit: 'touches' },
  { id: 'spend_distribution', label: 'Spend Distribution', unit: '$' },
  { id: 'cpr_distribution', label: 'CPR Distribution', unit: '$' },
];

interface HistogramWidgetProps {
  workspaceId: string | undefined;
  reportId: string | undefined;
  dateFrom: string;
  dateTo: string;
  accountIds: string[];
  attribution?: string;
  distributionType?: string;
  title?: string;
  color?: string;
}

export const HistogramWidget = memo(function HistogramWidget({
  workspaceId,
  reportId,
  dateFrom,
  dateTo,
  accountIds,
  attribution = '7d_click_1d_view',
  distributionType = 'time_to_convert',
  title,
  color = '#3b82f6',
}: HistogramWidgetProps) {
  const [selectedType, setSelectedType] = useState(distributionType);
  
  const widgetId = `histogram-${reportId}-${dateFrom}-${dateTo}-${selectedType}`;
  
  // Запрос данных
  const request: WidgetRequest = {
    widgetId,
    widgetType: 'histogram' as any,
    entityType: 'campaign',
    workspaceId,
    reportId,
    dateFrom,
    dateTo,
    attribution,
    accountIds,
    metricIds: ['conversions'],
    filters: {
      distribution: selectedType,
    } as any,
  };
  
  const { data, isLoading, error, refetch } = useWidgetCache(request, {
    enabled: Boolean(workspaceId && reportId && accountIds.length > 0),
  });
  
  // Обработка данных
  const chartData = useMemo(() => {
    if (!data?.buckets) {
      // Mock data для Time to Convert
      if (selectedType === 'time_to_convert') {
        return [
          { bucket: '0-1d', count: 156, percent: 25 },
          { bucket: '1-3d', count: 234, percent: 38 },
          { bucket: '3-7d', count: 145, percent: 23 },
          { bucket: '7-14d', count: 56, percent: 9 },
          { bucket: '14-30d', count: 28, percent: 5 },
        ];
      }
      // Mock для Touch Frequency
      if (selectedType === 'touch_frequency') {
        return [
          { bucket: '1 touch', count: 278, percent: 45 },
          { bucket: '2 touches', count: 217, percent: 35 },
          { bucket: '3 touches', count: 89, percent: 14 },
          { bucket: '4+ touches', count: 35, percent: 6 },
        ];
      }
      return [];
    }
    
    return data.buckets;
  }, [data, selectedType]);
  
  const typeConfig = DISTRIBUTION_TYPES.find(t => t.id === selectedType);
  const displayTitle = title || typeConfig?.label || 'Distribution';
  
  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    
    return (
      <Card className="p-2 shadow-lg">
        <p className="font-medium text-sm">{d.bucket}</p>
        <p className="text-xs text-muted-foreground">
          {formatNumber(d.count)} ({d.percent}%)
        </p>
      </Card>
    );
  };
  
  return (
    <WidgetWrapper
      widgetId={widgetId}
      title={displayTitle}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      headerAction={
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="h-7 w-[150px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DISTRIBUTION_TYPES.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis 
              dataKey="bucket" 
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-30}
              textAnchor="end"
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => formatNumber(v)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={index} 
                  fill={color}
                  fillOpacity={0.6 + (entry.percent / 100) * 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </WidgetWrapper>
  );
});

export default HistogramWidget;
