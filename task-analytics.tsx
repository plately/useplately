import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import AdvancedTaskManager from "./advanced-task-manager";
import { TemplateSelector, GeneralWritingTemplate, CodeSnippetTemplate, TaskBasedTemplate, MeetingRecapTemplate, BrainstormingTemplate } from "./journal-templates";
import GitHubIntegration from "./github-integration";
import AIAssistant from "./ai-assistant";
import { format, isToday } from "date-fns";
import {
  Save,
  Share,
  Link as LinkIcon,
  Tag,
  Search,
  Plus,
  X,
  Clock,
  Users,
  Eye,
  EyeOff,
  Star,
  Bookmark,
  MessageCircle,
  Edit3,
  Type,
  Palette,
  Settings,
  History,
  Download,
  Upload,
  Zap,
  Target,
  Calendar,
  CheckSquare,
  FileText,
  Image,
  Video,
  Mic,
  PaperclipIcon,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelRightClose,
  Filter,
  SortAsc,
  Grid3X3,
  BarChart3,
  TrendingUp,
  Activity,
  Layers,
  Globe,
  Lock,
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  BellRing,
  Moon,
  Sun,
  Contrast,
  Sparkles,
  Github
} from "lucide-react";

interface JournalEntry {
  id: number;
  title: string;
  content: string;
  tags: string[];
  linkedNodes: number[];
  isShared: boolean;
  sharedWith: string[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
  author: string;
  mood?: 'happy' | 'neutral' | 'sad' | 'excited' | 'stressed';
  weather?: string;
  location?: string;
  attachments: Array<{
    id: string;
    name: string;
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    size: number;
  }>;
  collaborators: Array<{
    id: number;
    name: string;
    email: string;
    role: 'editor' | 'viewer' | 'commenter';
    lastSeen: Date;
  }>;
  comments: Array<{
    id: number;
    content: string;
    author: string;
    createdAt: Date;
    replies: Array<{
      id: number;
      content: string;
      author: string;
      createdAt: Date;
    }>;
  }>;
  analytics: {
    wordCount: number;
    readingTime: number;
    editingSessions: number;
    timeSpent: number;
  };
}

interface SuperEnhancedJournalProps {
  nodeId: number;
}

export default function SuperEnhancedJournal({ nodeId }: SuperEnhancedJournalProps) {
  // Core state
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'write' | 'preview' | 'split' | 'focus'>('write');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('editor');
  
  // Content editing state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [linkedNodes, setLinkedNodes] = useState<number[]>([]);
  
  // Collaboration state
  const [isShared, setIsShared] = useState(false);
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [activeCollaborators, setActiveCollaborators] = useState<any[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('updated');
  
  // UI state
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [showStats, setShowStats] = useState(false);
  const [notifications, setNotifications] = useState(true);
  
  // Advanced features
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showGitHubIntegration, setShowGitHubIntegration] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [entryType, setEntryType] = useState<'general' | 'code' | 'task' | 'meeting' | 'brainstorm'>('general');
  
  // Refs
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const autosaveRef = useRef<NodeJS.Timeout>();
  const lastSaveRef = useRef<Date>(new Date());
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { connected, lastMessage, sendUpdate } = useWebSocket(nodeId);

  // Fetch journal entry
  const { data: journalData, isLoading, refetch } = useQuery({
    queryKey: ['/api/nodes', nodeId],
    enabled: !!nodeId,
  });

  // Fetch available nodes for linking
  const { data: availableNodes = [] } = useQuery({
    queryKey: ['/api/nodes'],
  });

  // Fetch available tags
  const { data: availableTags = [] } = useQuery({
    queryKey: ['/api/tags'],
  });

  // Initialize entry data
  useEffect(() => {
    if (journalData) {
      const entryData: JournalEntry = {
        id: journalData.id,
        title: journalData.title || '',
        content: journalData.content || '',
        tags: journalData.tags || [],
        linkedNodes: journalData.linkedNodes || [],
        isShared: journalData.isShared || false,
        sharedWith: journalData.sharedWith || [],
        createdAt: new Date(journalData.createdAt),
        updatedAt: new Date(journalData.updatedAt || journalData.createdAt),
        version: journalData.version || 1,
        author: journalData.author || 'Current User',
        attachments: journalData.attachments || [],
        collaborators: journalData.collaborators || [],
        comments: journalData.comments || [],
        analytics: {
          wordCount: (journalData.content || '').split(/\s+/).filter(Boolean).length,
          readingTime: Math.ceil((journalData.content || '').split(/\s+/).filter(Boolean).length / 200),
          editingSessions: journalData.editingSessions || 0,
          timeSpent: journalData.timeSpent || 0
        }
      };
      
      setEntry(entryData);
      setTitle(entryData.title);
      setContent(entryData.content);
      setTags(entryData.tags);
      setLinkedNodes(entryData.linkedNodes);
      setIsShared(entryData.isShared);
      setSharedWith(entryData.sharedWith);
    }
  }, [journalData]);

  // Auto-save functionality
  const saveEntry = useCallback(async () => {
    if (!entry || isSaving) return;
    
    setIsSaving(true);
    try {
      const updatedEntry = {
        ...entry,
        title,
        content,
        tags,
        linkedNodes,
        isShared,
        sharedWith,
        updatedAt: new Date(),
        version: entry.version + 1,
        analytics: {
          ...entry.analytics,
          wordCount: content.split(/\s+/).filter(Boolean).length,
          readingTime: Math.ceil(content.split(/\s+/).filter(Boolean).length / 200),
        }
      };

      await apiRequest('PATCH', `/api/nodes/${nodeId}`, updatedEntry);
      
      setEntry(updatedEntry);
      lastSaveRef.current = new Date();
      
      // Send real-time update
      if (connected) {
        sendUpdate({
          type: 'journal_updated',
          nodeId,
          data: updatedEntry,
          userId: 1
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/nodes', nodeId] });
      
      toast({
        title: "Saved",
        description: "Journal entry saved successfully",
        duration: 2000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Failed to save journal entry",
      });
    } finally {
      setIsSaving(false);
    }
  }, [entry, title, content, tags, linkedNodes, isShared, sharedWith, nodeId, connected, sendUpdate, queryClient, toast]);

  // Auto-save on content change
  useEffect(() => {
    if (autosaveRef.current) {
      clearTimeout(autosaveRef.current);
    }
    
    if (isEditing && entry) {
      autosaveRef.current = setTimeout(() => {
        saveEntry();
      }, 2000); // Auto-save after 2 seconds of inactivity
    }
    
    return () => {
      if (autosaveRef.current) {
        clearTimeout(autosaveRef.current);
      }
    };
  }, [title, content, tags, linkedNodes, isShared, sharedWith, isEditing, saveEntry]);

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage?.type === 'journal_updated' && lastMessage.nodeId === nodeId) {
      const updatedData = lastMessage.data;
      if (updatedData.version > (entry?.version || 0)) {
        setEntry(updatedData);
        if (!isEditing) {
          setTitle(updatedData.title);
          setContent(updatedData.content);
          setTags(updatedData.tags);
          setLinkedNodes(updatedData.linkedNodes);
        }
        
        toast({
          title: "Content updated",
          description: "Journal has been updated by another user",
          duration: 3000,
        });
      }
    }
  }, [lastMessage, nodeId, entry, isEditing, toast]);

  // Handle adding tags
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  // Handle removing tags
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Handle search
  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      const results = await apiRequest('GET', `/api/search?q=${encodeURIComponent(searchQuery)}&type=journal`);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  // Handle linking nodes
  const linkNode = (targetNodeId: number) => {
    if (!linkedNodes.includes(targetNodeId)) {
      setLinkedNodes([...linkedNodes, targetNodeId]);
    }
  };

  // Handle unlinking nodes
  const unlinkNode = (targetNodeId: number) => {
    setLinkedNodes(linkedNodes.filter(id => id !== targetNodeId));
  };

  // Format content for preview
  const formatContentForPreview = (text: string) => {
    return text
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br/>');
  };

  // Get word count and reading time
  const getStats = () => {
    const words = content.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(words / 200);
    return { words, readingTime };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="h-full flex bg-background">
      {/* Left Sidebar */}
      {sidebarOpen && (
        <div className="w-64 border-r border-border bg-muted/30 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Journal Explorer</h3>
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Search */}
            <div className="flex gap-2">
              <Input
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && performSearch()}
              />
              <Button variant="outline" size="sm" onClick={performSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Navigation */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Quick Actions */}
              <div>
                <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    New Entry
                  </Button>
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-1" />
                    Today
                  </Button>
                  <Button variant="outline" size="sm">
                    <Star className="h-4 w-4 mr-1" />
                    Favorites
                  </Button>
                  <Button variant="outline" size="sm">
                    <History className="h-4 w-4 mr-1" />
                    Recent
                  </Button>
                </div>
              </div>
              
              {/* Tags */}
              <div>
                <h4 className="text-sm font-medium mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {availableTags.slice(0, 10).map((tag: string) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        if (!filterTags.includes(tag)) {
                          setFilterTags([...filterTags, tag]);
                        }
                      }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Search Results</h4>
                  <div className="space-y-2">
                    {searchResults.slice(0, 5).map((result: any) => (
                      <div key={result.id} className="p-2 border rounded cursor-pointer hover:bg-muted">
                        <div className="font-medium text-sm">{result.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(result.updatedAt), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Main Header */}
        <div className="border-b border-border p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              )}
              
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h1 className="text-lg font-semibold">Super Journal</h1>
                <Badge variant="outline" className="text-xs">
                  {connected ? (
                    <><Wifi className="h-3 w-3 mr-1" />Live</>
                  ) : (
                    <><WifiOff className="h-3 w-3 mr-1" />Offline</>
                  )}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {/* View Mode Toggle */}
              <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="write">Write</SelectItem>
                  <SelectItem value="preview">Preview</SelectItem>
                  <SelectItem value="split">Split</SelectItem>
                  <SelectItem value="focus">Focus</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)} className="h-8 px-2">
                <Edit3 className="h-3 w-3 mr-1" />
                {isEditing ? 'Stop' : 'Edit'}
              </Button>
              
              <Button variant="outline" size="sm" onClick={saveEntry} disabled={isSaving} className="h-8 px-2">
                {isSaving ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                Save
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => setShowTemplateSelector(true)} className="h-8 px-2">
                <FileText className="h-3 w-3 mr-1" />
                Templates
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => setShowAIAssistant(true)} className="h-8 px-2">
                <Sparkles className="h-3 w-3 mr-1" />
                AI
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => setShowGitHubIntegration(true)} className="h-8 px-2">
                <Upload className="h-3 w-3 mr-1" />
                GitHub
              </Button>
              
              <Button variant="outline" size="sm" className="h-8 px-2">
                <Share className="h-3 w-3 mr-1" />
                Share
              </Button>
              
              {!rightPanelOpen && (
                <Button variant="ghost" size="sm" onClick={() => setRightPanelOpen(true)} className="h-8 px-2">
                  <PanelRightClose className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Stats Bar */}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Type className="h-3 w-3" />
              {stats.words} words
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {stats.readingTime} min read
            </div>
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Last saved: {format(lastSaveRef.current, 'HH:mm')}
            </div>
            {activeCollaborators.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {activeCollaborators.length} active
              </div>
            )}
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start p-0.5 bg-muted/50 h-9">
              <TabsTrigger value="editor" className="text-sm h-8">Editor</TabsTrigger>
              <TabsTrigger value="tasks" className="text-sm h-8">Tasks</TabsTrigger>
              <TabsTrigger value="analytics" className="text-sm h-8">Analytics</TabsTrigger>
              <TabsTrigger value="collaboration" className="text-sm h-8">Collaboration</TabsTrigger>
            </TabsList>
            
            {/* Editor Tab */}
            <TabsContent value="editor" className="flex-1 flex">
              <div className="flex-1 flex">
                {/* Title Input */}
                <div className="flex-1 flex flex-col">
                  <div className="p-3 border-b border-border">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter journal title..."
                      className="text-base font-medium border-none p-0 focus-visible:ring-0 h-8"
                      disabled={!isEditing}
                    />
                  </div>
                  
                  {/* Content Area */}
                  <div className="flex-1 flex">
                    {viewMode === 'write' || viewMode === 'split' ? (
                      <div className={viewMode === 'split' ? 'flex-1' : 'w-full'}>
                        <Textarea
                          ref={contentRef}
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Start writing your journal entry..."
                          className="h-full resize-none border-none focus-visible:ring-0 p-3 text-sm leading-relaxed"
                          disabled={!isEditing}
                          style={{ fontSize: `${fontSize}px`, fontFamily }}
                        />
                      </div>
                    ) : null}
                    
                    {viewMode === 'preview' || viewMode === 'split' ? (
                      <div className={viewMode === 'split' ? 'flex-1 border-l border-border' : 'w-full'}>
                        <div 
                          className="h-full p-3 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ 
                            __html: formatContentForPreview(content) 
                          }}
                          style={{ fontSize: `${fontSize}px`, fontFamily }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Tasks Tab */}
            <TabsContent value="tasks" className="flex-1">
              <AdvancedTaskManager nodeId={nodeId} />
            </TabsContent>
            
            {/* Analytics Tab */}
            <TabsContent value="analytics" className="flex-1 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600">Total Words</p>
                      <p className="text-2xl font-bold text-blue-700">{stats.words}</p>
                    </div>
                    <Type className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600">Reading Time</p>
                      <p className="text-2xl font-bold text-green-700">{stats.readingTime}m</p>
                    </div>
                    <Clock className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600">Linked Nodes</p>
                      <p className="text-2xl font-bold text-purple-700">{linkedNodes.length}</p>
                    </div>
                    <LinkIcon className="h-8 w-8 text-purple-500" />
                  </div>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600">Tags</p>
                      <p className="text-2xl font-bold text-orange-700">{tags.length}</p>
                    </div>
                    <Tag className="h-8 w-8 text-orange-500" />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Writing Activity</h3>
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mb-2" />
                    <p>Writing activity chart would go here</p>
                  </div>
                </div>
                
                <div className="bg-white border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Tag Distribution</h3>
                  <div className="space-y-2">
                    {tags.map((tag, index) => (
                      <div key={tag} className="flex items-center justify-between">
                        <span className="text-sm">{tag}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded">
                            <div 
                              className="h-full bg-blue-500 rounded"
                              style={{ width: `${Math.max(20, 100 - index * 10)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {Math.max(1, 10 - index)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Collaboration Tab */}
            <TabsContent value="collaboration" className="flex-1 p-4">
              <div className="space-y-6">
                {/* Sharing Settings */}
                <div className="bg-white border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Sharing & Permissions</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Public Access</h4>
                        <p className="text-sm text-muted-foreground">Allow anyone with the link to view</p>
                      </div>
                      <Button variant="outline" size="sm">
                        {isShared ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
                        {isShared ? 'Public' : 'Private'}
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Collaborators</h4>
                      <div className="flex gap-2">
                        <Input placeholder="Enter email address..." className="flex-1" />
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Invite
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Real-time Activity */}
                <div className="bg-white border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Real-time Activity</h3>
                  <div className="space-y-3">
                    {activeCollaborators.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No active collaborators
                      </p>
                    ) : (
                      activeCollaborators.map((collaborator) => (
                        <div key={collaborator.id} className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">{collaborator.name[0]}</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{collaborator.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {collaborator.role} • Last seen {format(collaborator.lastSeen, 'HH:mm')}
                            </div>
                          </div>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                {/* Comments */}
                <div className="bg-white border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Comments</h3>
                    <Button variant="outline" size="sm" onClick={() => setShowComments(!showComments)}>
                      <MessageCircle className="h-4 w-4 mr-1" />
                      {showComments ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                  
                  {showComments && (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="flex-1"
                        />
                        <Button variant="outline" size="sm">
                          Post
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {entry?.comments.map((comment) => (
                          <div key={comment.id} className="border-l-2 border-blue-200 pl-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{comment.author}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(comment.createdAt, 'MMM dd, HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Panel */}
      {rightPanelOpen && (
        <div className="w-64 border-l border-border bg-muted/30 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Properties</h3>
              <Button variant="ghost" size="sm" onClick={() => setRightPanelOpen(false)}>
                <PanelRightClose className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">
              {/* Tags Section */}
              <div>
                <h4 className="text-sm font-medium mb-2">Tags</h4>
                <div className="space-y-2">
                  <div className="flex gap-1">
                    <Input
                      placeholder="Add tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTag()}
                      className="flex-1 h-7 text-xs"
                    />
                    <Button variant="outline" size="sm" onClick={addTag} className="h-7 px-2">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs h-6">
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Linked Nodes */}
              <div>
                <h4 className="text-sm font-medium mb-2">Linked Nodes</h4>
                <div className="space-y-1">
                  {linkedNodes.map((nodeId) => {
                    const node = availableNodes.find((n: any) => n.id === nodeId);
                    return node ? (
                      <div key={nodeId} className="flex items-center justify-between p-2 border rounded text-xs">
                        <span className="truncate flex-1">{node.title}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unlinkNode(nodeId)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
              
              {/* Settings */}
              <div>
                <h4 className="text-sm font-medium mb-2">Display Settings</h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Font Size</label>
                    <div className="flex items-center gap-1 mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                        className="h-6 w-6 p-0"
                      >
                        -
                      </Button>
                      <span className="text-xs w-6 text-center">{fontSize}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                        className="h-6 w-6 p-0"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs text-muted-foreground">Theme</label>
                    <Select value={theme} onValueChange={(value: any) => setTheme(value)}>
                      <SelectTrigger className="mt-1 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Advanced Feature Dialogs */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelectTemplate={(template) => {
          setSelectedTemplate(template);
          setEntryType(template as any);
          setShowTemplateSelector(false);
        }}
      />

      <GitHubIntegration
        isOpen={showGitHubIntegration}
        onClose={() => setShowGitHubIntegration(false)}
        nodeId={nodeId}
      />

      <AIAssistant
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        nodeId={nodeId}
        context={{
          content,
          tags,
          type: entryType
        }}
      />
    </div>
  );
}