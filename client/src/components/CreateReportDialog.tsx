import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface SelectionsData {
  accounts: string[];
  campaigns: string[];
  adsets: string[];
  ads: string[];
  creatives: string[];
}

interface CreateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selections: SelectionsData;
  onConfirm: (reportName: string) => void;
  isLoading?: boolean;
  defaultName?: string;
}

/**
 * Report creation confirmation dialog
 * Report-First Sync Architecture: warns about selections freeze
 */
export function CreateReportDialog({
  open,
  onOpenChange,
  selections,
  onConfirm,
  isLoading = false,
  defaultName = 'New Report',
}: CreateReportDialogProps) {
  const [reportName, setReportName] = useState(defaultName);

  // Reset name when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setReportName(defaultName);
    }
    onOpenChange(newOpen);
  };

  const handleConfirm = () => {
    if (reportName.trim()) {
      onConfirm(reportName.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && reportName.trim()) {
      e.preventDefault();
      handleConfirm();
    }
  };

  const isValid = reportName.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📊 Create Report
          </DialogTitle>
          <DialogDescription>
            After creation, data synchronization for the last 30 days will begin
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Report Name */}
          <div className="grid gap-2">
            <Label htmlFor="report-name">Report Name</Label>
            <Input
              id="report-name"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter report name"
              autoFocus
              data-testid="input-report-name"
            />
          </div>

          {/* Selected Objects */}
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Selected objects:</Label>
            <ul className="text-sm space-y-1 pl-4">
              <li className="flex justify-between">
                <span>Ad Accounts:</span>
                <span className="font-medium">{selections.accounts.length}</span>
              </li>
              <li className="flex justify-between">
                <span>Campaigns:</span>
                <span className="font-medium">{selections.campaigns.length}</span>
              </li>
              <li className="flex justify-between">
                <span>Ad Sets:</span>
                <span className="font-medium">{selections.adsets.length}</span>
              </li>
              <li className="flex justify-between">
                <span>Ads:</span>
                <span className="font-medium">{selections.ads.length}</span>
              </li>
              <li className="flex justify-between">
                <span>Creatives:</span>
                <span className="font-medium">{selections.creatives.length}</span>
              </li>
            </ul>
          </div>

          {/* Freeze Warning */}
          <Alert variant="destructive" className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Warning!</strong> After creating the report, object selection will be frozen. 
              Make sure you have selected everything you need.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            data-testid="button-confirm-create-report"
          >
            {isLoading ? 'Creating...' : '✓ Create Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateReportDialog;
