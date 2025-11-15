/**
 * API Route: Initialize Volume Tracking
 * 
 * POST /api/tracking/init
 * 
 * Initializes real-time volume tracking for all registered projects
 * This should be called once when the server starts or via a cron job
 */

import { NextResponse } from 'next/server';
import { initializeVolumeTracking } from '@/lib/volume-tracker';

export async function POST() {
  try {
    await initializeVolumeTracking();
    return NextResponse.json({ 
      success: true, 
      message: 'Volume tracking initialized' 
    });
  } catch (error) {
    console.error('Error initializing volume tracking:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

