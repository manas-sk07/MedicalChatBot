// Implemented by Gemini.
'use server';

/**
 * @fileOverview A voice-based medical diagnosis AI agent.
 *
 * - voiceDiagnosis - A function that handles the voice diagnosis process.
 * - VoiceDiagnosisInput - The input type for the voiceDiagnosis function.
 * - VoiceDiagnosisOutput - The return type for the voiceDiagnosis function, including Indian medical recommendations.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
// saveAnalysisResult import is removed as saving is now handled by the frontend.

// Updated Input Schema: userId is now mandatory
const VoiceDiagnosisInputSchema = z.object({
  symptomsDescription: z
    .string().optional()
    .describe('A description of the symptoms provided by the user via text.'),
   audioDataUri: z
    .string().optional()
    .describe(
      "An audio recording of the user describing symptoms, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. Use this if symptomsDescription is not provided."
    ),
  userId: z.string().min(1, { message: "User ID is required and cannot be empty." }).describe('A unique identifier for the user. This field is required.'),
}).refine(data => data.symptomsDescription || data.audioDataUri, {
    message: 'Either symptomsDescription or audioDataUri must be provided.',
    path: ["symptomsDescription"], // Indicate which field might be missing if refinement fails
});
export type VoiceDiagnosisInput = z.infer<typeof VoiceDiagnosisInputSchema>;

const IndianMedicalRecommendationSchema = z.object({
  doctorName: z.string().describe("Name of the recommended doctor or clinic in India."),
  hospitalName: z.string().describe("Name of the affiliated hospital or clinic in India."),
  phoneNumber: z.string().optional().describe("A placeholder or general contact number for the hospital/clinic in India (e.g., 9xxxxxxxxx, 011-xxxxxxx)."),
  specialty: z.string().describe("Specialty of the doctor or focus of the clinic."),
});

const VoiceDiagnosisOutputSchema = z.object({
  potentialConditions: z
    .array(z.string())
    .describe('A list of potential medical conditions based on the symptoms.'),
  clarifyingQuestions: z
    .array(z.string())
    .describe('A list of clarifying questions to better understand the symptoms.'),
   doctorRecommendations: z.array(z.string()).describe('Suggested types of doctors or specialists to consult based on the potential conditions (e.g., Cardiologist, Pulmonologist, General Practitioner). Provide at least one suggestion, even if it\'s just a General Practitioner.'),
  indianMedicalRecommendations: z.array(IndianMedicalRecommendationSchema).optional().describe("A list of 2-3 AI-generated medical recommendations in India, relevant to the potential conditions. This information requires user verification."),
});
export type VoiceDiagnosisOutput = z.infer<typeof VoiceDiagnosisOutputSchema>;

export async function voiceDiagnosis(input: VoiceDiagnosisInput): Promise<VoiceDiagnosisOutput> {
  return voiceDiagnosisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'voiceDiagnosisPrompt',
  input: {
    // Use the updated schema for prompt input definition
    schema: z.object({
       symptomsDescription: z.string().optional(),
       audioDataUri: z.string().optional(),
       userId: z.string().min(1, { message: "User ID is required." }), // Added userId here as well and made it required
    })
  },
  output: {
    schema: z.object({
      potentialConditions: z
        .array(z.string())
        .describe('A list of potential medical conditions based on the symptoms.'),
      clarifyingQuestions: z
        .array(z.string())
        .describe('A list of clarifying questions to better understand the symptoms.'),
      doctorRecommendations: z.array(z.string()).describe('Suggested types of doctors or specialists to consult **specifically relevant to the potential conditions** identified (e.g., "Cardiologist", "Pulmonologist", "General Practitioner"). Provide at least one suggestion, defaulting to "General Practitioner" if no specific specialist is clearly indicated.'),
      indianMedicalRecommendations: z.array(IndianMedicalRecommendationSchema).optional().describe("Up to 3 AI-generated medical recommendations in India (doctor name, hospital, specialty, placeholder phone number) relevant to potential conditions, for user verification. This is a suggestion and needs to be verified by the user."),
    }),
  },
  // Updated prompt to reflect userId is mandatory
  prompt: `You are an AI medical assistant. Analyze the provided symptoms (either text or audio) to suggest potential conditions, clarifying questions, and relevant medical specialists.

User ID: {{{userId}}}
Symptoms provided via:
{{#if audioDataUri}}
Audio Recording: {{media url=audioDataUri}}
(Transcribe the audio to understand the symptoms fully before proceeding with the analysis.)
{{else if symptomsDescription}}
Text Description: {{{symptomsDescription}}}
{{else}}
(No symptoms provided)
{{/if}}

Based ONLY on the symptoms provided, generate:
1.  A list of potential medical conditions.
2.  A list of clarifying questions to better understand the symptoms.
3.  A list of suggested types of doctors or specialists to consult **specifically relevant to the potential conditions** you identified (e.g., "Cardiologist", "Pulmonologist", "General Practitioner"). Always provide at least one suggestion, defaulting to "General Practitioner" if no specific specialist is clearly indicated.
4.  Based on the potential conditions, provide up to 2-3 suggestions for medical professionals or hospitals **in India**. Include their name, hospital/clinic affiliation, specialty (e.g., "Cardiologist"), and if possible, a placeholder contact number (e.g., "Dr. Priya Singh, Apollo Hospitals, Cardiologist, Tel: 044-xxxxxxx"). This information is AI-generated and intended for suggestion only; the user MUST verify all details independently. If specific Indian recommendations are not readily available, provide general advice to search for specialists in major Indian cities.

IMPORTANT: Your response MUST be formatted as valid JSON conforming to the provided output schema. Do not add any introductory text or explanations outside the JSON structure. If no symptoms were provided, return empty lists for conditions and questions, and suggest consulting a General Practitioner, and an empty list for Indian recommendations.`,
});

const voiceDiagnosisFlow = ai.defineFlow<
  typeof VoiceDiagnosisInputSchema,
  typeof VoiceDiagnosisOutputSchema
>(
  {
    name: 'voiceDiagnosisFlow',
    inputSchema: VoiceDiagnosisInputSchema,
    outputSchema: VoiceDiagnosisOutputSchema,
  },
  async input => {
    // Prepare input for the prompt, passing through relevant fields
    const promptInput: { symptomsDescription?: string; audioDataUri?: string; userId: string } = { // userId is now string, not string?
        userId: input.userId,
    };
    if (input.audioDataUri) {
        promptInput.audioDataUri = input.audioDataUri;
    } else if (input.symptomsDescription) {
        promptInput.symptomsDescription = input.symptomsDescription;
    } else {
         console.error("Invalid input: Neither symptomsDescription nor audioDataUri provided.");
         return {
             potentialConditions: [],
             clarifyingQuestions: ["No symptoms were provided to analyze."],
             doctorRecommendations: ["General Practitioner"],
             indianMedicalRecommendations: []
         };
    }

    const {output} = await prompt(promptInput);

     if (!output) {
       throw new Error("Received null output from the AI model.");
     }
     if (!Array.isArray(output.potentialConditions) || !Array.isArray(output.clarifyingQuestions) || !Array.isArray(output.doctorRecommendations)) {
        console.warn("Output from AI might be missing expected fields, attempting to use defaults.", output);
        output.potentialConditions = Array.isArray(output.potentialConditions) ? output.potentialConditions : [];
        output.clarifyingQuestions = Array.isArray(output.clarifyingQuestions) ? output.clarifyingQuestions : ["Could not generate questions."];
        output.doctorRecommendations = Array.isArray(output.doctorRecommendations) && output.doctorRecommendations.length > 0
                 ? output.doctorRecommendations
                 : ["General Practitioner"];
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
