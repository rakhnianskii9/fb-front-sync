import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PresetSelectorProps {
  activePresetName: string | null;
  isEditing: boolean;
  editedName: string;
  onEditedNameChange: (value: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onEditKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSelectClick: () => void;
  onSaveClick: () => void;
  disabled?: boolean;
  saveDisabled?: boolean;
  
  // Typography settings
  presetNameSize?: "sm" | "base" | "lg" | "xl";
  selectButtonSize?: "xs" | "sm" | "base";
  saveButtonHeight?: "sm" | "md" | "lg";
  
  className?: string;
}

const presetNameSizeClasses = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

const selectButtonSizeClasses = {
  xs: "text-[10px]",
  sm: "text-xs",
  base: "text-sm",
};

const saveButtonHeightClasses = {
  sm: "h-7",
  md: "h-8",
  lg: "h-9",
};

export function PresetSelector({
  activePresetName,
  isEditing,
  editedName,
  onEditedNameChange,
  onStartEdit,
  onSaveEdit,
  onEditKeyDown,
  onSelectClick,
  onSaveClick,
  disabled = false,
  saveDisabled = false,
  presetNameSize = "base",
  selectButtonSize = "xs",
  saveButtonHeight = "md",
  className,
}: PresetSelectorProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              value={editedName}
              onChange={(e) => onEditedNameChange(e.target.value)}
              onBlur={onSaveEdit}
              onKeyDown={onEditKeyDown}
              className="text-display-lg leading-none h-auto py-1 px-2"
              style={{ color: '#000000' }}
              autoFocus
              data-testid="input-preset-name"
              onFocus={(e) => e.target.select()}
            />
          ) : (
            <h1
              onClick={onStartEdit}
              className={cn(
                "text-display-lg leading-none cursor-pointer",
                disabled && "cursor-not-allowed"
              )}
              style={{ color: '#000000' }}
              data-testid="button-preset-name"
            >
              {activePresetName || "Your New Preset"}
            </h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={onSaveClick}
            disabled={saveDisabled}
            data-testid="button-add-preset"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={onSaveClick}
            disabled={saveDisabled}
            data-testid="button-save-preset"
          >
            <Save className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <button
        onClick={onSelectClick}
        className="text-body-sm text-muted-foreground hover:text-primary transition-colors text-left"
        data-testid="button-select-preset"
      >
        Select another preset
      </button>
    </div>
  );
}
