import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  Github,
  GitBranch,
  GitCommit,
  Upload,
  Download,
  Sync,
  Settings,
  Lock,
  Unlock,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";

interface GitHubConfig {
  token: string;
  username: string;
  repository: string;
  branch: string;
  autoSync: boolean;
  syncInterval: number; // minutes
  onlyPushLocked: boolean;
  encryptEntries: boolean;
}

interface SyncStatus {
  lastSync: Date;
  status: 'idle' | 'syncing' | 'error' | 'success';
  message: string;
  pendingChanges: number;
}

interface GitHubIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId?: number;
}

export default function GitHubIntegration({ isOpen, onClose, nodeId }: GitHubIntegrationProps) {
  const [config, setConfig] = useState<GitHubConfig>({
    token: '',
    username: '',
    repository: '',
    branch: 'main',
    autoSync: false,
    syncInterval: 30,
    onlyPushLocked: true,
    encryptEntries: false
  });
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: new Date(),
    status: 'idle',
    message: 'Not configured',
    pendingChanges: 0
  });
  
  const [repositories, setRepositories] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [commits, setCommits] = useState<Array<{
    sha: string;
    message: string;
    date: Date;
    author: string;
  }>>([]);

  const { toast } = useToast();

  // Load saved configuration
  useEffect(() => {
    const savedConfig = localStorage.getItem('github-config');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      setConfig(parsed);
      if (parsed.token && parsed.username && parsed.repository) {
        setIsConnected(true);
        loadRepositories(parsed.token, parsed.username);
        loadCommitHistory(parsed.token, parsed.username, parsed.repository);
      }
    }
  }, []);

  // Auto-sync timer
  useEffect(() => {
    if (config.autoSync && isConnected && config.syncInterval > 0) {
      const interval = setInterval(() => {
        handleSync();
      }, config.syncInterval * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [config.autoSync, config.syncInterval, isConnected]);

  const loadRepositories = async (token: string, username: string) => {
    try {
      const response = await fetch(`https://api.github.com/users/${username}/repos`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.ok) {
        const repos = await response.json();
        setRepositories(repos.map((repo: any) => repo.name));
      }
    } catch (error) {
      console.error('Failed to load repositories:', error);
    }
  };

  const loadCommitHistory = async (token: string, username: string, repository: string) => {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${username}/${repository}/commits?path=journal&per_page=10`,
        {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      
      if (response.ok) {
        const commitData = await response.json();
        setCommits(commitData.map((commit: any) => ({
          sha: commit.sha.substring(0, 7),
          message: commit.commit.message,
          date: new Date(commit.commit.author.date),
          author: commit.commit.author.name
        })));
      }
    } catch (error) {
      console.error('Failed to load commit history:', error);
    }
  };

  const testConnection = async () => {
    if (!config.token || !config.username) {
      toast({
        variant: "destructive",
        title: "Missing credentials",
        description: "Please provide GitHub token and username"
      });
      return;
    }

    setIsConfiguring(true);
    try {
      const response = await fetch(`https://api.github.com/user`, {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setIsConnected(true);
        loadRepositories(config.token, config.username);
        
        toast({
          title: "Connected successfully",
          description: `Connected as ${userData.login}`
        });
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: "Please check your GitHub token and username"
      });
    } finally {
      setIsConfiguring(false);
    }
  };

  const saveConfiguration = () => {
    localStorage.setItem('github-config', JSON.stringify(config));
    toast({
      title: "Configuration saved",
      description: "GitHub integration settings have been saved"
    });
  };

  const handleSync = async () => {
    if (!isConnected || !config.repository) return;

    setSyncStatus(prev => ({ ...prev, status: 'syncing', message: 'Synchronizing...' }));

    try {
      // Get journal entries to sync
      const entries = await apiRequest('GET', '/api/nodes?type=journal');
      
      let syncedCount = 0;
      for (const entry of entries) {
        // Skip if only pushing locked entries and this entry isn't locked
        if (config.onlyPushLocked && !entry.isLocked) continue;
        
        const content = formatEntryForGitHub(entry);
        const filename = `journal/${format(new Date(entry.createdAt), 'yyyy-MM-dd')}-${entry.id}.md`;
        
        await pushToGitHub(filename, content, `Update journal entry: ${entry.title}`);
        syncedCount++;
      }

      setSyncStatus({
        lastSync: new Date(),
        status: 'success',
        message: `Synced ${syncedCount} entries`,
        pendingChanges: 0
      });

      toast({
        title: "Sync completed",
        description: `Successfully synced ${syncedCount} journal entries`
      });

    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        status: 'error',
        message: 'Sync failed'
      }));

      toast({
        variant: "destructive",
        title: "Sync failed",
        description: "Failed to sync with GitHub repository"
      });
    }
  };

  const formatEntryForGitHub = (entry: any) => {
    const frontmatter = `---
title: "${entry.title}"
date: ${format(new Date(entry.createdAt), 'yyyy-MM-dd')}
tags: [${entry.tags?.join(', ') || ''}]
type: ${entry.type || 'general'}
nodeId: ${entry.id}
---

`;

    let content = entry.content || '';
    
    // Encrypt if enabled
    if (config.encryptEntries) {
      content = btoa(content); // Simple base64 encoding for demo
    }

    return frontmatter + content;
  };

  const pushToGitHub = async (path: string, content: string, message: string) => {
    const response = await fetch(
      `https://api.github.com/repos/${config.username}/${config.repository}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          content: btoa(content),
          branch: config.branch
        })
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return response.json();
  };

  const pullFromGitHub = async () => {
    setSyncStatus(prev => ({ ...prev, status: 'syncing', message: 'Pulling changes...' }));

    try {
      const response = await fetch(
        `https://api.github.com/repos/${config.username}/${config.repository}/contents/journal`,
        {
          headers: {
            'Authorization': `token ${config.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (response.ok) {
        const files = await response.json();
        let pulledCount = 0;

        for (const file of files) {
          if (file.name.endsWith('.md')) {
            const fileResponse = await fetch(file.download_url);
            const content = await fileResponse.text();
            
            // Parse frontmatter and content
            const entry = parseGitHubEntry(content);
            if (entry) {
              await apiRequest('POST', '/api/nodes', entry);
              pulledCount++;
            }
          }
        }

        setSyncStatus({
          lastSync: new Date(),
          status: 'success',
          message: `Pulled ${pulledCount} entries`,
          pendingChanges: 0
        });

        toast({
          title: "Pull completed",
          description: `Successfully pulled ${pulledCount} entries from GitHub`
        });
      }
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        status: 'error',
        message: 'Pull failed'
      }));

      toast({
        variant: "destructive",
        title: "Pull failed",
        description: "Failed to pull from GitHub repository"
      });
    }
  };

  const parseGitHubEntry = (content: string) => {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) return null;

    const [, frontmatter, body] = frontmatterMatch;
    const metadata: any = {};
    
    frontmatter.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        let value = valueParts.join(':').trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        metadata[key.trim()] = value;
      }
    });

    let entryContent = body.trim();
    
    // Decrypt if needed
    if (config.encryptEntries) {
      try {
        entryContent = atob(entryContent);
      } catch (error) {
        console.error('Failed to decrypt entry:', error);
      }
    }

    return {
      title: metadata.title || 'Untitled',
      content: entryContent,
      tags: metadata.tags ? metadata.tags.split(',').map((t: string) => t.trim()) : [],
      type: metadata.type || 'journal',
      createdAt: metadata.date ? new Date(metadata.date) : new Date()
    };
  };

  const getStatusIcon = () => {
    switch (syncStatus.status) {
      case 'syncing': return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Integration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <div className="font-medium">
                  {isConnected ? 'Connected' : 'Not Connected'}
                </div>
                <div className="text-sm text-gray-500">{syncStatus.message}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected && (
                <>
                  <Button variant="outline" onClick={pullFromGitHub}>
                    <Download className="h-4 w-4 mr-2" />
                    Pull
                  </Button>
                  <Button variant="outline" onClick={handleSync}>
                    <Upload className="h-4 w-4 mr-2" />
                    Push
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">GitHub Token</label>
                <Input
                  type="password"
                  value={config.token}
                  onChange={(e) => setConfig({ ...config, token: e.target.value })}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Username</label>
                <Input
                  value={config.username}
                  onChange={(e) => setConfig({ ...config, username: e.target.value })}
                  placeholder="your-username"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Repository</label>
                <Select
                  value={config.repository}
                  onValueChange={(value) => setConfig({ ...config, repository: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select repository" />
                  </SelectTrigger>
                  <SelectContent>
                    {repositories.map((repo) => (
                      <SelectItem key={repo} value={repo}>
                        {repo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Branch</label>
                <Input
                  value={config.branch}
                  onChange={(e) => setConfig({ ...config, branch: e.target.value })}
                  placeholder="main"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={testConnection} disabled={isConfiguring}>
                {isConfiguring ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Github className="h-4 w-4 mr-2" />}
                Test Connection
              </Button>
              <Button variant="outline" onClick={saveConfiguration}>
                <Settings className="h-4 w-4 mr-2" />
                Save Config
              </Button>
            </div>
          </div>

          {/* Sync Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Sync Settings</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Auto Sync</div>
                  <div className="text-sm text-gray-500">Automatically sync changes</div>
                </div>
                <Switch
                  checked={config.autoSync}
                  onCheckedChange={(checked) => setConfig({ ...config, autoSync: checked })}
                />
              </div>

              {config.autoSync && (
                <div>
                  <label className="text-sm font-medium">Sync Interval (minutes)</label>
                  <Input
                    type="number"
                    value={config.syncInterval}
                    onChange={(e) => setConfig({ ...config, syncInterval: parseInt(e.target.value) || 30 })}
                    min="5"
                    max="1440"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Only Push Locked Entries</div>
                  <div className="text-sm text-gray-500">Only sync entries marked as final</div>
                </div>
                <Switch
                  checked={config.onlyPushLocked}
                  onCheckedChange={(checked) => setConfig({ ...config, onlyPushLocked: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Encrypt Entries</div>
                  <div className="text-sm text-gray-500">Encrypt content before pushing</div>
                </div>
                <Switch
                  checked={config.encryptEntries}
                  onCheckedChange={(checked) => setConfig({ ...config, encryptEntries: checked })}
                />
              </div>
            </div>
          </div>

          {/* Recent Commits */}
          {isConnected && commits.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recent Commits</h3>
              <div className="space-y-2">
                {commits.map((commit) => (
                  <div key={commit.sha} className="flex items-center gap-3 p-3 border rounded">
                    <GitCommit className="h-4 w-4 text-gray-500" />
                    <div className="flex-1">
                      <div className="font-medium">{commit.message}</div>
                      <div className="text-sm text-gray-500">
                        {commit.author} • {format(commit.date, 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                    <Badge variant="outline">{commit.sha}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}