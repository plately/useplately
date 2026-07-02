import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/use-websocket';
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
  Clock,
  Plus,
  Search,
  MessageSquare,
  Calendar,
  FileText
} from 'lucide-react';

interface EnhancedJournalProps {
  nodeId: number;
}

export default function EnhancedJournal({ nodeId }: EnhancedJournalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [linkedNodes, setLinkedNodes] = useState<Node[]>([]);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeCollaborators, setActiveCollaborators] = useState<number[]>([]);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const { connected, joinNode, sendUpdate } = useWebSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current node data
  const { data: node, isLoading } = useQuery({
    queryKey: [`/api/nodes/${nodeId}`],
    enabled: !!nodeId
  });

  // Search for nodes to link
  const { data: searchResults = [] } = useQuery({
    queryKey: [`/api/nodes/search`, searchQuery],
    enabled: searchQuery.length > 2
  });

  // Update node mutation
  const updateNodeMutation = useMutation({
    mutationFn: async (updates: Partial<Node>) => {
      return await apiRequest(`/api/nodes/${nodeId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/nodes/${nodeId}`] });
      setIsDirty(false);
      toast({
        title: "Saved",
        description: "Node updated successfully"
      });
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "Could not save changes",
        variant: "destructive"
      });
    }
  });

  // Create node link mutation
  const linkNodeMutation = useMutation({
    mutationFn: async (targetNodeId: number) => {
      return await apiRequest(`/api/nodes/${nodeId}/links`, {
        method: 'POST',
        body: JSON.stringify({ targetId: targetNodeId }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/nodes/${nodeId}`] });
      toast({
        title: "Linked",
        description: "Nodes connected successfully"
      });
      setShowLinkDialog(false);
    }
  });

  // Initialize data when node loads
  useEffect(() => {
    if (node) {
      setTitle(node.title || '');
      setContent(node.content || '');
      setTags(node.tags || []);
      setIsShared(node.isShared || false);
      setLinkedNodes(node.linkedNodes || []);
    }
  }, [node]);

  // Join WebSocket room for real-time collaboration
  useEffect(() => {
    if (nodeId && connected) {
      joinNode(nodeId);
    }
  }, [nodeId, connected, joinNode]);

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
    
    saveTimeoutRef.current = setTimeout(() => {
      if (isDirty && isOnline) {
        updateNodeMutation.mutate({
          title,
          content,
          tags,
          isShared,
          version: (node?.version || 1) + 1
        });
        
        // Send real-time update to collaborators
        if (connected) {
          sendUpdate({
            type: 'content_change',
            nodeId,
            content,
            title,
            tags
          });
        }
      }
    }, 2000);
  }, [title, content, tags, isShared, isDirty, isOnline, updateNodeMutation, node?.version, connected, sendUpdate, nodeId]);

  // Trigger auto-save when content changes
  useEffect(() => {
    if (node) { // Only set dirty if we have initial data
      setIsDirty(true);
      debouncedSave();
    }
  }, [title, content, tags, debouncedSave, node]);

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleShare = () => {
    setIsShared(!isShared);
    setIsDirty(true);
  };

  const handleLinkNode = (targetNodeId: number) => {
    linkNodeMutation.mutate(targetNodeId);
  };

  const forceSync = () => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Cannot sync while offline",
        variant: "destructive"
      });
      return;
    }

    updateNodeMutation.mutate({
      title,
      content,
      tags,
      isShared,
      version: (node?.version || 1) + 1
    });
  };

  if (isLoading) {
    return <div className="p-6">Loading journal...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header with collaboration status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
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
          </div>
          
          {activeCollaborators.length > 0 && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="text-sm">{activeCollaborators.length} collaborators</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={forceSync}
            disabled={!isDirty || !isOnline || updateNodeMutation.isPending}
          >
            <Save className="h-4 w-4 mr-1" />
            {updateNodeMutation.isPending ? 'Saving...' : isDirty ? 'Save' : 'Saved'}
          </Button>
          
          <Button
            variant={isShared ? "default" : "outline"}
            size="sm"
            onClick={handleShare}
          >
            <Share className="h-4 w-4 mr-1" />
            {isShared ? 'Shared' : 'Share'}
          </Button>
          
          <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <LinkIcon className="h-4 w-4 mr-1" />
                Link Node
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Link to Another Node</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Search className="h-4 w-4 mt-3 text-muted-foreground" />
                  <Input
                    placeholder="Search nodes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {searchResults.map((searchNode: Node) => (
                    <div
                      key={searchNode.id}
                      className="flex items-center justify-between p-2 border rounded hover:bg-muted"
                    >
                      <div>
                        <div className="font-medium">{searchNode.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {searchNode.nodeType} • {new Date(searchNode.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleLinkNode(searchNode.id)}
                        disabled={linkedNodes.some(ln => ln.id === searchNode.id)}
                      >
                        {linkedNodes.some(ln => ln.id === searchNode.id) ? 'Linked' : 'Link'}
                      </Button>
                    </div>
                  ))}
                  
                  {searchQuery.length > 2 && searchResults.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      No nodes found
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Title */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Journal title..."
        className="text-xl font-semibold"
      />

      {/* Tags */}
      <div className="space-y-3">
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
        
        <div className="flex gap-2 max-w-sm">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add tag..."
            onKeyPress={(e) => e.key === 'Enter' && addTag()}
          />
          <Button onClick={addTag} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content Editor */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Content</label>
        <Textarea
          ref={contentRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing your journal entry..."
          className="min-h-[500px] font-mono"
        />
      </div>

      {/* Linked Nodes */}
      {linkedNodes.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Linked Nodes ({linkedNodes.length})
          </h4>
          <div className="grid gap-2">
            {linkedNodes.map((linkedNode) => (
              <div key={linkedNode.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  {linkedNode.nodeType === 'journal' && <FileText className="h-4 w-4" />}
                  {linkedNode.nodeType === 'task' && <Calendar className="h-4 w-4" />}
                  {linkedNode.nodeType === 'message' && <MessageSquare className="h-4 w-4" />}
                  
                  <div>
                    <div className="font-medium">{linkedNode.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {linkedNode.nodeType} • {new Date(linkedNode.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last saved: {node?.updatedAt ? new Date(node.updatedAt).toLocaleTimeString() : 'Never'}
          </div>
          
          {isShared && (
            <Badge variant="outline" className="text-xs">
              <Share className="h-3 w-3 mr-1" />
              Shared
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <span>Version {node?.version || 1}</span>
          <span>{content.length} characters</span>
          <span>{tags.length} tags</span>
        </div>
      </div>
    </div>
  );
}