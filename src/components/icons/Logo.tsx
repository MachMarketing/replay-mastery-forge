
import React from 'react';

export const Logo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Shield outline */}
      <path 
        d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" 
        stroke="currentColor" 
        fill="currentColor" 
        fillOpacity="0.1"
      />
      
      {/* Inner shield details */}
      <path 
        d="M12 17C12 17 16.5 14.5 16.5 11V7L12 5.5L7.5 7V11C7.5 14.5 12 17 12 17Z" 
        stroke="currentColor" 
        strokeOpacity="0.8"
        fill="none"
      />
    </svg>
  );
};

export default Logo;
