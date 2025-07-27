// Implemented by Gemini.
'use server';
/**
 * @fileOverview This file defines the Genkit flow for analyzing an image of a skin condition.
 *
 * It includes:
 * - analyzeImage - A function that handles the image analysis process.
 * - AnalyzeImageInput - The input type for the analyzeImage function, including the image data URI, a description, and a userId.
 * - AnalyzeImageOutput - The return type for the analyzeImage function, providing a preliminary assessment, recommendations, potential specialist suggestions, and Indian medical recommendations.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
// saveAnalysisResult import is removed as saving is now handled by the frontend.

// Updated Input Schema: userId is now mandatory
const AnalyzeImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a skin condition, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z.string().describe('A brief description of the skin condition.'),
  userId: z.string().min(1, { message: "User ID is required and cannot be empty." }).describe('A unique identifier for the user. This field is required.'),
});
export type AnalyzeImageInput = z.infer<typeof AnalyzeImageInputSchema>;

const IndianMedicalRecommendationSchema = z.object({
  doctorName: z.string().describe("Name of the recommended doctor or clinic in India."),
  hospitalName: z.string().describe("Name of the affiliated hospital or clinic in India."),
  phoneNumber: z.string().optional().describe("A placeholder or general contact number for the hospital/clinic in India (e.g., 9xxxxxxxxx, 011-xxxxxxx)."),
  specialty: z.string().describe("Specialty of the doctor or focus of the clinic."),
});

const AnalyzeImageOutputSchema = z.object({
  assessment: z.string().describe('A preliminary assessment of the possible skin condition.'),
  recommendations: z.string().describe('Recommended actions based on the assessment.'),
  doctorRecommendations: z.array(z.string()).describe('Suggested types of doctors or specialists to consult based on the assessment (e.g., Dermatologist, General Practitioner).'),
  indianMedicalRecommendations: z.array(IndianMedicalRecommendationSchema).optional().describe("A list of 2-3 AI-generated medical recommendations in India, relevant to the assessment. This information requires user verification."),
});
export type AnalyzeImageOutput = z.infer<typeof AnalyzeImageOutputSchema>;

export async function analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
  return analyzeImageFlow(input);
}

const analyzeImagePrompt = ai.definePrompt({
  name: 'analyzeImagePrompt',
  input: {
    schema: AnalyzeImageInputSchema, // Use the updated schema
  },
  output: {
    schema: z.object({
      assessment: z.string().describe('A preliminary assessment of the possible skin condition.'),
      recommendations: z.string().describe('Recommended actions based on the assessment.'),
      doctorRecommendations: z.array(z.string()).describe('Suggested types of doctors or specialists to consult based on the assessment (e.g., Dermatologist, Allergist, General Practitioner). Provide at least one suggestion, even if it\'s just a General Practitioner.'),
      indianMedicalRecommendations: z.array(IndianMedicalRecommendationSchema).optional().describe("Up to 3 AI-generated medical recommendations in India (doctor name, hospital, specialty, placeholder phone number) for user verification. This is a suggestion and needs to be verified by the user."),
    }),
  },
  prompt: `You are a teledermatology AI assistant. Analyze the provided image and description of a skin condition to provide a preliminary assessment, recommendations, and suggest relevant medical specialists.

User ID: {{{userId}}}
Description: {{{description}}}
Image: {{media url=photoDataUri}}

Respond with:
1.  A concise assessment of the possible skin condition, including potential causes.
2.  Clear and actionable recommendations, advising when it's necessary to seek professional medical advice.
3.  A list of suggested types of doctors or specialists to consult **specifically relevant to your assessment** (e.g., "Dermatologist", "Allergist", "General Practitioner"). Always provide at least one suggestion, defaulting to "General Practitioner" if no specific specialist is clearly indicated.
4.  Based on your assessment, provide up to 2-3 suggestions for medical professionals or hospitals **in India**. Include their name, hospital/clinic affiliation, specialty (e.g., "Dermatologist"), and if possible, a placeholder contact number (e.g., "Dr. Ananya Sharma, Fortis Hospital, Dermatologist, Tel: 011-xxxxxxx"). This information is AI-generated and intended for suggestion only; the user MUST verify all details independently. If specific Indian recommendations are not readily available, provide general advice to search for specialists in major Indian cities.

IMPORTANT: Your response MUST be formatted as valid JSON conforming to the provided output schema. Do not add any introductory text or explanations outside the JSON structure. Ensure all fields in the output schema are addressed.`,
});

const analyzeImageFlow = ai.defineFlow<
  typeof AnalyzeImageInputSchema,
  typeof AnalyzeImageOutputSchema
>({
  name: 'analyzeImageFlow',
  inputSchema: AnalyzeImageInputSchema,
  outputSchema: AnalyzeImageOutputSchema,
}, async input => {
  const {output} = await analyzeImagePrompt(input);
  // Ensure output is not null and conforms to the schema. Provide default if necessary.
  if (!output) {
      throw new Error("Received null output from the AI model.");
  }
   // Basic validation, though Zod schema parsing is the primary validation
   if (!output.assessment || !output.recommendations || !Array.isArray(output.doctorRecommendations)) {
       console.warn("Output from AI might be missing expected fields, attempting to use defaults.", output);
       output.assessment = output.assessment || "Assessment unavailable.";
       output.recommendations = output.recommendations || "Consult a healthcare professional.";
       output.doctorRecommendations = Array.isArray(output.doctorRecommendations) && output.doctorRecommendations.length > 0
               ? output.doctorRecommendations
               : ["General Practitioner"]; // Ensure default
   }
   // Ensure at least one recommendation, even if the AI returns an empty array
   if (output.doctorRecommendations.length === 0) {
     output.doctorRecommendations = ["General Practitioner"];
   }

   // Add fallback for indianMedicalRecommendations if not present
   output.indianMedicalRecommendations = output.indianMedicalRecommendations ?? [];

  // Saving is now handled by the frontend using localStorage.

  return output;
});

