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
        compact ? "min-w-[280px] max-w-[320px] flex-shrink-0" : "w-full"
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
        <div className={cn("flex gap-3", compact ? "flex-row" : "flex-row")}>
          {news.urlToImage && (
            <div className="flex-shrink-0">
              <img 
                src={news.urlToImage} 
                alt={news.title}
                className={cn(
                  "rounded object-cover",
                  compact ? "w-16 h-16" : "w-20 h-20"
                )}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-muted-foreground leading-relaxed",
              compact ? "text-xs line-clamp-2" : "text-sm line-clamp-3"
            )}>
              {news.description && news.description.length > 150 
                ? `${news.description.substring(0, 150)}...` 
                : news.description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
