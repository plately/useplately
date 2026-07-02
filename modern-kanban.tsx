import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Code,
  CheckSquare,
  Users,
  Lightbulb,
  Calendar,
  Heart,
  Smile,
  Meh,
  Frown,
  Plus,
  Minus,
  Play,
  ArrowUp,
  ArrowDown,
  Circle,
  Mic,
  Upload,
  Link,
  Palette,
  Sparkles
} from "lucide-react";

interface TemplateProps {
  onSave: (content: any) => void;
  onCancel: () => void;
}

export function GeneralWritingTemplate({ onSave, onCancel }: TemplateProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<'happy' | 'neutral' | 'sad' | 'excited' | 'stressed'>('neutral');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [dailyPrompt, setDailyPrompt] = useState('');

  const moodIcons = {
    happy: <Smile className="h-5 w-5 text-green-500" />,
    neutral: <Meh className="h-5 w-5 text-gray-500" />,
    sad: <Frown className="h-5 w-5 text-blue-500" />,
    excited: <Heart className="h-5 w-5 text-pink-500" />,
    stressed: <Circle className="h-5 w-5 text-red-500" />
  };

  const dailyPrompts = [
    "What are three things you're grateful for today?",
    "What challenged you today and how did you handle it?",
    "Describe a moment from today that made you smile.",
    "What did you learn about yourself today?",
    "What are you looking forward to tomorrow?"
  ];

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleSave = () => {
    onSave({
      type: 'general_writing',
      title,
      content,
      mood,
      tags,
      dailyPrompt,
      metadata: {
        wordCount: content.split(/\s+/).filter(Boolean).length,
        readingTime: Math.ceil(content.split(/\s+/).filter(Boolean).length / 200)
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-blue-500" />
        <h2 className="text-xl font-semibold">General Writing Log</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter your journal title..."
          />
        </div>

        <div>
          <label className="text-sm font-medium">How are you feeling?</label>
          <div className="flex gap-3 mt-2">
            {Object.entries(moodIcons).map(([moodKey, icon]) => (
              <button
                key={moodKey}
                onClick={() => setMood(moodKey as any)}
                className={`p-3 rounded-lg border transition-all ${
                  mood === moodKey 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Daily Prompt</label>
          <Select value={dailyPrompt} onValueChange={setDailyPrompt}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a writing prompt..." />
            </SelectTrigger>
            <SelectContent>
              {dailyPrompts.map((prompt, index) => (
                <SelectItem key={index} value={prompt}>
                  {prompt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Content</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={dailyPrompt || "Start writing your thoughts..."}
            rows={12}
            className="resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Tags</label>
          <div className="flex gap-2 mt-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add a tag..."
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
            />
            <Button variant="outline" onClick={addTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
                <button
                  onClick={() => setTags(tags.filter(t => t !== tag))}
                  className="ml-1 hover:text-red-500"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Entry
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CodeSnippetTemplate({ onSave, onCancel }: TemplateProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [commitSummary, setCommitSummary] = useState('');

  const languages = [
    'javascript', 'python', 'typescript', 'java', 'cpp', 'c', 'rust', 'go',
    'html', 'css', 'sql', 'bash', 'json', 'yaml', 'markdown'
  ];

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const generateCommitSummary = () => {
    if (title && language) {
      setCommitSummary(`feat(${language}): ${title.toLowerCase().replace(/\s+/g, '-')}`);
    }
  };

  const handleSave = () => {
    onSave({
      type: 'code_snippet',
      title,
      description,
      code,
      language,
      tags: [...tags, language],
      commitSummary,
      metadata: {
        lineCount: code.split('\n').length,
        language
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Code className="h-6 w-6 text-green-500" />
        <h2 className="text-xl font-semibold">Code Snippet Journal</h2>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Code snippet title..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Language</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this code does..."
            rows={3}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Code</label>
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={`// Write your ${language} code here...`}
            rows={15}
            className="font-mono text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Commit Summary</label>
          <div className="flex gap-2">
            <Input
              value={commitSummary}
              onChange={(e) => setCommitSummary(e.target.value)}
              placeholder="Git-style commit message..."
            />
            <Button variant="outline" onClick={generateCommitSummary}>
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Tags</label>
          <div className="flex gap-2 mt-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add a tag..."
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
            />
            <Button variant="outline" onClick={addTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
                <button
                  onClick={() => setTags(tags.filter(t => t !== tag))}
                  className="ml-1 hover:text-red-500"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Code Snippet
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TaskBasedTemplate({ onSave, onCancel }: TemplateProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tasks, setTasks] = useState<Array<{
    id: number;
    text: string;
    completed: boolean;
    priority: 'low' | 'medium' | 'high';
    subtasks: Array<{ id: number; text: string; completed: boolean }>;
  }>>([]);
  const [newTaskText, setNewTaskText] = useState('');

  const addTask = () => {
    if (newTaskText.trim()) {
      setTasks([...tasks, {
        id: Date.now(),
        text: newTaskText.trim(),
        completed: false,
        priority: 'medium',
        subtasks: []
      }]);
      setNewTaskText('');
    }
  };

  const toggleTask = (taskId: number) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const updateTaskPriority = (taskId: number, priority: 'low' | 'medium' | 'high') => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, priority } : task
    ));
  };

  const addSubtask = (taskId: number, subtaskText: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, subtasks: [...task.subtasks, { 
            id: Date.now(), 
            text: subtaskText, 
            completed: false 
          }]}
        : task
    ));
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <ArrowUp className="h-4 w-4 text-red-500" />;
      case 'medium': return <Minus className="h-4 w-4 text-yellow-500" />;
      case 'low': return <ArrowDown className="h-4 w-4 text-green-500" />;
      default: return <Circle className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleSave = () => {
    onSave({
      type: 'task_based',
      title,
      description,
      tasks,
      metadata: {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.completed).length,
        highPriorityTasks: tasks.filter(t => t.priority === 'high').length
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CheckSquare className="h-6 w-6 text-purple-500" />
        <h2 className="text-xl font-semibold">Task-Based Note</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task list title..."
          />
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this task list..."
            rows={3}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Tasks</label>
          <div className="flex gap-2 mt-2">
            <Input
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Add a new task..."
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
            />
            <Button variant="outline" onClick={addTask}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 mt-4">
            {tasks.map((task) => (
              <div key={task.id} className="border rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTask(task.id)}
                  />
                  <span className={task.completed ? 'line-through text-gray-500' : ''}>
                    {task.text}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <Select
                      value={task.priority}
                      onValueChange={(value: any) => updateTaskPriority(task.id, value)}
                    >
                      <SelectTrigger className="w-24">
                        {getPriorityIcon(task.priority)}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Task Note
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MeetingRecapTemplate({ onSave, onCancel }: TemplateProps) {
  const [title, setTitle] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [newParticipant, setNewParticipant] = useState('');
  const [agenda, setAgenda] = useState('');
  const [notes, setNotes] = useState('');
  const [actionItems, setActionItems] = useState<Array<{
    id: number;
    text: string;
    assignee: string;
    dueDate?: Date;
  }>>([]);
  const [recordings, setRecordings] = useState<Array<{
    id: number;
    name: string;
    timestamp: string;
  }>>([]);

  const addParticipant = () => {
    if (newParticipant.trim() && !participants.includes(newParticipant.trim())) {
      setParticipants([...participants, newParticipant.trim()]);
      setNewParticipant('');
    }
  };

  const addActionItem = () => {
    setActionItems([...actionItems, {
      id: Date.now(),
      text: '',
      assignee: ''
    }]);
  };

  const handleSave = () => {
    onSave({
      type: 'meeting_recap',
      title,
      participants,
      agenda,
      notes,
      actionItems,
      recordings,
      metadata: {
        participantCount: participants.length,
        actionItemCount: actionItems.length,
        meetingDate: new Date().toISOString()
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-orange-500" />
        <h2 className="text-xl font-semibold">Meeting / Event Recap</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Meeting Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Meeting title..."
          />
        </div>

        <div>
          <label className="text-sm font-medium">Participants</label>
          <div className="flex gap-2 mt-2">
            <Input
              value={newParticipant}
              onChange={(e) => setNewParticipant(e.target.value)}
              placeholder="Add participant..."
              onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
            />
            <Button variant="outline" onClick={addParticipant}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {participants.map((participant) => (
              <Badge key={participant} variant="outline">
                {participant}
                <button
                  onClick={() => setParticipants(participants.filter(p => p !== participant))}
                  className="ml-1 hover:text-red-500"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Agenda</label>
          <Textarea
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            placeholder="Meeting agenda..."
            rows={4}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Notes & Discussion</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Meeting notes and key discussion points..."
            rows={8}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Action Items</label>
          <Button variant="outline" onClick={addActionItem} className="w-full mt-2">
            <Plus className="h-4 w-4 mr-2" />
            Add Action Item
          </Button>
          <div className="space-y-2 mt-2">
            {actionItems.map((item, index) => (
              <div key={item.id} className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Action item..."
                  value={item.text}
                  onChange={(e) => {
                    const newItems = [...actionItems];
                    newItems[index].text = e.target.value;
                    setActionItems(newItems);
                  }}
                />
                <Input
                  placeholder="Assignee..."
                  value={item.assignee}
                  onChange={(e) => {
                    const newItems = [...actionItems];
                    newItems[index].assignee = e.target.value;
                    setActionItems(newItems);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Meeting Recap
          </Button>
        </div>
      </div>
    </div>
  );
}

export function BrainstormingTemplate({ onSave, onCancel }: TemplateProps) {
  const [title, setTitle] = useState('');
  const [centralIdea, setCentralIdea] = useState('');
  const [ideas, setIdeas] = useState<Array<{
    id: number;
    text: string;
    x: number;
    y: number;
    color: string;
    connections: number[];
  }>>([]);
  const [connections, setConnections] = useState<Array<{
    id: number;
    from: number;
    to: number;
    label?: string;
  }>>([]);

  const colors = ['bg-blue-200', 'bg-green-200', 'bg-yellow-200', 'bg-pink-200', 'bg-purple-200'];

  const addIdea = () => {
    const newIdea = {
      id: Date.now(),
      text: 'New idea',
      x: Math.random() * 400,
      y: Math.random() * 300,
      color: colors[Math.floor(Math.random() * colors.length)],
      connections: []
    };
    setIdeas([...ideas, newIdea]);
  };

  const handleSave = () => {
    onSave({
      type: 'brainstorming',
      title,
      centralIdea,
      ideas,
      connections,
      metadata: {
        ideaCount: ideas.length,
        connectionCount: connections.length
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Lightbulb className="h-6 w-6 text-yellow-500" />
        <h2 className="text-xl font-semibold">Brainstorming Node</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Session Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brainstorming session title..."
          />
        </div>

        <div>
          <label className="text-sm font-medium">Central Idea</label>
          <Input
            value={centralIdea}
            onChange={(e) => setCentralIdea(e.target.value)}
            placeholder="What's the main topic or problem?"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Idea Canvas</label>
          <div className="border rounded-lg p-4 h-96 relative bg-gray-50">
            <Button
              variant="outline"
              onClick={addIdea}
              className="absolute top-2 right-2 z-10"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Idea
            </Button>
            
            {/* Central idea bubble */}
            {centralIdea && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white p-4 rounded-full text-center font-semibold">
                {centralIdea}
              </div>
            )}
            
            {/* Idea bubbles */}
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className={`absolute p-2 rounded-lg ${idea.color} border cursor-move`}
                style={{ left: idea.x, top: idea.y }}
              >
                <Input
                  value={idea.text}
                  onChange={(e) => {
                    const newIdeas = ideas.map(i => 
                      i.id === idea.id ? { ...i, text: e.target.value } : i
                    );
                    setIdeas(newIdeas);
                  }}
                  className="border-none bg-transparent p-0 text-xs"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Brainstorm
          </Button>
        </div>
      </div>
    </div>
  );
}

interface TemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: string) => void;
}

export function TemplateSelector({ isOpen, onClose, onSelectTemplate }: TemplateDialogProps) {
  const templates = [
    {
      id: 'general_writing',
      name: 'General Writing Log',
      description: 'Rich markdown editor with mood tracking and daily prompts',
      icon: <FileText className="h-6 w-6 text-blue-500" />,
      color: 'border-blue-200 hover:border-blue-400'
    },
    {
      id: 'code_snippet',
      name: 'Code Snippet Journal',
      description: 'Syntax highlighting and version control for code',
      icon: <Code className="h-6 w-6 text-green-500" />,
      color: 'border-green-200 hover:border-green-400'
    },
    {
      id: 'task_based',
      name: 'Task-Based Note',
      description: 'Checkbox lists with priorities and status tracking',
      icon: <CheckSquare className="h-6 w-6 text-purple-500" />,
      color: 'border-purple-200 hover:border-purple-400'
    },
    {
      id: 'meeting_recap',
      name: 'Meeting / Event Recap',
      description: 'Structured meeting notes with action items',
      icon: <Users className="h-6 w-6 text-orange-500" />,
      color: 'border-orange-200 hover:border-orange-400'
    },
    {
      id: 'brainstorming',
      name: 'Brainstorming Node',
      description: 'Visual whiteboard for connecting ideas',
      icon: <Lightbulb className="h-6 w-6 text-yellow-500" />,
      color: 'border-yellow-200 hover:border-yellow-400'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Choose a Journal Template</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template.id)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${template.color}`}
            >
              <div className="flex items-center gap-3 mb-2">
                {template.icon}
                <h3 className="font-semibold">{template.name}</h3>
              </div>
              <p className="text-sm text-gray-600">{template.description}</p>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}