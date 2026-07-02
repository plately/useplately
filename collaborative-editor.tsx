import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  Sparkles,
  Brain,
  Lightbulb,
  Target,
  Calendar,
  BookOpen,
  MessageSquare,
  Zap,
  RefreshCw,
  Send,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Settings,
  Wand2
} from "lucide-react";

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId?: number;
  context?: {
    content: string;
    tags: string[];
    type: string;
  };
}

interface AIPrompt {
  id: string;
  title: string;
  prompt: string;
  category: 'writing' | 'reflection' | 'productivity' | 'creative' | 'analysis';
  icon: React.ReactNode;
}

interface AIResponse {
  id: string;
  prompt: string;
  response: string;
  timestamp: Date;
  rating?: 'positive' | 'negative';
}

const dailyPrompts: AIPrompt[] = [
  {
    id: 'gratitude',
    title: 'Daily Gratitude',
    prompt: 'What are three things you\'re genuinely grateful for today? Reflect on why each one matters to you.',
    category: 'reflection',
    icon: <Sparkles className="h-4 w-4" />
  },
  {
    id: 'challenge',
    title: 'Growth Challenge',
    prompt: 'What challenged you today? How did you handle it, and what did you learn about yourself?',
    category: 'reflection',
    icon: <Target className="h-4 w-4" />
  },
  {
    id: 'creative',
    title: 'Creative Spark',
    prompt: 'If you could solve any problem in the world, what would it be and how would you approach it?',
    category: 'creative',
    icon: <Lightbulb className="h-4 w-4" />
  },
  {
    id: 'productivity',
    title: 'Focus Reflection',
    prompt: 'What was your most productive moment today? What conditions made that possible?',
    category: 'productivity',
    icon: <Zap className="h-4 w-4" />
  },
  {
    id: 'wisdom',
    title: 'Daily Wisdom',
    prompt: 'What piece of advice would you give to someone facing a similar situation to yours today?',
    category: 'reflection',
    icon: <Brain className="h-4 w-4" />
  },
  {
    id: 'future',
    title: 'Tomorrow\'s Vision',
    prompt: 'What are you most looking forward to tomorrow, and how can you prepare for it today?',
    category: 'productivity',
    icon: <Calendar className="h-4 w-4" />
  }
];

const writingPrompts: AIPrompt[] = [
  {
    id: 'story',
    title: 'Story Starter',
    prompt: 'Write a short story that begins with: "The last person on Earth sat alone in a room. There was a knock on the door."',
    category: 'creative',
    icon: <BookOpen className="h-4 w-4" />
  },
  {
    id: 'memory',
    title: 'Memory Lane',
    prompt: 'Describe a childhood memory that still influences who you are today. What lessons did it teach you?',
    category: 'reflection',
    icon: <Brain className="h-4 w-4" />
  },
  {
    id: 'character',
    title: 'Character Study',
    prompt: 'Create a character who has the opposite personality to you. What would a typical day look like for them?',
    category: 'creative',
    icon: <MessageSquare className="h-4 w-4" />
  }
];

