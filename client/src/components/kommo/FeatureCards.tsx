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
      title: "Воронки и статусы",
      description: "События обновляются мгновенно на обеих платформах.",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Users,
      title: "Пользователи (менеджеры)",
      description: "Контролируйте, какие лиды импортируются на основе этапов воронки.",
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      icon: History,
      title: "Кастомные поля",
      description: "Отслеживайте все действия синхронизации и ошибки легко.",
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
