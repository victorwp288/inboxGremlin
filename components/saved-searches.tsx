"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  Search,
  Clock,
  TrendingUp,
  Edit,
  Trash2,
  Play,
  Plus,
  BookOpen,
} from "lucide-react";
import { SavedSearch } from "@/lib/search-builder";
import { toast } from "sonner";

interface SavedSearchesProps {
  onExecuteSearch: (query: string) => void;
  onEditSearch: (search: SavedSearch) => void;
  trigger?: React.ReactNode;
}

export function SavedSearches({ onExecuteSearch, onEditSearch, trigger }: SavedSearchesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'usage'>('usage');

  useEffect(() => {
    if (isOpen) {
      loadSavedSearches();
    }
  }, [isOpen]);

  const loadSavedSearches = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/search/saved");
      if (response.ok) {
        const searches = await response.json();
        setSavedSearches(searches);
      } else {
        toast.error("Failed to load saved searches");
      }
    } catch (error) {
      toast.error("Failed to load saved searches");
    } finally {
      setLoading(false);
    }
  };

  const deleteSavedSearch = async (id: string) => {
    try {
      const response = await fetch(`/api/search/saved/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Search deleted");
        setSavedSearches(searches => searches.filter(s => s.id !== id));
      } else {
        toast.error("Failed to delete search");
      }
    } catch (error) {
      toast.error("Failed to delete search");
    }
  };

  const executeSearch = async (search: SavedSearch) => {
    onExecuteSearch(search.query);
    setIsOpen(false);

    // Update usage count
    try {
      await fetch(`/api/search/saved/${search.id}/use`, {
        method: "POST",
      });
      // Update local state
      setSavedSearches(searches => 
        searches.map(s => 
          s.id === search.id 
            ? { ...s, use_count: s.use_count + 1, last_used: new Date().toISOString() }
            : s
        )
      );
    } catch (error) {
      console.error("Error updating search usage:", error);
    }
  };

  const editSearch = (search: SavedSearch) => {
    onEditSearch(search);
    setIsOpen(false);
  };

  const sortedSearches = [...savedSearches].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'created':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'usage':
        return b.use_count - a.use_count;
      default:
        return 0;
    }
  });

  const defaultTrigger = (
    <Button variant="outline" className="gap-2">
      <BookOpen className="h-4 w-4" />
      Saved Searches
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Saved Searches
            <Badge variant="secondary" className="ml-auto">
              {savedSearches.length}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Manage your saved search queries and quick access frequently used searches
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Sort Options */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <div className="flex gap-1">
              {[
                { value: 'usage', label: 'Most Used', icon: TrendingUp },
                { value: 'created', label: 'Recent', icon: Clock },
                { value: 'name', label: 'Name', icon: Search },
              ].map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant={sortBy === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy(value as typeof sortBy)}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Searches List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading searches...</p>
              </div>
            </div>
          ) : savedSearches.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No saved searches</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create advanced searches and save them for quick access
              </p>
              <Button onClick={() => setIsOpen(false)}>
                <Plus className="h-4 w-4 mr-1" />
                Create Search
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {sortedSearches.map((search, index) => (
                  <div key={search.id}>
                    <SavedSearchCard
                      search={search}
                      onExecute={() => executeSearch(search)}
                      onEdit={() => editSearch(search)}
                      onDelete={() => deleteSavedSearch(search.id)}
                    />
                    {index < sortedSearches.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SavedSearchCardProps {
  search: SavedSearch;
  onExecute: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SavedSearchCard({ search, onExecute, onEdit, onDelete }: SavedSearchCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{search.name}</h4>
            {search.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {search.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onExecute}
              title="Execute search"
            >
              <Play className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
              title="Edit search"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              title="Delete search"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Query Preview */}
        <div className="mb-3">
          <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
            {search.query}
          </code>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                Created {new Date(search.created_at).toLocaleDateString()}
              </span>
            </div>
            {search.use_count > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>Used {search.use_count} times</span>
              </div>
            )}
          </div>
          
          {search.last_used && (
            <div className="flex items-center gap-1">
              <span>
                Last used {new Date(search.last_used).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {search.use_count > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <Badge variant={search.use_count > 10 ? "default" : "secondary"}>
                {search.use_count > 10 ? "Popular" : "Used"}
              </Badge>
              {search.last_used && 
                new Date(search.last_used).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 && (
                <Badge variant="outline">Recent</Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}