"use client"

import { Home, Settings, BarChart3, Filter } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Activity",
    url: "/activity",
    icon: BarChart3,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">🧌</span>
          </div>
          <span className="text-xl font-bold">InboxGremlin</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4">
        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className="text-foreground/70 hover:text-foreground hover:bg-accent data-[active=true]:bg-brand-600 data-[active=true]:text-white"
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-border" />

        {/* Inbox Stats */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider">
            Inbox Stats
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <Card>
              <CardContent className="p-3 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Unread</span>
                  <Badge
                    variant="secondary"
                    className="bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300"
                  >
                    1,203
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Top Sender</span>
                  <span className="text-sm">newsletters@</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Oldest</span>
                  <span className="text-sm text-orange-500 dark:text-orange-400">847 days</span>
                </div>
              </CardContent>
            </Card>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-border" />

        {/* Filters */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider flex items-center">
            <Filter className="w-3 h-3 mr-1" />
            Quick Filters
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Age</Label>
              <Select defaultValue="all">
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All emails</SelectItem>
                  <SelectItem value="1m">Older than 1 month</SelectItem>
                  <SelectItem value="3m">Older than 3 months</SelectItem>
                  <SelectItem value="6m">Older than 6 months</SelectItem>
                  <SelectItem value="1y">Older than 1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select defaultValue="all">
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="promotions">Promotions</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="updates">Updates</SelectItem>
                  <SelectItem value="forums">Forums</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select defaultValue="all">
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All emails</SelectItem>
                  <SelectItem value="unread">Unread only</SelectItem>
                  <SelectItem value="read">Read only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Custom Query</Label>
              <Input placeholder="from:newsletter" className="h-8 text-xs" />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Card className="bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-950 dark:to-brand-900 border-brand-200 dark:border-brand-800">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🧌</span>
              <div>
                <p className="text-xs text-brand-700 dark:text-brand-300 font-medium">Gremlin Status</p>
                <p className="text-xs text-muted-foreground">Ready to chomp!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </SidebarFooter>
    </Sidebar>
  )
}
