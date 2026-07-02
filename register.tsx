import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Activity, 
  Mail, 
  Check, 
  X, 
  Settings,
  Calendar,
  MessageSquare,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  Edit
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { User, CustomRole, UserInvitation, UserActivity } from '@shared/schema';

export default function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState("users");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [generatedInviteLink, setGeneratedInviteLink] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query all users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  // Query active users
  const { data: activeUsers = [], isLoading: activeUsersLoading } = useQuery({
    queryKey: ['/api/users/active'],
  });

  // Query custom roles
  const { data: customRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['/api/custom-roles'],
  });

  // Query user invitations
  const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ['/api/user-invitations'],
  });

  // Query recent activity
  const { data: recentActivity = [], isLoading: activityLoading } = useQuery({
    queryKey: ['/api/activity/recent'],
  });

  // Query user activity for selected user
  const { data: userActivity = [], isLoading: userActivityLoading } = useQuery({
    queryKey: ['/api/users', selectedUserId, 'activity'],
    enabled: !!selectedUserId,
  });

  // Query user tasks for selected user
  const { data: userTasks = [], isLoading: userTasksLoading } = useQuery({
    queryKey: ['/api/users', selectedUserId, 'tasks'],
    enabled: !!selectedUserId,
  });

  // Query user chats for selected user
  const { data: userChats = [], isLoading: userChatsLoading } = useQuery({
    queryKey: ['/api/users', selectedUserId, 'chats'],
    enabled: !!selectedUserId,
  });

  // Mutation to change user role
  const changeUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      apiRequest(`/api/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  // Mutation to deactivate user
  const deactivateUserMutation = useMutation({
    mutationFn: ({ userId, deactivatedBy }: { userId: number; deactivatedBy: number }) =>
      apiRequest(`/api/users/${userId}/deactivate`, { method: 'PUT', body: JSON.stringify({ deactivatedBy }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Success",
        description: "User deactivated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deactivate user",
        variant: "destructive",
      });
    },
  });

  // Mutation to activate user
  const activateUserMutation = useMutation({
    mutationFn: ({ userId }: { userId: number }) =>
      apiRequest(`/api/users/${userId}/activate`, { method: 'PUT', body: JSON.stringify({}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Success",
        description: "User activated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to activate user",
        variant: "destructive",
      });
    },
  });

  // Mutation to create invitation and get shareable link
  const sendInvitationMutation = useMutation({
    mutationFn: async (invitationData: any) => {
      const res = await fetch('/api/user-invitations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invitationData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create invitation');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-invitations'] });
      setInviteEmail("");
      setInviteRole("user");
      if (data.inviteUrl) {
        setGeneratedInviteLink(data.inviteUrl);
      }
      toast({
        title: "Invite link created!",
        description: "Copy the link below and share it with the user.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to create invitation",
        variant: "destructive",
      });
    },
  });

  // Mutation to create custom role
  const createCustomRoleMutation = useMutation({
    mutationFn: (roleData: any) =>
      apiRequest('/api/custom-roles', { method: 'POST', body: JSON.stringify(roleData) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-roles'] });
      setNewRoleName("");
      setNewRoleDescription("");
      setNewRolePermissions([]);
      toast({
        title: "Success",
        description: "Custom role created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create custom role",
        variant: "destructive",
      });
    },
  });

  const handleSendInvitation = () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    setGeneratedInviteLink("");
    sendInvitationMutation.mutate({
      email: inviteEmail,
      role: inviteRole,
      invitedBy: currentUser?.id ?? 1,
    });
  };

  const handleCreateCustomRole = () => {
    if (!newRoleName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a role name",
        variant: "destructive",
      });
      return;
    }

    createCustomRoleMutation.mutate({
      name: newRoleName,
      description: newRoleDescription,
      permissions: newRolePermissions,
      createdBy: 1, // TODO: Get current user ID
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500/15 text-red-500';
      case 'supervisor': return 'bg-blue-500/15 text-blue-500';
      case 'user': return 'bg-green-500/15 text-green-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-500';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Block access for non-admin users
  if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'supervisor') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You don't have permission to view this page.</p>
          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
            onClick={() => setLocation('/')}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage users, roles, and system activities</p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 glass-card border-0">
            <TabsTrigger value="users" className="flex items-center gap-1.5 data-[state=active]:glass-card-light text-xs sm:text-sm">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center gap-1.5 data-[state=active]:glass-card-light text-xs sm:text-sm">
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Invitations</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-1.5 data-[state=active]:glass-card-light text-xs sm:text-sm">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Roles</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-1.5 data-[state=active]:glass-card-light text-xs sm:text-sm">
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-1.5 data-[state=active]:glass-card-light text-xs sm:text-sm">
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Monitoring</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Users className="w-5 h-5" />
                  User Management
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Manage user accounts, roles, and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* User Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="glass-highlight-purple border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-blue-100">Total Users</p>
                            <p className="text-2xl font-bold">{users.length}</p>
                          </div>
                          <Users className="w-8 h-8 text-blue-200" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-green-100">Active Users</p>
                            <p className="text-2xl font-bold">{activeUsers.length}</p>
                          </div>
                          <CheckCircle className="w-8 h-8 text-green-200" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-purple-100">Custom Roles</p>
                            <p className="text-2xl font-bold">{customRoles.length}</p>
                          </div>
                          <Shield className="w-8 h-8 text-purple-200" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Users Table */}
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Last Active</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user: User) => (
                          <TableRow key={user.id} className="hover:bg-muted/40">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                                  {user.displayName?.charAt(0) || user.username?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <p className="font-medium">{user.displayName || user.username}</p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(user.role || 'user')}>
                                {user.role || 'user'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(user.isActive !== false)}>
                                {user.isActive !== false ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {user.lastActiveAt ? formatDate(user.lastActiveAt) : 'Never'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <Select
                                  value={user.role || 'user'}
                                  onValueChange={(newRole) => 
                                    changeUserRoleMutation.mutate({ userId: user.id, role: newRole })
                                  }
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="supervisor">Supervisor</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                                {user.isActive !== false ? (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => 
                                      deactivateUserMutation.mutate({ userId: user.id, deactivatedBy: 1 })
                                    }
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => 
                                      activateUserMutation.mutate({ userId: user.id })
                                    }
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedUserId(user.id)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="mt-6">
            <Card className="bg-card/80 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  User Invitations
                </CardTitle>
                <CardDescription>
                  Send invitations to new users and manage pending invitations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Send Invitation Form */}
                  <Card className="bg-muted/40 border-border">
                    <CardHeader>
                      <CardTitle className="text-lg">Send New Invitation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="user@example.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="role">Role</Label>
                          <Select value={inviteRole} onValueChange={setInviteRole}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="supervisor">Supervisor</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <Button 
                            onClick={handleSendInvitation}
                            disabled={sendInvitationMutation.isPending}
                            className="w-full"
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            {sendInvitationMutation.isPending ? "Generating..." : "Generate Invite Link"}
                          </Button>
                        </div>
                      </div>

                      {/* Show generated invite link */}
                      {generatedInviteLink && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-medium text-green-800 mb-2">✓ Invite link ready — share this with the user:</p>
                          <div className="flex gap-2">
                            <Input 
                              readOnly 
                              value={generatedInviteLink} 
                              className="text-xs bg-white font-mono"
                            />
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(generatedInviteLink);
                                toast({ title: "Copied!", description: "Invite link copied to clipboard." });
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                          <p className="text-xs text-green-600 mt-1">Link expires in 7 days.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Pending Invitations */}
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Invited By</TableHead>
                          <TableHead>Sent</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.map((invitation: UserInvitation) => (
                          <TableRow key={invitation.id} className="hover:bg-muted/40">
                            <TableCell className="font-medium">{invitation.email}</TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(invitation.role || 'user')}>
                                {invitation.role || 'user'}
                              </Badge>
                            </TableCell>
                            <TableCell>{invitation.invitedBy}</TableCell>
                            <TableCell>{formatDate(invitation.createdAt)}</TableCell>
                            <TableCell>{formatDate(invitation.expiresAt)}</TableCell>
                            <TableCell>
                              <Badge className={invitation.acceptedAt ? 'bg-green-500/15 text-green-600' : 'bg-yellow-500/15 text-yellow-600'}>
                                {invitation.acceptedAt ? 'Accepted' : 'Pending'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="mt-6">
            <Card className="bg-card/80 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Custom Roles
                </CardTitle>
                <CardDescription>
                  Create and manage custom user roles with specific permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Create Role Form */}
                  <Card className="bg-muted/40 border-border">
                    <CardHeader>
                      <CardTitle className="text-lg">Create New Role</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="roleName">Role Name</Label>
                            <Input
                              id="roleName"
                              placeholder="e.g., Project Manager"
                              value={newRoleName}
                              onChange={(e) => setNewRoleName(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="roleDescription">Description</Label>
                            <Input
                              id="roleDescription"
                              placeholder="Role description"
                              value={newRoleDescription}
                              onChange={(e) => setNewRoleDescription(e.target.value)}
                            />
                          </div>
                        </div>
                        <Button 
                          onClick={handleCreateCustomRole}
                          disabled={createCustomRoleMutation.isPending}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Create Role
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Custom Roles List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customRoles.map((role: CustomRole) => (
                      <Card key={role.id} className="bg-card border-border">
                        <CardHeader>
                          <CardTitle className="text-lg">{role.name}</CardTitle>
                          <CardDescription>{role.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              Created {formatDate(role.createdAt)}
                            </p>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <Card className="bg-card/80 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  System Activity
                </CardTitle>
                <CardDescription>
                  Monitor recent system activities and user actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity: UserActivity) => (
                    <div key={activity.id} className="flex items-start gap-4 p-4 bg-muted/40 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                        {activity.userId}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.action}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(activity.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring" className="mt-6">
            <Card className="bg-card/80 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  User Monitoring
                </CardTitle>
                <CardDescription>
                  Monitor individual user activities, tasks, and communications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* User Selection */}
                  <div>
                    <Label htmlFor="userSelect">Select User to Monitor</Label>
                    <Select value={selectedUserId?.toString() || ""} onValueChange={(value) => setSelectedUserId(parseInt(value))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user: User) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.displayName || user.username} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedUserId && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* User Tasks */}
                      <Card className="bg-muted/40 border-border">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            Tasks ({userTasks.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {userTasks.map((task: any) => (
                              <div key={task.id} className="p-3 bg-white rounded border">
                                <p className="font-medium">{task.title}</p>
                                <p className="text-sm text-muted-foreground">{task.status}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* User Activity */}
                      <Card className="bg-muted/40 border-border">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Activity className="w-5 h-5" />
                            Activity ({userActivity.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {userActivity.map((activity: UserActivity) => (
                              <div key={activity.id} className="p-3 bg-white rounded border">
                                <p className="font-medium">{activity.action}</p>
                                <p className="text-sm text-muted-foreground">{formatDate(activity.createdAt)}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* User Chats */}
                      <Card className="bg-muted/40 border-border">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            Chats ({userChats.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {userChats.map((chat: any) => (
                              <div key={chat.id} className="p-3 bg-white rounded border">
                                <p className="font-medium">{chat.content}</p>
                                <p className="text-sm text-muted-foreground">{formatDate(chat.createdAt)}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}