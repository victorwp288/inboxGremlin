"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Download, 
  Upload, 
  RotateCcw,
  Shield,
  Bell,
  Zap,
  Palette,
  Archive,
  Trash2,
  Clock,
  Tag,
  Plus,
  Edit,
  X
} from 'lucide-react';

import { UserPreferences, CleanupStrategy, CustomCategory, NotificationSettings, AutomationSettings, DEFAULT_PREFERENCES } from '@/lib/user-preferences';

export default function PreferencesPage() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('cleanup');
  const [newCategory, setNewCategory] = useState<Partial<CustomCategory>>({});
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/preferences');
      if (!response.ok) throw new Error('Failed to fetch preferences');
      
      const data = await response.json();
      setPreferences(data.preferences);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (section?: string, data?: any) => {
    if (!preferences) return;

    setSaving(true);
    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          section,
          data: data || preferences,
        }),
      });

      if (!response.ok) throw new Error('Failed to save preferences');
      
      const result = await response.json();
      setPreferences(result.preferences);
      toast.success('Preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Preferences</h1>
            <p className="text-gray-600">Customize your email management experience</p>
          </div>
        </div>
        
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          <div className="h-64 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load preferences</h3>
          <p className="text-gray-600 mb-4">There was an error loading your preferences.</p>
          <Button onClick={fetchPreferences}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Preferences</h1>
          <p className="text-gray-600">Customize your email management experience</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={() => savePreferences()} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Preferences Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="cleanup">Cleanup</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="interface">Interface</TabsTrigger>
        </TabsList>

        {/* Cleanup Strategy */}
        <TabsContent value="cleanup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Archive className="h-5 w-5 mr-2" />
                Cleanup Strategy
              </CardTitle>
              <CardDescription>Configure automatic email cleanup behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Auto-archive emails older than (days)</Label>
                  <div className="px-3">
                    <Slider
                      value={[preferences.cleanup_strategy.auto_archive_days || 90]}
                      max={365}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>1 day</span>
                      <span>{preferences.cleanup_strategy.auto_archive_days || 90} days</span>
                      <span>365 days</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Auto-delete emails older than (days)</Label>
                  <div className="px-3">
                    <Slider
                      value={[preferences.cleanup_strategy.auto_delete_days || 365]}
                      max={3650}
                      min={30}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>30 days</span>
                      <span>{preferences.cleanup_strategy.auto_delete_days || 365} days</span>
                      <span>10 years</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Preserve starred emails</Label>
                    <p className="text-sm text-gray-600">Never automatically archive or delete starred emails</p>
                  </div>
                  <Switch
                    checked={preferences.cleanup_strategy.preserve_starred}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Categories */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Tag className="h-5 w-5 mr-2" />
                Custom Categories
              </CardTitle>
              <CardDescription>Create custom email categories with rules and actions</CardDescription>
            </CardHeader>
            <CardContent>
              {preferences.custom_categories && preferences.custom_categories.length > 0 ? (
                <div className="space-y-3">
                  {preferences.custom_categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <div>
                          <div className="font-medium">{category.name}</div>
                          <div className="text-sm text-gray-600">{category.description}</div>
                        </div>
                        {!category.enabled && (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No custom categories</h3>
                  <p className="text-gray-600 mb-4">Create custom categories to better organize your emails</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Settings
              </CardTitle>
              <CardDescription>Configure when and how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Cleanup summary notifications</Label>
                    <p className="text-sm text-gray-600">Get notified when cleanup operations complete</p>
                  </div>
                  <Switch
                    checked={preferences.notification_settings.cleanup_summary}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Rule execution results</Label>
                    <p className="text-sm text-gray-600">Get notified when automated rules run</p>
                  </div>
                  <Switch
                    checked={preferences.notification_settings.rule_execution_results}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly analytics</Label>
                    <p className="text-sm text-gray-600">Receive weekly summary of your email management</p>
                  </div>
                  <Switch
                    checked={preferences.notification_settings.weekly_analytics}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Email frequency</Label>
                  <Select
                    value={preferences.notification_settings.email_frequency || 'daily'}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="daily">Daily digest</SelectItem>
                      <SelectItem value="weekly">Weekly digest</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Settings */}
        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Automation Settings
              </CardTitle>
              <CardDescription>Configure automatic email management features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Smart categorization</Label>
                    <p className="text-sm text-gray-600">Automatically categorize emails using AI</p>
                  </div>
                  <Switch
                    checked={preferences.automation_settings.enable_smart_categorization}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-unsubscribe</Label>
                    <p className="text-sm text-gray-600">Automatically unsubscribe from detected newsletters</p>
                  </div>
                  <Switch
                    checked={preferences.automation_settings.enable_auto_unsubscribe}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Scheduled cleanup</Label>
                    <p className="text-sm text-gray-600">Run cleanup operations on a schedule</p>
                  </div>
                  <Switch
                    checked={preferences.automation_settings.enable_scheduled_cleanup}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Safety Settings
                </h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Safe mode</Label>
                    <p className="text-sm text-gray-600">Require confirmation for destructive operations</p>
                  </div>
                  <Switch
                    checked={preferences.automation_settings.safe_mode}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interface Preferences */}
        <TabsContent value="interface" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="h-5 w-5 mr-2" />
                Interface Preferences
              </CardTitle>
              <CardDescription>Customize the look and feel of the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select
                    value={preferences.ui_preferences.theme || 'system'}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Default view</Label>
                  <Select
                    value={preferences.ui_preferences.default_view || 'inbox'}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inbox">Inbox</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                      <SelectItem value="rules">Rules</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Compact view</Label>
                    <p className="text-sm text-gray-600">Use a more compact layout with smaller spacing</p>
                  </div>
                  <Switch
                    checked={preferences.ui_preferences.compact_view}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show previews</Label>
                    <p className="text-sm text-gray-600">Show email content previews in lists</p>
                  </div>
                  <Switch
                    checked={preferences.ui_preferences.show_previews}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}