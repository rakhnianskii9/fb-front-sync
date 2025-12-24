import { cn } from "@/lib/utils";
import { RefreshCw, Users, History } from "lucide-react";

interface FeatureCardsProps {
  className?: string;
}

/**
 * Информационные карточки о возможностях интеграции Kommo
 * Отображаются внизу страницы настройки
 */
export function FeatureCards({ className }: FeatureCardsProps) {
  const features = [
    {
      icon: RefreshCw,
      title: "Pipelines & statuses",
      description: "Events are synced instantly across both platforms.",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Users,
      title: "Users (managers)",
      description: "Control which leads are imported based on pipeline stages.",
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      icon: History,
      title: "Custom fields",
      description: "Track all sync actions and errors easily.",
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
  ];

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-6", className)}>
      {features.map((feature, index) => (
        <div
          key={index}
          className="p-6 rounded-xl border border-border bg-card flex flex-col gap-4 hover:border-primary/50 transition-colors group cursor-default shadow-sm"
        >
          <div className={cn("size-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform", feature.bgColor)}>
            <feature.icon className={cn("w-6 h-6", feature.color)} />
          </div>
          <div>
            <h3 className="font-bold text-body-lg text-foreground mb-2">{feature.title}</h3>
            <p className="text-body-sm text-muted-foreground leading-relaxed">{feature.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
