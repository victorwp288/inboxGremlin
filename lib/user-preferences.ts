import { createClient } from '@/lib/supabase/server';

export interface CleanupStrategy {
  auto_archive_days?: number;
  auto_delete_days?: number;
  keep_important_labels?: string[];
  preserve_starred?: boolean;
  preserve_recent_days?: number;
  bulk_operation_limit?: number;
  confirmation_threshold?: number;
}

export interface CustomCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  rules: Array<{
    field: string;
    operator: string;
    value: string;
  }>;
  actions: Array<{
    type: string;
    value: string;
  }>;
  enabled: boolean;
}

export interface NotificationSettings {
  cleanup_summary?: boolean;
  rule_execution_results?: boolean;
  unsubscribe_confirmations?: boolean;
  weekly_analytics?: boolean;
  storage_warnings?: boolean;
  email_frequency?: 'immediate' | 'daily' | 'weekly' | 'disabled';
  quiet_hours?: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

export interface AutomationSettings {
  enable_smart_categorization?: boolean;
  enable_auto_unsubscribe?: boolean;
  enable_scheduled_cleanup?: boolean;
  smart_suggestions?: boolean;
  learning_mode?: boolean;
  backup_before_deletion?: boolean;
  safe_mode?: boolean;
}

export interface UserPreferences {
  user_id: string;
  cleanup_strategy: CleanupStrategy;
  custom_categories: CustomCategory[];
  notification_settings: NotificationSettings;
  automation_settings: AutomationSettings;
  ui_preferences: {
    theme?: 'light' | 'dark' | 'system';
    compact_view?: boolean;
    show_previews?: boolean;
    default_view?: 'inbox' | 'analytics' | 'rules';
    items_per_page?: number;
  };
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'user_id'> = {
  cleanup_strategy: {
    auto_archive_days: 90,
    auto_delete_days: 365,
    keep_important_labels: ['IMPORTANT', 'STARRED'],
    preserve_starred: true,
    preserve_recent_days: 7,
    bulk_operation_limit: 1000,
    confirmation_threshold: 100,
  },
  custom_categories: [],
  notification_settings: {
    cleanup_summary: true,
    rule_execution_results: true,
    unsubscribe_confirmations: true,
    weekly_analytics: true,
    storage_warnings: true,
    email_frequency: 'daily',
    quiet_hours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  },
  automation_settings: {
    enable_smart_categorization: true,
    enable_auto_unsubscribe: false,
    enable_scheduled_cleanup: false,
    smart_suggestions: true,
    learning_mode: true,
    backup_before_deletion: true,
    safe_mode: true,
  },
  ui_preferences: {
    theme: 'system',
    compact_view: false,
    show_previews: true,
    default_view: 'inbox',
    items_per_page: 50,
  },
};

export class UserPreferencesService {
  private supabase = createClient();

  /**
   * Get user preferences, creating defaults if none exist
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }

      if (!data) {
        // Create default preferences
        return await this.createDefaultPreferences(userId);
      }

      return {
        user_id: data.user_id,
        cleanup_strategy: data.cleanup_strategy || DEFAULT_PREFERENCES.cleanup_strategy,
        custom_categories: data.custom_categories || DEFAULT_PREFERENCES.custom_categories,
        notification_settings: data.notification_settings || DEFAULT_PREFERENCES.notification_settings,
        automation_settings: data.automation_settings || DEFAULT_PREFERENCES.automation_settings,
        ui_preferences: data.ui_preferences || DEFAULT_PREFERENCES.ui_preferences,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string, 
    preferences: Partial<Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<UserPreferences> {
    try {
      const { data, error } = await this.supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        user_id: data.user_id,
        cleanup_strategy: data.cleanup_strategy,
        custom_categories: data.custom_categories,
        notification_settings: data.notification_settings,
        automation_settings: data.automation_settings,
        ui_preferences: data.ui_preferences,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Update cleanup strategy
   */
  async updateCleanupStrategy(userId: string, strategy: Partial<CleanupStrategy>): Promise<void> {
    try {
      const currentPrefs = await this.getUserPreferences(userId);
      const updatedStrategy = { ...currentPrefs.cleanup_strategy, ...strategy };
      
      await this.updateUserPreferences(userId, {
        cleanup_strategy: updatedStrategy,
      });
    } catch (error) {
      console.error('Error updating cleanup strategy:', error);
      throw error;
    }
  }

