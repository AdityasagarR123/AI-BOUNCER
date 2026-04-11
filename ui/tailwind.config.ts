import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: '#040404',
  			foreground: '#ffffff',
        accent: {
          DEFAULT: '#E55B3C', // The vibrant framer copper/orange
          foreground: '#ffffff'
        },
  			card: {
  				DEFAULT: '#0a0a0a',
  				foreground: '#f3f4f6'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: '#E55B3C',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: '#1c1c1c',
  				foreground: '#ffffff'
  			},
  			muted: {
  				DEFAULT: '#1a1a1a',
  				foreground: '#888888'
  			},
  			accent_alt: {
  				DEFAULT: '#2a110a',
  				foreground: '#E55B3C'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: '#222222',
  			input: '#1a1a1a',
  			ring: '#E55B3C',
  			chart: {
  				'1': '#E55B3C',
  				'2': '#ff7841',
  				'3': '#ff945b',
  				'4': '#cc492b',
  				'5': '#a83c23'
  			}
  		},
  		borderRadius: {
  			lg: '0.75rem',
  			md: '0.5rem',
  			sm: '0.25rem'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
