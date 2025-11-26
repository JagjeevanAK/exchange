"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function FloatingThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  const isDark = theme === "dark"

  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-4 right-4 z-50 inline-flex items-center rounded-full border p-0 shadow-sm hover:shadow-md transition-all duration-200"
      aria-label="Toggle Theme"
    >
      <Sun className={`lucide size-10 rounded-full p-1.5 ${
        !isDark ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
      }`} />
      <Moon className={`lucide size-10 rounded-full p-1.5 ${
        isDark ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
      }`} />
    </button>
  )
}
