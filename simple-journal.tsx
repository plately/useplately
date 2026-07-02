import { useState } from "react";
import { Link, useLocation } from "wouter";
import desqLogoSrc from "@assets/desq-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  CheckSquare,
  GitBranch,
  Map,
  FolderOpen,
  Zap,
  Shield,
  Settings,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Users,
  Plus,
  Star,
  Menu,
  ChevronsLeft,
  User,
  Bell,
  LogOut,
  HelpCircle,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  currentPage: string;
  onClose?: () => void;
  isMobile?: boolean;
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard",    href: "/dashboard",    id: "dashboard"    },
  { icon: MessageSquare,   label: "Chat",          href: "/chat",         id: "chat"         },
  { icon: Calendar,        label: "Calendar",      href: "/calendar",     id: "calendar"     },
  { icon: CheckSquare,     label: "Tasks",         href: "/tasks",        id: "tasks"        },
  { icon: GitBranch,       label: "Graph",         href: "/graph",        id: "graph"        },
  { icon: Map,             label: "Planning",      href: "/planning",     id: "planning"     },
  { icon: FolderOpen,      label: "Files",         href: "/workspace",    id: "workspace"    },
  { icon: Zap,             label: "Integrations",  href: "/integrations", id: "integrations" },
];

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  isActive: boolean;
  collapsed: boolean;
  onClick?: () => void;
}

function NavItem({ icon: Icon, label, href, isActive, collapsed, onClick }: NavItemProps) {
  return (
    <Link href={href}>
      <div
        onClick={onClick}
        className={`
          flex items-center gap-3 px-3 py-2 mx-2 mb-0.5 rounded-lg cursor-pointer
          text-[13px] font-medium transition-all duration-150
          ${isActive
            ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20"
            : "text-white/40 hover:text-white/80 hover:bg-white/[0.04] border border-transparent"
          }
        `}
      >
        <Icon size={16} className="flex-shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </div>
    </Link>
  );
}

