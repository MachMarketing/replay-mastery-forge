
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ["Montserrat", "sans-serif"],
				orbitron: ["Orbitron", "sans-serif"],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Custom StarCraft-themed colors
				protoss: {
					DEFAULT: '#00A8FF',
					light: '#84D0FF',
					dark: '#0076B3',
				},
				terran: {
					DEFAULT: '#DE2C2C',
					light: '#FF7A7A',
					dark: '#9E1F1F',
				},
				zerg: {
					DEFAULT: '#9370DB',
					light: '#C9B3F1',
					dark: '#674EA7',
				},
				// Coaching report colors
				strength: {
					DEFAULT: '#4CAF50',
					light: '#A3D9A5',
					dark: '#357A38',
				},
				weakness: {
					DEFAULT: '#F44336',
					light: '#FFCDD2',
					dark: '#B71C1C',
				},
				improvement: {
					DEFAULT: '#FFC107',
					light: '#FFECB3',
					dark: '#FF8F00',
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'fade-out': {
					'0%': {
						opacity: '1',
						transform: 'translateY(0)'
					},
					'100%': {
						opacity: '0',
						transform: 'translateY(10px)'
					}
				},
				'scale-in': {
					'0%': {
						transform: 'scale(0.95)',
						opacity: '0'
					},
					'100%': {
						transform: 'scale(1)',
						opacity: '1'
					}
				},
				'pulse': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.5' }
				},
				'scan': {
					'0%, 100%': { top: '0', opacity: '0.6' },
					'50%': { top: '100%', opacity: '0.2' }
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-10px)' }
				},
				'spin': {
					'0%': { transform: 'rotate(0deg)' },
					'100%': { transform: 'rotate(360deg)' }
				},
				'spin-reverse': {
					'0%': { transform: 'rotate(0deg)' },
					'100%': { transform: 'rotate(-360deg)' }
				},
				'blur-in': {
					'0%': { filter: 'blur(5px)', opacity: '0' },
					'100%': { filter: 'blur(0)', opacity: '1' }
				},
				'glow-pulse': {
					'0%, 100%': { 
						boxShadow: '0 0 5px rgba(0, 168, 255, 0.5)',
						opacity: '0.8' 
					},
					'50%': { 
						boxShadow: '0 0 20px rgba(0, 168, 255, 0.8)',
						opacity: '1' 
					}
				},
				'tech-scan': {
					'0%': { 
						transform: 'translateY(-100%) translateX(0%)',
						opacity: '0.7',
						backgroundColor: 'rgba(0, 168, 255, 0.3)'
					},
					'50%': { 
						opacity: '0.3',
						backgroundColor: 'rgba(0, 168, 255, 0.5)'
					},
					'100%': { 
						transform: 'translateY(100%) translateX(0%)',
						opacity: '0.7',
						backgroundColor: 'rgba(0, 168, 255, 0.3)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'fade-out': 'fade-out 0.3s ease-out',
				'scale-in': 'scale-in 0.2s ease-out',
				'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'float': 'float 3s ease-in-out infinite',
				'blur-in': 'blur-in 0.5s ease-out forwards',
				'scan': 'scan 4s ease-in-out infinite',
				'glow-pulse': 'glow-pulse 2s infinite',
				'tech-scan': 'tech-scan 8s infinite linear',
			},
			backgroundImage: {
				'hero-pattern': "linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('/background.jpg')",
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
				'tech-grid': 'linear-gradient(to right, theme("colors.primary.DEFAULT / 10%") 1px, transparent 1px), linear-gradient(to bottom, theme("colors.primary.DEFAULT / 10%") 1px, transparent 1px)',
			},
			gridTemplateRows: {
				'12': 'repeat(12, minmax(0, 1fr))',
			},
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
