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

  const handleBulkCleanup = async () => {
    try {
      const result = await bulkCleanup();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Bulk cleanup failed:", error);
    }
  };

  const handleArchiveOld = async () => {
    try {
      await archiveOldEmails(archiveDays);
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
      action: handleBulkCleanup,
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
      action: handleArchiveOld,
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
    </div>
  );
}
