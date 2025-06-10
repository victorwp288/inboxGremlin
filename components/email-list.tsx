"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Mail, MailOpen, Star, Paperclip } from "lucide-react"

interface Email {
  id: string
  subject: string
  sender: string
  snippet: string
  date: string
  isRead: boolean
  isStarred: boolean
  hasAttachment: boolean
  category: string
  size: string
}

const mockEmails: Email[] = [
  {
    id: "1",
    subject: "50% Off Everything - Limited Time Offer!",
    sender: "deals@retailstore.com",
    snippet: "Don't miss out on our biggest sale of the year. Everything must go!",
    date: "2023-12-15",
    isRead: false,
    isStarred: false,
    hasAttachment: false,
    category: "Promotions",
    size: "12 KB",
  },
  {
    id: "2",
    subject: "Your Weekly Newsletter - Tech Updates",
    sender: "newsletter@techblog.com",
    snippet: "This week: AI breakthroughs, new frameworks, and industry insights...",
    date: "2023-12-14",
    isRead: true,
    isStarred: false,
    hasAttachment: false,
    category: "Updates",
    size: "45 KB",
  },
  {
    id: "3",
    subject: "Social Media Digest - 15 new notifications",
    sender: "notifications@social.com",
    snippet: "John liked your post, Sarah commented on your photo, and 13 more...",
    date: "2023-12-13",
    isRead: false,
    isStarred: false,
    hasAttachment: false,
    category: "Social",
    size: "8 KB",
  },
  {
    id: "4",
    subject: "Invoice #12345 - Payment Due",
    sender: "billing@service.com",
    snippet: "Your monthly subscription payment is due. Please review the attached invoice.",
    date: "2023-12-12",
    isRead: true,
    isStarred: true,
    hasAttachment: true,
    category: "Updates",
    size: "156 KB",
  },
  {
    id: "5",
    subject: "Flash Sale: 24 Hours Only!",
    sender: "sales@fashion.com",
    snippet: "Exclusive flash sale on designer items. Use code FLASH24 at checkout.",
    date: "2023-12-11",
    isRead: false,
    isStarred: false,
    hasAttachment: false,
    category: "Promotions",
    size: "23 KB",
  },
]

interface EmailListProps {
  selectedEmails: string[]
  onSelectionChange: (selected: string[]) => void
}

export function EmailList({ selectedEmails, onSelectionChange }: EmailListProps) {
  const [emails] = useState<Email[]>(mockEmails)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(emails.map((email) => email.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectEmail = (emailId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedEmails, emailId])
    } else {
      onSelectionChange(selectedEmails.filter((id) => id !== emailId))
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Promotions":
        return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
      case "Social":
        return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
      case "Updates":
        return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  return (
    <div className="space-y-2">
      {/* Select All Header */}
      <div className="flex items-center space-x-3 p-3 border-b">
        <Checkbox
          checked={selectedEmails.length === emails.length}
          onCheckedChange={handleSelectAll}
          className="data-[state=checked]:bg-brand-600 data-[state=checked]:border-brand-600"
        />
        <span className="text-sm text-muted-foreground">
          {selectedEmails.length > 0
            ? `${selectedEmails.length} of ${emails.length} selected`
            : `${emails.length} emails`}
        </span>
      </div>

      {/* Email List */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-1">
          {emails.map((email) => (
            <div
              key={email.id}
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                selectedEmails.includes(email.id)
                  ? "bg-brand-50 border-brand-200 dark:bg-brand-900/20 dark:border-brand-800"
                  : "bg-card border-border hover:bg-muted"
              }`}
              onClick={() => handleSelectEmail(email.id, !selectedEmails.includes(email.id))}
            >
              <Checkbox
                checked={selectedEmails.includes(email.id)}
                onCheckedChange={(checked) => handleSelectEmail(email.id, checked as boolean)}
                className="data-[state=checked]:bg-brand-600 data-[state=checked]:border-brand-600"
                onClick={(e) => e.stopPropagation()}
              />

              <div className="flex items-center space-x-2">
                {email.isRead ? (
                  <MailOpen className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Mail className="w-4 h-4 text-brand-600" />
                )}
                {email.isStarred && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                {email.hasAttachment && <Paperclip className="w-4 h-4 text-muted-foreground" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4
                    className={`text-sm font-medium truncate ${email.isRead ? "text-muted-foreground" : "text-foreground"}`}
                  >
                    {email.subject}
                  </h4>
                  <div className="flex items-center space-x-2 ml-2">
                    <Badge variant="secondary" className={`text-xs ${getCategoryColor(email.category)}`}>
                      {email.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{email.size}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground truncate">{email.sender}</p>
                  <span className="text-xs text-muted-foreground ml-2">{email.date}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-1">{email.snippet}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
