
import React from 'react';

export const Google = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M17.6 10h-4.6v2h2.6c-.23 1.21-1.3 2-2.6 2a3 3 0 1 1 0-6c.8 0 1.52.32 2.06.84L16.54 7.3A5 5 0 1 0 12 17a5 5 0 0 0 5-5v-2z" />
    </svg>
  );
};
