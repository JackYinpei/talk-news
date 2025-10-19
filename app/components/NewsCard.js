"use client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function NewsCard({ news, isSelected, onSelect, compact = false }) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md w-full h-full flex flex-col overflow-hidden p-0",
        isSelected ? "ring-2 ring-primary bg-accent/10" : "hover:bg-card/80"
      )}
      onClick={(e) => {
        onSelect && onSelect(e)
      }}
    >
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-1">
          <Badge variant="secondary" className="text-xs">
            {news.category}
          </Badge>
          <span className="text-xs text-muted-foreground">{new Date(news.date).toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' })}</span>
        </div>
        <h3 className={cn(
          "font-semibold text-card-foreground leading-tight line-clamp-2",
          compact ? "text-base" : "text-lg"
        )}>{news.title}</h3>
        <div className={cn(
          "relative",
          isSelected && "overflow-y-auto max-h-64"
        )}>
          {news.urlToImage && (
            <img
              src={news.urlToImage}
              alt={news.title}
              className={cn(
                "float-left mr-3 mb-2 rounded object-cover",
                compact ? "w-16 h-16" : "w-20 h-20"
              )}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <div className={cn(
            "text-muted-foreground leading-relaxed",
            compact ? "text-xs" : "text-sm"
          )}>
            {isSelected ? news.description : `${news.description.substring(0, 250)}...`}
          </div>
        </div>
      </div>
    </Card>
  )
}
