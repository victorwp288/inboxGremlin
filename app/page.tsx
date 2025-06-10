import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Github,
  Mail,
  Shield,
  Zap,
  Trash2,
  Filter,
  BarChart3,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { HeaderAuth } from "@/components/header-auth";

export default function LandingPage() {
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
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Link
              href="https://github.com/yourusername/inbox-gremlin"
              target="_blank"
            >
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </Button>
            </Link>
            <HeaderAuth />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge
            variant="secondary"
            className="mb-6 bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950 dark:text-brand-300 dark:border-brand-800"
          >
            Open Source • Privacy First
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
            Your inbox, <span className="text-brand-600">tamed.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Open-source Gmail cleaner with zero data creep. Let our gremlin
            chomp through your email clutter while you stay in control.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button
              size="lg"
              className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 text-lg"
            >
              <Mail className="w-5 h-5 mr-2" />
              Connect Gmail Account
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-border text-muted-foreground hover:bg-accent px-8 py-3 text-lg"
            >
              View Demo
            </Button>
          </div>

          {/* Demo Image Placeholder */}
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-card rounded-lg border border-border p-6 shadow-2xl">
              <div className="bg-muted rounded-md h-64 md:h-96 flex items-center justify-center border border-border">
                <div className="text-center">
                  <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-brand-600" />
                  </div>
                  <p className="text-muted-foreground">Dashboard Preview</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Clean interface • Bulk actions • Smart filtering
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Features that bite back at email chaos
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Our gremlin is hungry for your unwanted emails. Here's what it can
            devour.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="bg-card border-border hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900 rounded-lg flex items-center justify-center mb-4">
                <Filter className="w-6 h-6 text-brand-600" />
              </div>
              <CardTitle className="text-foreground">Smart Filtering</CardTitle>
              <CardDescription className="text-muted-foreground">
                Filter by age, sender, labels, or create custom queries to find
                exactly what needs cleaning.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card border-border hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900 rounded-lg flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-brand-600" />
              </div>
              <CardTitle className="text-foreground">Bulk Actions</CardTitle>
              <CardDescription className="text-muted-foreground">
                Delete, archive, label, or mark thousands of emails as read with
                a single click. Undo anytime.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card border-border hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-brand-600" />
              </div>
              <CardTitle className="text-foreground">Privacy First</CardTitle>
              <CardDescription className="text-muted-foreground">
                Your emails never leave your browser. We only store cleanup
                preferences and activity logs.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card border-border hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-brand-600" />
              </div>
              <CardTitle className="text-foreground">Dry Run Mode</CardTitle>
              <CardDescription className="text-muted-foreground">
                Preview exactly what will happen before executing any actions.
                No surprises, no regrets.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card border-border hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-brand-600" />
              </div>
              <CardTitle className="text-foreground">
                Activity Tracking
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Keep track of your cleanup sessions and see how much storage
                you've reclaimed over time.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card border-border hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900 rounded-lg flex items-center justify-center mb-4">
                <Github className="w-6 h-6 text-brand-600" />
              </div>
              <CardTitle className="text-foreground">Open Source</CardTitle>
              <CardDescription className="text-muted-foreground">
                Fully transparent, community-driven, and free forever.
                Contribute or fork on GitHub.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-950 dark:to-purple-950 rounded-2xl border border-brand-200 dark:border-brand-800 p-12 text-center max-w-4xl mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to unleash the gremlin?
          </h3>
          <p className="text-foreground/80 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            Connect your Gmail account and let our gremlin devour your email
            clutter. Clean, organized, and clutter-free in minutes.
          </p>
          <Button
            size="lg"
            className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 text-lg"
          >
            <Mail className="w-5 h-5 mr-2" />
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-brand-600 rounded flex items-center justify-center">
                <span className="text-white text-xs">🧌</span>
              </div>
              <span className="text-muted-foreground">InboxGremlin</span>
            </div>
            <div className="flex items-center space-x-6">
              <Link
                href="https://github.com/yourusername/inbox-gremlin"
                className="text-muted-foreground hover:text-brand-600 transition-colors"
              >
                <Github className="w-5 h-5" />
              </Link>
              <span className="text-muted-foreground text-sm">
                Made with 💜 for email sanity
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
