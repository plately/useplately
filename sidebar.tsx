import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Node } from "@shared/schema";
import { 
  Book, 
  Save, 
  Plus,
  Bold, 
  Italic, 
  Underline, 
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Link2,
  Image,
  Palette,
  Type,
  FileText,
  Search,
  Calendar,
  Tag,
  Hash,
  Sparkles,
  PenTool,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Strikethrough,
  MoreHorizontal,
  GitBranch,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  Copy,
  Share
} from "lucide-react";
import { format } from "date-fns";

interface JournalEntry {
  id: number;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  mood?: string;
  wordCount: number;
}

export default function RichTextJournal() {
  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  const [entryTitle, setEntryTitle] = useState("");
  const [entryTags, setEntryTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTextColor, setSelectedTextColor] = useState("#000000");
  const [selectedHighlightColor, setSelectedHighlightColor] = useState("#ffff00");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [fontSize, setFontSize] = useState("16");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [entryToConvert, setEntryToConvert] = useState<JournalEntry | null>(null);
  const [convertToType, setConvertToType] = useState("note");
  const [linkedNodes, setLinkedNodes] = useState<Node[]>([]);
  const [selectedLinkedNodes, setSelectedLinkedNodes] = useState<number[]>([]);

  // Text colors
  const textColors = [
    "#000000", "#374151", "#6B7280", "#EF4444", "#F97316", 
    "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899"
  ];

  // Highlight colors
  const highlightColors = [
    "#FEF3C7", "#DBEAFE", "#D1FAE5", "#FECACA", "#E0E7FF",
    "#F3E8FF", "#FCE7F3", "#FFEDD5", "#ECFDF5", "#F0F9FF"
  ];

  // Font families
  const fontFamilies = [
    "Inter", "Arial", "Georgia", "Times New Roman", "Courier New",
    "Helvetica", "Verdana", "Trebuchet MS", "Comic Sans MS", "Impact"
  ];

  // Journal templates
  const journalTemplates = [
    {
      name: "Daily Reflection",
      content: `<h2>Daily Reflection - ${format(new Date(), 'PPP')}</h2>
<h3>📅 Today's Focus</h3>
<p>What are the 3 most important things I want to accomplish today?</p>
<ul><li></li><li></li><li></li></ul>

<h3>💭 Current Thoughts</h3>
<p>What's on my mind right now?</p>

<h3>🎯 Progress & Wins</h3>
<p>What did I accomplish? What went well?</p>

<h3>🔍 Challenges & Learnings</h3>
<p>What obstacles did I face? What did I learn?</p>

<h3>✨ Gratitude</h3>
<p>What am I grateful for today?</p>

<h3>🌅 Tomorrow's Intention</h3>
<p>What do I want to focus on tomorrow?</p>`
    },
    {
      name: "Project Planning",
      content: `<h2>🚀 Project Planning Session</h2>
<h3>📋 Project Overview</h3>
<p><strong>Project Name:</strong> </p>
<p><strong>Goal:</strong> </p>
<p><strong>Deadline:</strong> </p>

<h3>🎯 Objectives</h3>
<ul><li></li><li></li><li></li></ul>

<h3>📊 Resources Needed</h3>
<p>What tools, people, or materials do I need?</p>

<h3>⚡ Action Steps</h3>
<ol><li></li><li></li><li></li></ol>

<h3>🚧 Potential Challenges</h3>
<p>What obstacles might I encounter?</p>

<h3>✅ Success Metrics</h3>
<p>How will I know this project is successful?</p>`
    },
    {
      name: "Meeting Notes",
      content: `<h2>📝 Meeting Notes</h2>
<h3>Meeting Details</h3>
<p><strong>Date:</strong> ${format(new Date(), 'PPP')}</p>
<p><strong>Time:</strong> ${format(new Date(), 'p')}</p>
<p><strong>Attendees:</strong> </p>
<p><strong>Purpose:</strong> </p>

<h3>📋 Agenda</h3>
<ul><li></li><li></li><li></li></ul>

<h3>💬 Key Discussion Points</h3>
<p>What were the main topics discussed?</p>

<h3>✅ Decisions Made</h3>
<ul><li></li><li></li></ul>

<h3>🎯 Action Items</h3>
<ul><li><strong>Who:</strong> | <strong>What:</strong> | <strong>When:</strong></li></ul>

<h3>📅 Next Steps</h3>
<p>What happens next? When is the follow-up?</p>`
    },
    {
      name: "Creative Brainstorm",
      content: `<h2>🧠 Creative Brainstorm</h2>
<h3>💡 Challenge/Opportunity</h3>
<p>What am I trying to solve or explore?</p>

<h3>🌟 Wild Ideas</h3>
<p>No judgment zone - what are all the possibilities?</p>
<ul><li></li><li></li><li></li><li></li><li></li></ul>

<h3>🔥 Most Promising Ideas</h3>
<p>Which ideas have the most potential?</p>

<h3>🛠️ How Might We...</h3>
<ul><li>How might we make this simpler?</li><li>How might we make this more engaging?</li><li>How might we solve this differently?</li></ul>

<h3>🎨 Visual Inspiration</h3>
<p>Any visual references, sketches, or inspiration?</p>

<h3>⚡ Next Experiments</h3>
<p>What small tests can I run to validate these ideas?</p>`
    }
  ];

  // Query for journal entries (stored as nodes with type 'journal')
  const { data: journalNodes = [] } = useQuery({
    queryKey: ['/api/nodes', 'journal'],
    queryFn: async () => {
      const allNodes = await fetch('/api/nodes', { credentials: 'include' }).then(res => res.json());
      return Array.isArray(allNodes) ? allNodes.filter((node: any) => node.nodeType === 'journal') : [];
    }
  });

  // Query for all nodes (for linking)
  const { data: allNodes = [] } = useQuery({
    queryKey: ['/api/nodes'],
  });

  // Convert nodes to journal entries
  const journalEntries: JournalEntry[] = Array.isArray(journalNodes) ? journalNodes.map((node: any) => ({
    id: node.id,
    title: node.title,
    content: node.content || '',
    tags: node.tags || [],
    createdAt: new Date(node.createdAt),
    updatedAt: new Date(node.updatedAt),
    wordCount: countWords(node.content || '')
  })) : [];

  // Filter entries based on search
  const filteredEntries = journalEntries.filter(entry =>
    entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Save entry mutation
  const saveEntryMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; tags: string[]; id?: number }) => {
      const method = data.id ? 'PUT' : 'POST';
      const url = data.id ? `/api/nodes/${data.id}` : '/api/nodes';
      
      return apiRequest(url, {
        method,
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          nodeType: 'journal',
          tags: data.tags,
          createdBy: 1
        })
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nodes', 'journal'] });
      queryClient.invalidateQueries({ queryKey: ['/api/nodes'] });
      setIsEditing(false);
      setCurrentEntry(null);
      setEntryTitle("");
      setEntryTags([]);
      toast({
        title: "Journal entry saved",
        description: "Your entry has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving entry",
        description: "Failed to save your journal entry. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Convert entry to different node type mutation
  const convertEntryMutation = useMutation({
    mutationFn: async (data: { entryId: number; newType: string; linkedNodeIds: number[] }) => {
      // Update the node type
      const updateResponse = await apiRequest(`/api/nodes/${data.entryId}`, {
        method: 'PUT',
        body: JSON.stringify({
          nodeType: data.newType
        })
      });

      // Create links to selected nodes
      for (const linkedNodeId of data.linkedNodeIds) {
        await apiRequest('/api/node-links', {
          method: 'POST',
          body: JSON.stringify({
            sourceId: data.entryId,
            targetId: linkedNodeId,
            label: 'relates-to'
          })
        });
      }

      return updateResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nodes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/node-links'] });
      setShowConvertDialog(false);
      setEntryToConvert(null);
      setSelectedLinkedNodes([]);
      toast({
        title: "Entry converted successfully",
        description: "Your journal entry has been converted and linked to selected nodes.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error converting entry",
        description: "Failed to convert journal entry. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Delete entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: number) => {
      return apiRequest(`/api/nodes/${entryId}`, {
        method: 'DELETE'
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nodes', 'journal'] });
      queryClient.invalidateQueries({ queryKey: ['/api/nodes'] });
      toast({
        title: "Entry deleted",
        description: "Journal entry has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting entry",
        description: "Failed to delete journal entry. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Text formatting functions
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertTemplate = (template: any) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = template.content;
      setEntryTitle(template.name + " - " + format(new Date(), 'PPP'));
    }
    setShowTemplateDialog(false);
  };

  const saveEntry = () => {
    if (!entryTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your journal entry.",
        variant: "destructive"
      });
      return;
    }

    const content = editorRef.current?.innerHTML || '';
    saveEntryMutation.mutate({
      id: currentEntry?.id,
      title: entryTitle,
      content,
      tags: entryTags
    });
  };

  const editEntry = (entry: JournalEntry) => {
    setCurrentEntry(entry);
    setEntryTitle(entry.title);
    setEntryTags(entry.tags);
    setIsEditing(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = entry.content;
      }
    }, 100);
  };

  const startNewEntry = () => {
    setCurrentEntry(null);
    setEntryTitle("");
    setEntryTags([]);
    setIsEditing(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    }, 100);
  };

  const addTag = () => {
    if (newTag.trim() && !entryTags.includes(newTag.trim())) {
      setEntryTags([...entryTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEntryTags(entryTags.filter(tag => tag !== tagToRemove));
  };

  const handleConvertEntry = (entry: JournalEntry) => {
    setEntryToConvert(entry);
    setConvertToType("note");
    setSelectedLinkedNodes([]);
    setShowConvertDialog(true);
  };

  const handleDeleteEntry = (entry: JournalEntry) => {
    if (confirm(`Are you sure you want to delete "${entry.title}"? This action cannot be undone.`)) {
      deleteEntryMutation.mutate(entry.id);
    }
  };

  const handleConvertConfirm = () => {
    if (entryToConvert) {
      convertEntryMutation.mutate({
        entryId: entryToConvert.id,
        newType: convertToType,
        linkedNodeIds: selectedLinkedNodes
      });
    }
  };

  function countWords(text: string): number {
    return text.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  return (
    <div className="h-full flex flex-col">
      {!isEditing ? (
        // Journal entries list view
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Book className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Journal</h1>
              <Badge variant="secondary" className="text-xs">
                {journalEntries.length} entries
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              
              <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Templates
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Journal Templates</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {journalTemplates.map((template, index) => (
                      <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => insertTemplate(template)}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-xs text-muted-foreground">
                            {template.content.replace(/<[^>]*>/g, '').slice(0, 100)}...
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>

              <Button onClick={startNewEntry} size="sm" className="bg-gradient-to-r from-blue-500 via-slate-500 to-indigo-500 hover:from-blue-600 hover:via-slate-600 hover:to-indigo-600">
                <Plus className="h-4 w-4 mr-2" />
                New Entry
              </Button>
            </div>
          </div>

          {/* Entries list */}
          <ScrollArea className="flex-1">
            <div className="space-y-4">
              {filteredEntries.length > 0 ? (
                filteredEntries.map(entry => (
                  <Card key={entry.id} className="glass-card hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => editEntry(entry)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">{entry.title}</CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(entry.createdAt, 'MMM d, yyyy')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Type className="h-3 w-3" />
                              {entry.wordCount} words
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); editEntry(entry); }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Entry
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleConvertEntry(entry); }}>
                              <GitBranch className="h-4 w-4 mr-2" />
                              Convert to Node
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteEntry(entry); }} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Entry
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div 
                        className="text-sm text-muted-foreground mb-3 line-clamp-3"
                        dangerouslySetInnerHTML={{ 
                          __html: entry.content.replace(/<[^>]*>/g, '').slice(0, 200) + '...' 
                        }}
                      />
                      
                      {entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {entry.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <Hash className="h-2 w-2 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No journal entries found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'Try adjusting your search terms' : 'Start writing your first journal entry'}
                  </p>
                  <Button onClick={startNewEntry} className="bg-gradient-to-r from-blue-500 via-slate-500 to-indigo-500 hover:from-blue-600 hover:via-slate-600 hover:to-indigo-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Entry
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      ) : (
        // Rich text editor view
        <div className="flex-1 flex flex-col">
          {/* Editor header */}
          <div className="flex items-center justify-between mb-4">
            <Input
              placeholder="Entry title..."
              value={entryTitle}
              onChange={(e) => setEntryTitle(e.target.value)}
              className="text-lg font-medium border-none shadow-none px-0 focus-visible:ring-0"
            />
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setCurrentEntry(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={saveEntry}
                disabled={saveEntryMutation.isPending}
                className="bg-gradient-to-r from-blue-500 via-slate-500 to-indigo-500 hover:from-blue-600 hover:via-slate-600 hover:to-indigo-600"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveEntryMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Formatting toolbar */}
          <div className="flex flex-wrap items-center gap-1 p-3 bg-muted/30 rounded-lg mb-4">
            {/* Font styling */}
            <div className="flex items-center gap-1 mr-2">
              <select 
                value={fontFamily} 
                onChange={(e) => {
                  setFontFamily(e.target.value);
                  formatText('fontName', e.target.value);
                }}
                className="text-xs border rounded px-2 py-1"
              >
                {fontFamilies.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
              
              <select 
                value={fontSize} 
                onChange={(e) => {
                  setFontSize(e.target.value);
                  formatText('fontSize', e.target.value);
                }}
                className="text-xs border rounded px-2 py-1 w-16"
              >
                {[12, 14, 16, 18, 20, 24, 28, 32, 36].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Text formatting */}
            <Button variant="ghost" size="sm" onClick={() => formatText('bold')}>
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => formatText('italic')}>
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => formatText('underline')}>
              <Underline className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => formatText('strikethrough')}>
              <Strikethrough className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Headers */}
            <Button variant="ghost" size="sm" onClick={() => formatText('formatBlock', 'h1')}>
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => formatText('formatBlock', 'h2')}>
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => formatText('formatBlock', 'h3')}>
              <Heading3 className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Text color */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Text Color</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {textColors.map(color => (
                      <button
                        key={color}
                        className="w-8 h-8 rounded border-2 border-gray-200 hover:border-gray-400"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          setSelectedTextColor(color);
                          formatText('foreColor', color);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Highlight color */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Highlighter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Highlight Color</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {highlightColors.map(color => (
                      <button
                        key={color}
                        className="w-8 h-8 rounded border-2 border-gray-200 hover:border-gray-400"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          setSelectedHighlightColor(color);
                          formatText('backColor', color);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Alignment */}
            <Button variant="ghost" size="sm" onClick={() => formatText('justifyLeft')}>
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => formatText('justifyCenter')}>
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => formatText('justifyRight')}>
              <AlignRight className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Lists */}
            <Button variant="ghost" size="sm" onClick={() => formatText('insertUnorderedList')}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => formatText('insertOrderedList')}>
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => formatText('formatBlock', 'blockquote')}>
              <Quote className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Code */}
            <Button variant="ghost" size="sm" onClick={() => formatText('formatBlock', 'pre')}>
              <Code className="h-4 w-4" />
            </Button>
          </div>

          {/* Rich text editor */}
          <div className="flex-1 border rounded-lg p-4 bg-background">
            <div
              ref={editorRef}
              contentEditable
              className="min-h-[400px] outline-none prose prose-sm max-w-none"
              style={{ 
                fontFamily: fontFamily,
                fontSize: fontSize + 'px'
              }}
              suppressContentEditableWarning={true}
            />
          </div>

          {/* Tags input */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Add tags..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                className="flex-1"
              />
              <Button onClick={addTag} size="sm" variant="outline">
                Add
              </Button>
            </div>
            
            {entryTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {entryTags.map((tag, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeTag(tag)}
                  >
                    <Hash className="h-2 w-2 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Convert Entry Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto glass-modal">
          <DialogHeader>
            <DialogTitle>Convert Journal Entry to Node</DialogTitle>
          </DialogHeader>
          
          {entryToConvert && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <h3 className="font-medium mb-1">{entryToConvert.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {entryToConvert.content.replace(/<[^>]*>/g, '').slice(0, 100)}...
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Convert to Node Type</label>
                <Select value={convertToType} onValueChange={setConvertToType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="reference">Reference</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Link to Existing Nodes (Optional)</label>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {Array.isArray(allNodes) ? allNodes.filter((node: any) => node.nodeType !== 'journal' && node.id !== entryToConvert.id).map((node: any) => (
                    <div key={node.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                      <input
                        type="checkbox"
                        checked={selectedLinkedNodes.includes(node.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLinkedNodes([...selectedLinkedNodes, node.id]);
                          } else {
                            setSelectedLinkedNodes(selectedLinkedNodes.filter(id => id !== node.id));
                          }
                        }}
                        className="rounded"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{node.title}</div>
                        <div className="text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs mr-1">{node.nodeType}</Badge>
                          {node.tags?.slice(0, 2).map((tag: string) => (
                            <span key={tag} className="text-xs">#{tag} </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )) : null}
                </div>
                {selectedLinkedNodes.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedLinkedNodes.length} node(s) selected for linking
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowConvertDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleConvertConfirm}
                  disabled={convertEntryMutation.isPending}
                  className="bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 hover:from-green-600 hover:via-blue-600 hover:to-purple-600 text-white"
                >
                  {convertEntryMutation.isPending ? (
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <GitBranch className="h-4 w-4 mr-2" />
                  )}
                  Convert Node
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}