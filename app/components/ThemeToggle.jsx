'use client'

import { Button } from '@/app/components/ui/button'
import { useTheme } from '@/app/contexts/ThemeContext'

export default function ThemeToggle() {
  const { theme, resolvedTheme, toggleTheme } = useTheme()
  const label = theme === 'system' ? '跟随系统' : (theme === 'dark' ? '深色' : '浅色')
  const resolved = resolvedTheme === 'dark' ? '🌙' : '🌞'
  return (
    <Button variant="outline" size="sm" onClick={toggleTheme} title={`主题：${label}（当前 ${resolvedTheme}）`}>
      {resolved} {label}
    </Button>
  )
}

