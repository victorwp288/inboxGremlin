"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  Filter,
  Save,
  Clock,
  Star,
  Trash2,
  Edit,
  Play,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { QueryBuilder } from "./query-builder";
import { SearchCondition, SavedSearch } from "@/lib/search-builder";
import { toast } from "sonner";

// Duplicate EmailData interface to avoid import issues
interface EmailData {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  isRead: boolean;
  labels: string[];
}

interface AdvancedSearchProps {
  onSearchResults: (emails: EmailData[], query: string) => void;
  onClose?: () => void;
  trigger?: React.ReactNode;
}

export function AdvancedSearch({ onSearchResults, onClose, trigger }: AdvancedSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");
  const [currentConditions, setCurrentConditions] = useState<SearchCondition[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [saveSearchDescription, setSaveSearchDescription] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadSavedSearches();
    }
  }, [isOpen]);

  const loadSavedSearches = async () => {
    try {
      const response = await fetch("/api/search/saved");
      if (response.ok) {
        const searches = await response.json();
        setSavedSearches(searches);
      }
    } catch (error) {
      console.error("Error loading saved searches:", error);
    }
  };

  const executeSearch = async (query: string = currentQuery) => {
    if (!query.trim()) {
      setError("Please enter a search query");
      return;
    }

    try {
      setSearching(true);
      setError(null);

      const response = await fetch("/api/emails/organize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getByQuery",
          query: query,
          maxResults: 100,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Search failed");
      }

      onSearchResults(result.emails || [], query);
      setIsOpen(false);
      onClose?.();

      // Update usage count for saved search if applicable
      const savedSearch = savedSearches.find(s => s.query === query);
      if (savedSearch) {
        updateSearchUsage(savedSearch.id);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const saveCurrentSearch = async () => {
    if (!saveSearchName.trim()) {
      toast.error("Please enter a name for the search");
      return;
    }

    if (!currentQuery.trim()) {
      toast.error("Please create a search query first");
      return;
    }

    try {
      const response = await fetch("/api/search/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveSearchName,
          description: saveSearchDescription,
          query: currentQuery,
          conditions: currentConditions,
        }),
      });

      if (response.ok) {
        toast.success("Search saved successfully");
        setShowSaveDialog(false);
        setSaveSearchName("");
        setSaveSearchDescription("");
        loadSavedSearches();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to save search");
      }
    } catch (error) {
      toast.error("Failed to save search");
    }
  };

  const deleteSavedSearch = async (id: string) => {
    try {
      const response = await fetch(`/api/search/saved/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Search deleted");
        loadSavedSearches();
      } else {
        toast.error("Failed to delete search");
      }
    } catch (error) {
      toast.error("Failed to delete search");
    }
  };

  const loadSavedSearch = (savedSearch: SavedSearch) => {
    setCurrentQuery(savedSearch.query);
    // Note: We would need to implement condition parsing to fully restore the visual builder
    toast.success(`Loaded search: ${savedSearch.name}`);
  };

  const updateSearchUsage = async (id: string) => {
    try {
      await fetch(`/api/search/saved/${id}/use`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Error updating search usage:", error);
    }
  };

  const handleQueryChange = (query: string, conditions: SearchCondition[]) => {
    setCurrentQuery(query);
    setCurrentConditions(conditions);
    setError(null);
  };

  const defaultTrigger = (
    <Button variant="outline" className="gap-2">
      <Filter className="h-4 w-4" />
      Advanced Search
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Email Search
          </DialogTitle>
          <DialogDescription>
            Build complex search queries to find specific emails in your inbox
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            {/* Query Builder */}
            <div className="lg:col-span-2">
              <QueryBuilder
                onQueryChange={handleQueryChange}
                initialQuery={currentQuery}
                className="h-full"
              />
            </div>

            {/* Saved Searches */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Saved Searches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {savedSearches.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No saved searches yet
                    </p>
                  ) : (
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {savedSearches.map((search) => (
                          <SavedSearchItem
                            key={search.id}
                            search={search}
                            onLoad={() => loadSavedSearch(search)}
                            onDelete={() => deleteSavedSearch(search.id)}
                            onExecute={() => executeSearch(search.query)}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Quick Searches</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => executeSearch("is:unread")}
                  >
                    Unread emails
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => executeSearch("has:attachment")}
                  >
                    With attachments
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => executeSearch("older_than:30d")}
                  >
                    Older than 30 days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => executeSearch("larger:10M")}
                  >
                    Large emails (>10MB)
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <div className="flex-1">
            {currentQuery && (
              <Badge variant="secondary" className="font-mono text-xs">
                {currentQuery}
              </Badge>
            )}
          </div>
          
          <Button
            variant="outline"
            onClick={() => setShowSaveDialog(true)}
            disabled={!currentQuery.trim()}
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          
          <Button
            onClick={() => executeSearch()}
            disabled={!currentQuery.trim() || searching}
            className="min-w-24"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Search className="h-4 w-4 mr-1" />
            )}
            {searching ? "Searching..." : "Search"}
          </Button>
        </DialogFooter>

        {/* Save Search Dialog */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Search</DialogTitle>
              <DialogDescription>
                Save this search query for quick access later
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="search-name">Name</Label>
                <Input
                  id="search-name"
                  value={saveSearchName}
                  onChange={(e) => setSaveSearchName(e.target.value)}
                  placeholder="e.g., Newsletter emails"
                />
              </div>
              <div>
                <Label htmlFor="search-description">Description (optional)</Label>
                <Input
                  id="search-description"
                  value={saveSearchDescription}
                  onChange={(e) => setSaveSearchDescription(e.target.value)}
                  placeholder="Brief description of what this search finds"
                />
              </div>
              <div>
                <Label>Query</Label>
                <div className="p-2 bg-muted rounded text-sm font-mono">
                  {currentQuery}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveCurrentSearch}>Save Search</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

interface SavedSearchItemProps {
  search: SavedSearch;
  onLoad: () => void;
  onDelete: () => void;
  onExecute: () => void;
}

function SavedSearchItem({ search, onLoad, onDelete, onExecute }: SavedSearchItemProps) {
  return (
    <div className="border rounded-lg p-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium truncate">{search.name}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onExecute}
            title="Execute search"
          >
            <Play className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onLoad}
            title="Load in builder"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            title="Delete search"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {search.description && (
        <p className="text-xs text-muted-foreground">{search.description}</p>
      )}
      
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono bg-muted px-1 rounded truncate flex-1">
          {search.query}
        </span>
        {search.use_count > 0 && (
          <Badge variant="outline" className="text-xs">
            {search.use_count}
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>
          {new Date(search.created_at).toLocaleDateString()}
        </span>
        {search.last_used && (
          <>
            <span>•</span>
            <span>Last used: {new Date(search.last_used).toLocaleDateString()}</span>
          </>
        )}
      </div>
    </div>
  );
}