export default function Sidebar({ collapsed, onToggle, currentPage, onClose, isMobile = false }: SidebarProps) {
  const [, setLocation] = useLocation();
  const { user: authUser, logout } = useAuth();
  const [workspacesExpanded, setWorkspacesExpanded] = useState(true);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceIcon, setNewWorkspaceIcon] = useState("💼");
  const [workspaces, setWorkspaces] = useState<Array<{ id: number; name: string; icon: string; href: string; members: number }>>([]);

  const workspaceIcons = ["💼", "🏢", "🛠️", "🎨", "📊", "📣", "🔍", "📝", "🌐", "💡"];

  const handleLogout = async () => {
    await logout();
    setLocation("/auth/login");
    window.location.href = "/auth/login";
  };

  const handleCreateWorkspace = () => {
    if (!newWorkspaceName.trim()) {
      toast({ variant: "destructive", title: "Workspace name required" });
      return;
    }
    setWorkspaces(prev => [...prev, {
      id: Date.now(),
      name: newWorkspaceName,
      icon: newWorkspaceIcon,
      href: `/spaces/${Date.now()}`,
      members: 1,
    }]);
    toast({ title: "Workspace created", description: `${newWorkspaceName} has been created.` });
    setIsCreateWorkspaceOpen(false);
    setNewWorkspaceName("");
    setNewWorkspaceIcon("💼");
  };

  const user = {
    name: authUser?.displayName || authUser?.username || "User",
    role: authUser?.role ? authUser.role.charAt(0).toUpperCase() + authUser.role.slice(1) : "Member",
    avatar: authUser?.avatar || "",
  };

  const sidebarWidth = isMobile ? "w-64" : collapsed ? "w-[60px]" : "w-[220px]";

  return (
    <>
      {/* Create Workspace Dialog */}
      <Dialog open={isCreateWorkspaceOpen} onOpenChange={setIsCreateWorkspaceOpen}>
        <DialogContent className="sm:max-w-[400px]" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)" }}>
          <DialogHeader>
            <DialogTitle className="text-white">Create Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wide">Name</label>
              <Input
                value={newWorkspaceName}
                onChange={e => setNewWorkspaceName(e.target.value)}
                placeholder="e.g. Marketing Team"
                className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wide">Icon</label>
              <div className="flex flex-wrap gap-2">
                {workspaceIcons.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setNewWorkspaceIcon(icon)}
                    className={`w-8 h-8 flex items-center justify-center text-base rounded-lg transition-colors ${
                      newWorkspaceIcon === icon ? "bg-indigo-600" : "bg-white/[0.05] hover:bg-white/[0.08]"
                    }`}
                  >{icon}</button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setIsCreateWorkspaceOpen(false); setNewWorkspaceName(""); }}
                className="px-4 py-2 text-sm text-white/50 hover:text-white border border-white/10 rounded-lg transition-colors"
              >Cancel</button>
              <button
                onClick={handleCreateWorkspace}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
              >Create</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <aside
        className={`glass-sidebar flex flex-col h-full border-r border-white/[0.07] transition-all duration-300 z-50 ${sidebarWidth}`}
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b border-white/[0.07] flex-shrink-0">
          {collapsed ? (
            <img src={desqLogoSrc} alt="desq" className="h-5 w-5 object-contain mx-auto invert" />
          ) : (
            <img src={desqLogoSrc} alt="desq" className="h-6 object-contain invert" />
          )}
          <button
            onClick={onToggle}
            className="ml-auto p-1.5 rounded-md text-white/40 hover:text-white/80 hover:bg-white/[0.07] transition-colors"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <Menu size={15} /> : <ChevronsLeft size={15} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto scrollbar-hide">
          <div className="space-y-0.5">
            {NAV_ITEMS.map(item => (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                href={item.href}
                isActive={currentPage === item.id}
                collapsed={collapsed}
                onClick={onClose}
              />
            ))}
          </div>

          {/* Workspaces */}
          {!collapsed && (
            <div className="mx-2 mt-5 pt-4 border-t border-white/[0.07]">
              <div className="flex items-center justify-between px-2 mb-1.5">
                <button
                  className="flex items-center gap-1.5 group"
                  onClick={() => setWorkspacesExpanded(!workspacesExpanded)}
                >
                  {workspacesExpanded
                    ? <ChevronDown size={12} className="text-white/30 group-hover:text-white/60 transition-colors" />
                    : <ChevronRight size={12} className="text-white/30 group-hover:text-white/60 transition-colors" />
                  }
                  <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest group-hover:text-white/70 transition-colors">Workspaces</span>
                </button>
                <button
                  onClick={() => setIsCreateWorkspaceOpen(true)}
                  className="p-1 rounded text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>

              {workspacesExpanded && (
                <div className="space-y-0.5">
                  {workspaces.map(ws => (
                    <Link key={ws.id} href={ws.href}>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-white/50 hover:text-white/90 hover:bg-white/[0.07] cursor-pointer transition-colors">
                        <span className="text-sm">{ws.icon}</span>
                        <span className="flex-1 truncate">{ws.name}</span>
                        <span className="text-[10px] text-white/30 flex items-center gap-0.5">
                          <Users size={9} /> {ws.members}
                        </span>
                      </div>
                    </Link>
                  ))}
                  <button
                    onClick={() => setIsCreateWorkspaceOpen(true)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-white/40 hover:text-white/80 hover:bg-white/[0.07] transition-colors"
                  >
                    <Plus size={11} /> New workspace
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Admin link */}
        {(authUser?.role === "admin" || authUser?.role === "supervisor") && (
          <div className="px-2 pb-2 border-t border-white/[0.07]">
            <Link href="/admin">
              <div className={`flex items-center gap-3 px-3 py-2 mx-0 mt-2 rounded-lg cursor-pointer text-[13px] font-medium transition-all duration-150 ${
                currentPage === "admin"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20"
                  : "text-white/50 hover:text-white/90 hover:bg-white/[0.07] border border-transparent"
              }`}>
                <Shield size={16} className="flex-shrink-0" />
                {!collapsed && <span>Admin</span>}
              </div>
            </Link>
          </div>
        )}

        {/* User section */}
        <div className="p-3 border-t border-white/[0.07] flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2.5 cursor-pointer hover:bg-white/[0.07] rounded-lg p-2 transition-colors">
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="text-xs bg-indigo-600 text-white">{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-white/85 truncate">{user.name}</p>
                      <p className="text-[10px] text-white/50 truncate">{user.role}</p>
                    </div>
                    <ChevronUp className="w-3 h-3 text-white/30 flex-shrink-0" />
                  </>
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-card border-border">
              <DropdownMenuLabel className="text-muted-foreground text-xs">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="cursor-pointer">
                <Link href="/profile-settings" className="flex items-center w-full gap-2">
                  <User size={14} /> Profile Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2">
                <Bell size={14} /> Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="cursor-pointer gap-2">
                <HelpCircle size={14} /> Help & Support
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-500 hover:text-red-400 cursor-pointer gap-2"
              >
                <LogOut size={14} /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
