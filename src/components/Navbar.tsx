import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, X, LogOut, Settings, User } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';

interface NavbarProps {
  isLoggedIn: boolean;
  username?: string | null;
}

const Navbar: React.FC<NavbarProps> = ({ isLoggedIn, username }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuRef]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="bg-background border-b border-border fixed top-0 left-0 w-full z-50">
      <div className="container flex items-center justify-between h-16">
        {/* Logo and Brand */}
        <Logo />

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-6">
          <Link to="/features" className="text-sm font-medium hover:text-primary transition-colors">Features</Link>
          <Link to="/pricing" className="text-sm font-medium hover:text-primary transition-colors">Pricing</Link>
          {isLoggedIn ? (
            <>
              <Link to="/replays" className="text-sm font-medium hover:text-primary transition-colors">My Replays</Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="absolute right-0 mt-2 w-48">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>{username || 'Profile'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium hover:text-primary transition-colors">Log In</Link>
              <Button asChild>
                <Link to="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>

        {/* Mobile Navigation Button */}
        <Button variant="ghost" className="lg:hidden" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="sr-only">Toggle Menu</span>
        </Button>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div ref={mobileMenuRef} className="lg:hidden absolute top-full left-0 w-full bg-background border-b border-border rounded-md shadow-md py-2">
            <nav className="flex flex-col items-center space-y-3">
              <Link to="/features" className="block text-sm font-medium hover:text-primary transition-colors py-2 px-4">Features</Link>
              <Link to="/pricing" className="block text-sm font-medium hover:text-primary transition-colors py-2 px-4">Pricing</Link>
              {isLoggedIn ? (
                <>
                  <Link to="/replays" className="block text-sm font-medium hover:text-primary transition-colors py-2 px-4">My Replays</Link>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <User className="h-4 w-4" />
                  </Button>
                  <DropdownMenuContent className="absolute right-0 mt-2 w-48">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>{username || 'Profile'}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </>
              ) : (
                <>
                  <Link to="/login" className="block text-sm font-medium hover:text-primary transition-colors py-2 px-4">Log In</Link>
                  <Button asChild className="w-full">
                    <Link to="/signup">Sign Up</Link>
                  </Button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
