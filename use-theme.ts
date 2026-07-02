import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface OfflineChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  nodeId?: number;
  data: any;
  timestamp: number;
  synced: boolean;
}

interface SyncConflict {
  id: string;
  localChange: OfflineChange;
  serverData: any;
  resolved: boolean;
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingChanges, setPendingChanges] = useState<OfflineChange[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  // Load pending changes from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('offline-changes');
    if (stored) {
      try {
        setPendingChanges(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load offline changes:', error);
      }
    }
  }, []);

  // Save pending changes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('offline-changes', JSON.stringify(pendingChanges));
  }, [pendingChanges]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      if (pendingChanges.length > 0) {
        syncChanges();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingChanges.length]);

  // Add a change to the offline queue
  const addOfflineChange = useCallback((change: Omit<OfflineChange, 'id' | 'timestamp' | 'synced'>) => {
    const offlineChange: OfflineChange = {
      ...change,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      synced: false,
    };

    setPendingChanges(prev => [...prev, offlineChange]);
    return offlineChange.id;
  }, []);

  // Sync all pending changes
  const syncChanges = useCallback(async () => {
    if (!isOnline || isSyncing || pendingChanges.length === 0) return;

    setIsSyncing(true);
    const newConflicts: SyncConflict[] = [];

    try {
      for (const change of pendingChanges.filter(c => !c.synced)) {
        try {
          let response;
          
          switch (change.type) {
            case 'create':
              response = await apiRequest('POST', '/api/nodes', change.data);
              break;
            case 'update':
              response = await apiRequest('PATCH', `/api/nodes/${change.nodeId}`, change.data);
              break;
            case 'delete':
              response = await apiRequest('DELETE', `/api/nodes/${change.nodeId}`);
              break;
          }

          // Mark as synced
          setPendingChanges(prev => 
            prev.map(c => c.id === change.id ? { ...c, synced: true } : c)
          );

        } catch (error: any) {
          // Handle conflicts (409 status code typically indicates conflict)
          if (error.message.includes('409') || error.message.includes('conflict')) {
            try {
              // Fetch current server data to show conflict
              const serverData = await fetch(`/api/nodes/${change.nodeId}`).then(r => r.json());
              
              newConflicts.push({
                id: change.id,
                localChange: change,
                serverData,
                resolved: false,
              });
            } catch (fetchError) {
              console.error('Failed to fetch server data for conflict:', fetchError);
            }
          } else {
            console.error('Sync error for change:', change.id, error);
          }
        }
      }

      if (newConflicts.length > 0) {
        setConflicts(prev => [...prev, ...newConflicts]);
      }

      // Remove synced changes
      setPendingChanges(prev => prev.filter(c => !c.synced));
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/nodes'] });

    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, pendingChanges, queryClient]);

  // Resolve a conflict by choosing local or server version
  const resolveConflict = useCallback(async (conflictId: string, resolution: 'local' | 'server') => {
    const conflict = conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    try {
      if (resolution === 'local') {
        // Apply local changes to server
        await apiRequest('PATCH', `/api/nodes/${conflict.localChange.nodeId}`, {
          ...conflict.localChange.data,
          forceUpdate: true, // Flag to force update despite conflicts
        });
      }
      // If server resolution, we just discard the local change

      // Mark conflict as resolved
      setConflicts(prev => prev.filter(c => c.id !== conflictId));
      
      // Remove the conflicted change from pending
      setPendingChanges(prev => prev.filter(c => c.id !== conflictId));
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/nodes'] });

    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  }, [conflicts, queryClient]);

  // Manual sync trigger
  const forcSync = useCallback(() => {
    if (isOnline) {
      syncChanges();
    }
  }, [isOnline, syncChanges]);

  // Get offline-capable save function
  const saveOffline = useCallback(async (nodeId: number | null, data: any) => {
    if (isOnline) {
      // Try online save first
      try {
        if (nodeId) {
          return await apiRequest('PATCH', `/api/nodes/${nodeId}`, data);
        } else {
          return await apiRequest('POST', '/api/nodes', data);
        }
      } catch (error) {
        // Fall back to offline if online save fails
        addOfflineChange({
          type: nodeId ? 'update' : 'create',
          nodeId: nodeId || undefined,
          data,
        });
        return { offline: true };
      }
    } else {
      // Save offline
      addOfflineChange({
        type: nodeId ? 'update' : 'create',
        nodeId: nodeId || undefined,
        data,
      });
      return { offline: true };
    }
  }, [isOnline, addOfflineChange]);

  return {
    isOnline,
    pendingChanges: pendingChanges.filter(c => !c.synced),
    conflicts,
    isSyncing,
    syncChanges: forcSync,
    resolveConflict,
    saveOffline,
    addOfflineChange,
  };
}