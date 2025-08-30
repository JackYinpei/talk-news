"use client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { cn } from "@/lib/utils"

export function NewsCard({ news, isSelected, onSelect, compact = false }) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected ? "ring-2 ring-primary bg-accent/10" : "hover:bg-card/80",
        compact ? "min-w-[280px] flex-shrink-0" : ""
      )}
      onClick={onSelect}
    >
      <CardHeader className={compact ? "pb-2" : "pb-3"}>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary" className="text-xs">
            {news.category}
          </Badge>
          <span className="text-xs text-muted-foreground">{new Date(news.date).toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' })}</span>
        </div>
        <h3 className={cn(
          "font-semibold text-card-foreground leading-tight",
          compact ? "text-base" : "text-lg"
        )}>{news.title}</h3>
      </CardHeader>
      <CardContent className="pt-0">
        <p className={cn(
          "text-muted-foreground leading-relaxed",
          compact ? "text-xs line-clamp-2" : "text-sm"
        )}>{news.description}</p>
      </CardContent>
    </Card>
  )
}
