import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-plus-jakarta-sans)"],
      },
      colors: {
        zenith: {
          primary: "#667eea",
          secondary: "#764ba2",
          accent: "#4facfe",
          light: "#f093fb",
          soft: "#ffecd2",
          purple: "#e3f2fd",
          blue: "#00f2fe",
          pink: "#f5576c",
          orange: "#fcb69f",
        },
        luna: {
          primary: "#667eea",
          secondary: "#764ba2",
          dark: "#4c63d2",
          yellow: "#ffc93c",
          "yellow-light": "#ffd76f",
          "yellow-dark": "#ffbb09",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        float: {
          "0%, 100%": {
            transform: "translateY(0px) rotate(0deg)",
          },
          "50%": {
            transform: "translateY(-20px) rotate(180deg)",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "slide-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        float: "float 6s ease-in-out infinite",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
      },
      backgroundImage: {
        "zenith-gradient": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        "zenith-gradient-light": "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        "zenith-gradient-purple": "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
        "zenith-gradient-soft": "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
        "zenith-bg": "linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 50%, #fff3e0 100%)",
      },
      boxShadow: {
        zenith: "0 8px 32px rgba(102, 126, 234, 0.4)",
        "zenith-hover": "0 12px 40px rgba(102, 126, 234, 0.6)",
        glass: "0 8px 32px rgba(31, 38, 135, 0.37)",
        soft: "0 4px 20px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
