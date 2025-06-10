"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Mail, MailOpen, RefreshCw } from "lucide-react";
import { EmailData } from "@/lib/gmail/service";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmailListRealProps {
  emails: EmailData[];
  loading: boolean;
  error: string | null;
  needsReauth: boolean;
  onRefresh: () => void;
  onReauth: () => void;
}

export function EmailListReal({
  emails,
  loading,
  error,
  needsReauth,
  onRefresh,
  onReauth,
}: EmailListRealProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant={needsReauth ? "destructive" : "default"}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <div className="flex gap-2">
            {needsReauth ? (
              <Button onClick={onReauth} size="sm" variant="outline">
                Re-authenticate
              </Button>
            ) : (
              <Button onClick={onRefresh} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!emails || emails.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No emails found
          </h3>
          <p className="text-muted-foreground mb-4">
            Your inbox appears to be empty or there was an issue loading emails.
          </p>
          <Button onClick={onRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {emails.map((email) => (
        <Card
          key={email.id}
          className={`transition-colors hover:bg-accent/50 cursor-pointer ${
            !email.isRead
              ? "border-brand-200 bg-brand-50/20 dark:border-brand-800 dark:bg-brand-950/20"
              : ""
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {email.isRead ? (
                    <MailOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <Mail className="h-4 w-4 text-brand-600 flex-shrink-0" />
                  )}
                  <h4
                    className={`text-sm font-medium truncate ${
                      !email.isRead
                        ? "text-foreground font-semibold"
                        : "text-foreground"
                    }`}
                  >
                    {email.subject}
                  </h4>
                  {!email.isRead && (
                    <Badge
                      variant="default"
                      className="bg-brand-600 text-white text-xs"
                    >
                      New
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mb-2 truncate">
                  From: {email.from}
                </p>

                <p className="text-sm text-muted-foreground line-clamp-2">
                  {email.snippet}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2 ml-4">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {email.date}
                </span>

                {email.labels.includes("IMPORTANT") && (
                  <Badge variant="secondary" className="text-xs">
                    Important
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
