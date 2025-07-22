"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Archive,
  Trash2,
  Tag,
  Brain,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
  BarChart3,
  Calendar,
  Mail,
} from "lucide-react";
import { useEmailOrganizer } from "@/hooks/use-email-organizer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PreviewModal, PreviewOperation } from "@/components/preview-modal";
import { showUndoToast } from "@/components/undo-toast";
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
import { createClient } from "@/lib/supabase/client";

interface InboxOrganizerProps {
  onRefresh?: () => void;
}

export function InboxOrganizer({ onRefresh }: InboxOrganizerProps) {
  const {
    loading,
    error,
    lastResult,
    organizeEmails,
    archiveOldEmails,
    categorizeInbox,
    bulkCleanup,
  } = useEmailOrganizer();

  const [archiveDays, setArchiveDays] = useState(30);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    operation: PreviewOperation | null;
    onConfirm: () => void;
  }>({
    isOpen: false,
    operation: null,
    onConfirm: () => {},
  });

  const fetchPreviewEmails = async (operation: PreviewOperation): Promise<EmailData[]> => {
    try {
      const response = await fetch("/api/emails/organize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getByQuery",
          query: operation.query,
          maxResults: 100,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      return result.emails || [];
    } catch (error) {
      console.error("Error fetching preview emails:", error);
      throw error;
    }
  };

  const getAccessToken = async (): Promise<string> => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.provider_token || '';
  };

  const handleBulkCleanupWithPreview = () => {
    setPreviewModal({
      isOpen: true,
      operation: {
        type: 'archive',
        query: 'in:inbox (sale OR deal OR offer OR discount OR "% off" OR "shop now" OR newsletter OR unsubscribe OR "no-reply" OR noreply OR facebook OR twitter OR linkedin OR instagram OR notification) older_than:7d',
        description: 'Archive promotional emails, newsletters, and social notifications older than 7 days',
      },
      onConfirm: handleBulkCleanup,
    });
  };

  const handleBulkCleanup = async () => {
    try {
      const result = await bulkCleanup();
      if (result.success && result.operationId) {
        const accessToken = await getAccessToken();
        showUndoToast({
          operationId: result.operationId,
          operationType: 'Smart Cleanup',
          affectedCount: result.processedCount,
          onUndo: onRefresh,
          accessToken,
        });
      }
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Bulk cleanup failed:", error);
    }
  };

  const handleArchiveOldWithPreview = () => {
    setPreviewModal({
      isOpen: true,
      operation: {
        type: 'archive',
        query: `in:inbox older_than:${archiveDays}d`,
        description: `Archive emails older than ${archiveDays} days`,
      },
      onConfirm: handleArchiveOld,
    });
  };

  const handleArchiveOld = async () => {
    try {
      const result = await archiveOldEmails(archiveDays);
      if (result.success && result.operationId) {
        const accessToken = await getAccessToken();
        showUndoToast({
          operationId: result.operationId,
          operationType: 'Archive Old Emails',
          affectedCount: result.processedCount,
          onUndo: onRefresh,
          accessToken,
        });
      }
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Archive old emails failed:", error);
    }
  };

  const handleCategorizeInbox = async () => {
    try {
      setIsAnalyzing(true);
      const result = await categorizeInbox();
      setAnalysisResult(result);
    } catch (error) {
      console.error("Categorization failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const quickActions = [
    {
      id: "bulk-cleanup",
      title: "Smart Cleanup",
      description:
        "Automatically archive newsletters, promotions, and old emails",
      icon: Zap,
      color: "bg-blue-500",
      action: handleBulkCleanupWithPreview,
    },
    {
      id: "categorize",
      title: "Analyze Inbox",
      description:
        "Categorize your emails to understand what's taking up space",
      icon: Brain,
      color: "bg-purple-500",
      action: handleCategorizeInbox,
    },
    {
      id: "archive-old",
      title: "Archive Old",
      description: `Archive emails older than ${archiveDays} days`,
      icon: Archive,
      color: "bg-green-500",
      action: handleArchiveOldWithPreview,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Inbox Gremlin 🧌</h2>
        <p className="text-muted-foreground">
          Let the gremlin organize your inbox automatically
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Display */}
      {lastResult && lastResult.success && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            {typeof lastResult.summary === "string"
              ? lastResult.summary
              : `Successfully processed ${
                  lastResult.processedCount || 0
                } emails`}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="quick-actions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quick-actions">Quick Actions</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="quick-actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const isCurrentLoading = loading;

              return (
                <Card key={action.id} className="relative overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-lg ${action.color} bg-opacity-10`}
                      >
                        <Icon
                          className={`h-5 w-5 text-white`}
                          style={{
                            color: action.color
                              .replace("bg-", "")
                              .replace("-500", ""),
                          }}
                        />
                      </div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                    </div>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={action.action}
                      disabled={isCurrentLoading}
                      className="w-full"
                      variant={
                        action.id === "bulk-cleanup" ? "default" : "outline"
                      }
                    >
                      {isCurrentLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Icon className="h-4 w-4 mr-2" />
                      )}
                      {isCurrentLoading ? "Processing..." : action.title}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Archive Days Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Archive Settings
              </CardTitle>
              <CardDescription>
                Configure how old emails should be before archiving
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="archive-days">Archive emails older than</Label>
                <Input
                  id="archive-days"
                  type="number"
                  value={archiveDays}
                  onChange={(e) =>
                    setArchiveDays(parseInt(e.target.value) || 30)
                  }
                  className="w-20"
                  min="1"
                  max="365"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Inbox Analysis
              </CardTitle>
              <CardDescription>
                Understand what types of emails are in your inbox
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleCategorizeInbox}
                disabled={isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Brain className="h-4 w-4 mr-2" />
                )}
                {isAnalyzing ? "Analyzing..." : "Analyze Inbox"}
              </Button>

              {analysisResult && (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Analyzed {analysisResult.totalEmails} emails
                  </div>

                  <div className="space-y-3">
                    {analysisResult.categoryStats?.map((stat: any) => (
                      <div key={stat.category} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium capitalize">
                            {stat.category}
                          </span>
                          <Badge variant="secondary">
                            {stat.count} emails ({stat.percentage}%)
                          </Badge>
                        </div>
                        <Progress value={stat.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Operations</CardTitle>
              <CardDescription>
                More granular control over your inbox organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    // Future: Implement newsletter management
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Manage Newsletters
                </Button>

                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    // Future: Implement promotional cleanup
                  }}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Clean Promotions
                </Button>

                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    // Future: Implement social media cleanup
                  }}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Social
                </Button>

                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    // Future: Implement custom rules
                  }}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Custom Rules
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      <PreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ ...previewModal, isOpen: false })}
        operation={previewModal.operation}
        onConfirm={previewModal.onConfirm}
        onFetchPreview={fetchPreviewEmails}
      />
    </div>
  );
}
