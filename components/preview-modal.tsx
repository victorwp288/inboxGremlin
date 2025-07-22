"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Archive,
  Trash2,
  Tag,
  Mail,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";
// Remove direct import to avoid bundling googleapis on client side
// import { EmailData } from "@/lib/gmail/service";
interface EmailData {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  isRead: boolean;
  labels: string[];
}

export interface PreviewOperation {
  type: 'archive' | 'delete' | 'label' | 'mark_read';
  query?: string;
  emailIds?: string[];
  labelIds?: string[];
  description: string;
}

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation: PreviewOperation | null;
  onConfirm: () => void;
  onFetchPreview?: (operation: PreviewOperation) => Promise<EmailData[]>;
}

export function PreviewModal({
  isOpen,
  onClose,
  operation,
  onConfirm,
  onFetchPreview,
}: PreviewModalProps) {
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && operation && onFetchPreview) {
      fetchPreviewEmails();
    }
  }, [isOpen, operation]);

  const fetchPreviewEmails = async () => {
    if (!operation || !onFetchPreview) return;

    try {
      setLoading(true);
      setError(null);
      const previewEmails = await onFetchPreview(operation);
      setEmails(previewEmails);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch preview');
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const getOperationIcon = () => {
    if (!operation) return <Mail className="h-5 w-5" />;
    
    switch (operation.type) {
      case 'archive':
        return <Archive className="h-5 w-5" />;
      case 'delete':
        return <Trash2 className="h-5 w-5" />;
      case 'label':
        return <Tag className="h-5 w-5" />;
      case 'mark_read':
        return <Mail className="h-5 w-5" />;
      default:
        return <Mail className="h-5 w-5" />;
    }
  };

  const getOperationColor = () => {
    if (!operation) return 'text-blue-500';
    
    switch (operation.type) {
      case 'archive':
        return 'text-green-500';
      case 'delete':
        return 'text-red-500';
      case 'label':
        return 'text-blue-500';
      case 'mark_read':
        return 'text-yellow-500';
      default:
        return 'text-blue-500';
    }
  };

  const getConfirmButtonVariant = () => {
    if (!operation) return 'default';
    
    switch (operation.type) {
      case 'delete':
        return 'destructive' as const;
      default:
        return 'default' as const;
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  if (!operation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={getOperationColor()}>
              {getOperationIcon()}
            </span>
            Preview Operation
          </DialogTitle>
          <DialogDescription>
            {operation.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading email preview...</span>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {emails.length} email{emails.length !== 1 ? 's' : ''} will be affected
                  </span>
                  {emails.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {emails.filter(e => !e.isRead).length} unread
                    </Badge>
                  )}
                </div>
                {operation.query && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {operation.query}
                  </Badge>
                )}
              </div>

              {emails.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No emails match the criteria. No action will be performed.
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-96 border rounded-md">
                  <div className="p-4 space-y-3">
                    {emails.map((email, index) => (
                      <div key={email.id} className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium truncate ${
                                !email.isRead ? 'font-bold' : ''
                              }`}>
                                {email.subject || 'No Subject'}
                              </span>
                              {!email.isRead && (
                                <Badge variant="default" className="text-xs">
                                  Unread
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span className="truncate">{email.from}</span>
                              <Clock className="h-3 w-3 ml-2" />
                              <span>{email.date}</span>
                            </div>
                            {email.snippet && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {email.snippet}
                              </p>
                            )}
                            {email.labels.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {email.labels
                                  .filter(label => !['INBOX', 'UNREAD', 'IMPORTANT'].includes(label))
                                  .slice(0, 3)
                                  .map(label => (
                                    <Badge key={label} variant="outline" className="text-xs">
                                      {label}
                                    </Badge>
                                  ))}
                                {email.labels.length > 6 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{email.labels.length - 6} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {index < emails.length - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || emails.length === 0}
            variant={getConfirmButtonVariant()}
          >
            {operation.type === 'delete' && (
              <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            Confirm {operation.type === 'delete' ? 'Delete' : 'Action'}
            {emails.length > 0 && ` (${emails.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}