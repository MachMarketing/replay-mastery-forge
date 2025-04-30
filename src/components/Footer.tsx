
import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-background border-t border-border/60 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-medium text-primary mb-4">ReplayCoach.gg</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-foreground hover:text-primary transition">Home</Link>
              </li>
              <li>
                <Link to="/features" className="text-foreground hover:text-primary transition">Features</Link>
              </li>
              <li>
                <Link to="/pricing" className="text-foreground hover:text-primary transition">Pricing</Link>
              </li>
              <li>
                <Link to="/about" className="text-foreground hover:text-primary transition">About Us</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-primary mb-4">StarCraft Resources</h3>
            <ul className="space-y-2">
              <li>
                <a href="https://liquipedia.net/starcraft" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition">Liquipedia</a>
              </li>
              <li>
                <a href="https://tl.net/" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition">Team Liquid</a>
              </li>
              <li>
                <a href="https://www.youtube.com/c/AfreecaTVesports" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition">ASL</a>
              </li>
              <li>
                <a href="https://esports.starcraft.com/" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition">Official StarCraft</a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-primary mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-foreground hover:text-primary transition">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms" className="text-foreground hover:text-primary transition">Terms of Service</Link>
              </li>
              <li>
                <Link to="/cookies" className="text-foreground hover:text-primary transition">Cookies Policy</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-primary mb-4">Connect</h3>
            <ul className="space-y-2">
              <li>
                <a href="https://discord.gg/replaycoach" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition">Discord</a>
              </li>
              <li>
                <a href="https://twitter.com/replaycoach" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition">Twitter</a>
              </li>
              <li>
                <a href="https://www.youtube.com/c/replaycoach" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition">YouTube</a>
              </li>
              <li>
                <Link to="/contact" className="text-foreground hover:text-primary transition">Contact Us</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} ReplayCoach.gg. All rights reserved.</p>
          <p className="mt-2">
            StarCraft and StarCraft: Brood War are trademarks or registered trademarks of Blizzard Entertainment, Inc.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
