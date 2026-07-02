import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Save, FileText, CheckSquare, Users, Lightbulb, Link2, Upload, Search, Plus, Trash2, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Node } from "@shared/schema";

interface NodeEditorModalProps {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (node: Node) => void;
}

const nodeTypes = [
  { value: 'journal', label: 'Journal', icon: FileText },
  { value: 'task', label: 'Task', icon: CheckSquare },
  { value: 'note', label: 'Note', icon: Lightbulb },
  { value: 'meeting', label: 'Meeting', icon: Users },
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'link', label: 'Link', icon: Link2 },
  { value: 'file', label: 'File', icon: Upload },
];

export default function NodeEditorModal({ node, isOpen, onClose, onSaved }: NodeEditorModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [nodeType, setNodeType] = useState('note');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkType, setLinkType] = useState('related');

  // Fetch all nodes for linking
  const { data: allNodes } = useQuery<Node[]>({
    queryKey: ['/api/nodes'],
    enabled: isOpen && !!node,
  });

  // Fetch node links
  const { data: nodeLinks } = useQuery<any[]>({
    queryKey: ['/api/node-links'],
    enabled: isOpen && !!node,
  });

  // Get current node's links
  const currentNodeLinks = nodeLinks?.filter(link => 
    link.sourceId === node?.id || link.targetId === node?.id
  ) || [];

  // Reset form when node changes
  useEffect(() => {
    if (node) {
      setTitle(node.title || '');
      setContent(node.content || '');
      setNodeType(node.nodeType || 'note');
      setTags(node.tags || []);
    } else {
      setTitle('');
      setContent('');
      setNodeType('note');
      setTags([]);
    }
  }, [node]);

  const updateNodeMutation = useMutation<Node, Error, { title: string; content: string; nodeType: string; tags: string[] }>({
    mutationFn: async (data) => {
      if (!node) throw new Error('No node to update');
      
      return await apiRequest(`/api/nodes/${node.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }) as unknown as Node;
    },
    onSuccess: (updatedNode) => {
      queryClient.invalidateQueries({ queryKey: ['/api/nodes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/node-changes', node?.id] });
      toast({
        title: "Node updated",
        description: "Your changes have been saved and added to the change history.",
      });
      onSaved?.(updatedNode);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update node",
        description: error.message,
      });
    }
  });

  // Create link mutation
  const createLinkMutation = useMutation({
    mutationFn: async (data: { sourceId: number; targetId: number; label?: string; type?: string }) => {
      return await apiRequest('/api/node-links', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/node-links'] });
      setShowLinkDialog(false);
      setSearchQuery('');
      setLinkLabel('');
      setLinkType('related');
      toast({
        title: "Link created",
        description: "The nodes have been connected successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to create link",
        description: error.message,
      });
    }
  });

  // Delete link mutation
  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: number) => {
      return await apiRequest(`/api/node-links/${linkId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/node-links'] });
      toast({
        title: "Link removed",
        description: "The connection has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to remove link",
        description: error.message,
      });
    }
  });

  const handleSave = () => {
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Title required",
        description: "Please enter a title for the node.",
      });
      return;
    }

    updateNodeMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      nodeType,
      tags
    });
  };

  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleCreateLink = (targetNodeId: number) => {
    if (!node) return;
    
    createLinkMutation.mutate({
      sourceId: node.id,
      targetId: targetNodeId,
      label: linkLabel || linkType,
      type: linkType
    });
  };

  const handleDeleteLink = (linkId: number) => {
    deleteLinkMutation.mutate(linkId);
  };

  const getNodeIcon = (nodeType: string) => {
    const nodeTypeObj = nodeTypes.find(type => type.value === nodeType);
    return nodeTypeObj?.icon || FileText;
  };

  const getNodeColor = (nodeType: string) => {
    const colors: Record<string, string> = {
      journal: '#3563E9',
      task: '#22C55E',
      meeting: '#F43F5E',
      document: '#F59E0B',
      note: '#8B5CF6',
      integration: '#EC4899',
      default: '#64748B'
    };
    return colors[nodeType] || colors.default;
  };

  // Filter linkable nodes
  const linkableNodes = allNodes?.filter(n => {
    if (n.id === node?.id) return false;
    if (currentNodeLinks.some(link => 
      (link.sourceId === node?.id && link.targetId === n.id) ||
      (link.targetId === node?.id && link.sourceId === n.id)
    )) return false;
    if (searchQuery === "") return true;
    return n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           n.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           n.nodeType.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  if (!isOpen || !node) return null;

  const selectedNodeType = nodeTypes.find(type => type.value === nodeType);
  const IconComponent = selectedNodeType?.icon || FileText;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" onKeyDown={handleKeyPress}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconComponent className="h-5 w-5" />
            Edit Node
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter node title..."
              className="mt-1"
              autoFocus
            />
          </div>

          {/* Node Type */}
          <div>
            <Label htmlFor="nodeType">Type</Label>
            <Select value={nodeType} onValueChange={setNodeType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {nodeTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter node content..."
              className="mt-1 min-h-[120px]"
              rows={6}
            />
          </div>

          {/* Links & Dependencies */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Links & Dependencies</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowLinkDialog(!showLinkDialog)}
                className="h-8 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Link
              </Button>
            </div>

            {/* Current Links */}
            {currentNodeLinks.length > 0 ? (
              <div className="space-y-2 mb-3">
                {currentNodeLinks.map((link) => {
                  const isSource = link.sourceId === node.id;
                  const connectedNodeId = isSource ? link.targetId : link.sourceId;
                  const connectedNode = allNodes?.find(n => n.id === connectedNodeId);
                  const NodeIcon = connectedNode ? getNodeIcon(connectedNode.nodeType) : FileText;
                  
                  return (
                    <div 
                      key={link.id} 
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted border text-sm"
                    >
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: connectedNode ? getNodeColor(connectedNode.nodeType) : '#64748B' }}
                      >
                        <NodeIcon className="h-3 w-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {connectedNode?.title || `Node #${connectedNodeId}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {link.label || link.type || 'related'}
                        </p>
                      </div>
                      {isSource ? (
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0 rotate-180" />
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteLink(link.id)}
                        className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground p-2 bg-muted/50 rounded mb-3">
                No links yet. Click "Add Link" to connect this node.
              </p>
            )}

            {/* Link Dialog */}
            {showLinkDialog && (
              <div className="border rounded-lg p-3 bg-muted/50 space-y-3">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search nodes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Connection Type</Label>
                    <Select value={linkType} onValueChange={setLinkType}>
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="related">Related</SelectItem>
                        <SelectItem value="depends">Depends On</SelectItem>
                        <SelectItem value="blocks">Blocks</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="child">Child</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Label (optional)</Label>
                    <Input
                      placeholder="e.g., requires, part of..."
                      value={linkLabel}
                      onChange={(e) => setLinkLabel(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>

                <ScrollArea className="h-48 rounded border bg-background">
                  <div className="p-2 space-y-1">
                    {linkableNodes.length > 0 ? (
                      linkableNodes.map((n) => {
                        const NodeIcon = getNodeIcon(n.nodeType);
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => handleCreateLink(n.id)}
                            className="w-full flex items-center gap-2 p-2 rounded hover:bg-accent text-left transition-colors"
                          >
                            <div 
                              className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: getNodeColor(n.nodeType) }}
                            >
                              <NodeIcon className="h-3 w-3 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{n.title}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{n.nodeType}</p>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        {searchQuery ? 'No nodes found' : 'No available nodes to link'}
                      </p>
                    )}
                  </div>
                </ScrollArea>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowLinkDialog(false);
                    setSearchQuery('');
                    setLinkLabel('');
                  }}
                  className="w-full h-8 text-xs"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mt-2 mb-2">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => handleRemoveTag(tag)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button variant="outline" onClick={handleAddTag} disabled={!newTag.trim()}>Add</Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Press Ctrl+Enter to save quickly
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={updateNodeMutation.isPending || !title.trim()}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {updateNodeMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}