// Implemented by Gemini.
'use server';
/**
 * @fileOverview A symptom checking AI agent that provides potential conditions, urgency, next steps, and Indian medical recommendations.
 *
 * - checkSymptoms - A function that handles the symptom checking process.
 * - CheckSymptomsInput - The input type for the checkSymptoms function.
 * - CheckSymptomsOutput - The return type for the checkSymptoms function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
// saveAnalysisResult import is removed as saving is now handled by the frontend.

// Input Schema: includes symptoms description and mandatory userId
const CheckSymptomsInputSchema = z.object({
  symptoms: z.string().min(10, { message: "Please provide a more detailed description of your symptoms." }).describe('A detailed description of the user\'s symptoms, including onset, duration, severity, and any related factors.'),
  userId: z.string().min(1, { message: "User ID is required and cannot be empty." }).describe('A unique identifier for the user. This field is required.'),
});
export type CheckSymptomsInput = z.infer<typeof CheckSymptomsInputSchema>;

const IndianMedicalRecommendationSchema = z.object({
  doctorName: z.string().describe("Name of the recommended doctor or clinic in India."),
  hospitalName: z.string().describe("Name of the affiliated hospital or clinic in India."),
  phoneNumber: z.string().optional().describe("A placeholder or general contact number for the hospital/clinic in India (e.g., 9xxxxxxxxx, 011-xxxxxxx)."),
  specialty: z.string().describe("Specialty of the doctor or focus of the clinic."),
});

// Output Schema: includes potential conditions, urgency assessment, suggested next steps, specialist recommendations, and Indian medical recommendations
const CheckSymptomsOutputSchema = z.object({
  potentialConditions: z
    .array(z.string())
    .describe('A list of potential medical conditions based on the described symptoms. Prioritize more likely conditions.'),
  urgency: z.enum(['Low', 'Medium', 'High']).describe('An assessment of the urgency based on the symptoms (Low, Medium, High).'),
  urgencyReasoning: z.string().describe('A brief explanation for the urgency assessment.'),
  suggestedNextSteps: z
    .array(z.string())
    .describe('Actionable next steps for the user, such as home care, monitoring, or seeking medical advice. Include specific advice like "See a doctor within 24 hours" or "Go to the nearest emergency room immediately" if urgency is high.'),
   doctorRecommendations: z.array(z.string()).describe('Suggested types of doctors or specialists to consult based on the potential conditions and urgency (e.g., General Practitioner, Neurologist, Cardiologist). Provide at least one suggestion, defaulting to "General Practitioner".'),
  indianMedicalRecommendations: z.array(IndianMedicalRecommendationSchema).optional().describe("A list of 2-3 AI-generated medical recommendations in India, relevant to the potential conditions and urgency. This information requires user verification."),
});
export type CheckSymptomsOutput = z.infer<typeof CheckSymptomsOutputSchema>;

// Exported async function to call the flow
export async function checkSymptoms(input: CheckSymptomsInput): Promise<CheckSymptomsOutput> {
  return checkSymptomsFlow(input);
}

// Genkit Prompt Definition
const symptomCheckerPrompt = ai.definePrompt({
  name: 'symptomCheckerPrompt',
  input: {
    schema: CheckSymptomsInputSchema, // Use the updated schema
  },
  output: {
    schema: CheckSymptomsOutputSchema,
  },
  prompt: `You are an AI medical assistant specializing in symptom analysis. Analyze the user's described symptoms thoroughly.

User ID: {{{userId}}}
Symptoms Description:
{{{symptoms}}}

Based ONLY on the symptoms provided:
1.  Identify a list of potential medical conditions. List the most likely ones first.
2.  Assess the urgency level (Low, Medium, High). Consider factors like severity, potential for rapid deterioration, and association with critical conditions (e.g., chest pain, difficulty breathing, sudden severe headache, signs of stroke).
3.  Provide a brief reasoning for the assessed urgency level.
4.  Suggest clear, actionable next steps. Be specific about timelines if urgency is Medium or High (e.g., "Consult a doctor today," "Seek immediate medical attention").
5.  Recommend relevant types of doctors or specialists. Always include "General Practitioner" if unsure or as a starting point.
6.  Based on the potential conditions and urgency, provide up to 2-3 suggestions for medical professionals or hospitals **in India**. Include their name, hospital/clinic affiliation, specialty (e.g., "Neurologist"), and if possible, a placeholder contact number (e.g., "Dr. Rajesh Kumar, Manipal Hospital, Neurologist, Tel: 080-xxxxxxx"). This information is AI-generated and intended for suggestion only; the user MUST verify all details independently. If specific Indian recommendations are not readily available, provide general advice to search for specialists in major Indian cities.

IMPORTANT:
- Your response MUST be formatted as valid JSON conforming to the provided output schema.
- Do NOT provide a definitive diagnosis. Emphasize that this is preliminary analysis.
- Prioritize safety. If symptoms suggest a potentially serious condition, clearly advise seeking immediate medical attention (High urgency).
- Ensure doctor recommendations align with the potential conditions identified.`,
});

// Genkit Flow Definition
const checkSymptomsFlow = ai.defineFlow<
  typeof CheckSymptomsInputSchema,
  typeof CheckSymptomsOutputSchema
>(
  {
    name: 'checkSymptomsFlow',
    inputSchema: CheckSymptomsInputSchema,
    outputSchema: CheckSymptomsOutputSchema,
  },
  async input => {
    const {output} = await symptomCheckerPrompt(input);

    if (!output) {
      throw new Error("Received null output from the AI model.");
    }
    if (!output.potentialConditions || !output.urgency || !output.urgencyReasoning || !output.suggestedNextSteps || !output.doctorRecommendations) {
       console.warn("Output from AI might be missing expected fields, using defaults.", output);
       output.potentialConditions = output.potentialConditions ?? [];
       output.urgency = output.urgency ?? 'Low';
       output.urgencyReasoning = output.urgencyReasoning ?? 'Could not determine urgency reasoning.';
       output.suggestedNextSteps = output.suggestedNextSteps ?? ["Consult a healthcare professional."];
       output.doctorRecommendations = output.doctorRecommendations && output.doctorRecommendations.length > 0 ? output.doctorRecommendations : ["General Practitioner"];
    }
    if (output.doctorRecommendations.length === 0) {
      output.doctorRecommendations = ["General Practitioner"];
    }
    // Add fallback for indianMedicalRecommendations if not present
    output.indianMedicalRecommendations = output.indianMedicalRecommendations ?? [];

    // Saving is now handled by the frontend using localStorage.

    return output;
  }
);
