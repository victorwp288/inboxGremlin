export interface SearchCondition {
  id: string;
  field: 'from' | 'to' | 'subject' | 'content' | 'label' | 'date' | 'size' | 'attachment' | 'read_status';
  operator: 'contains' | 'not_contains' | 'equals' | 'not_equals' | 'before' | 'after' | 'between' | 'greater_than' | 'less_than' | 'has' | 'not_has';
  value: string | number | Date | [Date, Date] | boolean;
  connector?: 'AND' | 'OR';
}

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  conditions: SearchCondition[];
  query: string;
  created_at: string;
  last_used?: string;
  use_count: number;
}

export class SearchBuilder {
  private conditions: SearchCondition[] = [];

  static readonly FIELD_OPTIONS = [
    { value: 'from', label: 'From', type: 'text' },
    { value: 'to', label: 'To', type: 'text' },
    { value: 'subject', label: 'Subject', type: 'text' },
    { value: 'content', label: 'Content', type: 'text' },
    { value: 'label', label: 'Label', type: 'select' },
    { value: 'date', label: 'Date', type: 'date' },
    { value: 'size', label: 'Size', type: 'number' },
    { value: 'attachment', label: 'Attachment', type: 'boolean' },
    { value: 'read_status', label: 'Read Status', type: 'boolean' },
  ];

  static readonly OPERATOR_OPTIONS = {
    text: [
      { value: 'contains', label: 'contains' },
      { value: 'not_contains', label: 'does not contain' },
      { value: 'equals', label: 'equals' },
      { value: 'not_equals', label: 'does not equal' },
    ],
    select: [
      { value: 'has', label: 'has label' },
      { value: 'not_has', label: 'does not have label' },
    ],
    date: [
      { value: 'before', label: 'before' },
      { value: 'after', label: 'after' },
      { value: 'between', label: 'between' },
    ],
    number: [
      { value: 'greater_than', label: 'greater than' },
      { value: 'less_than', label: 'less than' },
      { value: 'equals', label: 'equals' },
    ],
    boolean: [
      { value: 'equals', label: 'is' },
    ],
  };

  constructor(conditions: SearchCondition[] = []) {
    this.conditions = conditions;
  }

  addCondition(condition: Omit<SearchCondition, 'id'>): SearchBuilder {
    const newCondition: SearchCondition = {
      ...condition,
      id: this.generateId(),
    };
    this.conditions.push(newCondition);
    return this;
  }

  removeCondition(id: string): SearchBuilder {
    this.conditions = this.conditions.filter(c => c.id !== id);
    return this;
  }

  updateCondition(id: string, updates: Partial<SearchCondition>): SearchBuilder {
    this.conditions = this.conditions.map(c => 
      c.id === id ? { ...c, ...updates } : c
    );
    return this;
  }

  getConditions(): SearchCondition[] {
    return [...this.conditions];
  }

  clear(): SearchBuilder {
    this.conditions = [];
    return this;
  }

  /**
   * Build Gmail search query from conditions
   */
  buildQuery(): string {
    if (this.conditions.length === 0) return '';

    const queryParts: string[] = [];
    
    for (let i = 0; i < this.conditions.length; i++) {
      const condition = this.conditions[i];
      const queryPart = this.conditionToQuery(condition);
      
      if (queryPart) {
        if (i > 0 && condition.connector === 'OR') {
          queryParts.push('OR');
        }
        queryParts.push(queryPart);
      }
    }

    return queryParts.join(' ');
  }

