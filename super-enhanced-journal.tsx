import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, Users } from "lucide-react";

interface SystemStatus {
  database: 'online' | 'offline' | 'degraded';
  websocket: 'connected' | 'disconnected' | 'reconnecting';
  api: 'healthy' | 'slow' | 'error';
  activeUsers: number;
  lastUpdated: Date;
}

export default function StatusIndicator() {
  const { connected } = useWebSocket();
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: 'online',
    websocket: connected ? 'connected' : 'disconnected',
    api: 'healthy',
    activeUsers: 1,
    lastUpdated: new Date()
  });

  useEffect(() => {
    setSystemStatus(prev => ({
      ...prev,
      websocket: connected ? 'connected' : 'disconnected',
      lastUpdated: new Date()
    }));
  }, [connected]);

  // Check API health periodically
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health');
        setSystemStatus(prev => ({
          ...prev,
          api: response.ok ? 'healthy' : 'error',
          lastUpdated: new Date()
        }));
      } catch (error) {
        setSystemStatus(prev => ({
          ...prev,
          api: 'error',
          lastUpdated: new Date()
        }));
      }
    };

    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    checkHealth(); // Initial check

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (systemStatus.websocket === 'disconnected' || systemStatus.api === 'error') {
      return 'destructive';
    }
    if (systemStatus.websocket === 'reconnecting' || systemStatus.api === 'slow') {
      return 'secondary';
    }
    return 'default';
  };

  const getStatusIcon = () => {
    if (systemStatus.websocket === 'disconnected' || systemStatus.api === 'error') {
      return <WifiOff className="h-3 w-3" />;
    }
    if (systemStatus.websocket === 'reconnecting') {
      return <RefreshCw className="h-3 w-3 animate-spin" />;
    }
    return <Wifi className="h-3 w-3" />;
  };

  const getOverallStatus = () => {
    if (systemStatus.websocket === 'disconnected' || systemStatus.api === 'error') {
      return 'Offline';
    }
    if (systemStatus.websocket === 'reconnecting' || systemStatus.api === 'slow') {
      return 'Degraded';
    }
    return 'Online';
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          {getStatusIcon()}
          <span className="ml-1 text-xs hidden md:inline">
            {getOverallStatus()}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">System Status</h3>
            <Badge variant={getStatusColor()}>
              {getOverallStatus()}
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {systemStatus.api === 'healthy' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">API Server</span>
              </div>
              <Badge variant={systemStatus.api === 'healthy' ? 'default' : 'destructive'} className="text-xs">
                {systemStatus.api}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {systemStatus.database === 'online' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Database</span>
              </div>
              <Badge variant={systemStatus.database === 'online' ? 'default' : 'destructive'} className="text-xs">
                {systemStatus.database}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {connected ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Real-time Connection</span>
              </div>
              <Badge variant={connected ? 'default' : 'destructive'} className="text-xs">
                {systemStatus.websocket}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Active Users</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {systemStatus.activeUsers}
              </Badge>
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Last updated: {systemStatus.lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}