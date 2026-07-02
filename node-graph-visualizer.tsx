import { useState, useEffect, useRef } from 'react';
import { Node, NodeWithLinks } from '@shared/schema';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link, Network, Tag, Calendar, User, Clock, ExternalLink, Code } from 'lucide-react';
import Prism from 'prismjs';
// Import default CSS
import 'prismjs/themes/prism-tomorrow.css';
// Import languages
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';

interface NodeEditorProps {
  node: NodeWithLinks;
  onChange: (updatedNode: Node) => void;
}

interface NodeBulletProps {
  content: string;
  level?: number;
  children?: React.ReactNode;
}

// Function to parse node links in text
const parseNodeLinks = (text: string) => {
  const linkRegex = /\[\[(.*?)\]\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }
    
    parts.push({
      type: 'link',
      content: match[1]
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }
  
  return parts;
};

// Render a bullet point with or without nested items
const NodeBullet = ({ content, level = 0, children }: NodeBulletProps) => {
  const parts = parseNodeLinks(content);
  
  return (
    <div className={`pl-${level > 0 ? 4 : 0} mb-2`}>
      <div className="relative pl-5">
        <span className="absolute left-0 top-1.5 w-2 h-2 bg-primary rounded-full"></span>
        <span>
          {parts.map((part, index) => 
            part.type === 'link' ? (
              <span key={index} className="node-link">
                [[{part.content}]]
              </span>
            ) : (
              <span key={index}>{part.content}</span>
            )
          )}
        </span>
      </div>
      {children}
    </div>
  );
};

// Define item types for better type safety
interface TextItem {
  type: 'text';
  content: string;
}

interface CodeItem {
  type: 'code';
  content: string;
  language: string;
}

interface BulletItem {
  type?: string; // undefined type defaults to bullet
  content: string;
  level?: number;
  children?: Array<{
    content: string;
    level: number;
  }>;
}

type ContentItem = TextItem | CodeItem | BulletItem;

// Define content section type
interface ContentSection {
  title: string;
  items: ContentItem[];
}

// Parse code blocks from content
const parseCodeBlocks = (text: string) => {
  // Match code blocks with language specification: ```language\ncode\n```
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before the code block
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }
    
    // Add the code block with language
    parts.push({
      type: 'code',
      language: match[1] || 'text', // Default to text if no language specified
      content: match[2]
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after the last code block
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }
  
  return parts;
};

// Render a code block using Prism.js
const CodeBlock = ({ language, content }: { language: string, content: string }) => {
  const codeRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [language, content]);
  
  return (
    <div className="code-block-container my-4 rounded-md overflow-hidden border border-gray-700">
      <div className="code-header bg-gray-800 text-gray-300 px-4 py-1 text-xs flex items-center justify-between">
        <span className="text-sm font-mono">{language}</span>
        <div className="flex items-center space-x-1">
          <Code className="h-3 w-3 mr-1" />
          <span>Code</span>
        </div>
      </div>
      <pre className="rounded-b-md p-4 m-0 text-sm bg-gray-900 overflow-x-auto">
        <code ref={codeRef} className={`language-${language}`}>
          {content}
        </code>
      </pre>
    </div>
  );
};

