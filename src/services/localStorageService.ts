
// src/services/localStorageService.ts
"use client";

// Define the types for analysis records
export type AnalysisType =
  | 'imageAnalyses'
  | 'voiceDiagnoses'
  | 'symptomChecks'
  | 'mentalHealthAssessments'
  | 'dietaryAnalyses';

export interface AnalysisRecord<T = any> {
  id: string; // Unique ID for the analysis record, can be generated (e.g., UUID or timestamp-based)
  userId: string;
  analysisType: AnalysisType;
  timestamp: string; // ISO string representation of the date
  result: T; // The actual analysis result object
}

const getStorageKey = (userId: string) => `userAnalyses_${userId}`;

/**
 * Saves an analysis result to localStorage.
 * @param userId The ID of the user.
 * @param analysisType The type of analysis performed.
 * @param result The result object from the analysis.
 */
export async function saveAnalysisResult(
  userId: string,
  analysisType: AnalysisType,
  result: any
): Promise<void> {
  if (typeof window === 'undefined') {
    console.warn('localStorage is not available. Skipping save.');
    return;
  }
  if (!userId || !userId.trim()) {
    throw new Error("User ID is required to save analysis.");
  }

  const storageKey = getStorageKey(userId);
  try {
    const existingAnalyses = await getUserAnalyses(userId);
    const newAnalysis: AnalysisRecord = {
      id: `${analysisType}-${new Date().getTime()}-${Math.random().toString(36).substr(2, 9)}`, // Simple unique ID
      userId,
      analysisType,
      result,
      timestamp: new Date().toISOString(),
    };
    const updatedAnalyses = [newAnalysis, ...existingAnalyses];
    localStorage.setItem(storageKey, JSON.stringify(updatedAnalyses));
  } catch (error) {
    console.error(`Error saving ${analysisType} result for user ${userId} to localStorage:`, error);
    throw new Error(`Failed to save analysis result to localStorage: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Retrieves all analysis records for a given user from localStorage.
 * @param userId The ID of the user.
 * @returns A promise that resolves to an array of AnalysisRecord objects.
 */
export async function getUserAnalyses(userId: string): Promise<AnalysisRecord[]> {
  if (typeof window === 'undefined') {
    console.warn('localStorage is not available. Returning empty array.');
    return [];
  }
   if (!userId || !userId.trim()) {
    console.warn("User ID is required to fetch analyses. Returning empty array.");
    return [];
  }
  const storageKey = getStorageKey(userId);
  try {
    const storedData = localStorage.getItem(storageKey);
    if (storedData) {
      const analyses: AnalysisRecord[] = JSON.parse(storedData);
      // Sort by timestamp descending to ensure latest are first
      return analyses.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return [];
  } catch (error) {
    console.error(`Error fetching analyses for user ${userId} from localStorage:`, error);
    return []; // Return empty array on error
  }
}
