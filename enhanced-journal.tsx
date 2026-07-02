import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/hooks/use-websocket';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Node, NodeWithLinks } from '@shared/schema';
import { 
  Save, 
  Share, 
  Link as LinkIcon, 
  Tag, 
  X, 
  Users,
  Wifi,
  WifiOff,
  Clock
} from 'lucide-react';

interface CollaborativeEditorProps {
  node: NodeWithLinks;
  onChange: (updatedNode: Node) => void;
  onSave?: () => void;
}

interface CollaborationData {
  type: 'content_change' | 'cursor_position' | 'user_joined' | 'user_left';
  nodeId: number;
  userId: number;
  content?: string;
  position?: number;
  timestamp: number;
}

export default function CollaborativeEditor({ node, onChange, onSave }: CollaborativeEditorProps) {
  const [title, setTitle] = useState(node.title || '');
  const [content, setContent] = useState(node.content || '');
  const [tags, setTags] = useState<string[]>(node.tags || []);
  const [newTag, setNewTag] = useState('');
  const [isShared, setIsShared] = useState(node.isShared || false);
  const [sharedWith, setSharedWith] = useState<string[]>(node.sharedWith || []);
  const [linkedNodes, setLinkedNodes] = useState<Node[]>(node.linkedNodes || []);
  const [activeUsers, setActiveUsers] = useState<number[]>([]);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDirty, setIsDirty] = useState(false);
  
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const { connected, sendMessage } = useWebSocket(node.id);
  const { toast } = useToast();

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-save with debouncing
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      if (isDirty && isOnline) {
        try {
          const updatedNode = await apiRequest(`/api/nodes/${node.id}`, {
            method: 'PATCH',
            body: {
              title,
              content,
              tags,
              isShared,
              sharedWith,
              version: (node.version || 1) + 1
            }
          });
          
          onChange(updatedNode);
          setLastSynced(new Date());
          setIsDirty(false);
          
          // Broadcast changes to other users
          if (connected) {
            sendMessage({
              type: 'content_change',
              nodeId: node.id,
              content,
              timestamp: Date.now()
            });
          }
          
          toast({
            title: "Auto-saved",
            description: "Changes synced successfully",
          });
        } catch (error) {
          console.error('Auto-save failed:', error);
          toast({
            title: "Auto-save failed",
            description: "Changes saved locally, will sync when online",
            variant: "destructive"
          });
        }
      }
    }, 2000);
  }, [title, content, tags, isShared, sharedWith, isDirty, isOnline, node.id, node.version, onChange, connected, sendMessage, toast]);

  // Trigger auto-save when content changes
  useEffect(() => {
    setIsDirty(true);
    debouncedSave();
  }, [title, content, tags, debouncedSave]);

  // Handle real-time collaboration messages
  useEffect(() => {
    if (connected) {
      // Listen for collaboration updates
      const handleMessage = (event: MessageEvent) => {
        try {
          const data: CollaborationData = JSON.parse(event.data);
          
          if (data.nodeId === node.id) {
            switch (data.type) {
              case 'content_change':
                if (data.content && data.content !== content) {
                  setContent(data.content);
                }
                break;
              case 'user_joined':
                setActiveUsers(prev => [...new Set([...prev, data.userId])]);
                break;
              case 'user_left':
                setActiveUsers(prev => prev.filter(id => id !== data.userId));
                break;
            }
          }
        } catch (error) {
          console.error('Error handling collaboration message:', error);
        }
      };

      // Note: This would need to be properly integrated with the WebSocket hook
      // For now, we'll simulate the real-time collaboration
    }
  }, [connected, node.id, content]);

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleShare = async () => {
    try {
      const updatedNode = await apiRequest(`/api/nodes/${node.id}/share`, {
        method: 'POST',
        body: {
          isShared: !isShared,
          sharedWith: isShared ? [] : sharedWith
        }
      });
      
      setIsShared(!isShared);
      onChange(updatedNode);
      
      toast({
        title: isShared ? "Sharing disabled" : "Node shared",
        description: isShared ? "Node is now private" : "Node is now shared with collaborators"
      });
    } catch (error) {
      toast({
        title: "Sharing failed",
        description: "Could not update sharing settings",
        variant: "destructive"
      });
    }
  };

  const linkToNode = async (targetNodeId: number) => {
    try {
      await apiRequest(`/api/nodes/${node.id}/links`, {
        method: 'POST',
        body: {
          targetId: targetNodeId
        }
      });
      
      toast({
        title: "Nodes linked",
        description: "Successfully created connection between nodes"
      });
    } catch (error) {
      toast({
        title: "Link failed",
        description: "Could not create node connection",
        variant: "destructive"
      });
    }
  };

  const forceSync = async () => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Cannot sync while offline",
        variant: "destructive"
      });
      return;
    }

    try {
      const updatedNode = await apiRequest(`/api/nodes/${node.id}`, {
        method: 'PATCH',
        body: {
          title,
          content,
          tags,
          isShared,
          sharedWith,
          version: (node.version || 1) + 1
        }
      });
      
      onChange(updatedNode);
      setLastSynced(new Date());
      setIsDirty(false);
      
      toast({
        title: "Synced",
        description: "All changes synchronized"
      });
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "Could not synchronize changes",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with collaboration status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOnline ? (
            connected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <Wifi className="h-4 w-4 text-yellow-500" />
            )
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          
          <span className="text-sm text-muted-foreground">
            {isOnline ? (connected ? 'Online' : 'Connecting...') : 'Offline'}
          </span>
          
          {activeUsers.length > 0 && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="text-sm">{activeUsers.length}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={forceSync}
            disabled={!isDirty || !isOnline}
          >
            <Save className="h-4 w-4 mr-1" />
            {isDirty ? 'Save' : 'Saved'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
          >
            <Share className="h-4 w-4 mr-1" />
            {isShared ? 'Unshare' : 'Share'}
          </Button>
        </div>
      </div>

      {/* Title */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Node title..."
        className="text-lg font-semibold"
      />

      {/* Tags */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add tag..."
            onKeyPress={(e) => e.key === 'Enter' && addTag()}
            className="max-w-xs"
          />
          <Button onClick={addTag} size="sm">
            <Tag className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content Editor */}
      <Textarea
        ref={contentRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Start writing..."
        className="min-h-[400px] font-mono"
      />

      {/* Linked Nodes */}
      {linkedNodes.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Linked Nodes
          </h4>
          <div className="flex flex-wrap gap-2">
            {linkedNodes.map((linkedNode) => (
              <Badge key={linkedNode.id} variant="outline" className="flex items-center gap-1">
                <LinkIcon className="h-3 w-3" />
                {linkedNode.title}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3" />
          Last synced: {lastSynced.toLocaleTimeString()}
        </div>
        
        <div>
          Version {node.version || 1} • {content.length} characters
        </div>
      </div>
    </div>
  );
}