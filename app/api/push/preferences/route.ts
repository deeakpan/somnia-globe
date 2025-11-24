/**
 * API Route: Manage User Notification Preferences
 * 
 * GET /api/push/preferences?userId=xxx - Get all preferences for user
 * POST /api/push/preferences - Create/update preference
 * DELETE /api/push/preferences?userId=xxx&projectId=xxx - Delete preference
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserPreferences,
  setUserPreference,
  deleteUserPreference,
} from '@/lib/user-notification-preferences';

// GET - Get all preferences for a user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const preferences = await getUserPreferences(userId);
    return NextResponse.json({ success: true, preferences });
  } catch (error: any) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create or update preference
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, projectId, percentageThreshold, enabled } = body;

    if (!userId || !projectId) {
      return NextResponse.json(
        { error: 'User ID and Project ID are required' },
        { status: 400 }
      );
    }

    if (percentageThreshold === undefined) {
      return NextResponse.json(
        { error: 'Percentage threshold is required' },
        { status: 400 }
      );
    }

    const preference = await setUserPreference(
      userId,
      projectId,
      Number(percentageThreshold),
      enabled !== false // Default to true
    );

    return NextResponse.json({ success: true, preference });
  } catch (error: any) {
    console.error('Error setting preference:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete preference
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const projectId = searchParams.get('projectId');

    if (!userId || !projectId) {
      return NextResponse.json(
        { error: 'User ID and Project ID are required' },
        { status: 400 }
      );
    }

    await deleteUserPreference(userId, projectId);
    return NextResponse.json({ success: true, message: 'Preference deleted' });
  } catch (error: any) {
    console.error('Error deleting preference:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

