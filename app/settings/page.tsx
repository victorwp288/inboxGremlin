"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Save, Plus, Trash2, Shield, Zap } from "lucide-react"

export default function SettingsPage() {
  const [safeMode, setSafeMode] = useState(true)
  const [autoClean, setAutoClean] = useState(false)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Configure your InboxGremlin preferences and cleanup rules.</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="filters">Filter Presets</TabsTrigger>
          <TabsTrigger value="whitelist">Whitelist</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2 text-brand-600" />
                Safety Settings
              </CardTitle>
              <CardDescription>Configure how cautious your gremlin should be when cleaning.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Safe Mode</Label>
                  <p className="text-sm text-muted-foreground">Always require confirmation before deleting emails</p>
                </div>
                <Switch
                  checked={safeMode}
                  onCheckedChange={setSafeMode}
                  className="data-[state=checked]:bg-brand-600"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Auto-clean Mode</Label>
                  <p className="text-sm text-muted-foreground">Automatically apply saved filter presets daily</p>
                </div>
                <Switch
                  checked={autoClean}
                  onCheckedChange={setAutoClean}
                  className="data-[state=checked]:bg-brand-600"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gremlin Personality</CardTitle>
              <CardDescription>Customize how chatty and mischievous your gremlin is.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Commentary Level</Label>
                <div className="flex space-x-2">
                  <Badge variant="outline" className="border-brand-500 text-brand-600 cursor-pointer">
                    Silent
                  </Badge>
                  <Badge className="bg-brand-600 text-white cursor-pointer">Playful</Badge>
                  <Badge variant="outline" className="border-muted-foreground text-muted-foreground cursor-pointer">
                    Chatty
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filters" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Saved Filter Presets</CardTitle>
                  <CardDescription>Create reusable filters for common cleanup tasks.</CardDescription>
                </div>
                <Button className="bg-brand-600 hover:bg-brand-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Preset
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg border">
                  <div>
                    <h4 className="font-medium">Old Promotions</h4>
                    <p className="text-sm text-muted-foreground">Promotional emails older than 3 months</p>
                    <Badge
                      variant="secondary"
                      className="mt-2 bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                    >
                      2,847 matches
                    </Badge>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg border">
                  <div>
                    <h4 className="font-medium">Newsletter Cleanup</h4>
                    <p className="text-sm text-muted-foreground">Unread newsletters older than 1 month</p>
                    <Badge
                      variant="secondary"
                      className="mt-2 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                    >
                      456 matches
                    </Badge>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whitelist" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Protected Domains</CardTitle>
              <CardDescription>Emails from these domains will never be automatically deleted.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Add Domain</Label>
                <div className="flex space-x-2">
                  <Input placeholder="example.com" />
                  <Button className="bg-brand-600 hover:bg-brand-700">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Protected Domains</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className="bg-brand-100 text-brand-700 border-brand-200 dark:bg-brand-900/20 dark:text-brand-300 dark:border-brand-800"
                  >
                    work.com
                    <button className="ml-2 hover:text-red-500">×</button>
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-brand-100 text-brand-700 border-brand-200 dark:bg-brand-900/20 dark:text-brand-300 dark:border-brand-800"
                  >
                    bank.com
                    <button className="ml-2 hover:text-red-500">×</button>
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-brand-100 text-brand-700 border-brand-200 dark:bg-brand-900/20 dark:text-brand-300 dark:border-brand-800"
                  >
                    important-service.com
                    <button className="ml-2 hover:text-red-500">×</button>
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2 text-brand-600" />
                Advanced Settings
              </CardTitle>
              <CardDescription>Power user options for fine-tuning your gremlin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Custom Gmail Query</Label>
                <Textarea
                  placeholder="is:unread older_than:30d category:promotions"
                  className="font-mono text-sm"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Use Gmail search syntax for advanced filtering</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Batch Size</Label>
                <Input type="number" defaultValue="100" />
                <p className="text-xs text-muted-foreground">Number of emails to process at once (1-1000)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-6">
        <Button className="bg-brand-600 hover:bg-brand-700">
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  )
}
