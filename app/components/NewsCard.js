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
        <div className="flex gap-3">
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
            <div className={cn(
              "text-muted-foreground leading-relaxed",
              isSelected && "overflow-y-auto",
              compact ? "text-xs line-clamp-5" : "text-sm max-h-64"
            )}>
              {isSelected ? news.description : `${news.description.substring(0, 250)}...`}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
