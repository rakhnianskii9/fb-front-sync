import { AlertCircle } from 'lucide-react';

interface ChartWarningProps {
  message: string;
  reason?: string;
}

export function ChartWarning({ message, reason }: ChartWarningProps) {
  return (
    <div className="absolute top-2 left-2 right-2 bg-yellow-500/10 border border-yellow-500/50 rounded-md p-2 flex items-start gap-2 z-10 backdrop-blur-sm">
      <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-xs">
        <p className="text-yellow-600 dark:text-yellow-400 font-medium">
          {reason || 'Warning'}
        </p>
        <p className="text-muted-foreground mt-0.5">
          {message}
        </p>
      </div>
    </div>
  );
}
