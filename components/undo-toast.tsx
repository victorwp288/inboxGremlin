"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Undo2, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { OperationHistoryService } from "@/lib/operation-history";

interface UndoToastOptions {
  operationId: string;
  operationType: string;
  affectedCount: number;
  onUndo?: () => void;
  accessToken: string;
}

export function showUndoToast({
  operationId,
  operationType,
  affectedCount,
  onUndo,
  accessToken,
}: UndoToastOptions) {
  const operationHistoryService = new OperationHistoryService();

  const handleUndo = async () => {
    const undoPromise = new Promise(async (resolve, reject) => {
      try {
        // Call the undo API endpoint instead of using GmailService directly
        const response = await fetch("/api/emails/undo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationId }),
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
          onUndo?.();
          resolve(result.success);
        } else {
          reject(new Error(result.error || 'Failed to undo operation'));
        }
      } catch (error) {
        reject(error);
      }
    });

    toast.promise(undoPromise, {
      loading: (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Undoing {operationType}...</span>
        </div>
      ),
      success: (
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>Successfully undone {operationType} of {affectedCount} emails</span>
        </div>
      ),
      error: (error: Error) => (
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span>Failed to undo: {error.message}</span>
        </div>
      ),
    });
  };

  // Show the initial success toast with undo button
  toast.success(
    <div className="flex items-center justify-between gap-3 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
        <span className="truncate">
          {operationType} completed for {affectedCount} email{affectedCount !== 1 ? 's' : ''}
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleUndo}
        className="flex-shrink-0 h-8 px-3"
      >
        <Undo2 className="h-3 w-3 mr-1" />
        Undo
      </Button>
    </div>,
    {
      duration: 10000, // 10 seconds to undo
      closeButton: true,
    }
  );
}

export interface UndoableOperationResult {
  success: boolean;
  processedCount: number;
  operationId: string | null;
  operationType: string;
}

export function UndoToastContainer() {
  // This component can be used to manage multiple undo toasts
  // or provide a central undo history panel
  return null;
}