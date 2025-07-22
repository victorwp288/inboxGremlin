"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Play, Edit, Trash2, TestTube, Clock, CheckCircle, XCircle } from 'lucide-react';

interface RuleCondition {
  field: 'from' | 'to' | 'subject' | 'body' | 'has_attachment' | 'size' | 'age_days' | 'label' | 'is_unread';
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'has' | 'not_has';
  value: string | number | boolean;
  case_sensitive?: boolean;
}

interface RuleAction {
  type: 'archive' | 'delete' | 'label' | 'mark_read' | 'mark_unread' | 'forward' | 'star' | 'unstar';
  value?: string;
}

interface UserRule {
  id: string;
  user_id: string;
  name: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  is_active: boolean;
  schedule?: {
    enabled: boolean;
    frequency: 'hourly' | 'daily' | 'weekly';
    time?: string;
    days?: number[];
  };
  created_at: string;
  updated_at: string;
}

interface RuleExecution {
  id: string;
  rule_id: string;
  user_id: string;
  emails_processed: number;
  emails_matched: number;
  actions_performed: number;
  success: boolean;
  error_message?: string;
  execution_time_ms: number;
  executed_at: string;
}

export function RulesManager() {
  const [rules, setRules] = useState<UserRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<UserRule | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/rules');
      if (!response.ok) throw new Error('Failed to fetch rules');
      const data = await response.json();
      setRules(data.rules);
    } catch (error) {
      console.error('Error fetching rules:', error);
      toast.error('Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  const executeRule = async (rule: UserRule) => {
    try {
      const response = await fetch('/api/rules/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId: rule.id, maxEmails: 500 }),
      });

      if (!response.ok) throw new Error('Failed to execute rule');
      const data = await response.json();

      toast.success(
        `Rule executed successfully! ${data.summary.emailsMatched} emails matched, ${data.summary.actionsPerformed} actions performed.`
      );
      
      // Refresh rules to show updated stats
      fetchRules();
    } catch (error) {
      console.error('Error executing rule:', error);
      toast.error('Failed to execute rule');
    }
  };

  const testRule = async (conditions: RuleCondition[]) => {
    try {
      const response = await fetch('/api/rules/execute', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditions, maxEmails: 100 }),
      });

      if (!response.ok) throw new Error('Failed to test rule');
      const data = await response.json();
      setTestResults(data);
    } catch (error) {
      console.error('Error testing rule:', error);
      toast.error('Failed to test rule');
    }
  };

  const toggleRuleActive = async (rule: UserRule) => {
    try {
      const response = await fetch('/api/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: rule.id, 
          is_active: !rule.is_active 
        }),
      });

      if (!response.ok) throw new Error('Failed to update rule');
      
      setRules(rules.map(r => 
        r.id === rule.id ? { ...r, is_active: !r.is_active } : r
      ));
      
      toast.success(`Rule ${rule.is_active ? 'deactivated' : 'activated'}`);
    } catch (error) {
      console.error('Error updating rule:', error);
      toast.error('Failed to update rule');
    }
  };

  const deleteRule = async (rule: UserRule) => {
    try {
      const response = await fetch(`/api/rules?id=${rule.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete rule');
      
      setRules(rules.filter(r => r.id !== rule.id));
      toast.success('Rule deleted successfully');
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Rules</h2>
          <p className="text-gray-600">Automate your email management with custom rules</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Rule</DialogTitle>
              <DialogDescription>
                Set up conditions and actions for automatically processing emails
              </DialogDescription>
            </DialogHeader>
            <CreateRuleForm onSuccess={() => {
              setIsCreateDialogOpen(false);
              fetchRules();
            }} />
          </DialogContent>
        </Dialog>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">No rules created yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first rule to start automating your email management
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Rule
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <Card key={rule.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                    <Badge variant={rule.is_active ? "default" : "secondary"}>
                      {rule.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testRule(rule.conditions)}
                    >
                      <TestTube className="h-4 w-4 mr-1" />
                      Test
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => executeRule(rule)}
                      disabled={!rule.is_active}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Run
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRule(rule);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Rule</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{rule.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteRule(rule)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => toggleRuleActive(rule)}
                    />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Conditions</h4>
                    <div className="space-y-1">
                      {rule.conditions.map((condition, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          <Badge variant="outline" className="mr-2">
                            {condition.field}
                          </Badge>
                          {condition.operator} "{condition.value}"
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      {rule.actions.map((action, index) => (
                        <Badge key={index} variant="secondary">
                          {action.type}
                          {action.value && `: ${action.value}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {rule.schedule?.enabled && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Schedule
                      </h4>
                      <div className="text-sm text-gray-600">
                        Runs {rule.schedule.frequency}
                        {rule.schedule.time && ` at ${rule.schedule.time}`}
                        {rule.schedule.days && rule.schedule.days.length > 0 && 
                          ` on ${rule.schedule.days.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}`
                        }
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Rule</DialogTitle>
            <DialogDescription>
              Modify the conditions and actions for this rule
            </DialogDescription>
          </DialogHeader>
          {selectedRule && (
            <CreateRuleForm
              existingRule={selectedRule}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setSelectedRule(null);
                fetchRules();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Test Results Dialog */}
      {testResults && (
        <Dialog open={!!testResults} onOpenChange={() => setTestResults(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Rule Test Results</DialogTitle>
              <DialogDescription>
                Preview of emails that would be affected by this rule
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold">{testResults.totalEmails}</div>
                  <div className="text-sm text-gray-600">Total Emails</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{testResults.matchingEmails}</div>
                  <div className="text-sm text-gray-600">Matching Emails</div>
                </div>
              </div>
              
              {testResults.matchingEmailsPreview && testResults.matchingEmailsPreview.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Sample Matching Emails</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {testResults.matchingEmailsPreview.map((email: any) => (
                      <div key={email.id} className="p-3 border rounded-lg">
                        <div className="font-medium truncate">{email.subject}</div>
                        <div className="text-sm text-gray-600 truncate">{email.from}</div>
                        <div className="text-xs text-gray-500">{email.date}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Create/Edit Rule Form Component
function CreateRuleForm({ 
  existingRule, 
  onSuccess 
}: { 
  existingRule?: UserRule;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(existingRule?.name || '');
  const [conditions, setConditions] = useState<RuleCondition[]>(
    existingRule?.conditions || [{ field: 'from', operator: 'contains', value: '' }]
  );
  const [actions, setActions] = useState<RuleAction[]>(
    existingRule?.actions || [{ type: 'archive' }]
  );
  const [loading, setLoading] = useState(false);

  const addCondition = () => {
    setConditions([...conditions, { field: 'from', operator: 'contains', value: '' }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    setConditions(conditions.map((condition, i) => 
      i === index ? { ...condition, ...updates } : condition
    ));
  };

  const addAction = () => {
    setActions([...actions, { type: 'archive' }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, updates: Partial<RuleAction>) => {
    setActions(actions.map((action, i) => 
      i === index ? { ...action, ...updates } : action
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Rule name is required');
      return;
    }

    setLoading(true);
    try {
      const method = existingRule ? 'PUT' : 'POST';
      const body = existingRule 
        ? { id: existingRule.id, name, conditions, actions }
        : { name, conditions, actions };

      const response = await fetch('/api/rules', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to save rule');
      
      toast.success(`Rule ${existingRule ? 'updated' : 'created'} successfully`);
      onSuccess();
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('Failed to save rule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="name">Rule Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter rule name"
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Conditions</Label>
          <Button type="button" variant="outline" size="sm" onClick={addCondition}>
            <Plus className="h-4 w-4 mr-1" />
            Add Condition
          </Button>
        </div>
        
        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg">
              <Select
                value={condition.field}
                onValueChange={(value) => updateCondition(index, { field: value as any })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="from">From</SelectItem>
                  <SelectItem value="to">To</SelectItem>
                  <SelectItem value="subject">Subject</SelectItem>
                  <SelectItem value="body">Body</SelectItem>
                  <SelectItem value="has_attachment">Has Attachment</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                  <SelectItem value="age_days">Age (Days)</SelectItem>
                  <SelectItem value="is_unread">Is Unread</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={condition.operator}
                onValueChange={(value) => updateCondition(index, { operator: value as any })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="equals">Equals</SelectItem>
                  <SelectItem value="starts_with">Starts With</SelectItem>
                  <SelectItem value="ends_with">Ends With</SelectItem>
                  <SelectItem value="greater_than">Greater Than</SelectItem>
                  <SelectItem value="less_than">Less Than</SelectItem>
                </SelectContent>
              </Select>

              <Input
                value={condition.value?.toString() || ''}
                onChange={(e) => updateCondition(index, { value: e.target.value })}
                placeholder="Value"
                className="flex-1"
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeCondition(index)}
                disabled={conditions.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Actions</Label>
          <Button type="button" variant="outline" size="sm" onClick={addAction}>
            <Plus className="h-4 w-4 mr-1" />
            Add Action
          </Button>
        </div>
        
        <div className="space-y-3">
          {actions.map((action, index) => (
            <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg">
              <Select
                value={action.type}
                onValueChange={(value) => updateAction(index, { type: value as any })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="archive">Archive</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="label">Add Label</SelectItem>
                  <SelectItem value="mark_read">Mark as Read</SelectItem>
                  <SelectItem value="mark_unread">Mark as Unread</SelectItem>
                  <SelectItem value="star">Star</SelectItem>
                  <SelectItem value="unstar">Unstar</SelectItem>
                </SelectContent>
              </Select>

              {action.type === 'label' && (
                <Input
                  value={action.value || ''}
                  onChange={(e) => updateAction(index, { value: e.target.value })}
                  placeholder="Label name"
                  className="flex-1"
                />
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeAction(index)}
                disabled={actions.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : existingRule ? 'Update Rule' : 'Create Rule'}
        </Button>
      </div>
    </form>
  );
}