// Process markdown-like content into structured format
const processNodeContent = (content: string): ContentSection[] => {
  if (!content) return [];
  
  const lines = content.split('\n');
  const sections: ContentSection[] = [];
  let currentSection: ContentSection | null = null;
  let currentList: any[] = [];
  let isInCodeBlock = false;
  let codeBlockLanguage = '';
  let codeBlockContent = '';
  
  // Process line by line
  lines.forEach(line => {
    // Handle code block start/end
    if (line.startsWith('```')) {
      if (!isInCodeBlock) {
        // Starting a code block
        isInCodeBlock = true;
        codeBlockLanguage = line.substring(3).trim();
        codeBlockContent = '';
      } else {
        // Ending a code block
        isInCodeBlock = false;
        
        // Add code block to current section
        if (currentSection) {
          currentSection.items.push({
            type: 'code',
            content: codeBlockContent,
            language: codeBlockLanguage || 'text'
          });
        }
      }
      return;
    }
    
    // If we're in a code block, just add to the content
    if (isInCodeBlock) {
      codeBlockContent += line + '\n';
      return;
    }
    
    // Normal processing for non-code content
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) return;
    
    // Check if it's a heading (## Heading)
    if (trimmedLine.startsWith('##')) {
      // If there was a previous section, save it
      if (currentSection) {
        if (currentList.length > 0) {
          currentSection.items = currentList;
          currentList = [];
        }
        sections.push(currentSection);
      }
      
      // Start a new section
      currentSection = {
        title: trimmedLine.substring(2).trim(),
        items: []
      };
      return;
    }
    
    // Check if it's a bullet point (- Item)
    if (trimmedLine.startsWith('-')) {
      const item = trimmedLine.substring(1).trim();
      
      // Check for nesting level
      if (line.startsWith('  -') || line.startsWith('    -')) {
        // This is a nested item, attach to the previous item
        const level = line.indexOf('-') / 2;
        
        // Add nested item to the last item at level-1
        if (currentList.length > 0) {
          const lastItem = currentList[currentList.length - 1];
          if (!lastItem.children) lastItem.children = [];
          lastItem.children.push({
            content: item,
            level
          });
        }
      } else {
        // Top-level item
        currentList.push({
          content: item,
          level: 0
        });
      }
      return;
    }
    
    // Regular text, add to current section
    if (currentSection) {
      currentSection.items.push({
        type: 'text',
        content: line
      });
    }
  });
  
  // Add the last section
  if (currentSection) {
    if (currentList.length > 0) {
      currentSection.items = currentList;
    }
    sections.push(currentSection);
  }
  
  return sections;
};

