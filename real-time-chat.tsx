import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  XCircle,
  GitMerge
} from 'lucide-react';
import { format } from 'date-fns';
import { useOfflineSync } from '@/hooks/use-offline-sync';

export default function OfflineSyncStatus() {
  const [showDetails, setShowDetails] = useState(false);
  const { 
    isOnline, 
    pendingChanges, 
    conflicts, 
    isSyncing, 
    syncChanges, 
    resolveConflict 
  } = useOfflineSync();

  const getStatusColor = () => {
    if (!isOnline) return 'destructive';
    if (conflicts.length > 0) return 'secondary';
    if (pendingChanges.length > 0) return 'outline';
    return 'default';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (conflicts.length > 0) return `${conflicts.length} Conflicts`;
    if (pendingChanges.length > 0) return `${pendingChanges.length} Pending`;
    return 'Synced';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-3 w-3" />;
    if (conflicts.length > 0) return <AlertTriangle className="h-3 w-3" />;
    if (pendingChanges.length > 0) return <Clock className="h-3 w-3" />;
    return <Wifi className="h-3 w-3" />;
  };

  return (
    <>
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogTrigger asChild>
          <Badge 
            variant={getStatusColor()} 
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            {getStatusIcon()}
            {getStatusText()}
          </Badge>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getStatusIcon()}
              Sync Status
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">
                  {isOnline ? 'Online' : 'Offline Mode'}
                </span>
              </div>
              
              {isOnline && (
                <Button 
                  onClick={syncChanges} 
                  disabled={isSyncing || pendingChanges.length === 0}
                  variant="outline" 
                  size="sm"
                >
                  {isSyncing ? (
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Sync Now
                </Button>
              )}
            </div>

            {/* Pending Changes */}
            {pendingChanges.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">Pending Changes ({pendingChanges.length})</span>
                </div>
                <ScrollArea className="h-32 border rounded-lg p-2">
                  <div className="space-y-2">
                    {pendingChanges.map((change) => (
                      <div key={change.id} className="text-sm p-2 bg-muted/50 rounded">
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">{change.type}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(change.timestamp), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {change.data.title || 'Untitled'}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Conflicts */}
            {conflicts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-medium">Conflicts ({conflicts.length})</span>
                </div>
                <ScrollArea className="h-40 border rounded-lg p-2">
                  <div className="space-y-3">
                    {conflicts.map((conflict) => (
                      <div key={conflict.id} className="border rounded-lg p-3 bg-red-50 dark:bg-red-950/20">
                        <div className="font-medium text-sm mb-2">
                          {conflict.localChange.data.title || 'Untitled'}
                        </div>
                        <div className="text-xs text-muted-foreground mb-3">
                          Local changes conflict with server version
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => resolveConflict(conflict.id, 'local')}
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                          >
                            Keep Local
                          </Button>
                          <Button 
                            onClick={() => resolveConflict(conflict.id, 'server')}
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                          >
                            Keep Server
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* No Issues */}
            {isOnline && pendingChanges.length === 0 && conflicts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>Everything is synced</p>
                <p className="text-sm">All changes have been saved to the server</p>
              </div>
            )}

            {/* Offline Message */}
            {!isOnline && (
              <div className="text-center py-8 text-muted-foreground">
                <WifiOff className="h-12 w-12 mx-auto mb-2" />
                <p>Working offline</p>
                <p className="text-sm">Changes will sync when connection is restored</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}