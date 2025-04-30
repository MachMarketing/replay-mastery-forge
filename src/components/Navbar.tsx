import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Menu,
  X,
  LogOut,
  Settings,
  User,
} from 'lucide-react';
import { Logo } from '@/components/icons/Logo';
import { useAuth } from '@/context/AuthContext';

const Navbar = ({ isLoggedIn = false, username = '' }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // Automatically close menu when clicking elsewhere
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 bg-background z-50 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <Logo className="h-8 w-auto" />
              <span className="ml-2 text-xl font-bold">ReplayCoach.gg</span>
            </Link>
            
            <div className="hidden md:flex ml-10 space-x-6">
              <Link to="/features" className="text-muted-foreground hover:text-foreground transition-colors duration-200">Features</Link>
              <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors duration-200">Pricing</Link>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/replays" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
                  My Replays
                </Link>
                <Link to="/upload" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
                  Upload
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="ml-2">
                      {user.user_metadata.username || 'Account'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Log in</Button>
                </Link>
                <Link to="/signup">
                  <Button>Sign up</Button>
                </Link>
              </>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div
        ref={menuRef}
        className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'}`}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 border-t border-border">
          <Link to="/features" className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground">
            Features
          </Link>
          <Link to="/pricing" className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground">
            Pricing
          </Link>
          
          {user ? (
            <>
              <Link to="/replays" className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground">
                My Replays
              </Link>
              <Link to="/upload" className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground">
                Upload
              </Link>
              <Link to="/profile" className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground">
                Profile
              </Link>
              <Link to="/settings" className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground">
                Settings
              </Link>
              <button 
                onClick={handleLogout}
                className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-destructive"
              >
                Log out
              </button>
            </>
          ) : (
            <div className="pt-4 pb-3 border-t border-border">
              <div className="px-3 space-y-2">
                <Link to="/login">
                  <Button variant="outline" size="sm" className="w-full">Log in</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="w-full">Sign up</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