export default function NodeEditor({ node, onChange }: NodeEditorProps) {
  const [content, setContent] = useState(node.content || '');
  
  // Process node content
  const sections = processNodeContent(content);
  
  // Handle manual edits (in a real app, this would use a rich text editor)
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onChange({
      ...node,
      content: newContent
    });
  };
  
  // Get node type badge color
  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case 'journal': return 'bg-blue-500';
      case 'task': return 'bg-slate-500';
      case 'meeting': return 'bg-slate-600';
      case 'document': return 'bg-slate-400';
      case 'note': return 'bg-blue-600';
      case 'integration': return 'bg-slate-500';
      default: return 'bg-gray-500';
    }
  };
  
  // Render node children (for nested structure like in a journal)
  const renderNodeChildren = () => {
    if (!node.children || node.children.length === 0) return null;
    
    return node.children.map(childNode => (
      <div key={childNode.id} className="mb-6 p-3 bg-accent/10 rounded-md border border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${getNodeTypeColor(childNode.nodeType)}`}></div>
            <h2 className="font-display font-medium text-lg">{childNode.title}</h2>
          </div>
          <Badge variant="outline" className="capitalize">{childNode.nodeType}</Badge>
        </div>
        
        {childNode.nodeType === 'meeting' && childNode.properties && (
          <div className="mb-4 bg-accent/30 p-3 rounded-lg">
            {/* Meeting attendees */}
            {childNode.properties && typeof childNode.properties === 'object' && 
             'attendees' in childNode.properties && 
             Array.isArray((childNode.properties as any).attendees) && 
              (childNode.properties as any).attendees.map((attendeeId: number) => (
                <div key={attendeeId} className="mb-2">
                  {/* In a real app, fetch attendee details */}
                  <div className="flex items-center mb-1">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                      <User className="h-3 w-3" />
                    </div>
                    <span className="font-medium">Attendee {attendeeId}</span>
                  </div>
                  
                  {/* Sample content */}
                  <div className="pl-8 space-y-1">
                    <NodeBullet content="Sample point from meeting" />
                  </div>
                </div>
              ))
            }
          </div>
        )}
        
        {childNode.content && (
          <div className="pl-5 space-y-2">
            {processNodeContent(childNode.content || '').map((section, sIndex) => (
              <div key={sIndex}>
                {section.title && <h3 className="font-medium text-sm mb-1">{section.title}</h3>}
                {section.items && section.items.map((item: any, iIndex: number) => {
                  if (item.type === 'text') {
                    return <p key={iIndex} className="mb-2 text-sm">{item.content}</p>;
                  }
                  
                  return (
                    <NodeBullet key={iIndex} content={item.content} level={item.level}>
                      {item.children && (
                        <div className="pl-4 mt-1">
                          {item.children.map((child: any, cIndex: number) => (
                            <NodeBullet key={cIndex} content={child.content} level={child.level} />
                          ))}
                        </div>
                      )}
                    </NodeBullet>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="node-editor">
      {/* Node metadata header */}
      <div className="mb-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className={`w-4 h-4 rounded-full mr-2 ${getNodeTypeColor(node.nodeType)}`}></div>
            <h1 className="text-2xl font-display font-semibold">{node.title}</h1>
          </div>
          
          <Badge variant="outline" className="capitalize text-sm">{node.nodeType}</Badge>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-3">
          {/* Node metadata */}
          {node.creator && (
            <div className="flex items-center text-xs text-muted-foreground bg-accent/30 px-2 py-1 rounded-md">
              <User className="h-3 w-3 mr-1" />
              <span>{node.creator.displayName}</span>
            </div>
          )}
          
          <div className="flex items-center text-xs text-muted-foreground bg-accent/30 px-2 py-1 rounded-md">
            <Clock className="h-3 w-3 mr-1" />
            <span>{format(new Date(node.createdAt), 'MMM d, yyyy')}</span>
          </div>
          
          {node.scheduledFor && (
            <div className="flex items-center text-xs text-muted-foreground bg-accent/30 px-2 py-1 rounded-md">
              <Calendar className="h-3 w-3 mr-1" />
              <span>{format(new Date(node.scheduledFor), 'MMM d, yyyy')}</span>
            </div>
          )}
          
          {node.tags && node.tags.length > 0 && (
            <div className="flex items-center text-xs text-muted-foreground bg-accent/30 px-2 py-1 rounded-md">
              <Tag className="h-3 w-3 mr-1" />
              <span>{node.tags.join(', ')}</span>
            </div>
          )}
          
          {node.linkedNodes && node.linkedNodes.length > 0 && (
            <div className="flex items-center text-xs text-muted-foreground bg-accent/30 px-2 py-1 rounded-md">
              <Link className="h-3 w-3 mr-1" />
              <span>{node.linkedNodes.length} linked nodes</span>
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="outline" className="text-xs">
            <Tag className="h-3 w-3 mr-1" />
            Add Tag
          </Button>
          <Button size="sm" variant="outline" className="text-xs">
            <Link className="h-3 w-3 mr-1" />
            Link Node
          </Button>
          <Button size="sm" variant="outline" className="text-xs">
            <ExternalLink className="h-3 w-3 mr-1" />
            Share
          </Button>
          <Button size="sm" className="text-xs ml-auto">
            <Network className="h-3 w-3 mr-1" />
            View in Graph
          </Button>
        </div>
      </div>
      
      {/* Render main node content */}
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="mb-6">
          <h2 className="font-display font-medium text-lg mb-2">{section.title}</h2>
          
          <div className="pl-5 space-y-2">
            {section.items.map((item: any, itemIndex) => {
              // Render code blocks
              if (item.type === 'code') {
                return <CodeBlock 
                  key={itemIndex}
                  language={item.language || 'javascript'} 
                  content={item.content} 
                />;
              }
              
              // Render regular text
              if (item.type === 'text') {
                return <p key={itemIndex} className="mb-2">{item.content}</p>;
              }
              
              // Render bullet points with possible children
              return (
                <NodeBullet key={itemIndex} content={item.content} level={item.level}>
                  {item.children && (
                    <div className="pl-4 mt-1">
                      {item.children.map((child: any, childIndex: number) => (
                        <NodeBullet key={childIndex} content={child.content} level={child.level} />
                      ))}
                    </div>
                  )}
                </NodeBullet>
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Child nodes section */}
      {node.children && node.children.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center mb-4">
            <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Linked Child Nodes</h3>
            <div className="h-px flex-1 bg-border ml-3"></div>
          </div>
          {renderNodeChildren()}
        </div>
      )}
      
      {/* In a real app, add a proper rich text editor with full editing capabilities */}
    </div>
  );
}
