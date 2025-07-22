"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Search, Unlink, ExternalLink, Mail, TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw, Zap } from 'lucide-react';

interface UnsubscribeLink {
  type: 'link' | 'mailto' | 'list_unsubscribe';
  url: string;
  text?: string;
  method?: 'GET' | 'POST';
  isListUnsubscribe?: boolean;
}

interface UnsubscribeCandidate {
  emailId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  unsubscribeLinks: UnsubscribeLink[];
  confidence: 'high' | 'medium' | 'low';
  category: 'newsletter' | 'promotional' | 'transactional' | 'social' | 'other';
  domain: string;
}

interface UnsubscribeHistory {
  id: string;
  user_id: string;
  email_id: string;
  sender_domain: string;
  sender_email: string;
  unsubscribe_method: string;
  success: boolean;
  attempted_at: string;
  confirmed_at?: string;
  error_message?: string;
}

interface UnsubscribeStats {
  totalAttempts: number;
  successfulUnsubscribes: number;
  topDomains: Array<{ domain: string; count: number; successRate: number }>;
  recentActivity: UnsubscribeHistory[];
}

export function UnsubscribeManager() {
  const [candidates, setCandidates] = useState<UnsubscribeCandidate[]>([]);
  const [history, setHistory] = useState<UnsubscribeHistory[]>([]);
  const [stats, setStats] = useState<UnsubscribeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('discover');

  useEffect(() => {
    fetchHistory();
    fetchStats();
  }, []);

  const scanForOpportunities = async () => {
    setScanning(true);
    try {
      const response = await fetch('/api/unsubscribe?action=scan');
      if (!response.ok) throw new Error('Failed to scan for opportunities');
      
      const data = await response.json();
      setCandidates(data.candidates);
      
      toast.success(
        `Found ${data.totalFound} unsubscribe opportunities! ${data.scanSummary.highConfidence} high confidence.`
      );
    } catch (error) {
      console.error('Error scanning:', error);
      toast.error('Failed to scan for unsubscribe opportunities');
    } finally {
      setScanning(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/unsubscribe?action=history');
      if (!response.ok) throw new Error('Failed to fetch history');
      
      const data = await response.json();
      setHistory(data.history);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load unsubscribe history');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/unsubscribe?action=stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load statistics');
    }
  };

  const handleUnsubscribe = async (candidate: UnsubscribeCandidate, linkIndex = 0) => {
    const link = candidate.unsubscribeLinks[linkIndex];
    if (!link) return;

    setLoading(true);
    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unsubscribe',
          emailId: candidate.emailId,
          unsubscribeUrl: link.url,
          method: link.type,
        }),
      });

      if (!response.ok) throw new Error('Failed to process unsubscribe');
      
      const data = await response.json();
      
      if (data.requiresConfirmation) {
        // Open the unsubscribe link in a new tab
        window.open(link.url, '_blank');
        
        toast.success(
          'Unsubscribe link opened. Please complete the process in the new tab.',
          {
            action: {
              label: 'Mark as Confirmed',
              onClick: () => confirmUnsubscribe(data.historyId),
            },
          }
        );
      } else {
        toast.success('Unsubscribe processed successfully!');
      }
      
      // Refresh data
      fetchHistory();
      fetchStats();
    } catch (error) {
      console.error('Error processing unsubscribe:', error);
      toast.error('Failed to process unsubscribe');
    } finally {
      setLoading(false);
    }
  };

  const confirmUnsubscribe = async (historyId: string) => {
    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          historyId,
        }),
      });

      if (!response.ok) throw new Error('Failed to confirm unsubscribe');
      
      toast.success('Unsubscribe confirmed!');
      fetchHistory();
      fetchStats();
    } catch (error) {
      console.error('Error confirming unsubscribe:', error);
      toast.error('Failed to confirm unsubscribe');
    }
  };

  const handleBulkUnsubscribe = async () => {
    if (selectedCandidates.size === 0) {
      toast.error('Please select candidates to unsubscribe');
      return;
    }

    const selectedCandidatesList = candidates.filter(c => selectedCandidates.has(c.emailId));
    
    setLoading(true);
    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_unsubscribe',
          candidates: selectedCandidatesList,
        }),
      });

      if (!response.ok) throw new Error('Failed to process bulk unsubscribe');
      
      const data = await response.json();
      
      toast.success(
        `Bulk unsubscribe completed! ${data.summary.successful}/${data.summary.total} processed successfully.`
      );
      
      setSelectedCandidates(new Set());
      fetchHistory();
      fetchStats();
    } catch (error) {
      console.error('Error processing bulk unsubscribe:', error);
      toast.error('Failed to process bulk unsubscribe');
    } finally {
      setLoading(false);
    }
  };

  const toggleCandidateSelection = (emailId: string) => {
    const newSelection = new Set(selectedCandidates);
    if (newSelection.has(emailId)) {
      newSelection.delete(emailId);
    } else {
      newSelection.add(emailId);
    }
    setSelectedCandidates(newSelection);
  };

  const selectAllCandidates = () => {
    if (selectedCandidates.size === candidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(candidates.map(c => c.emailId)));
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'newsletter': return <Mail className="h-4 w-4" />;
      case 'promotional': return <TrendingUp className="h-4 w-4" />;
      case 'social': return <ExternalLink className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Unsubscribe Management</h2>
          <p className="text-gray-600">Find and safely unsubscribe from unwanted emails</p>
        </div>
        
        <Button onClick={scanForOpportunities} disabled={scanning}>
          {scanning ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Scan for Opportunities
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="space-y-4">
          {candidates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No opportunities found yet</h3>
                  <p className="text-gray-600 mb-4">
                    Click "Scan for Opportunities" to find emails you can unsubscribe from
                  </p>
                  <Button onClick={scanForOpportunities} disabled={scanning}>
                    {scanning ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Start Scanning
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllCandidates}
                  >
                    {selectedCandidates.size === candidates.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  {selectedCandidates.size > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedCandidates.size} selected
                    </span>
                  )}
                </div>
                
                {selectedCandidates.size > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={loading}>
                        <Zap className="h-4 w-4 mr-2" />
                        Bulk Unsubscribe ({selectedCandidates.size})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Bulk Unsubscribe</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to unsubscribe from {selectedCandidates.size} selected emails? 
                          This will open multiple unsubscribe links that you'll need to confirm manually.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkUnsubscribe}>
                          Proceed with Bulk Unsubscribe
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              <div className="space-y-4">
                {candidates.map((candidate) => (
                  <Card key={candidate.emailId} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedCandidates.has(candidate.emailId)}
                            onChange={() => toggleCandidateSelection(candidate.emailId)}
                            className="rounded"
                          />
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(candidate.category)}
                            <CardTitle className="text-lg truncate">{candidate.subject}</CardTitle>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge className={getConfidenceColor(candidate.confidence)}>
                            {candidate.confidence} confidence
                          </Badge>
                          <Badge variant="outline">
                            {candidate.category}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <div>From: {candidate.from}</div>
                        <div>Domain: {candidate.domain}</div>
                        <div>Date: {candidate.date}</div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-700 mb-3">{candidate.snippet}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">Unsubscribe Options ({candidate.unsubscribeLinks.length})</h4>
                          <div className="space-y-2">
                            {candidate.unsubscribeLinks.map((link, index) => (
                              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center space-x-3">
                                  {link.type === 'mailto' ? (
                                    <Mail className="h-4 w-4 text-blue-600" />
                                  ) : (
                                    <ExternalLink className="h-4 w-4 text-green-600" />
                                  )}
                                  <div>
                                    <div className="text-sm font-medium">
                                      {link.text || link.type.toUpperCase()}
                                      {link.isListUnsubscribe && (
                                        <Badge variant="secondary" className="ml-2">
                                          List-Unsubscribe
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate max-w-md">
                                      {link.url}
                                    </div>
                                  </div>
                                </div>
                                
                                <Button
                                  size="sm"
                                  onClick={() => handleUnsubscribe(candidate, index)}
                                  disabled={loading}
                                >
                                  <Unlink className="h-4 w-4 mr-1" />
                                  Unsubscribe
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Unsubscribe History</CardTitle>
              <CardDescription>Track your unsubscribe attempts and their outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No unsubscribe history yet</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {history.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {record.success ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <div>
                            <div className="font-medium">{record.sender_domain}</div>
                            <div className="text-sm text-gray-600">{record.sender_email}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(record.attempted_at).toLocaleDateString()} via {record.unsubscribe_method}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Badge variant={record.success ? "default" : "destructive"}>
                            {record.success ? 'Success' : 'Failed'}
                          </Badge>
                          {record.error_message && (
                            <div className="text-xs text-red-600 mt-1">
                              {record.error_message}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {stats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <div className="text-3xl font-bold text-blue-600">{stats.totalAttempts}</div>
                    <div className="text-sm text-gray-600">Total Attempts</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <div className="text-3xl font-bold text-green-600">{stats.successfulUnsubscribes}</div>
                    <div className="text-sm text-gray-600">Successful</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <div className="text-3xl font-bold text-purple-600">
                      {stats.totalAttempts > 0 ? Math.round((stats.successfulUnsubscribes / stats.totalAttempts) * 100) : 0}%
                    </div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Top Domains</CardTitle>
                  <CardDescription>Domains you've unsubscribed from most</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.topDomains.length === 0 ? (
                    <p className="text-center text-gray-600 py-4">No domain data available</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.topDomains.map((domain, index) => (
                        <div key={domain.domain} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="text-sm font-medium">{index + 1}.</div>
                            <div>
                              <div className="font-medium">{domain.domain}</div>
                              <div className="text-sm text-gray-600">
                                {domain.count} attempts • {Math.round(domain.successRate)}% success rate
                              </div>
                            </div>
                          </div>
                          <Progress value={domain.successRate} className="w-20" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Loading analytics...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}