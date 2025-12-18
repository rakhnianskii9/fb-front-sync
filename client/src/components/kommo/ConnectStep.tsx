import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, Lock, RefreshCw } from "lucide-react";
import type { KommoConnectionStatus } from "./types";

interface ConnectStepProps {
  status: KommoConnectionStatus;
  accountDomain?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  isLoading?: boolean;
}

/**
 * Шаг 1: Подключение к Kommo CRM через OAuth 2.0
 * Показывает статус подключения и кнопку для авторизации
 * Макет по Zkommo1.html
 */
export function ConnectStep({ status, accountDomain, onConnect, onDisconnect, isLoading }: ConnectStepProps) {
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  return (
    <div className="flex-1 p-10 md:p-14 flex flex-col items-center justify-center">
      {/* Иконки интеграции - большие 88px как в макете */}
      <div className="flex items-center gap-8 mb-10">
        {/* ARPU Icon — серая подложка с логотипом R внутри (как у Kommo) */}
        <div className="size-[88px] bg-muted rounded-2xl flex items-center justify-center shadow-sm border border-border">
          <img 
            src="/fb/images/r-logo.png" 
            alt="ARPU" 
            className="w-14 h-14 object-contain"
          />
        </div>

        {/* Стрелка синхронизации */}
        <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
          <RefreshCw className={cn("w-7 h-7", isConnecting && "animate-spin")} />
        </div>

        {/* Kommo Icon - настоящий логотип */}
        <div className="size-[88px] bg-muted rounded-2xl flex items-center justify-center shadow-sm border border-border relative overflow-hidden">
          <img 
            src="/fb/images/kommo.png" 
            alt="Kommo" 
            className="w-14 h-14 object-contain"
          />
          {/* Индикатор статуса */}
          <div
            className={cn(
              "absolute top-3 right-3 size-2.5 rounded-full border-2 border-background",
              isConnected && "bg-status-online",
              isConnecting && "bg-status-away animate-pulse",
              status === 'disconnected' && "bg-muted-foreground",
              status === 'error' && "bg-status-busy"
            )}
          />
        </div>
      </div>

      {/* Текстовый блок */}
      <div className="text-center space-y-3 mb-10">
        {/* Бейдж статуса */}
        <div
          className={cn(
            "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-2",
            isConnected 
              ? "bg-status-online/10 border-status-online/20" 
              : "bg-muted border-border"
          )}
        >
          <div
            className={cn(
              "size-2 rounded-full",
              isConnected && "bg-status-online",
              isConnecting && "bg-status-away",
              status === 'disconnected' && "bg-muted-foreground",
              status === 'error' && "bg-status-busy"
            )}
          />
          <span
            className={cn(
              "text-xs font-bold uppercase tracking-wide",
              isConnected ? "text-status-online" : "text-muted-foreground"
            )}
          >
            {isConnected && "Connected"}
            {isConnecting && "Connecting..."}
            {status === 'disconnected' && "Not Connected"}
            {status === 'error' && "Error"}
          </span>
        </div>

        <h3 className="text-h1 text-foreground">
          {isConnected 
            ? `Connected to ${accountDomain || 'Kommo'}`
            : "Connect your Kommo CRM"
          }
        </h3>
        <p className="text-body text-muted-foreground max-w-sm mx-auto">
          {isConnected
            ? "Your Kommo account is successfully connected. You can proceed to configure synchronization."
            : "Establish a secure OAuth 2.0 connection to start syncing your leads and events automatically."
          }
        </p>
      </div>

      {/* Кнопка действия - зелёная как в макете */}
      {isConnected ? (
        <Button
          variant="outline"
          size="lg"
          onClick={onDisconnect}
          className="w-full max-w-[320px] h-14 text-h3 transition-colors"
        >
          Disconnect
        </Button>
      ) : (
        <Button
          size="lg"
          onClick={onConnect}
          disabled={isConnecting}
          className="group w-full max-w-[320px] h-14 text-h3 shadow-lg transition-all active:scale-[0.98] bg-status-online hover:bg-status-online/90 text-white"
        >
          <Link className="w-5 h-5 mr-3" />
          {isConnecting ? "Connecting..." : "Connect Kommo"}
        </Button>
      )}

      {/* Secure badge */}
      <div className="mt-6 flex items-center gap-2 text-body-sm text-muted-foreground">
        <Lock className="w-4 h-4" />
        <span>Secure End-to-End Encryption</span>
      </div>
    </div>
  );
}
