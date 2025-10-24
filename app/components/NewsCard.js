"use client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function NewsCard({ news, isSelected, onSelect, compact = false }) {
  const showCompactSelected = compact && isSelected

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md w-full h-full flex flex-col overflow-hidden p-0",
        isSelected ? "ring-2 ring-inset ring-primary bg-accent/10" : "hover:bg-card/80",
        showCompactSelected && "max-h-[40vh]"
      )}
      onClick={(e) => {
        onSelect && onSelect(e)
      }}
    >
      <div className="p-2 pb-1 flex flex-col h-full">
        {!showCompactSelected && (
          <div className="flex items-center justify-between mb-1">
            <Badge variant="secondary" className="text-xs">
              {news.category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(news.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "numeric",
                day: "numeric",
              })}
            </span>
          </div>
        )}
        {showCompactSelected ? (
          <div className="flex items-center gap-3 mb-2">
            {news.urlToImage && (
              <img
                src={news.urlToImage}
                alt={news.title}
                className="w-16 h-16 rounded object-cover flex-shrink-0"
                onError={(e) => {
                  e.target.style.display = "none"
                }}
              />
            )}
            <h3 className="flex-1 font-semibold text-card-foreground text-base leading-tight line-clamp-3">
              {news.title}
            </h3>
          </div>
        ) : (
          <h3
            className={cn(
              "font-semibold text-card-foreground leading-tight line-clamp-2",
              compact ? "text-base" : "text-lg"
            )}
          >
            {news.title}
          </h3>
        )}
        {/* Give the description its own scrollable region so longer text stays visible inside the fixed-height card */}
        <div
          className={cn(
            "relative flex-1 min-h-0",
            showCompactSelected ? "mt-0" : "mt-1",
            isSelected && "overflow-y-auto pr-1"
          )}
        >
          {!showCompactSelected && news.urlToImage && (
            <img
              src={news.urlToImage}
              alt={news.title}
              className={cn(
                "rounded object-cover",
                compact
                  ? "float-left mr-3 mb-2 w-16 h-16"
                  : "float-left mr-3 mb-2 w-20 h-20"
              )}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <div
            className={cn(
              "text-muted-foreground leading-relaxed",
              showCompactSelected ? "text-sm" : compact ? "text-xs" : "text-sm"
            )}
          >
            {isSelected ? news.description : `${news.description.substring(0, 250)}...`}
          </div>
        </div>
      </div>
    </Card>
  )
}
