// Implemented by Gemini.
'use server';
/**
 * @fileOverview An AI agent for preliminary mental health assessment and resource suggestion, including Indian recommendations.
 *
 * - assessMentalHealth - A function that handles the mental health assessment process.
 * - AssessMentalHealthInput - The input type for the assessMentalHealth function.
 * - AssessMentalHealthOutput - The return type for the assessMentalHealth function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
// saveAnalysisResult import is removed as saving is now handled by the frontend.

// Input Schema: includes user description and mandatory userId
const AssessMentalHealthInputSchema = z.object({
  description: z.string().min(15, { message: "Please provide more details about how you're feeling or your concerns." }).describe('A description provided by the user about their feelings, mood, stress, or mental health concerns.'),
  userId: z.string().min(1, { message: "User ID is required and cannot be empty." }).describe('A unique identifier for the user. This field is required.'),
});
export type AssessMentalHealthInput = z.infer<typeof AssessMentalHealthInputSchema>;

const IndianMedicalRecommendationSchema = z.object({
  doctorName: z.string().describe("Name of the recommended mental health professional, clinic, or organization in India."),
  hospitalName: z.string().describe("Name of the affiliated hospital, clinic, or organization in India."),
  phoneNumber: z.string().optional().describe("A placeholder or general contact number for the professional/clinic/organization in India (e.g., 9xxxxxxxxx, 022-xxxxxxx, or helpline number)."),
  specialty: z.string().describe("Specialty (e.g., Psychiatrist, Psychologist, Counselor, Mental Health NGO)."),
});

// Output Schema: includes assessment, recommendations, resources, a crisis warning flag, and Indian medical recommendations
const AssessMentalHealthOutputSchema = z.object({
  assessment: z.string().describe('A preliminary assessment of the user\'s described state, identifying potential areas of concern (e.g., signs of anxiety, low mood, high stress). Avoid definitive diagnoses.'),
  recommendations: z
    .array(z.string())
    .describe('General recommendations and coping strategies based on the assessment (e.g., mindfulness techniques, journaling, exercise, seeking social support).'),
  resourceSuggestions: z
    .array(z.string())
    .describe('Suggestions for types of resources or professionals to consult (e.g., Therapist, Psychiatrist, Counselor, Support Group, Mental Health Apps, General Practitioner). Always include "General Practitioner" as a starting point.'),
  crisisWarning: z.string().optional().describe('Include a warning message ONLY IF the description contains explicit indicators of immediate crisis, self-harm, or harm to others. Example: "Your description mentions thoughts of self-harm."'),
  indianMedicalRecommendations: z.array(IndianMedicalRecommendationSchema).optional().describe("A list of 2-3 AI-generated mental health resource recommendations in India, relevant to the assessment. This information requires user verification."),
});
export type AssessMentalHealthOutput = z.infer<typeof AssessMentalHealthOutputSchema>;

// Exported async function to call the flow
export async function assessMentalHealth(input: AssessMentalHealthInput): Promise<AssessMentalHealthOutput> {
  return assessMentalHealthFlow(input);
}

// Genkit Prompt Definition
const mentalHealthPrompt = ai.definePrompt({
  name: 'mentalHealthPrompt',
  input: {
    schema: AssessMentalHealthInputSchema, // Use the updated schema
  },
  output: {
    schema: AssessMentalHealthOutputSchema,
  },
  prompt: `You are an AI assistant providing preliminary mental well-being support. Analyze the user's description of their feelings and concerns with empathy and caution.

User ID: {{{userId}}}
User Description:
{{{description}}}

Based ONLY on the description provided:
1.  Provide a *preliminary assessment* identifying potential areas of concern (e.g., "The description suggests feelings commonly associated with anxiety," "This indicates a potentially low mood or high stress levels"). AVOID making definitive diagnoses.
2.  Suggest *general*, non-prescriptive recommendations and coping strategies relevant to the assessment (e.g., mindfulness, journaling, exercise, connecting with others, establishing routines).
3.  List types of *resources or professionals* the user might consider consulting (e.g., Therapist, Psychiatrist, Counselor, Support Group, Mental Health Helplines, General Practitioner). Always include "General Practitioner".
4.  **CRISIS DETECTION:** If and ONLY IF the description contains *explicit and clear indicators* of immediate crisis, suicidal ideation, self-harm, or intent to harm others, include a concise warning message in the 'crisisWarning' field (e.g., "The description mentions thoughts of self-harm."). Otherwise, leave 'crisisWarning' empty or null. Do *not* infer crisis; rely on explicit statements.
5.  Based on the assessment, provide up to 2-3 suggestions for mental health professionals, clinics, or organizations **in India**. Include their name, affiliation, specialty (e.g., "Psychologist, NIMHANS affiliation"), and if possible, a placeholder contact number or helpline (e.g., "Dr. Kavita Rao, VIMHANS, Psychologist, Tel: 011-xxxxxxx" or "AASRA Helpline: 91-9820466726"). This information is AI-generated and intended for suggestion only; the user MUST verify all details independently. If specific Indian recommendations are not readily available, provide general advice to search for mental health support in major Indian cities or national helplines.

IMPORTANT:
- Your response MUST be formatted as valid JSON conforming to the provided output schema.
- Emphasize that this is NOT a substitute for professional diagnosis or therapy.
- Maintain a supportive and non-judgmental tone.
- Do not provide medical advice or treatment plans.
- Prioritize safety in crisis detection based *only* on explicit user statements.`,
});

// Genkit Flow Definition
const assessMentalHealthFlow = ai.defineFlow<
  typeof AssessMentalHealthInputSchema,
  typeof AssessMentalHealthOutputSchema
>(
  {
    name: 'assessMentalHealthFlow',
    inputSchema: AssessMentalHealthInputSchema,
    outputSchema: AssessMentalHealthOutputSchema,
  },
  async input => {
    const {output} = await mentalHealthPrompt(input);

    if (!output) {
      throw new Error("Received null output from the AI model.");
    }
     if (!output.assessment || !output.recommendations || !output.resourceSuggestions) {
       console.warn("Output from AI might be missing expected fields, using defaults.", output);
        output.assessment = output.assessment ?? 'Could not generate a preliminary assessment.';
        output.recommendations = output.recommendations ?? ["Consider practicing self-care and reaching out for support."];
        output.resourceSuggestions = output.resourceSuggestions && output.resourceSuggestions.length > 0 ? output.resourceSuggestions : ["General Practitioner", "Mental Health Professional"];
        output.crisisWarning = output.crisisWarning;
    }
    if (output.resourceSuggestions.length === 0) {
      output.resourceSuggestions = ["General Practitioner", "Mental Health Professional"];
    }
    // Add fallback for indianMedicalRecommendations if not present
    output.indianMedicalRecommendations = output.indianMedicalRecommendations ?? [];

    // Saving is now handled by the frontend using localStorage.

    return output;
  }
);
