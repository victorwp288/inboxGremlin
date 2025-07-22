"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  X,
  Calendar as CalendarIcon,
  Code,
  Search,
  Save,
  Trash2,
} from "lucide-react";
import { SearchBuilder, SearchCondition } from "@/lib/search-builder";
import { format } from "date-fns";

interface QueryBuilderProps {
  onQueryChange: (query: string, conditions: SearchCondition[]) => void;
  initialQuery?: string;
  className?: string;
}

export function QueryBuilder({ onQueryChange, initialQuery = "", className }: QueryBuilderProps) {
  const [searchBuilder, setSearchBuilder] = useState(() => {
    if (initialQuery) {
      const conditions = SearchBuilder.parseQuery(initialQuery);
      return new SearchBuilder(conditions);
    }
    return new SearchBuilder();
  });
  
  const [showRawQuery, setShowRawQuery] = useState(false);
  const [rawQuery, setRawQuery] = useState(initialQuery);

  useEffect(() => {
    const conditions = searchBuilder.getConditions();
    const query = searchBuilder.buildQuery();
    setRawQuery(query);
    onQueryChange(query, conditions);
  }, [searchBuilder, onQueryChange]);

  const addCondition = () => {
    const newBuilder = new SearchBuilder(searchBuilder.getConditions());
    newBuilder.addCondition({
      field: 'from',
      operator: 'contains',
      value: '',
      connector: searchBuilder.getConditions().length > 0 ? 'AND' : undefined,
    });
    setSearchBuilder(newBuilder);
  };

  const removeCondition = (id: string) => {
    const newBuilder = new SearchBuilder(searchBuilder.getConditions());
    newBuilder.removeCondition(id);
    setSearchBuilder(newBuilder);
  };

  const updateCondition = (id: string, updates: Partial<SearchCondition>) => {
    const newBuilder = new SearchBuilder(searchBuilder.getConditions());
    newBuilder.updateCondition(id, updates);
    setSearchBuilder(newBuilder);
  };

  const clearAll = () => {
    const newBuilder = new SearchBuilder();
    setSearchBuilder(newBuilder);
  };

  const applyRawQuery = () => {
    const conditions = SearchBuilder.parseQuery(rawQuery);
    const newBuilder = new SearchBuilder(conditions);
    setSearchBuilder(newBuilder);
    onQueryChange(rawQuery, conditions);
  };

  const conditions = searchBuilder.getConditions();

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Query Builder
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRawQuery(!showRawQuery)}
              >
                <Code className="h-4 w-4 mr-1" />
                {showRawQuery ? 'Visual' : 'Raw Query'}
              </Button>
              {conditions.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showRawQuery ? (
            <div className="space-y-3">
              <Label htmlFor="raw-query">Gmail Search Query</Label>
              <div className="flex gap-2">
                <Input
                  id="raw-query"
                  value={rawQuery}
                  onChange={(e) => setRawQuery(e.target.value)}
                  placeholder="e.g., from:example.com has:attachment older_than:7d"
                  className="font-mono"
                />
                <Button onClick={applyRawQuery}>Apply</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a Gmail search query directly. See{" "}
                <a
                  href="https://support.google.com/mail/answer/7190?hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Gmail search operators
                </a>{" "}
                for syntax help.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {conditions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No search conditions yet</p>
                  <p className="text-sm">Click "Add Condition" to get started</p>
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="space-y-3">
                    {conditions.map((condition, index) => (
                      <ConditionRow
                        key={condition.id}
                        condition={condition}
                        showConnector={index > 0}
                        onUpdate={(updates) => updateCondition(condition.id, updates)}
                        onRemove={() => removeCondition(condition.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}

              <div className="flex justify-between items-center">
                <Button onClick={addCondition} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Condition
                </Button>
                
                {conditions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {searchBuilder.buildQuery() || 'Empty query'}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ConditionRowProps {
  condition: SearchCondition;
  showConnector: boolean;
  onUpdate: (updates: Partial<SearchCondition>) => void;
  onRemove: () => void;
}

function ConditionRow({ condition, showConnector, onUpdate, onRemove }: ConditionRowProps) {
  const fieldType = SearchBuilder.FIELD_OPTIONS.find(f => f.value === condition.field)?.type || 'text';
  const availableOperators = SearchBuilder.OPERATOR_OPTIONS[fieldType as keyof typeof SearchBuilder.OPERATOR_OPTIONS] || [];

  return (
    <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
      {showConnector && (
        <Select
          value={condition.connector || 'AND'}
          onValueChange={(value) => onUpdate({ connector: value as 'AND' | 'OR' })}
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">AND</SelectItem>
            <SelectItem value="OR">OR</SelectItem>
          </SelectContent>
        </Select>
      )}

      <Select
        value={condition.field}
        onValueChange={(value) => onUpdate({ 
          field: value as SearchCondition['field'],
          operator: SearchBuilder.OPERATOR_OPTIONS[
            SearchBuilder.FIELD_OPTIONS.find(f => f.value === value)?.type as keyof typeof SearchBuilder.OPERATOR_OPTIONS
          ]?.[0]?.value as SearchCondition['operator'],
          value: ''
        })}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SearchBuilder.FIELD_OPTIONS.map((field) => (
            <SelectItem key={field.value} value={field.value}>
              {field.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={condition.operator}
        onValueChange={(value) => onUpdate({ operator: value as SearchCondition['operator'] })}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableOperators.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ConditionValueInput
        condition={condition}
        onUpdate={onUpdate}
      />

      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface ConditionValueInputProps {
  condition: SearchCondition;
  onUpdate: (updates: Partial<SearchCondition>) => void;
}

function ConditionValueInput({ condition, onUpdate }: ConditionValueInputProps) {
  const fieldType = SearchBuilder.FIELD_OPTIONS.find(f => f.value === condition.field)?.type || 'text';

  switch (fieldType) {
    case 'text':
      return (
        <Input
          value={condition.value as string}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder="Enter text..."
          className="flex-1"
        />
      );

    case 'number':
      return (
        <div className="flex items-center gap-1 flex-1">
          <Input
            type="number"
            value={condition.value as number}
            onChange={(e) => onUpdate({ value: parseInt(e.target.value) || 0 })}
            placeholder="Size in bytes"
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground">bytes</span>
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center gap-2 flex-1">
          <Switch
            checked={condition.value as boolean}
            onCheckedChange={(checked) => onUpdate({ value: checked })}
          />
          <span className="text-sm">
            {condition.field === 'attachment' 
              ? (condition.value ? 'Has attachment' : 'No attachment')
              : (condition.value ? 'Read' : 'Unread')
            }
          </span>
        </div>
      );

    case 'date':
      if (condition.operator === 'between') {
        const dateRange = condition.value as [Date, Date] || [new Date(), new Date()];
        return (
          <div className="flex items-center gap-2 flex-1">
            <DatePicker
              date={dateRange[0]}
              onDateChange={(date) => onUpdate({ value: [date, dateRange[1]] })}
              placeholder="Start date"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <DatePicker
              date={dateRange[1]}
              onDateChange={(date) => onUpdate({ value: [dateRange[0], date] })}
              placeholder="End date"
            />
          </div>
        );
      } else {
        return (
          <DatePicker
            date={condition.value as Date}
            onDateChange={(date) => onUpdate({ value: date })}
            placeholder="Select date"
            className="flex-1"
          />
        );
      }

    case 'select':
      if (condition.field === 'label') {
        return (
          <Input
            value={condition.value as string}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder="Label name (e.g., INBOX, SENT)"
            className="flex-1"
          />
        );
      }
      return (
        <Input
          value={condition.value as string}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder="Enter value..."
          className="flex-1"
        />
      );

    default:
      return (
        <Input
          value={condition.value as string}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder="Enter value..."
          className="flex-1"
        />
      );
  }
}

interface DatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  placeholder?: string;
  className?: string;
}

function DatePicker({ date, onDateChange, placeholder = "Pick a date", className }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`justify-start text-left font-normal ${className}`}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(date) => date && onDateChange(date)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}