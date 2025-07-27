// Implemented by Gemini.
'use server';
/**
 * @fileOverview An AI agent for analyzing dietary descriptions or meal photos, including Indian dietician/nutritionist recommendations.
 *
 * - analyzeDiet - A function that handles the dietary analysis process.
 * - AnalyzeDietInput - The input type for the analyzeDiet function.
 * - AnalyzeDietOutput - The return type for the analyzeDiet function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
// saveAnalysisResult import is removed as saving is now handled by the frontend.

// Input Schema: allows description OR photoDataUri (or both, though one is primary)
const AnalyzeDietInputSchema = z.object({
  description: z.string().optional().describe('A textual description of the meal(s) or overall diet, including foods, portion sizes, preparation methods, etc.'),
  photoDataUri: z
    .string().optional()
    .describe(
      "A photo of a meal, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  userId: z.string().min(1, { message: "User ID is required and cannot be empty." }).describe('A unique identifier for the user. This field is required.'),
}).refine(data => data.description || data.photoDataUri, {
    message: 'Either a description or a photo must be provided for dietary analysis.',
    path: ["description"], // Indicate which field might be missing
});
export type AnalyzeDietInput = z.infer<typeof AnalyzeDietInputSchema>;

const IndianMedicalRecommendationSchema = z.object({
  doctorName: z.string().describe("Name of the recommended dietician, nutritionist, or clinic in India."),
  hospitalName: z.string().describe("Name of the affiliated hospital, clinic, or wellness center in India."),
  phoneNumber: z.string().optional().describe("A placeholder or general contact number for the professional/clinic in India (e.g., 9xxxxxxxxx, 022-xxxxxxx)."),
  specialty: z.string().describe("Specialty (e.g., Registered Dietitian, Clinical Nutritionist, Sports Nutritionist)."),
});

// Output Schema: includes nutritional breakdown, observations, suggestions, recommendation, and Indian dietician recommendations
const AnalyzeDietOutputSchema = z.object({
  nutritionalBreakdown: z.string().describe('An estimated breakdown of macronutrients (protein, carbs, fat) and potentially key micronutrients or calories based on the input. Provide ranges if uncertain. Format clearly (e.g., list or paragraph).'),
  healthObservations: z
    .array(z.string())
    .describe('Observations about the potential health aspects of the described diet/meal (e.g., "Good source of fiber," "Appears high in saturated fat," "Balanced meal," "Lacks sufficient vegetables").'),
  improvementSuggestions: z
    .array(z.string())
    .describe('Actionable suggestions for improving the nutritional balance or health aspects (e.g., "Consider adding more leafy greens," "Opt for whole grains instead of refined," "Reduce portion size of high-fat items").'),
  professionalRecommendation: z.string().describe('A standard recommendation to consult a registered dietitian or healthcare provider for personalized advice.'),
  indianMedicalRecommendations: z.array(IndianMedicalRecommendationSchema).optional().describe("A list of 2-3 AI-generated dietician/nutritionist recommendations in India, relevant to the analysis. This information requires user verification."),
});
export type AnalyzeDietOutput = z.infer<typeof AnalyzeDietOutputSchema>;

// Exported async function to call the flow
export async function analyzeDiet(input: AnalyzeDietInput): Promise<AnalyzeDietOutput> {
  return analyzeDietFlow(input);
}

// Genkit Prompt Definition
const dietaryAnalysisPrompt = ai.definePrompt({
  name: 'dietaryAnalysisPrompt',
  input: {
    schema: z.object({ // Redefine slightly for prompt input structure clarity
        description: z.string().optional(),
        photoDataUri: z.string().optional(),
        userId: z.string().min(1, { message: "User ID is required and cannot be empty." }), // Ensure userId is required here too for consistency with flow input
    })
  },
  output: {
    schema: AnalyzeDietOutputSchema,
  },
  prompt: `You are an AI nutrition assistant. Analyze the provided dietary information (description and/or photo) to give estimated nutritional insights and general suggestions.

User ID: {{{userId}}}

Input Provided:
{{#if description}}
Description: {{{description}}}
{{/if}}
{{#if photoDataUri}}
Meal Photo: {{media url=photoDataUri}}
(Analyze the photo to identify foods and estimate portions if description is brief or missing.)
{{/if}}

Based on the provided input:
1.  Estimate the *nutritional breakdown* (macronutrients like protein, carbs, fat; potentially calories or key micronutrients). Be clear that this is an estimation. Use ranges if uncertain (e.g., "Protein: 20-30g"). Format clearly.
2.  Provide *health observations* regarding the meal/diet (e.g., balance, food groups present/missing, potential high/low nutrients).
3.  Offer *actionable improvement suggestions* (e.g., additions, substitutions, portion adjustments). Keep suggestions general.
4.  Include a *standard recommendation* to consult a registered dietitian or healthcare provider for personalized advice.
5.  Based on the analysis, provide up to 2-3 suggestions for registered dietitians, nutritionists, or wellness clinics **in India**. Include their name, clinic/affiliation, specialty (e.g., "Clinical Nutritionist"), and if possible, a placeholder contact number (e.g., "Ms. Sunita Patel, NutriLife Clinic, Registered Dietitian, Tel: 022-xxxxxxx"). This information is AI-generated and intended for suggestion only; the user MUST verify all details independently. If specific Indian recommendations are not readily available, provide general advice to search for qualified professionals in major Indian cities or national helplines.

IMPORTANT:
- Your response MUST be formatted as valid JSON conforming to the provided output schema.
- Clearly state that all nutritional information is an *estimate*.
- Do NOT provide specific meal plans or medical advice related to health conditions.
- Focus on general nutritional balance and healthy eating principles.
- If both description and photo are provided, use the description as the primary source and the photo for clarification or additional detail.`,
});

// Genkit Flow Definition
const analyzeDietFlow = ai.defineFlow<
  typeof AnalyzeDietInputSchema,
  typeof AnalyzeDietOutputSchema
>(
  {
    name: 'analyzeDietFlow',
    inputSchema: AnalyzeDietInputSchema,
    outputSchema: AnalyzeDietOutputSchema,
  },
  async input => {
     const promptInput = {
       description: input.description,
       photoDataUri: input.photoDataUri,
       userId: input.userId,
     };

    const {output} = await dietaryAnalysisPrompt(promptInput);

    if (!output) {
      throw new Error("Received null output from the AI model.");
    }
     if (!output.nutritionalBreakdown || !output.healthObservations || !output.improvementSuggestions || !output.professionalRecommendation) {
       console.warn("Output from AI might be missing expected fields, using defaults.", output);
        output.nutritionalBreakdown = output.nutritionalBreakdown ?? 'Could not estimate nutritional breakdown.';
        output.healthObservations = output.healthObservations ?? [];
        output.improvementSuggestions = output.improvementSuggestions ?? [];
        output.professionalRecommendation = output.professionalRecommendation ?? 'Consult a registered dietitian or healthcare provider for personalized advice.';
    }
     if (!output.professionalRecommendation) {
        output.professionalRecommendation = 'Consult a registered dietitian or healthcare provider for personalized advice.';
     }
    // Add fallback for indianMedicalRecommendations if not present
    output.indianMedicalRecommendations = output.indianMedicalRecommendations ?? [];

    // Saving is now handled by the frontend using localStorage.

    return output;
  }
);