  /**
   * Parse Gmail query back to conditions (basic implementation)
   */
  static parseQuery(query: string): SearchCondition[] {
    // This is a simplified parser - Gmail queries can be complex
    const conditions: SearchCondition[] = [];
    const terms = query.split(/\s+/);
    
    for (const term of terms) {
      if (term === 'OR' || term === 'AND') continue;
      
      if (term.includes(':')) {
        const [field, value] = term.split(':', 2);
        const condition = this.parseQueryTerm(field, value);
        if (condition) {
          conditions.push({
            ...condition,
            id: Math.random().toString(36).substr(2, 9),
          });
        }
      } else {
        // Plain text search
        conditions.push({
          id: Math.random().toString(36).substr(2, 9),
          field: 'content',
          operator: 'contains',
          value: term.replace(/['"]/g, ''),
        });
      }
    }
    
    return conditions;
  }

  private static parseQueryTerm(field: string, value: string): Omit<SearchCondition, 'id'> | null {
    const cleanValue = value.replace(/['"()]/g, '');
    
    switch (field) {
      case 'from':
        return { field: 'from', operator: 'contains', value: cleanValue };
      case 'to':
        return { field: 'to', operator: 'contains', value: cleanValue };
      case 'subject':
        return { field: 'subject', operator: 'contains', value: cleanValue };
      case 'label':
        return { field: 'label', operator: 'has', value: cleanValue };
      case 'has':
        if (cleanValue === 'attachment') {
          return { field: 'attachment', operator: 'equals', value: true };
        }
        break;
      case 'is':
        if (cleanValue === 'unread') {
          return { field: 'read_status', operator: 'equals', value: false };
        } else if (cleanValue === 'read') {
          return { field: 'read_status', operator: 'equals', value: true };
        }
        break;
      case 'older_than':
        return { field: 'date', operator: 'before', value: this.parseRelativeDate(cleanValue) };
      case 'newer_than':
        return { field: 'date', operator: 'after', value: this.parseRelativeDate(cleanValue) };
      case 'larger':
        return { field: 'size', operator: 'greater_than', value: this.parseSize(cleanValue) };
      case 'smaller':
        return { field: 'size', operator: 'less_than', value: this.parseSize(cleanValue) };
    }
    
    return null;
  }

  private static parseRelativeDate(value: string): Date {
    const match = value.match(/(\d+)([dwmy])/);
    if (!match) return new Date();
    
    const amount = parseInt(match[1]);
    const unit = match[2];
    const date = new Date();
    
    switch (unit) {
      case 'd':
        date.setDate(date.getDate() - amount);
        break;
      case 'w':
        date.setDate(date.getDate() - (amount * 7));
        break;
      case 'm':
        date.setMonth(date.getMonth() - amount);
        break;
      case 'y':
        date.setFullYear(date.getFullYear() - amount);
        break;
    }
    
    return date;
  }

  private static parseSize(value: string): number {
    const match = value.match(/(\d+)([kmg]?b?)/i);
    if (!match) return 0;
    
    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
      case 'k':
      case 'kb':
        return amount * 1024;
      case 'm':
      case 'mb':
        return amount * 1024 * 1024;
      case 'g':
      case 'gb':
        return amount * 1024 * 1024 * 1024;
      default:
        return amount;
    }
  }

  private conditionToQuery(condition: SearchCondition): string {
    const { field, operator, value } = condition;

    switch (field) {
      case 'from':
        return this.buildTextQuery('from', operator, value as string);
      case 'to':
        return this.buildTextQuery('to', operator, value as string);
      case 'subject':
        return this.buildTextQuery('subject', operator, value as string);
      case 'content':
        return this.buildContentQuery(operator, value as string);
      case 'label':
        return this.buildLabelQuery(operator, value as string);
      case 'date':
        return this.buildDateQuery(operator, value);
      case 'size':
        return this.buildSizeQuery(operator, value as number);
      case 'attachment':
        return this.buildAttachmentQuery(value as boolean);
      case 'read_status':
        return this.buildReadStatusQuery(value as boolean);
      default:
        return '';
    }
  }

  private buildTextQuery(field: string, operator: string, value: string): string {
    const escapedValue = this.escapeValue(value);
    
    switch (operator) {
      case 'contains':
        return `${field}:${escapedValue}`;
      case 'not_contains':
        return `-${field}:${escapedValue}`;
      case 'equals':
        return `${field}:"${value}"`;
      case 'not_equals':
        return `-${field}:"${value}"`;
      default:
        return `${field}:${escapedValue}`;
    }
  }

  private buildContentQuery(operator: string, value: string): string {
    const escapedValue = this.escapeValue(value);
    
    switch (operator) {
      case 'contains':
        return escapedValue;
      case 'not_contains':
        return `-${escapedValue}`;
      case 'equals':
        return `"${value}"`;
      case 'not_equals':
        return `-"${value}"`;
      default:
        return escapedValue;
    }
  }

  private buildLabelQuery(operator: string, value: string): string {
    switch (operator) {
      case 'has':
        return `label:${value}`;
      case 'not_has':
        return `-label:${value}`;
      default:
        return `label:${value}`;
    }
  }

  private buildDateQuery(operator: string, value: Date | [Date, Date]): string {
    if (Array.isArray(value)) {
      // Between dates
      const [start, end] = value;
      return `after:${this.formatDate(start)} before:${this.formatDate(end)}`;
    }
    
    const date = value as Date;
    const formattedDate = this.formatDate(date);
    
    switch (operator) {
      case 'before':
        return `before:${formattedDate}`;
      case 'after':
        return `after:${formattedDate}`;
      default:
        return `after:${formattedDate}`;
    }
  }

  private buildSizeQuery(operator: string, value: number): string {
    const sizeStr = this.formatSize(value);
    
    switch (operator) {
      case 'greater_than':
        return `larger:${sizeStr}`;
      case 'less_than':
        return `smaller:${sizeStr}`;
      case 'equals':
        return `size:${sizeStr}`;
      default:
        return `larger:${sizeStr}`;
    }
  }

  private buildAttachmentQuery(hasAttachment: boolean): string {
    return hasAttachment ? 'has:attachment' : '-has:attachment';
  }

  private buildReadStatusQuery(isRead: boolean): string {
    return isRead ? 'is:read' : 'is:unread';
  }

  private escapeValue(value: string): string {
    // Escape special characters and wrap in quotes if needed
    if (value.includes(' ') || /[(){}[\]]/.test(value)) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  private formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${Math.floor(bytes / (1024 * 1024 * 1024))}G`;
    } else if (bytes >= 1024 * 1024) {
      return `${Math.floor(bytes / (1024 * 1024))}M`;
    } else if (bytes >= 1024) {
      return `${Math.floor(bytes / 1024)}K`;
    }
    return `${bytes}`;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}