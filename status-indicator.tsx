import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import NodeConnectionAnimation from '@/components/node-connection-animation';
import NodeGraphVisualizer from '@/components/node-graph-visualizer';
import OfflineSyncStatus from '@/components/offline-sync-status';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { 
  FileText, 
  Calendar, 
  Search, 
  Plus, 
  Save, 
  Clock,
  Tag,
  X,
  ChevronLeft,
  ChevronRight,
  Link,
  Github,
  Upload,
  Download,
  GitBranch
} from 'lucide-react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Node } from '@shared/schema';

interface SimpleJournalProps {
  nodeId: number;
}

export default function SimpleJournal({ nodeId }: SimpleJournalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showGitHubDialog, setShowGitHubDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkedNodes, setLinkedNodes] = useState<number[]>([]);
  const [gitHubRepo, setGitHubRepo] = useState('');
  const [gitHubBranch, setGitHubBranch] = useState('main');
  const [gitHubPath, setGitHubPath] = useState('');
  const [showConnectionAnimation, setShowConnectionAnimation] = useState(false);
  const [animationSource, setAnimationSource] = useState<HTMLElement | null>(null);
  const [animationTarget, setAnimationTarget] = useState<HTMLElement | null>(null);
  
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { saveOffline, isOnline } = useOfflineSync();

  // Fetch current entry
  const { data: currentEntry, isLoading } = useQuery({
    queryKey: ['/api/nodes', nodeId],
    enabled: !!nodeId && !isCreating,
  });

  // Fetch all nodes (for linking and recent entries)
  const { data: allNodes = [] } = useQuery({
    queryKey: ['/api/nodes'],
  });

  // Fetch recent entries
  const recentEntries = (allNodes as any[])
    .filter((node: any) => node.nodeType === 'journal')
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  // Available nodes for linking (excluding current entry)
  const availableNodes = (allNodes as any[]).filter((node: any) => 
    node.id !== nodeId && node.id !== selectedEntry
  );

  // Search entries
  const { data: searchResults = [] } = useQuery({
    queryKey: ['/api/search', searchQuery],
    enabled: searchQuery.length > 2,
    select: (data: any[]) => data.filter((node: any) => node.nodeType === 'journal')
  });

  // Save mutation with offline support
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: title || `Journal Entry - ${format(new Date(), 'MMM dd, yyyy')}`,
        content,
        tags,
        nodeType: 'journal',
        linkedNodes
      };

      const result = await saveOffline(isCreating ? null : nodeId, payload);
      return result;
    },
    onSuccess: (result: any) => {
      if (result?.offline) {
        toast({
          title: "Saved offline",
          description: "Changes will sync when you're back online.",
          duration: 3000,
        });
      } else {
        toast({
          title: "Saved",
          description: "Your changes have been saved.",
          duration: 2000,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/nodes'] });
      setIsCreating(false);
    }
  });

  // GitHub sync mutation
  const gitHubSyncMutation = useMutation({
    mutationFn: async (action: 'push' | 'pull') => {
      const payload = {
        action,
        repo: gitHubRepo,
        branch: gitHubBranch,
        path: gitHubPath,
        content: action === 'push' ? content : undefined,
        title: action === 'push' ? title : undefined
      };
      return await apiRequest('POST', '/api/github/sync', payload);
    },
    onSuccess: (data, action) => {
      if (action === 'pull' && data) {
        setContent((data as any).content || '');
        setTitle((data as any).title || '');
      }
      queryClient.invalidateQueries({ queryKey: ['/api/nodes'] });
    }
  });

  // Load entry data
  useEffect(() => {
    if (currentEntry && !isCreating) {
      setTitle((currentEntry as any).title || '');
      setContent((currentEntry as any).content || '');
      setTags((currentEntry as any).tags || []);
      setLinkedNodes((currentEntry as any).linkedNodes || []);
    }
  }, [currentEntry, isCreating]);

  // Create new entry
  const createNewEntry = () => {
    setIsCreating(true);
    setTitle('');
    setContent('');
    setTags([]);
    setLinkedNodes([]);
    setSelectedEntry(null);
    setTimeout(() => contentRef.current?.focus(), 100);
  };

  // Load existing entry
  const loadEntry = (entry: any) => {
    setSelectedEntry(entry.id);
    setIsCreating(false);
    setTitle(entry.title || '');
    setContent(entry.content || '');
    setTags(entry.tags || []);
    setLinkedNodes(entry.linkedNodes || []);
    setTimeout(() => contentRef.current?.focus(), 100);
  };

  // Link to node with animation
  const linkToNode = (nodeId: number) => {
    if (!linkedNodes.includes(nodeId)) {
      // Get the link button element for animation source
      const linkButton = document.querySelector('[data-link-button]') as HTMLElement;
      // Get the target node element in the dialog
      const targetNode = document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement;
      
      if (linkButton && targetNode) {
        setAnimationSource(linkButton);
        setAnimationTarget(targetNode);
        setShowConnectionAnimation(true);
        
        // Add the link after a brief delay to show the animation
        setTimeout(() => {
          setLinkedNodes([...linkedNodes, nodeId]);
          toast({
            title: "Node linked",
            description: "Successfully connected to the node.",
            duration: 2000,
          });
        }, 400);
      } else {
        // Fallback without animation
        setLinkedNodes([...linkedNodes, nodeId]);
        toast({
          title: "Node linked",
          description: "Successfully connected to the node.",
          duration: 2000,
        });
      }
    }
    setShowLinkDialog(false);
  };

  // Unlink node
  const unlinkNode = (nodeId: number) => {
    setLinkedNodes(linkedNodes.filter(id => id !== nodeId));
  };

  // Add tag
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((title || content) && (title !== (currentEntry as any)?.title || content !== (currentEntry as any)?.content || JSON.stringify(tags) !== JSON.stringify((currentEntry as any)?.tags))) {
        saveMutation.mutate();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, content, tags]);

  const displayEntries = searchQuery.length > 2 ? searchResults : recentEntries;

  return (
    <div className="h-full flex bg-background">
      {/* Sidebar - Entry List */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Journal</h2>
            </div>
            <Button onClick={createNewEntry} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Entry List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {displayEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => loadEntry(entry)}
                className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                  selectedEntry === entry.id || (!isCreating && entry.id === nodeId)
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-medium text-sm truncate flex-1">
                    {entry.title || 'Untitled Entry'}
                  </h3>
                  <span className="text-xs text-muted-foreground ml-2">
                    {format(new Date(entry.createdAt), 'MMM dd')}
                  </span>
                </div>
                
                {entry.content && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {entry.content.substring(0, 100)}...
                  </p>
                )}
                
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {entry.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{entry.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}

            {displayEntries.length === 0 && searchQuery.length > 2 && (
              <div className="text-center text-muted-foreground py-8">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No entries found</p>
              </div>
            )}

            {displayEntries.length === 0 && searchQuery.length <= 2 && (
              <div className="text-center text-muted-foreground py-8">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No journal entries yet</p>
                <Button onClick={createNewEntry} variant="ghost" size="sm" className="mt-2">
                  Create your first entry
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {/* Editor Header */}
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {format(new Date(), 'EEEE, MMMM dd, yyyy')}
              </span>
              <OfflineSyncStatus />
            </div>
            
            <div className="flex items-center gap-2">
              {saveMutation.isPending && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 animate-spin" />
                  Saving...
                </div>
              )}
              
              <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" data-link-button>
                    <Link className="h-4 w-4 mr-1" />
                    Link
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Link to Node</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <ScrollArea className="h-60">
                      <div className="space-y-2">
                        {(availableNodes as any[]).map((node) => (
                          <div
                            key={node.id}
                            data-node-id={node.id}
                            onClick={() => linkToNode(node.id)}
                            className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                          >
                            <div className="font-medium">{node.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {node.nodeType} • Created {format(new Date(node.createdAt), 'MMM dd')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showGitHubDialog} onOpenChange={setShowGitHubDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Github className="h-4 w-4 mr-1" />
                    GitHub
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>GitHub Integration</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Repository</label>
                      <Input
                        value={gitHubRepo}
                        onChange={(e) => setGitHubRepo(e.target.value)}
                        placeholder="username/repository"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Branch</label>
                      <Input
                        value={gitHubBranch}
                        onChange={(e) => setGitHubBranch(e.target.value)}
                        placeholder="main"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">File Path</label>
                      <Input
                        value={gitHubPath}
                        onChange={(e) => setGitHubPath(e.target.value)}
                        placeholder="docs/journal.md"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => gitHubSyncMutation.mutate('pull')}
                        disabled={gitHubSyncMutation.isPending}
                        variant="outline"
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Pull from GitHub
                      </Button>
                      <Button 
                        onClick={() => gitHubSyncMutation.mutate('push')}
                        disabled={gitHubSyncMutation.isPending}
                        variant="outline"
                        className="flex-1"
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Push to GitHub
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                onClick={() => saveMutation.mutate()} 
                disabled={saveMutation.isPending}
                variant="outline" 
                size="sm"
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>

          {/* Title Input */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's on your mind today?"
            className="text-lg font-medium border-none px-0 focus-visible:ring-0 bg-transparent"
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
          <Textarea
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing... Use this space to capture your thoughts, reflect on your day, or plan ahead."
            className="flex-1 border-none resize-none p-4 focus-visible:ring-0 bg-transparent text-base leading-relaxed"
          />

          {/* Tags and Links Footer */}
          <div className="border-t border-border p-4 space-y-4">
            {/* Node Graph Visualization */}
            {linkedNodes.length > 0 && selectedEntry && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Link className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Node Connections</span>
                </div>
                <div className="border rounded-lg p-4 bg-muted/30">
                  <NodeGraphVisualizer
                    currentNode={selectedEntry}
                    linkedNodes={(availableNodes as any[]).filter(node => linkedNodes.includes(node.id))}
                    onNodeClick={(nodeId) => {
                      window.location.href = `/journal?nodeId=${nodeId}`;
                    }}
                    className="h-64"
                  />
                </div>
              </div>
            )}

            {/* Linked Nodes */}
            {linkedNodes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Linked Nodes</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {linkedNodes.map((nodeId) => {
                    const node = (availableNodes as any[]).find(n => n.id === nodeId);
                    return node ? (
                      <Badge key={nodeId} variant="outline" className="text-sm">
                        {node.title}
                        <button
                          onClick={() => unlinkNode(nodeId)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Tags */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Tags</span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-sm">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  className="flex-1"
                />
                <Button onClick={addTag} variant="outline" size="sm">
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Animation */}
      {showConnectionAnimation && (
        <NodeConnectionAnimation
          sourceElement={animationSource}
          targetElement={animationTarget}
          onComplete={() => {
            setShowConnectionAnimation(false);
            setAnimationSource(null);
            setAnimationTarget(null);
          }}
        />
      )}
    </div>
  );
}