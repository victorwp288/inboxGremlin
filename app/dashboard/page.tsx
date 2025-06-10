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
  Mail,
  Settings,
  Activity,
  LogOut,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useGmail } from "@/hooks/use-gmail";
import { EmailListReal } from "@/components/email-list-real";
import { InboxOrganizer } from "@/components/inbox-organizer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const {
    data: gmailData,
    loading: gmailLoading,
    error: gmailError,
    needsReauth,
    refetch,
  } = useGmail(5);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const handleReauth = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        scopes:
          "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify",
      },
    });

    if (error) {
      console.error("Reauth error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">🧌</span>
            </div>
            <span className="text-xl font-bold text-foreground">
              InboxGremlin
            </span>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <Badge
              variant="secondary"
              className="bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950 dark:text-brand-300 dark:border-brand-800"
            >
              Welcome to your Dashboard
            </Badge>
            <h1 className="text-4xl font-bold text-foreground">
              Hello,{" "}
              {user?.user_metadata?.first_name ||
                user?.email?.split("@")[0] ||
                "there"}
              ! 👋
            </h1>
            <p className="text-muted-foreground text-lg">
              Your gremlin is ready to tame your inbox. Let's get started!
            </p>
          </div>

          {/* Gmail Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Emails
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">
                  {gmailLoading
                    ? "..."
                    : gmailData?.counts.total.toLocaleString() || "0"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  In your inbox
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Unread Emails
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-brand-600">
                  {gmailLoading
                    ? "..."
                    : gmailData?.counts.unread.toLocaleString() || "0"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {gmailData?.counts.total
                    ? `${Math.round(
                        (gmailData.counts.unread / gmailData.counts.total) * 100
                      )}% of total`
                    : "No data"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Gmail Connected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500 dark:text-green-400">
                  {gmailError ? "❌" : "✅"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {gmailError ? "Connection issue" : "Active connection"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Inbox Organizer */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">
                Inbox Organization
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Use AI-powered tools to clean and organize your inbox
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InboxOrganizer onRefresh={refetch} />
            </CardContent>
          </Card>

          {/* Recent Emails */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">
                    Recent Emails
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Your latest 5 emails from Gmail
                  </CardDescription>
                </div>
                <Button
                  onClick={refetch}
                  variant="outline"
                  size="sm"
                  disabled={gmailLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${gmailLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <EmailListReal
                emails={gmailData?.emails || []}
                loading={gmailLoading}
                error={gmailError}
                needsReauth={needsReauth}
                onRefresh={refetch}
                onReauth={handleReauth}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
