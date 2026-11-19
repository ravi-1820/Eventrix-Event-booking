/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        "display-hero-mobile": [ "Plus Jakarta Sans" ], 
        "label-md": [ "Plus Jakarta Sans" ], 
        "body-lg": [ "Plus Jakarta Sans" ], 
        "headline-lg": [ "Plus Jakarta Sans" ], 
        "headline-lg-mobile": [ "Plus Jakarta Sans" ], 
        "body-sm": [ "Plus Jakarta Sans" ], 
        "headline-sm": [ "Plus Jakarta Sans" ], 
        "body-md": [ "Plus Jakarta Sans" ], 
        "label-lg": [ "Plus Jakarta Sans" ], 
        "label-sm": [ "Plus Jakarta Sans" ], 
        "headline-md": [ "Plus Jakarta Sans" ], 
        "display-hero": [ "Plus Jakarta Sans" ]
      },
      fontSize: {
        "display-hero-mobile": [ "36px", { "lineHeight": "44px", "letterSpacing": "-0.025em", "fontWeight": "800" } ], 
        "label-md": [ "13px", { "lineHeight": "18px", "letterSpacing": "0.01em", "fontWeight": "600" } ], 
        "body-lg": [ "18px", { "lineHeight": "28px", "letterSpacing": "-0.005em", "fontWeight": "400" } ], 
        "headline-lg": [ "36px", { "lineHeight": "44px", "letterSpacing": "-0.02em", "fontWeight": "700" } ], 
        "headline-lg-mobile": [ "28px", { "lineHeight": "36px", "letterSpacing": "-0.02em", "fontWeight": "700" } ], 
        "body-sm": [ "13px", { "lineHeight": "20px", "letterSpacing": "0.005em", "fontWeight": "400" } ], 
        "headline-sm": [ "20px", { "lineHeight": "28px", "letterSpacing": "-0.01em", "fontWeight": "600" } ], 
        "body-md": [ "15px", { "lineHeight": "24px", "letterSpacing": "0", "fontWeight": "400" } ], 
        "label-lg": [ "15px", { "lineHeight": "20px", "letterSpacing": "-0.005em", "fontWeight": "700" } ], 
        "label-sm": [ "11px", { "lineHeight": "14px", "letterSpacing": "0.03em", "fontWeight": "700" } ], 
        "headline-md": [ "24px", { "lineHeight": "32px", "letterSpacing": "-0.015em", "fontWeight": "700" } ], 
        "display-hero": [ "56px", { "lineHeight": "64px", "letterSpacing": "-0.03em", "fontWeight": "800" } ]
      },
      spacing: { 
        "space-sm": "0.5rem", 
        "margin-mobile": "1rem", 
        "margin": "1.5rem", 
        "gutter": "1.5rem", 
        "space-xl": "2.5rem", 
        "space-md": "1rem", 
        "gutter-sm": "1rem", 
        "margin-desktop": "3rem", 
        "space-xs": "0.25rem", 
        "gutter-lg": "2rem", 
        "space-lg": "1.5rem" 
      },
      colors: {
        // Shadcn & Design System Tokens
        border: "hsl(var(--border, 204 94% 94%))",
        input: "hsl(var(--input, 204 94% 94%))",
        ring: "hsl(var(--ring, 201 90% 27%))",
        background: "#E0F2FE",
        foreground: "#0F172A",
        destructive: {
          DEFAULT: "#FF4F70",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#E0F2FE",
          foreground: "#0369A1",
        },
        accent: {
          DEFAULT: "#FF4F70",
          foreground: "#FFFFFF",
          hover: "#E11D48",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
        },
        
        // New Eventrix Brand Palette
        brand: {
          teal: "#075985",       // PRIMARY DEEP TEAL
          lightBlue: "#E0F2FE",  // LIGHT BLUE
          coral: "#FF4F70",      // CORAL ACCENT
          white: "#FFFFFF",      // WHITE
          navy: "#0C4A6E",
        },

        // Primary: Deep Teal (#075985)
        primary: {
          DEFAULT: "#075985",
          hover: "#0369A1",
          light: "#E0F2FE",
          foreground: "#FFFFFF",
        },
        "primary-container": "#075985",
        "on-primary": "#FFFFFF",
        "on-primary-container": "#FFFFFF",

        // Secondary: Light Blue & Subtle Teal
        secondary: {
          DEFAULT: "#0284C7",
          hover: "#0369A1",
          foreground: "#FFFFFF",
        },
        "secondary-container": "#075985",
        "on-secondary": "#FFFFFF",
        "secondary-fixed": "#E0F2FE",
        "secondary-fixed-dim": "#BAE6FD",

        // Tertiary / Warning / Status
        tertiary: "#F59E0B",
        "tertiary-container": "#FEF3C7",

        // Surfaces & Containers
        "surface": "#FFFFFF",
        "surface-bright": "#FFFFFF",
        "surface-dim": "#F0F9FF",
        "surface-container-lowest": "#FFFFFF",
        "surface-container-low": "#F0F9FF",
        "surface-container": "#E0F2FE",
        "surface-container-high": "#BAE6FD",
        "surface-container-highest": "#7DD3FC",
        "on-surface": "#0F172A",
        "on-surface-variant": "#0369A1",
        "on-background": "#0F172A",

        // Error & Outline
        "error": "#FF4F70",
        "error-container": "rgba(255, 79, 112, 0.10)",
        "on-error": "#FFFFFF",
        "outline": "rgba(7, 89, 133, 0.12)",
        "outline-variant": "#BAE6FD",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "shimmer": {
          "100%": {
            "transform": "translateX(100%)",
          },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        }
      },
      animation: {
        "shimmer": "shimmer 2s infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
      }
    },
  },
  plugins: [],
}
