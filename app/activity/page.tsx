"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Calendar,
  Trash2,
  Archive,
  Tag,
  BarChart3,
  Brain,
  Zap,
  ArrowLeft,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";

const activityData = [
  {
    id: 1,
    timestamp: "2024-01-15 14:30",
    action: "Bulk Delete",
    count: 1247,
    type: "Promotional emails > 3 months",
    storageFreed: "2.3 GB",
    status: "completed",
  },
  {
    id: 2,
    timestamp: "2024-01-14 09:15",
    action: "Archive",
    count: 456,
    type: "Newsletter cleanup",
    storageFreed: "890 MB",
    status: "completed",
  },
  {
    id: 3,
    timestamp: "2024-01-13 16:45",
    action: "Label",
    count: 234,
    type: "Work emails organization",
    storageFreed: "0 MB",
    status: "completed",
  },
  {
    id: 4,
    timestamp: "2024-01-12 11:20",
    action: "Bulk Delete",
    count: 2891,
    type: "Spam and junk cleanup",
    storageFreed: "4.1 GB",
    status: "completed",
  },
  {
    id: 5,
    timestamp: "2024-01-11 13:10",
    action: "Archive",
    count: 167,
    type: "Old social notifications",
    storageFreed: "340 MB",
    status: "undone",
  },
];

export default function ActivityPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Mock activity data - in a real app, this would come from a database
  const activities = [
    {
      id: 1,
      type: "bulk-cleanup",
      title: "Smart Cleanup",
      description: "Archived 45 promotional emails and 12 newsletters",
      timestamp: "2024-01-15T10:30:00Z",
      status: "completed",
      processedCount: 57,
      details: {
        promotional: 45,
        newsletter: 12,
        social: 0,
        oldEmails: 0,
      },
    },
    {
      id: 2,
      type: "categorize",
      title: "Inbox Analysis",
      description: "Analyzed 234 emails and categorized them",
      timestamp: "2024-01-15T09:15:00Z",
      status: "completed",
      processedCount: 234,
      details: {
        personal: 89,
        work: 76,
        newsletter: 34,
        promotional: 23,
        social: 12,
      },
    },
    {
      id: 3,
      type: "archive-old",
      title: "Archive Old Emails",
      description: "Archived emails older than 30 days",
      timestamp: "2024-01-14T16:45:00Z",
      status: "completed",
      processedCount: 128,
      details: {
        archivedEmails: 128,
        daysThreshold: 30,
      },
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "bulk-cleanup":
        return Zap;
      case "categorize":
        return Brain;
      case "archive-old":
        return Archive;
      case "label":
        return Tag;
      case "delete":
        return Trash2;
      default:
        return CheckCircle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "in-progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays <= 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">🧌</span>
              </div>
              <span className="text-xl font-bold text-foreground">
                InboxGremlin Activity
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">
              Activity History 📊
            </h1>
            <p className="text-muted-foreground text-lg">
              Track all the magic your gremlin has performed on your inbox
            </p>
          </div>

          {/* Activity Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">
                  {activities.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Completed this week
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Emails Processed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-brand-600">
                  {activities.reduce(
                    (sum, activity) => sum + activity.processedCount,
                    0
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total organized
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500 dark:text-green-400">
                  100%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All operations successful
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Activity Timeline */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Your gremlin's recent inbox management activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity) => {
                  const Icon = getActivityIcon(activity.type);

                  return (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900 rounded-lg flex items-center justify-center">
                          <Icon className="h-5 w-5 text-brand-600" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-foreground">
                            {activity.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(activity.status)}>
                              {activity.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(activity.timestamp)}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mt-1">
                          {activity.description}
                        </p>

                        <div className="flex items-center space-x-4 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {activity.processedCount} emails
                          </Badge>

                          {activity.type === "bulk-cleanup" && (
                            <div className="flex space-x-2">
                              {activity.details.promotional > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {activity.details.promotional} promotional
                                </Badge>
                              )}
                              {activity.details.newsletter > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {activity.details.newsletter} newsletters
                                </Badge>
                              )}
                            </div>
                          )}

                          {activity.type === "categorize" && (
                            <div className="flex space-x-2 flex-wrap">
                              {Object.entries(activity.details).map(
                                ([category, count]) => (
                                  <Badge
                                    key={category}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {count} {category}
                                  </Badge>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {activities.length === 0 && (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No activity yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Start organizing your inbox to see activity here.
                  </p>
                  <Button
                    onClick={() => router.push("/dashboard")}
                    variant="outline"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
