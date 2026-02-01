
import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className={className}>
    <defs>
      <linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#7c3aed"/>
        <stop offset="100%" stopColor="#3b82f6"/>
      </linearGradient>
    </defs>
    <rect width="256" height="256" rx="48" fill="url(#a)"/>
    <circle cx="128" cy="128" r="78" fill="none" stroke="#fff" strokeWidth="14"/>
    <circle cx="102" cy="110" r="6" fill="#fff"/>
    <circle cx="154" cy="110" r="6" fill="#fff"/>
    <path d="M96 144c14 18 50 18 64 0" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round"/>
  </svg>
);
