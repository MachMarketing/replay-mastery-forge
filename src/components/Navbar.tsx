
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Logo from '@/components/Logo';
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
            <Logo />
            <div className="ml-10 hidden md:flex items-center space-x-1">
              <Link to="/" className="relative px-3 py-2 text-sm font-medium group">
                <span className="text-foreground hover:text-primary transition-colors duration-300">Home</span>
                <span className="absolute -bottom-[1px] left-1/2 w-0 h-[2px] bg-primary group-hover:w-3/4 group-hover:left-[12.5%] transition-all duration-300"></span>
              </Link>
              <Link to="/features" className="relative px-3 py-2 text-sm font-medium group">
                <span className="text-foreground hover:text-primary transition-colors duration-300">Features</span>
                <span className="absolute -bottom-[1px] left-1/2 w-0 h-[2px] bg-primary group-hover:w-3/4 group-hover:left-[12.5%] transition-all duration-300"></span>
              </Link>
              <Link to="/pricing" className="relative px-3 py-2 text-sm font-medium group">
                <span className="text-foreground hover:text-primary transition-colors duration-300">Pricing</span>
                <span className="absolute -bottom-[1px] left-1/2 w-0 h-[2px] bg-primary group-hover:w-3/4 group-hover:left-[12.5%] transition-all duration-300"></span>
              </Link>
              <Link to="/replays" className="relative px-3 py-2 text-sm font-medium group">
                <span className="text-foreground hover:text-primary transition-colors duration-300">My Replays</span>
                <span className="absolute -bottom-[1px] left-1/2 w-0 h-[2px] bg-primary group-hover:w-3/4 group-hover:left-[12.5%] transition-all duration-300"></span>
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <Button variant="outline" className="hidden md:flex items-center gap-2 border-primary/50 hover:bg-primary/10 hover:text-primary">
                  <Trophy size={16} className="text-primary" />
                  <span>Upgrade to Pro</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="cursor-pointer bg-secondary hover:opacity-80 transition border border-primary/30">
                      <AvatarImage src={avatarUrl} alt={username} />
                      <AvatarFallback className="bg-primary/20 text-primary">{getInitial(username)}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 border-primary/30 bg-card/95 backdrop-blur-sm">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-primary/20" />
                    <DropdownMenuItem className="hover:bg-primary/10 cursor-pointer group">
                      <User className="mr-2 h-4 w-4 text-primary group-hover:text-primary" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-primary/10 cursor-pointer group">
                      <Trophy className="mr-2 h-4 w-4 text-primary group-hover:text-primary" />
                      <span>Upgrade to Pro</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-primary/10 cursor-pointer group">
                      <BookOpen className="mr-2 h-4 w-4 text-primary group-hover:text-primary" />
                      <span>My Replays</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-primary/10 cursor-pointer group">
                      <Settings className="mr-2 h-4 w-4 text-primary group-hover:text-primary" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-primary/20" />
                    <DropdownMenuItem className="hover:bg-destructive/20 cursor-pointer group">
                      <LogOut className="mr-2 h-4 w-4 text-destructive group-hover:text-destructive" />
                      <span className="text-destructive">Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" className="hover:bg-primary/10 hover:text-primary" asChild>
                  <Link to="/login">Log in</Link>
                </Button>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 relative overflow-hidden group" asChild>
                  <Link to="/signup">
                    <span className="relative z-10">Sign up</span>
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-primary via-primary/80 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  </Link>
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
