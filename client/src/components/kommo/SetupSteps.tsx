import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface SetupStepsProps {
  currentStep: number;
  steps: { title: string; description: string }[];
  onStepClick?: (stepIndex: number) => void;
}

/**
 * Компонент боковой панели с шагами настройки
 * Отображает прогресс настройки Kommo интеграции с вертикальной линией соединения
 * Макет по Zkommo1.html
 */
export function SetupSteps({ currentStep, steps, onStepClick }: SetupStepsProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-body-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">
        Setup Steps
      </h3>
      <div className="relative flex flex-col">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const isLast = index === steps.length - 1;
          const isClickable = typeof onStepClick === 'function';

          const Container: any = isClickable ? 'button' : 'div';
          const containerProps = isClickable
            ? {
                type: 'button',
                onClick: () => onStepClick(index),
              }
            : {};

          return (
            <Container
              key={index}
              {...containerProps}
              className={cn(
                "relative flex gap-4 z-10 text-left",
                !isLast && "pb-8",
                isClickable && "w-full cursor-pointer"
              )}
            >
              {/* Вертикальная линия соединитель */}
              {!isLast && (
                <div 
                  className="absolute left-[15px] top-10 bottom-0 w-0.5 bg-border z-0" 
                />
              )}
              
              {/* Индикатор шага */}
              <div className="relative z-10 shrink-0">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-sm font-bold transition-all",
                    isCompleted && "bg-status-online text-white border border-status-online",
                    isActive && "border-2 border-status-online bg-status-online/10 text-status-online shadow-[0_0_0_3px_rgba(34,197,94,0.15)]",
                    !isActive && !isCompleted && "border border-muted-foreground/30 bg-card text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" strokeWidth={3} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
              </div>

              {/* Текст шага */}
              <div className="pt-0.5">
                <p
                  className={cn(
                    "text-sm font-bold leading-5 transition-colors",
                    isActive || isCompleted ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </p>
                <p 
                  className={cn(
                    "mt-1 text-xs leading-relaxed transition-colors",
                    isActive || isCompleted ? "text-muted-foreground" : "text-muted-foreground/60"
                  )}
                >
                  {step.description}
                </p>
              </div>
            </Container>
          );
        })}
      </div>
    </div>
  );
}
