"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Trash2, Archive, Tag, CheckCheck, Clock, Undo2 } from "lucide-react"

const recentActions = [
  {
    id: 1,
    action: "delete",
    count: 247,
    description: "Promotional emails > 3 months",
    timestamp: "2 minutes ago",
    canUndo: true,
  },
  {
    id: 2,
    action: "archive",
    count: 89,
    description: "Newsletter cleanup",
    timestamp: "5 minutes ago",
    canUndo: true,
  },
  {
    id: 3,
    action: "label",
    count: 156,
    description: "Work emails organization",
    timestamp: "1 hour ago",
    canUndo: false,
  },
]

export function ActionLogs() {
  const getActionIcon = (action: string) => {
    switch (action) {
      case "delete":
        return <Trash2 className="w-3 h-3 text-red-500 dark:text-red-400" />
      case "archive":
        return <Archive className="w-3 h-3 text-blue-500 dark:text-blue-400" />
      case "label":
        return <Tag className="w-3 h-3 text-green-500 dark:text-green-400" />
      case "read":
        return <CheckCheck className="w-3 h-3 text-purple-500 dark:text-purple-400" />
      default:
        return <Clock className="w-3 h-3 text-muted-foreground" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "delete":
        return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
      case "archive":
        return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
      case "label":
        return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
      case "read":
        return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center">
          <Clock className="w-4 h-4 mr-2 text-brand-600" />
          Recent Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64">
          <div className="space-y-2 p-3">
            {recentActions.map((action) => (
              <div key={action.id} className="p-3 bg-muted rounded-lg border">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getActionIcon(action.action)}
                    <Badge variant="secondary" className={`text-xs ${getActionColor(action.action)}`}>
                      {action.action}
                    </Badge>
                  </div>
                  {action.canUndo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Undo2 className="w-3 h-3 mr-1" />
                      Undo
                    </Button>
                  )}
                </div>
                <p className="text-xs mb-1">{action.count.toLocaleString()} emails</p>
                <p className="text-xs text-muted-foreground mb-2">{action.description}</p>
                <p className="text-xs text-muted-foreground">{action.timestamp}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
