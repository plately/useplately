import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NotificationCenter from '@/components/notification-center';
import StatusIndicator from '@/components/status-indicator';
import UniversalNodeCreator from '@/components/universal-node-creator';
import { useTheme } from '@/hooks/use-theme';
import { 
  Search, 
  Plus, 
  Command, 
  Sun,
  Moon,
  Menu
} from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export default function Header({ onMenuClick, showMenuButton = false }: HeaderProps) {
  const [location, navigate] = useLocation();
  const { theme, setTheme } = useTheme();

  const openSearch = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
  };

  return (
    <header className="glass-header h-16 flex items-center justify-between px-4 sm:px-6 border-b flex-shrink-0">
      {showMenuButton && (
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden mr-2 h-9 w-9 hover:bg-accent/50 transition-colors"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      
      <div className="flex items-center flex-1">
        {/* Search trigger — opens the GlobalSearch overlay */}
        <button
          onClick={openSearch}
          className="relative flex items-center gap-2.5 h-10 px-3.5 rounded-lg bg-accent/40 border border-border/60 text-muted-foreground/70 hover:bg-accent/60 hover:text-muted-foreground transition-colors text-sm max-w-[280px] md:max-w-[400px] w-full text-left"
        >
          <Search className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 truncate text-[14px]">Search…</span>
          <span className="hidden md:flex items-center gap-0.5 ml-2 flex-shrink-0">
            <kbd className="flex items-center justify-center h-5 px-1.5 rounded text-[10px] font-mono border border-border/50 bg-background/40 text-muted-foreground/50">
              <Command className="h-2.5 w-2.5" />
            </kbd>
            <kbd className="flex items-center justify-center h-5 px-1.5 rounded text-[10px] font-mono border border-border/50 bg-background/40 text-muted-foreground/50">
              K
            </kbd>
          </span>
        </button>
      </div>
      
      <div className="flex items-center space-x-2 md:space-x-3">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg hover:bg-accent/50 transition-colors no-glow"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark'
            ? <Sun className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            : <Moon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          }
        </Button>

        <div className="hidden sm:flex">
          <NotificationCenter />
        </div>
        
        <StatusIndicator />
        
        <UniversalNodeCreator 
          className="flex items-center gap-2"
          trigger={
            <Button className="flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-[14px] font-medium shadow-sm hover:shadow transition-all">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Node</span>
            </Button>
          }
        />
      </div>
    </header>
  );
}
