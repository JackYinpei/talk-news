import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function CombineInitPrompt(news) {
  return `下面是一篇新闻，我们接下来要讨论的。${news.description}`
}