export default function AIAssistant({ isOpen, onClose, nodeId, context }: AIAssistantProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<AIPrompt | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [aiResponses, setAiResponses] = useState<AIResponse[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompts' | 'suggestions' | 'analysis'>('prompts');
  const [contentSuggestions, setContentSuggestions] = useState<string[]>([]);
  const [writingAnalysis, setWritingAnalysis] = useState<{
    wordCount: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    readability: number;
    topics: string[];
    suggestions: string[];
  } | null>(null);

  const { toast } = useToast();

  // Load saved AI responses
  useEffect(() => {
    const saved = localStorage.getItem('ai-responses');
    if (saved) {
      const parsed = JSON.parse(saved).map((r: any) => ({
        ...r,
        timestamp: new Date(r.timestamp)
      }));
      setAiResponses(parsed);
    }
  }, []);

  // Generate content suggestions based on context
  useEffect(() => {
    if (context && isOpen) {
      generateContentSuggestions();
      analyzeContent();
    }
  }, [context, isOpen]);

  const generateContentSuggestions = async () => {
    if (!context?.content) return;

    try {
      // Simulate AI content suggestions based on current content
      const suggestions = [
        "Consider expanding on the emotional aspects of this experience",
        "Add specific examples to illustrate your points",
        "Connect this to a broader theme or pattern in your life",
        "Explore the implications for your future goals",
        "Include sensory details to make the writing more vivid"
      ];

      setContentSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    }
  };

  const analyzeContent = async () => {
    if (!context?.content) return;

    try {
      const content = context.content;
      const words = content.split(/\s+/).filter(Boolean);
      
      // Simulate content analysis
      const analysis = {
        wordCount: words.length,
        sentiment: words.some(w => ['happy', 'good', 'great', 'amazing'].includes(w.toLowerCase())) 
          ? 'positive' as const
          : words.some(w => ['sad', 'bad', 'terrible', 'awful'].includes(w.toLowerCase()))
          ? 'negative' as const
          : 'neutral' as const,
        readability: Math.max(1, Math.min(10, 10 - (words.length / 50))),
        topics: context.tags || [],
        suggestions: [
          "Consider breaking long paragraphs into shorter ones",
          "Add transition words to improve flow",
          "Include more specific details",
          "Vary sentence length for better rhythm"
        ]
      };

      setWritingAnalysis(analysis);
    } catch (error) {
      console.error('Failed to analyze content:', error);
    }
  };

  const generateResponse = async (prompt: string) => {
    setIsGenerating(true);
    
    try {
      // Simulate AI response generation
      let response = '';
      
      if (prompt.includes('grateful')) {
        response = "Gratitude is a powerful practice that shifts our focus from what we lack to what we have. Consider writing about: your health and physical capabilities, relationships that bring joy to your life, recent achievements or progress you've made, simple pleasures like a warm cup of coffee or a beautiful sunset, and opportunities for growth and learning that have come your way.";
      } else if (prompt.includes('challenge')) {
        response = "Challenges are opportunities for growth. Reflect on: the specific situation that tested you, the emotions you felt during the experience, the strategies you used to cope or overcome the obstacle, what this experience taught you about your strengths and areas for improvement, and how you might handle similar situations differently in the future.";
      } else if (prompt.includes('creative') || prompt.includes('solve')) {
        response = "Creative problem-solving often starts with reframing the question. Consider: what assumptions are you making about this problem, who else has faced similar challenges, what would an ideal solution look like, what resources and constraints do you have, and how might you test your ideas on a small scale first.";
      } else {
        response = "This is an interesting prompt that invites deep reflection. Consider exploring multiple perspectives, drawing from your personal experiences, connecting to broader themes in your life, and being honest about both challenges and insights. Remember that authentic writing comes from genuine reflection and openness to discovery.";
      }

      const newResponse: AIResponse = {
        id: Date.now().toString(),
        prompt,
        response,
        timestamp: new Date()
      };

      setAiResponses(prev => [newResponse, ...prev]);
      localStorage.setItem('ai-responses', JSON.stringify([newResponse, ...aiResponses]));

      toast({
        title: "AI response generated",
        description: "New writing guidance has been created"
      });

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: "Failed to generate AI response"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePromptSelect = (prompt: AIPrompt) => {
    setSelectedPrompt(prompt);
    generateResponse(prompt.prompt);
  };

  const handleCustomPrompt = () => {
    if (!customPrompt.trim()) return;
    generateResponse(customPrompt);
    setCustomPrompt('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Content has been copied"
    });
  };

  const rateResponse = (responseId: string, rating: 'positive' | 'negative') => {
    setAiResponses(prev => 
      prev.map(r => r.id === responseId ? { ...r, rating } : r)
    );
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50';
      case 'negative': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getReadabilityLabel = (score: number) => {
    if (score >= 8) return { label: 'Excellent', color: 'text-green-600' };
    if (score >= 6) return { label: 'Good', color: 'text-blue-600' };
    if (score >= 4) return { label: 'Average', color: 'text-yellow-600' };
    return { label: 'Needs work', color: 'text-red-600' };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Writing Assistant
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('prompts')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'prompts' 
                  ? 'border-b-2 border-purple-500 text-purple-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Writing Prompts
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'suggestions' 
                  ? 'border-b-2 border-purple-500 text-purple-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Smart Suggestions
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'analysis' 
                  ? 'border-b-2 border-purple-500 text-purple-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Content Analysis
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'prompts' && (
              <div className="h-full flex">
                {/* Prompt Categories */}
                <div className="w-1/3 border-r">
                  <div className="p-4">
                    <h3 className="font-semibold mb-3">Daily Prompts</h3>
                    <div className="space-y-2">
                      {dailyPrompts.map((prompt) => (
                        <button
                          key={prompt.id}
                          onClick={() => handlePromptSelect(prompt)}
                          className="w-full text-left p-3 rounded-lg border hover:border-purple-300 hover:bg-purple-50 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {prompt.icon}
                            <span className="font-medium text-sm">{prompt.title}</span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">{prompt.prompt}</p>
                        </button>
                      ))}
                    </div>

                    <h3 className="font-semibold mb-3 mt-6">Creative Writing</h3>
                    <div className="space-y-2">
                      {writingPrompts.map((prompt) => (
                        <button
                          key={prompt.id}
                          onClick={() => handlePromptSelect(prompt)}
                          className="w-full text-left p-3 rounded-lg border hover:border-purple-300 hover:bg-purple-50 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {prompt.icon}
                            <span className="font-medium text-sm">{prompt.title}</span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">{prompt.prompt}</p>
                        </button>
                      ))}
                    </div>

                    <div className="mt-6">
                      <h3 className="font-semibold mb-3">Custom Prompt</h3>
                      <div className="space-y-2">
                        <Textarea
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          placeholder="Ask the AI anything..."
                          rows={3}
                        />
                        <Button 
                          onClick={handleCustomPrompt} 
                          disabled={!customPrompt.trim() || isGenerating}
                          className="w-full"
                        >
                          {isGenerating ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Generate Response
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Responses */}
                <div className="flex-1">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      <h3 className="font-semibold mb-4">AI Responses</h3>
                      {aiResponses.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Select a prompt to get AI-powered writing guidance</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {aiResponses.map((response) => (
                            <div key={response.id} className="border rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-sm text-purple-600">
                                  {response.prompt.length > 100 
                                    ? response.prompt.substring(0, 100) + '...' 
                                    : response.prompt}
                                </h4>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(response.response)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => rateResponse(response.id, 'positive')}
                                    className={response.rating === 'positive' ? 'text-green-600' : ''}
                                  >
                                    <ThumbsUp className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => rateResponse(response.id, 'negative')}
                                    className={response.rating === 'negative' ? 'text-red-600' : ''}
                                  >
                                    <ThumbsDown className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed mb-2">
                                {response.response}
                              </p>
                              <div className="text-xs text-gray-500">
                                {format(response.timestamp, 'MMM dd, yyyy HH:mm')}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}

            {activeTab === 'suggestions' && (
              <div className="p-4">
                <h3 className="font-semibold mb-4">Smart Suggestions</h3>
                {contentSuggestions.length > 0 ? (
                  <div className="space-y-3">
                    {contentSuggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                        <Wand2 className="h-4 w-4 text-purple-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm">{suggestion}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          Apply
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Start writing to receive smart suggestions</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analysis' && (
              <div className="p-4">
                <h3 className="font-semibold mb-4">Content Analysis</h3>
                {writingAnalysis ? (
                  <div className="space-y-6">
                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {writingAnalysis.wordCount}
                        </div>
                        <div className="text-sm text-gray-600">Words</div>
                      </div>
                      
                      <div className="text-center p-4 border rounded-lg">
                        <div className={`text-2xl font-bold capitalize ${getSentimentColor(writingAnalysis.sentiment)}`}>
                          {writingAnalysis.sentiment}
                        </div>
                        <div className="text-sm text-gray-600">Sentiment</div>
                      </div>
                      
                      <div className="text-center p-4 border rounded-lg">
                        <div className={`text-2xl font-bold ${getReadabilityLabel(writingAnalysis.readability).color}`}>
                          {writingAnalysis.readability}/10
                        </div>
                        <div className="text-sm text-gray-600">Readability</div>
                      </div>
                    </div>

                    {/* Topics */}
                    {writingAnalysis.topics.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Detected Topics</h4>
                        <div className="flex flex-wrap gap-2">
                          {writingAnalysis.topics.map((topic) => (
                            <Badge key={topic} variant="secondary">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Improvement Suggestions */}
                    <div>
                      <h4 className="font-medium mb-2">Improvement Suggestions</h4>
                      <div className="space-y-2">
                        {writingAnalysis.suggestions.map((suggestion, index) => (
                          <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                            <Target className="h-4 w-4 text-blue-500 mt-0.5" />
                            <span className="text-sm">{suggestion}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Write some content to see detailed analysis</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}