  /**
   * Add or update custom category
   */
  async saveCustomCategory(userId: string, category: CustomCategory): Promise<void> {
    try {
      const currentPrefs = await this.getUserPreferences(userId);
      const categories = currentPrefs.custom_categories || [];
      
      const existingIndex = categories.findIndex(c => c.id === category.id);
      if (existingIndex >= 0) {
        categories[existingIndex] = category;
      } else {
        categories.push(category);
      }

      await this.updateUserPreferences(userId, {
        custom_categories: categories,
      });
    } catch (error) {
      console.error('Error saving custom category:', error);
      throw error;
    }
  }

  /**
   * Delete custom category
   */
  async deleteCustomCategory(userId: string, categoryId: string): Promise<void> {
    try {
      const currentPrefs = await this.getUserPreferences(userId);
      const categories = (currentPrefs.custom_categories || []).filter(c => c.id !== categoryId);

      await this.updateUserPreferences(userId, {
        custom_categories: categories,
      });
    } catch (error) {
      console.error('Error deleting custom category:', error);
      throw error;
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(userId: string, settings: Partial<NotificationSettings>): Promise<void> {
    try {
      const currentPrefs = await this.getUserPreferences(userId);
      const updatedSettings = { ...currentPrefs.notification_settings, ...settings };
      
      await this.updateUserPreferences(userId, {
        notification_settings: updatedSettings,
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  }

  /**
   * Update automation settings
   */
  async updateAutomationSettings(userId: string, settings: Partial<AutomationSettings>): Promise<void> {
    try {
      const currentPrefs = await this.getUserPreferences(userId);
      const updatedSettings = { ...currentPrefs.automation_settings, ...settings };
      
      await this.updateUserPreferences(userId, {
        automation_settings: updatedSettings,
      });
    } catch (error) {
      console.error('Error updating automation settings:', error);
      throw error;
    }
  }

  /**
   * Update UI preferences
   */
  async updateUIPreferences(userId: string, preferences: Partial<UserPreferences['ui_preferences']>): Promise<void> {
    try {
      const currentPrefs = await this.getUserPreferences(userId);
      const updatedUIPrefs = { ...currentPrefs.ui_preferences, ...preferences };
      
      await this.updateUserPreferences(userId, {
        ui_preferences: updatedUIPrefs,
      });
    } catch (error) {
      console.error('Error updating UI preferences:', error);
      throw error;
    }
  }

  /**
   * Reset preferences to defaults
   */
  async resetToDefaults(userId: string, section?: keyof UserPreferences): Promise<UserPreferences> {
    try {
      if (section) {
        const currentPrefs = await this.getUserPreferences(userId);
        const resetPrefs = {
          ...currentPrefs,
          [section]: DEFAULT_PREFERENCES[section as keyof typeof DEFAULT_PREFERENCES],
        };
        return await this.updateUserPreferences(userId, resetPrefs);
      } else {
        // Reset all preferences
        return await this.updateUserPreferences(userId, DEFAULT_PREFERENCES);
      }
    } catch (error) {
      console.error('Error resetting preferences:', error);
      throw error;
    }
  }

  /**
   * Export preferences as JSON
   */
  async exportPreferences(userId: string): Promise<string> {
    try {
      const preferences = await this.getUserPreferences(userId);
      
      // Remove sensitive data
      const exportData = {
        ...preferences,
        user_id: undefined,
        created_at: undefined,
        updated_at: undefined,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting preferences:', error);
      throw error;
    }
  }

  /**
   * Import preferences from JSON
   */
  async importPreferences(userId: string, jsonData: string): Promise<UserPreferences> {
    try {
      const importedData = JSON.parse(jsonData);
      
      // Validate imported data structure
      const validatedData = this.validateImportedPreferences(importedData);
      
      return await this.updateUserPreferences(userId, validatedData);
    } catch (error) {
      console.error('Error importing preferences:', error);
      throw error;
    }
  }

  /**
   * Create default preferences for new user
   */
  private async createDefaultPreferences(userId: string): Promise<UserPreferences> {
    try {
      const { data, error } = await this.supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          ...DEFAULT_PREFERENCES,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        user_id: data.user_id,
        cleanup_strategy: data.cleanup_strategy,
        custom_categories: data.custom_categories,
        notification_settings: data.notification_settings,
        automation_settings: data.automation_settings,
        ui_preferences: data.ui_preferences,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      console.error('Error creating default preferences:', error);
      throw error;
    }
  }

  /**
   * Validate imported preferences data
   */
  private validateImportedPreferences(data: any): Partial<UserPreferences> {
    const validated: Partial<UserPreferences> = {};

    // Validate cleanup strategy
    if (data.cleanup_strategy && typeof data.cleanup_strategy === 'object') {
      validated.cleanup_strategy = {};
      if (typeof data.cleanup_strategy.auto_archive_days === 'number') {
        validated.cleanup_strategy.auto_archive_days = Math.max(1, Math.min(365, data.cleanup_strategy.auto_archive_days));
      }
      if (typeof data.cleanup_strategy.auto_delete_days === 'number') {
        validated.cleanup_strategy.auto_delete_days = Math.max(1, Math.min(3650, data.cleanup_strategy.auto_delete_days));
      }
      if (Array.isArray(data.cleanup_strategy.keep_important_labels)) {
        validated.cleanup_strategy.keep_important_labels = data.cleanup_strategy.keep_important_labels.filter(
          (label: any) => typeof label === 'string'
        );
      }
      if (typeof data.cleanup_strategy.preserve_starred === 'boolean') {
        validated.cleanup_strategy.preserve_starred = data.cleanup_strategy.preserve_starred;
      }
      if (typeof data.cleanup_strategy.preserve_recent_days === 'number') {
        validated.cleanup_strategy.preserve_recent_days = Math.max(0, Math.min(30, data.cleanup_strategy.preserve_recent_days));
      }
      if (typeof data.cleanup_strategy.bulk_operation_limit === 'number') {
        validated.cleanup_strategy.bulk_operation_limit = Math.max(1, Math.min(10000, data.cleanup_strategy.bulk_operation_limit));
      }
      if (typeof data.cleanup_strategy.confirmation_threshold === 'number') {
        validated.cleanup_strategy.confirmation_threshold = Math.max(1, Math.min(1000, data.cleanup_strategy.confirmation_threshold));
      }
    }

    // Validate custom categories
    if (Array.isArray(data.custom_categories)) {
      validated.custom_categories = data.custom_categories.filter((category: any) => 
        category && 
        typeof category.id === 'string' && 
        typeof category.name === 'string' &&
        typeof category.enabled === 'boolean'
      );
    }

    // Validate notification settings
    if (data.notification_settings && typeof data.notification_settings === 'object') {
      validated.notification_settings = {};
      const booleanFields = ['cleanup_summary', 'rule_execution_results', 'unsubscribe_confirmations', 'weekly_analytics', 'storage_warnings'];
      booleanFields.forEach(field => {
        if (typeof data.notification_settings[field] === 'boolean') {
          validated.notification_settings![field as keyof NotificationSettings] = data.notification_settings[field];
        }
      });
      
      if (['immediate', 'daily', 'weekly', 'disabled'].includes(data.notification_settings.email_frequency)) {
        validated.notification_settings.email_frequency = data.notification_settings.email_frequency;
      }
    }

    // Validate automation settings
    if (data.automation_settings && typeof data.automation_settings === 'object') {
      validated.automation_settings = {};
      const booleanFields = ['enable_smart_categorization', 'enable_auto_unsubscribe', 'enable_scheduled_cleanup', 'smart_suggestions', 'learning_mode', 'backup_before_deletion', 'safe_mode'];
      booleanFields.forEach(field => {
        if (typeof data.automation_settings[field] === 'boolean') {
          validated.automation_settings![field as keyof AutomationSettings] = data.automation_settings[field];
        }
      });
    }

    // Validate UI preferences
    if (data.ui_preferences && typeof data.ui_preferences === 'object') {
      validated.ui_preferences = {};
      if (['light', 'dark', 'system'].includes(data.ui_preferences.theme)) {
        validated.ui_preferences.theme = data.ui_preferences.theme;
      }
      if (typeof data.ui_preferences.compact_view === 'boolean') {
        validated.ui_preferences.compact_view = data.ui_preferences.compact_view;
      }
      if (typeof data.ui_preferences.show_previews === 'boolean') {
        validated.ui_preferences.show_previews = data.ui_preferences.show_previews;
      }
      if (['inbox', 'analytics', 'rules'].includes(data.ui_preferences.default_view)) {
        validated.ui_preferences.default_view = data.ui_preferences.default_view;
      }
      if (typeof data.ui_preferences.items_per_page === 'number') {
        validated.ui_preferences.items_per_page = Math.max(10, Math.min(200, data.ui_preferences.items_per_page));
      }
    }

    return validated;
  }
}