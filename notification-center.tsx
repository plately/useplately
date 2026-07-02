import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { X, Edit, Link, Upload, FileText, Calendar, CheckSquare, Users, Lightbulb, Puzzle, History, User, Clock, RotateCcw, Search, ArrowRight, Globe, ExternalLink, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Node, NodeChange, User as UserType } from "@shared/schema";

interface NodePreviewModalProps {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (node: Node) => void;
  onLink?: (node: Node) => void;
  onUpload?: (node: Node) => void;
}

export default function NodePreviewModal({ 
  node, 
  isOpen, 
  onClose, 
  onEdit, 
  onLink, 
  onUpload 
}: NodePreviewModalProps) {
  const queryClient = useQueryClient();
  const [isVisible, setIsVisible] = useState(false);
  const [revertChangeId, setRevertChangeId] = useState<number | null>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkType, setLinkType] = useState("related");

  // Fetch change history for the node
  const { data: nodeChanges } = useQuery<(NodeChange & { user: UserType; team?: { name: string } })[]>({
    queryKey: ['/api/node-changes', node?.id],
    enabled: isOpen && !!node,
    queryFn: async () => {
      if (!node) return [];
      const response = await fetch(`/api/node-changes/${node.id}`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Fetch all nodes for linking and display
  const { data: allNodes } = useQuery<Node[]>({
    queryKey: ['/api/nodes'],
    enabled: isOpen && !!node,
  });

  // Fetch node links for this node
  const { data: nodeLinks } = useQuery<any[]>({
    queryKey: ['/api/node-links'],
    enabled: isOpen && !!node,
  });

  // Fetch graph profiles
  const { data: graphProfiles } = useQuery<any[]>({
    queryKey: ['/api/graph-profiles'],
    enabled: isOpen && !!node,
  });

  // Get links for current node (both source and target)
  const currentNodeLinks = nodeLinks?.filter(link => 
    link.sourceId === node?.id || link.targetId === node?.id
  ) || [];

  // Get profiles this node belongs to
  const nodeProfiles = graphProfiles?.filter(profile => 
    profile.nodeTypes?.includes(node?.nodeType)
  ) || [];

  // Revert to previous version mutation
  const revertNodeMutation = useMutation({
    mutationFn: async (changeId: number) => {
      if (!node) throw new Error('No node to revert');
      
      return await apiRequest(`/api/nodes/${node.id}/revert`, {
        method: 'POST',
        body: JSON.stringify({ changeId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nodes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/node-changes', node?.id] });
      setRevertChangeId(null);
      toast({
        title: "Node reverted",
        description: "The node has been reverted to the selected version.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to revert node",
        description: error.message,
      });
      setRevertChangeId(null);
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
      setIsLinkDialogOpen(false);
      setSearchQuery("");
      setLinkLabel("");
      setLinkType("related");
      toast({
        title: "Nodes connected",
        description: "The link has been created successfully.",
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

  // Update core node mutation
  const updateNodeCoreMutation = useMutation({
    mutationFn: async ({ nodeId, isCore }: { nodeId: number; isCore: boolean }) => {
      return await apiRequest(`/api/nodes/${nodeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isCore })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nodes'] });
      toast({
        title: "Node updated",
        description: "Core node status has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update node",
        description: error.message,
      });
    }
  });

  const handleCoreToggle = (nodeId: number, currentValue: boolean) => {
    updateNodeCoreMutation.mutate({ nodeId, isCore: !currentValue });
  };

  useEffect(() => {
    if (isOpen && node) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, node]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !node) return null;

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'journal': return <FileText className="h-5 w-5" />;
      case 'task': return <CheckSquare className="h-5 w-5" />;
      case 'meeting': return <Users className="h-5 w-5" />;
      case 'document': return <FileText className="h-5 w-5" />;
      case 'note': return <Lightbulb className="h-5 w-5" />;
      case 'integration': return <Puzzle className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getNodeColor = (nodeType: string) => {
    switch (nodeType) {
      case 'journal': return '#3563E9';
      case 'task': return '#22C55E';
      case 'meeting': return '#F43F5E';
      case 'document': return '#F59E0B';
      case 'note': return '#8B5CF6';
      case 'integration': return '#EC4899';
      default: return '#64748B';
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleLinkClick = () => {
    setIsLinkDialogOpen(true);
  };

  const handleCreateLink = (targetNodeId: number) => {
    if (!node) return;
    
    createLinkMutation.mutate({
      sourceId: node.id,
      targetId: targetNodeId,
      label: linkLabel || "related",
      type: linkType
    });
  };

  // Filter nodes for linking (exclude current node)
  const linkableNodes = allNodes?.filter(n => n.id !== node?.id && 
    (searchQuery === "" || 
     n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     n.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     n.nodeType.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ) || [];

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        backdropFilter: isVisible ? 'blur(12px)' : 'blur(0px)',
        backgroundColor: isVisible ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0)',
      }}
      onClick={handleBackdropClick}
    >
      <div 
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-hidden transition-all duration-300 ${
          isVisible ? 'scale-100' : 'scale-95'
        }`}
        style={{
          backdropFilter: 'blur(12px)',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '1rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/10">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div 
              className="flex items-center justify-center w-12 h-12 rounded-full text-white"
              style={{ backgroundColor: getNodeColor(node.nodeType) }}
            >
              {getNodeIcon(node.nodeType)}
            </div>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-white mb-2 break-words">
                {node.title}
              </h2>
              
              <div className="flex items-center gap-3 text-sm text-white/70">
                <span className="capitalize flex items-center gap-1">
                  {getNodeIcon(node.nodeType)}
                  {node.nodeType}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(node.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content with Tabs */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/10">
              <TabsTrigger value="details" className="text-white/80 data-[state=active]:text-white data-[state=active]:bg-white/20">
                Details
              </TabsTrigger>
              <TabsTrigger value="history" className="text-white/80 data-[state=active]:text-white data-[state=active]:bg-white/20">
                <History className="h-4 w-4 mr-1" />
                Change History
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="mt-6 space-y-6">
              {/* Content */}
              {node.content && (
                <div>
                  <h3 className="text-sm font-medium text-white/90 mb-3">Content</h3>
                  <div className="text-white/80 leading-relaxed whitespace-pre-wrap bg-white/5 rounded-lg p-4">
                    {node.content}
                  </div>
                </div>
              )}

              {/* Tags */}
              {node.tags && node.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-white/90 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {node.tags.map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="bg-white/10 text-white/90 border-white/20"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Core Node Toggle */}
              <div 
                className="flex items-center justify-between p-4 rounded-lg border border-white/20"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))',
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                    <Star className="w-5 h-5 text-white fill-white" />
                  </div>
                  <div>
                    <Label htmlFor="core-toggle" className="font-medium text-sm text-white cursor-pointer">
                      Core Node
                    </Label>
                    <p className="text-xs text-white/70">
                      Mark as main topic or project (40% bigger with golden glow)
                    </p>
                  </div>
                </div>
                <Switch
                  id="core-toggle"
                  checked={node.isCore || false}
                  onCheckedChange={() => handleCoreToggle(node.id, node.isCore || false)}
                />
              </div>

              {/* Links & Connections */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-white/90">Links & Connections</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleLinkClick}
                    className="text-xs h-7 bg-white/5 text-white/80 border-white/20 hover:bg-white/10 hover:text-white"
                  >
                    <Link className="h-3 w-3 mr-1" />
                    Add Link
                  </Button>
                </div>

                {/* Linked Nodes */}
                {currentNodeLinks.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    <p className="text-xs text-white/60 mb-2">Connected to {currentNodeLinks.length} node{currentNodeLinks.length !== 1 ? 's' : ''}</p>
                    {currentNodeLinks.map((link) => {
                      const isSource = link.sourceId === node.id;
                      const connectedNodeId = isSource ? link.targetId : link.sourceId;
                      const connectedNode = allNodes?.find(n => n.id === connectedNodeId);
                      
                      return (
                        <div 
                          key={link.id} 
                          className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                        >
                          <div 
                            className="w-6 h-6 rounded flex items-center justify-center text-xs"
                            style={{ backgroundColor: connectedNode ? getNodeColor(connectedNode.nodeType) : '#64748B' }}
                          >
                            {connectedNode ? getNodeIcon(connectedNode.nodeType) : <FileText className="h-3 w-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white/90 text-xs truncate">
                              {connectedNode?.title || `Node #${connectedNodeId}`}
                            </p>
                            <p className="text-white/50 text-[10px]">
                              {link.label || link.type || 'related'}
                            </p>
                          </div>
                          {isSource ? (
                            <ArrowRight className="h-3 w-3 text-white/40 flex-shrink-0" />
                          ) : (
                            <ArrowRight className="h-3 w-3 text-white/40 flex-shrink-0 rotate-180" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-white/60 p-3 bg-white/5 rounded-lg border border-white/10 mb-4">
                    No connections yet. Click "Add Link" to connect this node with others.
                  </div>
                )}

                {/* Graph Profiles */}
                {nodeProfiles.length > 0 && (
                  <div>
                    <p className="text-xs text-white/60 mb-2">Visible in {nodeProfiles.length} profile{nodeProfiles.length !== 1 ? 's' : ''}</p>
                    <div className="flex flex-wrap gap-2">
                      {nodeProfiles.map((profile) => (
                        <Badge 
                          key={profile.id}
                          variant="outline"
                          className="text-xs border-white/20 text-white/80 bg-white/5"
                          style={{ borderColor: profile.color || '#3b82f6' }}
                        >
                          <Globe className="h-3 w-3 mr-1" style={{ color: profile.color || '#3b82f6' }} />
                          {profile.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-white/60">Node ID:</span>
                  <span className="text-white/90 ml-2">#{node.id}</span>
                </div>
                <div>
                  <span className="text-white/60">Created by:</span>
                  <span className="text-white/90 ml-2">User #{node.createdBy}</span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="history" className="mt-6">
              <ScrollArea className="h-96">
                {nodeChanges && nodeChanges.length > 0 ? (
                  <div className="space-y-4">
                    {nodeChanges.map((change, index) => (
                      <div key={change.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-white/60" />
                              <span className="text-sm font-medium text-white/90">
                                {change.user?.username || `User #${change.userId}`}
                              </span>
                            </div>
                            {change.team && (
                              <Badge variant="outline" className="text-xs border-white/20 text-white/70">
                                {change.team.name}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {index > 0 && ( // Don't show revert for the latest change
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRevertChangeId(change.id)}
                                className="text-white/60 hover:text-white hover:bg-white/10 text-xs px-2 py-1 h-auto"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Revert
                              </Button>
                            )}
                            <div className="flex items-center gap-1 text-xs text-white/60">
                              <Clock className="h-3 w-3" />
                              {new Date(change.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-sm text-white/80 mb-3">
                          <span className="font-medium capitalize">{change.changeType.replace('_', ' ')}</span>
                        </div>
                        
                        {change.previousValue != null && change.newValue != null && (
                          <div className="space-y-3">
                            <div>
                              <div className="text-xs text-red-400 mb-1">- Original</div>
                              <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-sm text-white/80">
                                <pre className="whitespace-pre-wrap text-xs">
                                  {String(JSON.stringify(change.previousValue, null, 2))}
                                </pre>
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-green-400 mb-1">+ Modified</div>
                              <div className="bg-green-500/10 border border-green-500/20 rounded p-3 text-sm text-white/80">
                                <pre className="whitespace-pre-wrap text-xs">
                                  {String(JSON.stringify(change.newValue, null, 2))}
                                </pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/60">
                    <History className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p>No change history available</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onUpload?.(node)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleLinkClick}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <Link className="h-4 w-4 mr-2" />
            Link Node
          </Button>
          
          <Button 
            size="sm"
            onClick={() => onEdit?.(node)}
            className="bg-white/20 text-white hover:bg-white/30 border-white/20"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Link Node Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Link to Another Node</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search nodes to link..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Link Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="link-type">Relationship Type</Label>
                <Select value={linkType} onValueChange={setLinkType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="related">Related</SelectItem>
                    <SelectItem value="depends_on">Depends On</SelectItem>
                    <SelectItem value="blocks">Blocks</SelectItem>
                    <SelectItem value="enables">Enables</SelectItem>
                    <SelectItem value="references">References</SelectItem>
                    <SelectItem value="implements">Implements</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="link-label">Link Label (Optional)</Label>
                <Input
                  id="link-label"
                  placeholder="Enter custom label..."
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                />
              </div>
            </div>

            {/* Available Nodes */}
            <div className="space-y-2">
              <Label>Select a node to link with:</Label>
              <ScrollArea className="h-64 border rounded-md">
                <div className="p-4 space-y-2">
                  {linkableNodes.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      {searchQuery ? "No nodes match your search" : "No other nodes available"}
                    </p>
                  ) : (
                    linkableNodes.map((linkNode) => (
                      <div
                        key={linkNode.id}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => handleCreateLink(linkNode.id)}
                      >
                        <div 
                          className="flex items-center justify-center w-8 h-8 rounded-full text-white flex-shrink-0"
                          style={{ backgroundColor: getNodeColor(linkNode.nodeType) }}
                        >
                          {getNodeIcon(linkNode.nodeType)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {linkNode.title}
                          </h4>
                          <p className="text-xs text-muted-foreground capitalize">
                            {linkNode.nodeType}
                          </p>
                          {linkNode.content && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {linkNode.content.substring(0, 100)}...
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revert Confirmation Dialog */}
      <AlertDialog open={!!revertChangeId} onOpenChange={() => setRevertChangeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to Previous Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revert the node to a previous version. This action will create a new entry in the change history but cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => revertChangeId && revertNodeMutation.mutate(revertChangeId)}
              disabled={revertNodeMutation.isPending}
            >
              {revertNodeMutation.isPending ? 'Reverting...' : 'Revert'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}