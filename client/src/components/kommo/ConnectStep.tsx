import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Link, Lock, RefreshCw, Eye, EyeOff, ExternalLink, HelpCircle } from "lucide-react";
import type { KommoConnectionStatus } from "./types";

export interface KommoCredentials {
  subdomain: string;
  clientId: string;
  clientSecret: string;
  authorizationCode: string;
}

interface ConnectStepProps {
  status: KommoConnectionStatus;
  accountDomain?: string;
  onConnect: (credentials: KommoCredentials) => void;
  onDisconnect: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

/**
 * Шаг 1: Подключение к Kommo CRM через OAuth 2.0
 * Private Integration: пользователь вводит свои client_id/client_secret
 */
export function ConnectStep({ status, accountDomain, onConnect, onDisconnect, isLoading, errorMessage }: ConnectStepProps) {
  const R_LOGO_SRC = `${import.meta.env.BASE_URL}images/R.png`;
  const KOMMO_LOGO_SRC = `${import.meta.env.BASE_URL}images/kommo.png`;

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  // Форма credentials для Private Integration
  const [credentials, setCredentials] = useState<KommoCredentials>({
    subdomain: '',
    clientId: '',
    clientSecret: '',
    authorizationCode: ''
  });
  const [showSecret, setShowSecret] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleConnect = () => {
    // Валидация
    if (!credentials.subdomain.trim()) {
      setValidationError('Please enter your Kommo subdomain');
      return;
    }
    if (!credentials.clientId.trim()) {
      setValidationError('Please enter your Integration ID');
      return;
    }
    if (!credentials.clientSecret.trim()) {
      setValidationError('Please enter your Secret key');
      return;
    }
    if (!credentials.authorizationCode.trim()) {
      setValidationError('Please enter the Authorization Code from Kommo');
      return;
    }
    
    setValidationError(null);
    onConnect({
      subdomain: credentials.subdomain.trim(),
      clientId: credentials.clientId.trim(),
      clientSecret: credentials.clientSecret.trim(),
      authorizationCode: credentials.authorizationCode.trim(),
    });
  };

  // Connected state - простой вид
  if (isConnected) {
    return (
      <div className="flex-1 p-10 md:p-14 flex flex-col items-center justify-center">
        {/* Иконки интеграции */}
        <div className="flex items-center gap-8 mb-10">
          <div className="size-[88px] bg-muted rounded-2xl flex items-center justify-center shadow-sm border border-border">
            <img src={R_LOGO_SRC} alt="R" className="w-14 h-14 object-contain" />
          </div>
          <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
            <RefreshCw className="w-7 h-7" />
          </div>
          <div className="size-[88px] bg-muted rounded-2xl flex items-center justify-center shadow-sm border border-border relative overflow-hidden">
            <img src={KOMMO_LOGO_SRC} alt="Kommo" className="w-14 h-14 object-contain" />
            <div className="absolute top-3 right-3 size-2.5 rounded-full border-2 border-background bg-status-online" />
          </div>
        </div>

        {/* Статус */}
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border bg-status-online/10 border-status-online/20">
            <div className="size-2 rounded-full bg-status-online" />
            <span className="text-xs font-bold uppercase tracking-wide text-status-online">Connected</span>
          </div>
          <h3 className="text-h1 text-foreground">Connected to {accountDomain || 'Kommo'}</h3>
          <p className="text-body text-muted-foreground max-w-sm mx-auto">
            Your Kommo account is successfully connected. You can proceed to configure synchronization.
          </p>
        </div>

        <Button
          variant="outline"
          size="lg"
          onClick={onDisconnect}
          className="w-full max-w-[320px] h-14 text-h3 transition-colors"
        >
          Disconnect
        </Button>

        <div className="mt-6 flex items-center gap-2 text-body-sm text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span>Secure End-to-End Encryption</span>
        </div>
      </div>
    );
  }

  // Disconnected state - форма с credentials
  return (
    <div className="flex-1 p-6 md:p-10 flex flex-col">
      {/* Иконки интеграции - компактнее */}
      <div className="flex items-center justify-center gap-6 mb-6">
        <div className="size-16 bg-muted rounded-xl flex items-center justify-center shadow-sm border border-border">
          <img src={R_LOGO_SRC} alt="R" className="w-10 h-10 object-contain" />
        </div>
        <div className="flex flex-col items-center text-muted-foreground/40">
          <RefreshCw className={cn("w-5 h-5", isConnecting && "animate-spin")} />
        </div>
        <div className="size-16 bg-muted rounded-xl flex items-center justify-center shadow-sm border border-border relative overflow-hidden">
          <img src={KOMMO_LOGO_SRC} alt="Kommo" className="w-10 h-10 object-contain" />
          <div className={cn(
            "absolute top-2 right-2 size-2 rounded-full border-2 border-background",
            isConnecting ? "bg-status-away animate-pulse" : "bg-muted-foreground"
          )} />
        </div>
      </div>

      {/* Заголовок */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-muted border-border mb-2">
          <div className={cn(
            "size-2 rounded-full",
            isConnecting ? "bg-status-away animate-pulse" : "bg-muted-foreground"
          )} />
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {isConnecting ? "Connecting..." : "Not Connected"}
          </span>
        </div>
        <h3 className="text-h2 text-foreground">Connect your Kommo CRM</h3>
        <p className="text-body-sm text-muted-foreground mt-1">
          Enter your Private Integration credentials
        </p>
      </div>

      {/* Форма credentials */}
      <div className="space-y-4 flex-1">
        {/* Subdomain */}
        <div className="space-y-1.5">
          <Label htmlFor="subdomain" className="text-body-sm font-medium">
            Kommo Subdomain
          </Label>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
              https://
            </span>
            <Input
              id="subdomain"
              placeholder="your-company"
              value={credentials.subdomain}
              onChange={(e) => setCredentials(prev => ({ ...prev, subdomain: e.target.value }))}
              className="rounded-l-none rounded-r-none flex-1"
              disabled={isConnecting}
            />
            <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-muted-foreground text-sm">
              .kommo.com
            </span>
          </div>
        </div>

        {/* Client ID */}
        <div className="space-y-1.5">
          <Label htmlFor="clientId" className="text-body-sm font-medium">
            Integration ID
          </Label>
          <Input
            id="clientId"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={credentials.clientId}
            onChange={(e) => setCredentials(prev => ({ ...prev, clientId: e.target.value }))}
            disabled={isConnecting}
          />
        </div>

        {/* Client Secret */}
        <div className="space-y-1.5">
          <Label htmlFor="clientSecret" className="text-body-sm font-medium">
            Secret key
          </Label>
          <div className="relative">
            <Input
              id="clientSecret"
              type={showSecret ? "text" : "password"}
              placeholder="••••••••••••••••"
              value={credentials.clientSecret}
              onChange={(e) => setCredentials(prev => ({ ...prev, clientSecret: e.target.value }))}
              className="pr-10"
              disabled={isConnecting}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowSecret(!showSecret)}
            >
              {showSecret ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
            </Button>
          </div>
        </div>

        {/* Authorization Code */}
        <div className="space-y-1.5">
          <Label htmlFor="authCode" className="text-body-sm font-medium">
            Authorization Code <span className="text-muted-foreground">(valid for 20 min)</span>
          </Label>
          <div className="relative">
            <Input
              id="authCode"
              type={showCode ? "text" : "password"}
              placeholder="def50200..."
              value={credentials.authorizationCode}
              onChange={(e) => setCredentials(prev => ({ ...prev, authorizationCode: e.target.value }))}
              className="pr-10 font-mono text-sm"
              disabled={isConnecting}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowCode(!showCode)}
            >
              {showCode ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
            </Button>
          </div>
        </div>

        {/* Validation / API error */}
        {validationError && (
          <p className="text-sm text-destructive">{validationError}</p>
        )}
        {errorMessage && !validationError && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}

        {/* Help link */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
          <HelpCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p className="mb-1">To get your credentials:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Go to your Kommo account → Settings → Integrations</li>
              <li>Click "Create Integration" → choose "Private"</li>
              <li>Copy Integration ID and Secret key from "Keys and scopes" tab</li>
              <li>Copy the Authorization code (it's valid for 20 minutes!)</li>
            </ol>
            <a 
              href="https://developers.kommo.com/docs/private-integration" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-primary hover:underline"
            >
              View documentation <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Connect button */}
      <div className="mt-6 space-y-3">
        <Button
          size="lg"
          onClick={handleConnect}
          disabled={isConnecting}
          className="group w-full h-12 text-h3 shadow-lg transition-all active:scale-[0.98] bg-status-online hover:bg-status-online/90 text-white"
        >
          <Link className="w-5 h-5 mr-3" />
          {isConnecting ? "Connecting..." : "Connect Kommo"}
        </Button>

        <div className="flex items-center justify-center gap-2 text-body-sm text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span>Credentials encrypted end-to-end</span>
        </div>
      </div>
    </div>
  );
}
