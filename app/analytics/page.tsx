"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Database, 
  Users, 
  Mail, 
  Archive, 
  Trash2,
  Target,
  Zap,
  RefreshCw,
  Calendar,
  PieChart,
  Activity
} from 'lucide-react';

// Chart components
import { AreaChartComponent } from '@/components/charts/area-chart';
import { BarChartComponent } from '@/components/charts/bar-chart';
import { PieChartComponent } from '@/components/charts/pie-chart';
import { LineChartComponent } from '@/components/charts/line-chart';

interface AnalyticsSummary {
  totalEmails: number;
  totalSize: string;
  spaceSaved: string;
  timeSaved: number;
  unsubscribeSuccessRate: number;
  automationEfficiency: number;
  topSenders: Array<{
    domain: string;
    sender_email: string;
    total_emails: number;
    total_size: number;
    emails_archived: number;
    emails_deleted: number;
  }>;
  categoryDistribution: Record<string, number>;
  weeklyTrend: Array<{ date: string; emails: number; cleanup: number }>;
  monthlyStats: Array<{
    recorded_at: string;
    total_emails: number;
    unread_emails: number;
    total_size: number;
  }>;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics?days=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const data = await response.json();
      setAnalytics(data.summary);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh_stats' }),
      });
      
      if (!response.ok) throw new Error('Failed to refresh stats');
      
      toast.success('Statistics refreshed successfully');
      await fetchAnalytics();
    } catch (error) {
      console.error('Error refreshing stats:', error);
      toast.error('Failed to refresh statistics');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-gray-600">Track your email management performance</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const categoryData = analytics ? Object.entries(analytics.categoryDistribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  })) : [];

  const weeklyTrendData = analytics?.weeklyTrend.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    emails: item.emails,
    cleanup: item.cleanup,
  })) || [];

  const monthlyEmailsData = analytics?.monthlyStats.map(stat => ({
    date: new Date(stat.recorded_at).toLocaleDateString('en-US', { month: 'short' }),
    total: stat.total_emails,
    unread: stat.unread_emails,
  })) || [];

  const topSendersChartData = analytics?.topSenders.slice(0, 10).map(sender => ({
    domain: sender.domain,
    emails: sender.total_emails,
    size: Math.round(sender.total_size / 1024 / 1024), // Convert to MB
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600">Track your email management performance</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={refreshStats} disabled={refreshing} variant="outline">
            {refreshing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      {analytics && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Emails</p>
                    <p className="text-3xl font-bold">{analytics.totalEmails.toLocaleString()}</p>
                  </div>
                  <Mail className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Storage Used</p>
                    <p className="text-3xl font-bold">{analytics.totalSize}</p>
                  </div>
                  <Database className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Space Saved</p>
                    <p className="text-3xl font-bold">{analytics.spaceSaved}</p>
                  </div>
                  <Archive className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Time Saved</p>
                    <p className="text-3xl font-bold">{analytics.timeSaved}m</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Efficiency Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Unsubscribe Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-2xl font-bold">{analytics.unsubscribeSuccessRate.toFixed(1)}%</span>
                    <Badge variant={analytics.unsubscribeSuccessRate >= 80 ? "default" : "secondary"}>
                      {analytics.unsubscribeSuccessRate >= 80 ? 'Excellent' : 'Good'}
                    </Badge>
                  </div>
                  <Progress value={analytics.unsubscribeSuccessRate} className="h-2" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Automation Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-2xl font-bold">{analytics.automationEfficiency.toFixed(1)}%</span>
                    <Badge variant={analytics.automationEfficiency >= 60 ? "default" : "secondary"}>
                      {analytics.automationEfficiency >= 60 ? 'High' : 'Medium'}
                    </Badge>
                  </div>
                  <Progress value={analytics.automationEfficiency} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="senders">Top Senders</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Activity</CardTitle>
                    <CardDescription>Email volume and cleanup operations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AreaChartComponent
                      data={weeklyTrendData}
                      xKey="date"
                      yKey="emails"
                      color="#3b82f6"
                      height={250}
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Email Categories</CardTitle>
                    <CardDescription>Distribution by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PieChartComponent
                      data={categoryData}
                      height={250}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Email Trends Over Time</CardTitle>
                  <CardDescription>Total and unread emails by month</CardDescription>
                </CardHeader>
                <CardContent>
                  <LineChartComponent
                    data={monthlyEmailsData}
                    xKey="date"
                    yKey="total"
                    color="#3b82f6"
                    height={300}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Cleanup Activity</CardTitle>
                  <CardDescription>Daily cleanup operations</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarChartComponent
                    data={weeklyTrendData}
                    xKey="date"
                    yKey="cleanup"
                    color="#10b981"
                    height={300}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Category Breakdown</CardTitle>
                    <CardDescription>Email distribution by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {categoryData.map((category, index) => {
                        const percentage = analytics.totalEmails > 0 
                          ? (category.value / analytics.totalEmails) * 100 
                          : 0;
                        
                        return (
                          <div key={category.name} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{category.name}</span>
                              <span className="text-sm text-gray-600">
                                {category.value.toLocaleString()} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Category Insights</CardTitle>
                    <CardDescription>Actionable insights per category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {categoryData.map((category) => (
                        <div key={category.name} className="p-3 border rounded-lg">
                          <h4 className="font-semibold">{category.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {category.name === 'Promotional' && 'Consider setting up unsubscribe rules'}
                            {category.name === 'Social' && 'Review notification settings'}
                            {category.name === 'Updates' && 'Archive old updates automatically'}
                            {category.name === 'Forums' && 'Use digest mode if available'}
                            {category.name === 'Other' && 'Review for categorization opportunities'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="senders" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Senders by Volume</CardTitle>
                    <CardDescription>Domains sending the most emails</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BarChartComponent
                      data={topSendersChartData}
                      xKey="domain"
                      yKey="emails"
                      color="#ef4444"
                      height={300}
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Sender Details</CardTitle>
                    <CardDescription>Top email senders</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {analytics.topSenders.map((sender, index) => (
                          <div key={sender.sender_email} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="text-sm font-medium">{index + 1}.</div>
                              <div>
                                <div className="font-medium">{sender.domain}</div>
                                <div className="text-sm text-gray-600 truncate max-w-[200px]">
                                  {sender.sender_email}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{sender.total_emails}</div>
                              <div className="text-sm text-gray-600">emails</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}