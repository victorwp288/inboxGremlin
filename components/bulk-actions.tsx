"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Play, Trash2, Archive, Tag, CheckCheck, AlertTriangle } from "lucide-react"

interface BulkActionsProps {
  selectedCount: number
  isDryRun: boolean
  onDryRunToggle: (enabled: boolean) => void
  isProcessing: boolean
}

export function BulkActions({ selectedCount, isDryRun, onDryRunToggle, isProcessing }: BulkActionsProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch checked={isDryRun} onCheckedChange={onDryRunToggle} className="data-[state=checked]:bg-brand-600" />
            <Label>Dry Run Mode</Label>
            {isDryRun && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                Preview Only
              </Badge>
            )}
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Selected:</span>
            <Badge variant="secondary" className="bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300">
              {selectedCount.toLocaleString()}
            </Badge>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {selectedCount > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                disabled={isProcessing}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                disabled={isProcessing}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                disabled={isProcessing}
              >
                <Tag className="w-4 h-4 mr-2" />
                Label
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="border-muted-foreground text-muted-foreground hover:bg-muted-foreground hover:text-background"
                disabled={isProcessing}
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark Read
              </Button>
            </>
          )}

          <Button className="bg-brand-600 hover:bg-brand-700" disabled={selectedCount === 0 || isProcessing}>
            <Play className="w-4 h-4 mr-2" />
            {isDryRun ? "Preview Actions" : "Execute"}
          </Button>
        </div>
      </div>

      {!isDryRun && selectedCount > 0 && (
        <div className="mt-3 p-3 bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
            <span className="text-sm text-orange-700 dark:text-orange-400">
              Warning: This will permanently modify {selectedCount.toLocaleString()} emails. This action cannot be
              undone.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
