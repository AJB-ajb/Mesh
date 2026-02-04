/**
 * GitHub Sync API Route
 * Triggers GitHub profile extraction and enrichment
 * 
 * POST /api/github/sync
 * - Extracts data from GitHub
 * - Analyzes with OpenAI
 * - Merges with existing profile
 * - Returns suggestions for user review
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  extractGitHubProfile,
  prepareAnalysisInput,
  analyzeGitHubProfile,
  buildGitHubProfileData,
  mergeWithExistingProfile,
  getProfileSuggestions,
  saveGitHubProfile,
  getGitHubProfile,
  updateSyncStatus,
  updateUserProfile,
  getUserProfile,
} from '@/lib/github';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get GitHub access token from session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const providerToken = session?.provider_token;

    if (!providerToken) {
      return NextResponse.json(
        {
          error: 'GitHub access token not available',
          message: 'Please sign in with GitHub to sync your profile',
        },
        { status: 400 }
      );
    }

    // Check if user has GitHub linked (either primary or linked identity)
    // Supabase stores provider info in multiple places
    const identities = user.identities || [];
    const hasGithubIdentity = identities.some((identity: { provider: string }) => identity.provider === 'github');

    if (!hasGithubIdentity) {
      return NextResponse.json(
        {
          error: 'GitHub account not linked',
          message: 'Please link your GitHub account in Settings to sync your profile',
        },
        { status: 400 }
      );
    }

    // Update sync status to 'syncing'
    try {
      await updateSyncStatus(user.id, 'syncing');
    } catch {
      // Ignore if record doesn't exist yet
    }

    // Extract GitHub profile data
    console.log(`[GitHub Sync] Starting extraction for user ${user.id}`);
    const extraction = await extractGitHubProfile(providerToken);
    console.log(`[GitHub Sync] Extracted ${extraction.repos.length} repos, ${extraction.commitMessages.length} commits`);

    // Prepare data for LLM analysis
    const analysisInput = prepareAnalysisInput(extraction);
    console.log(`[GitHub Sync] Prepared analysis input with ${analysisInput.codeSnippets.length} code snippets`);

    // Analyze with OpenAI
    console.log(`[GitHub Sync] Starting OpenAI analysis`);
    const analysis = await analyzeGitHubProfile(analysisInput);
    console.log(`[GitHub Sync] Analysis complete: ${analysis.inferredSkills.length} skills, ${analysis.inferredInterests.length} interests`);

    // Build GitHub profile data
    const githubProfileData = buildGitHubProfileData(extraction, analysis);

    // Save GitHub profile to database
    await saveGitHubProfile(user.id, githubProfileData);
    console.log(`[GitHub Sync] Saved GitHub profile to database`);

    // Get existing user profile
    const existingProfile = await getUserProfile(user.id);

    // Get suggestions for user review
    const suggestions = getProfileSuggestions(existingProfile, githubProfileData);

    // Merge with existing profile (auto-update non-conflicting fields)
    const profileUpdate = mergeWithExistingProfile(existingProfile, githubProfileData);
    await updateUserProfile(user.id, profileUpdate);
    console.log(`[GitHub Sync] Updated user profile with merged data`);

    // Update sync status to 'completed'
    await updateSyncStatus(user.id, 'completed');

    return NextResponse.json({
      success: true,
      message: 'GitHub profile synced successfully',
      data: {
        githubUsername: githubProfileData.githubUsername,
        reposAnalyzed: githubProfileData.repoCount,
        languagesFound: githubProfileData.primaryLanguages,
        skillsInferred: githubProfileData.inferredSkills,
        interestsInferred: githubProfileData.inferredInterests,
        experienceLevel: githubProfileData.experienceLevel,
        codingStyle: githubProfileData.codingStyle,
        activityLevel: githubProfileData.activityLevel,
      },
      suggestions: {
        suggestedBio: suggestions.suggestedBio,
        suggestedSkills: suggestions.suggestedSkills,
        suggestedInterests: suggestions.suggestedInterests,
        experienceUpgrade: suggestions.experienceUpgrade,
      },
      profileUpdated: true,
    });
  } catch (error) {
    console.error('[GitHub Sync] Error:', error);

    // Try to update sync status to failed
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await updateSyncStatus(
          user.id,
          'failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    } catch {
      // Ignore status update errors
    }

    return NextResponse.json(
      {
        error: 'Failed to sync GitHub profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/github/sync
 * Get current GitHub sync status and profile data
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get GitHub profile
    const githubProfile = await getGitHubProfile(user.id);

    if (!githubProfile) {
      return NextResponse.json({
        synced: false,
        message: 'No GitHub profile data found. Sync to get started.',
      });
    }

    // Get existing user profile for suggestions
    const existingProfile = await getUserProfile(user.id);
    const suggestions = existingProfile
      ? getProfileSuggestions(existingProfile, githubProfile)
      : null;

    return NextResponse.json({
      synced: true,
      lastSyncedAt: githubProfile.lastSyncedAt,
      syncStatus: githubProfile.syncStatus,
      data: {
        githubUsername: githubProfile.githubUsername,
        githubUrl: githubProfile.githubUrl,
        avatarUrl: githubProfile.avatarUrl,
        repoCount: githubProfile.repoCount,
        totalStars: githubProfile.totalStars,
        primaryLanguages: githubProfile.primaryLanguages,
        topics: githubProfile.topics,
        inferredSkills: githubProfile.inferredSkills,
        inferredInterests: githubProfile.inferredInterests,
        experienceLevel: githubProfile.experienceLevel,
        experienceSignals: githubProfile.experienceSignals,
        codingStyle: githubProfile.codingStyle,
        collaborationStyle: githubProfile.collaborationStyle,
        activityLevel: githubProfile.activityLevel,
        suggestedBio: githubProfile.suggestedBio,
      },
      suggestions,
    });
  } catch (error) {
    console.error('[GitHub Sync] GET Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get GitHub profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
