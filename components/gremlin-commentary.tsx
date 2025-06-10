"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface GremlinCommentaryProps {
  selectedCount: number
}

export function GremlinCommentary({ selectedCount }: GremlinCommentaryProps) {
  const getGremlinMessage = () => {
    if (selectedCount === 0) {
      return {
        message: "I'm ready to chomp! Select some emails and let me feast on that digital clutter.",
        mood: "hungry",
      }
    } else if (selectedCount < 10) {
      return {
        message: "Just a light snack? I can handle much more than that! Feed me more emails.",
        mood: "playful",
      }
    } else if (selectedCount < 100) {
      return {
        message: "Now we're talking! This looks like a proper meal. Let's clean house!",
        mood: "excited",
      }
    } else if (selectedCount < 1000) {
      return {
        message: "Oh my! This is a feast! I'm practically drooling over all these emails to devour.",
        mood: "thrilled",
      }
    } else {
      return {
        message: "WHOA! This is a banquet! Are you sure you want me to eat ALL of these? I'm ready!",
        mood: "amazed",
      }
    }
  }

  const { message, mood } = getGremlinMessage()

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case "hungry":
        return "text-muted-foreground"
      case "playful":
        return "text-blue-600 dark:text-blue-400"
      case "excited":
        return "text-brand-600 dark:text-brand-400"
      case "thrilled":
        return "text-orange-600 dark:text-orange-400"
      case "amazed":
        return "text-red-600 dark:text-red-400"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <Card className="bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-950 dark:to-brand-900 border-brand-200 dark:border-brand-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-sm">
          <span className="text-2xl mr-2">🧌</span>
          Gremlin Commentary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className={`text-sm ${getMoodColor(mood)}`}>"{message}"</p>
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className="bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300 text-xs"
          >
            Mood: {mood}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Appetite: {selectedCount > 500 ? "Ravenous" : selectedCount > 100 ? "Hungry" : "Peckish"}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
