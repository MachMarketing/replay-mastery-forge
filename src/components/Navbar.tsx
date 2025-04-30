
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Settings, Trophy, BookOpen } from 'lucide-react';

interface NavbarProps {
  isLoggedIn?: boolean;
  username?: string;
  avatarUrl?: string;
}

const Navbar: React.FC<NavbarProps> = ({ 
  isLoggedIn = false, 
  username = '', 
  avatarUrl = '' 
}) => {
  // Get initial for avatar fallback
  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'G';
  };

  return (
    <nav className="border-b border-border/60 backdrop-blur-md bg-background/95 fixed top-0 w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <img 
                className="h-8 w-auto" 
                src="/lovable-uploads/c888e8ee-e3f1-4a01-9218-f1f7d48a72b1.png" 
                alt="ReplayCoach.gg Logo" 
              />
              <span className="ml-2 text-xl font-bold text-primary">ReplayCoach.gg</span>
            </Link>
            <div className="ml-10 flex items-center space-x-4">
              <Link to="/" className="animated-underline text-foreground hover:text-primary px-3 py-2 text-sm font-medium">
                Home
              </Link>
              <Link to="/features" className="animated-underline text-foreground hover:text-primary px-3 py-2 text-sm font-medium">
                Features
              </Link>
              <Link to="/pricing" className="animated-underline text-foreground hover:text-primary px-3 py-2 text-sm font-medium">
                Pricing
              </Link>
              <Link to="/replays" className="animated-underline text-foreground hover:text-primary px-3 py-2 text-sm font-medium">
                My Replays
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <Button variant="outline" className="hidden md:flex items-center gap-2">
                  <Trophy size={16} />
                  <span>Upgrade to Pro</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="cursor-pointer bg-secondary hover:opacity-80 transition">
                      <AvatarImage src={avatarUrl} alt={username} />
                      <AvatarFallback>{getInitial(username)}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Trophy className="mr-2 h-4 w-4" />
                      <span>Upgrade to Pro</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <BookOpen className="mr-2 h-4 w-4" />
                      <span>My Replays</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Sign up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
