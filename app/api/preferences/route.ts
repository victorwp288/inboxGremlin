import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UserPreferencesService } from '@/lib/user-preferences';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const preferencesService = new UserPreferencesService();

    switch (action) {
      case 'export':
        return await handleExportPreferences(user.id, preferencesService);

      default:
        const preferences = await preferencesService.getUserPreferences(user.id);
        return NextResponse.json({
          success: true,
          preferences,
        });
    }
  } catch (error) {
    console.error('Error in GET /api/preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, section, data, category, categoryId } = body;

    const preferencesService = new UserPreferencesService();

    switch (action) {
      case 'update':
        return await handleUpdatePreferences(user.id, section, data, preferencesService);

      case 'reset':
        return await handleResetSection(user.id, section, preferencesService);

      case 'save_category':
        return await handleSaveCategory(user.id, category, preferencesService);

      case 'delete_category':
        return await handleDeleteCategory(user.id, categoryId, preferencesService);

      case 'import':
        return await handleImportPreferences(user.id, data, preferencesService);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/preferences:', error);
    return NextResponse.json(
      { error: 'Failed to process preferences request' },
      { status: 500 }
    );
  }
}

async function handleUpdatePreferences(
  userId: string,
  section: string | undefined,
  data: any,
  preferencesService: UserPreferencesService
) {
  try {
    let preferences;

    if (section) {
      // Update specific section
      switch (section) {
        case 'cleanup_strategy':
          await preferencesService.updateCleanupStrategy(userId, data);
          break;
        case 'notification_settings':
          await preferencesService.updateNotificationSettings(userId, data);
          break;
        case 'automation_settings':
          await preferencesService.updateAutomationSettings(userId, data);
          break;
        case 'ui_preferences':
          await preferencesService.updateUIPreferences(userId, data);
          break;
        default:
          return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
      }
      preferences = await preferencesService.getUserPreferences(userId);
    } else {
      // Update entire preferences object
      preferences = await preferencesService.updateUserPreferences(userId, data);
    }

    return NextResponse.json({
      success: true,
      preferences,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

async function handleResetSection(
  userId: string,
  section: string,
  preferencesService: UserPreferencesService
) {
  try {
    const preferences = await preferencesService.resetToDefaults(userId, section as any);

    return NextResponse.json({
      success: true,
      preferences,
      message: `${section} preferences reset to defaults`,
    });
  } catch (error) {
    console.error('Error resetting preferences:', error);
    return NextResponse.json(
      { error: 'Failed to reset preferences' },
      { status: 500 }
    );
  }
}

async function handleSaveCategory(
  userId: string,
  category: any,
  preferencesService: UserPreferencesService
) {
  try {
    if (!category || !category.name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    await preferencesService.saveCustomCategory(userId, category);
    const preferences = await preferencesService.getUserPreferences(userId);

    return NextResponse.json({
      success: true,
      preferences,
      message: 'Custom category saved successfully',
    });
  } catch (error) {
    console.error('Error saving category:', error);
    return NextResponse.json(
      { error: 'Failed to save category' },
      { status: 500 }
    );
  }
}

async function handleDeleteCategory(
  userId: string,
  categoryId: string,
  preferencesService: UserPreferencesService
) {
  try {
    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    await preferencesService.deleteCustomCategory(userId, categoryId);
    const preferences = await preferencesService.getUserPreferences(userId);

    return NextResponse.json({
      success: true,
      preferences,
      message: 'Custom category deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}

async function handleExportPreferences(
  userId: string,
  preferencesService: UserPreferencesService
) {
  try {
    const preferencesJson = await preferencesService.exportPreferences(userId);
    
    return new NextResponse(preferencesJson, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="inbox-gremlin-preferences-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting preferences:', error);
    return NextResponse.json(
      { error: 'Failed to export preferences' },
      { status: 500 }
    );
  }
}

async function handleImportPreferences(
  userId: string,
  jsonData: string,
  preferencesService: UserPreferencesService
) {
  try {
    if (!jsonData) {
      return NextResponse.json({ error: 'JSON data is required' }, { status: 400 });
    }

    const preferences = await preferencesService.importPreferences(userId, jsonData);

    return NextResponse.json({
      success: true,
      preferences,
      message: 'Preferences imported successfully',
    });
  } catch (error) {
    console.error('Error importing preferences:', error);
    return NextResponse.json(
      { error: 'Failed to import preferences. Please check the file format.' },
      { status: 500 }
    );
  }
}