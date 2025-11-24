/**
 * User Notification Preferences Management
 * 
 * Handles user-specific notification settings per project
 */

import { supabase } from './supabase';

export interface UserNotificationPreference {
  id: string;
  user_id: string;
  project_id: string;
  percentage_threshold: number;
  enabled: boolean;
  last_notified_volume: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get user's notification preferences for a project
 */
export async function getUserPreference(
  userId: string,
  projectId: string
): Promise<UserNotificationPreference | null> {
  const { data, error } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching user preference:', error);
    throw error;
  }

  return data;
}

/**
 * Get all preferences for a user
 */
export async function getUserPreferences(
  userId: string
): Promise<UserNotificationPreference[]> {
  const { data, error } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user preferences:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create or update user notification preference
 */
export async function setUserPreference(
  userId: string,
  projectId: string,
  percentageThreshold: number,
  enabled: boolean = true
): Promise<UserNotificationPreference> {
  // Check if preference exists
  const existing = await getUserPreference(userId, projectId);

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .update({
        percentage_threshold: percentageThreshold,
        enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user preference:', error);
      throw error;
    }

    return data;
  } else {
    // Create new
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .insert({
        user_id: userId,
        project_id: projectId,
        percentage_threshold: percentageThreshold,
        enabled: enabled,
        last_notified_volume: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user preference:', error);
      throw error;
    }

    return data;
  }
}

/**
 * Delete user preference
 */
export async function deleteUserPreference(
  userId: string,
  projectId: string
): Promise<void> {
  const { error } = await supabase
    .from('user_notification_preferences')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId);

  if (error) {
    console.error('Error deleting user preference:', error);
    throw error;
  }
}

/**
 * Get all users monitoring a project
 */
export async function getProjectSubscribers(
  projectId: string
): Promise<UserNotificationPreference[]> {
  const { data, error } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('project_id', projectId)
    .eq('enabled', true);

  if (error) {
    console.error('Error fetching project subscribers:', error);
    throw error;
  }

  return data || [];
}

