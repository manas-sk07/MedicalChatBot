// Implemented by Gemini.
"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { analyzeDiet } from "@/ai/flows/dietary-analysis-flow"; // Import the Genkit flow
import type { AnalyzeDietInput, AnalyzeDietOutput } from "@/ai/flows/dietary-analysis-flow";
import { saveAnalysis } from "@/services/firebaseService"; // Updated import
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, UtensilsCrossed, Apple, Info, User, ExternalLink, FileImage, Upload, MapPin, Phone, Save, CheckCircle } from "lucide-react";
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";

// userId prop is now non-optional
interface DietaryAnalysisProps {
  userId: string;
}

export function DietaryAnalysis({ userId }: DietaryAnalysisProps) {
  const [dietDescription, setDietDescription] = useState("");
  const [foodPhotoUri, setFoodPhotoUri] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeDietOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const clearState = () => {
    setResult(null);
    setError(null);
    setSaved(false);
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    clearState();
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        if (!dataUri.startsWith('data:image/')) {
            setError("Invalid file type. Please upload an image (PNG, JPG, WEBP, etc.).");
            setFoodPhotoUri(null);
            if (event.target) event.target.value = "";
             toast({ variant: "destructive", title: "Invalid File Type", description: "Please upload a valid image file." });
            return;
        }
        setFoodPhotoUri(dataUri);
        toast({ title: "Image Selected", description: `Selected: ${file.name}` });
      };
      reader.onerror = () => {
          setError("Failed to read the image file.");
          setFoodPhotoUri(null);
           if (event.target) event.target.value = "";
            toast({ variant: "destructive", title: "File Read Error", description: "Could not read the selected image file." });
      }
      reader.readAsDataURL(file);
    } else {
        setFoodPhotoUri(null);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clearState();
    if (!userId.trim()) {
        setError("User ID is required to perform analysis.");
        toast({ variant: "destructive", title: "User ID Missing", description: "Please enter your User ID on the main page."});
        return;
    }
    if (!dietDescription && !foodPhotoUri) {
      setError("Please describe your diet/meal or upload a photo.");
      return;
    }
    
    setLoading(true);

    try {
      const input: AnalyzeDietInput = {
        userId, 
        ...(dietDescription && { description: dietDescription }),
        ...(foodPhotoUri && { photoDataUri: foodPhotoUri }),
      };
      const analysisResult = await analyzeDiet(input);
      setResult(analysisResult);
      toast({
        title: "Dietary Analysis Complete",
        description: "The nutritional analysis has finished.",
      });
    } catch (err) {
      console.error("Dietary analysis failed:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during analysis.";
      setError(errorMessage);
       toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: `Could not complete the analysis: ${errorMessage}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResult = async () => {
    if (!result || !userId) return;
    setSaving(true);
    setSaved(false);
    try {
      await saveAnalysis(userId, 'dietaryAnalyses', result);
      setSaved(true);
      toast({
        title: "Result Saved",
        description: "Dietary analysis has been saved to your dashboard.",
      });
    } catch (saveError) {
      console.error("Failed to save dietary analysis:", saveError);
      const errorMessage = saveError instanceof Error ? saveError.message : "An unexpected error occurred.";
      setError(`Failed to save result: ${errorMessage}`);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: `Could not save the analysis: ${errorMessage}`,
      });
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = !loading && !!userId.trim() && (!!dietDescription || !!foodPhotoUri);

  return (
    <Card className="w-full border-none shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <UtensilsCrossed className="text-primary" /> Dietary Analysis
        </CardTitle>
        <CardDescription>
          Describe your recent meal(s) or typical diet, or upload a photo of a meal for AI-powered nutritional insights and suggestions. This is not medical advice. Your User ID is required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Text Description */}
          <div className="space-y-2">
             <label htmlFor="diet-description" className="text-sm font-medium">Describe Diet/Meal</label>
            <Textarea
              id="diet-description"
              placeholder="Describe what you ate, portion sizes, drinks, etc. (e.g., 'Breakfast: Oatmeal with berries and nuts. Lunch: Chicken salad sandwich on whole wheat. Dinner: Salmon with roasted vegetables'). Or describe a specific meal."
              value={dietDescription}
              onChange={(e) => {
                setDietDescription(e.target.value);
                clearState();
              }}
              className="resize-none"
              rows={5}
              disabled={loading || !userId.trim()}
            />
          </div>

          <div className="flex items-center justify-center text-sm text-muted-foreground before:flex-1 before:border-t before:border-border before:me-4 after:flex-1 after:border-t after:border-border after:ms-4">
            OR
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label htmlFor="food-image-upload" className="text-sm font-medium">Upload Meal Photo</label>
            <Input
              id="food-image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="cursor-pointer file:text-accent file:font-semibold"
              disabled={loading || !userId.trim()}
            />
             {foodPhotoUri && !loading && (
              <div className="mt-4 border rounded-md overflow-hidden w-32 h-32 relative shadow-sm">
                 <Image
                    src={foodPhotoUri}
                    alt="Uploaded meal"
                    layout="fill"
                    objectFit="cover"
                    data-ai-hint="food meal plate nutrition"
                  />
              </div>
            )}
          </div>

          <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={!canSubmit}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing Diet...
              </>
            ) : (
              <>
                <Apple className="mr-2 h-4 w-4" /> Analyze Diet
              </>
            )}
          </Button>
        </form>

        {error && (
          <Alert variant="destructive" className="mt-4">
             <Info className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Card className="mt-6 bg-card border border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-primary">Nutritional Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               {result.nutritionalBreakdown && (
                 <div>
                   <h3 className="font-semibold text-md mb-1 flex items-center gap-1.5"><Apple className="w-4 h-4 text-primary" /> Estimated Nutritional Breakdown:</h3>
                   <p className="text-sm text-foreground/90 pl-6 whitespace-pre-line">{result.nutritionalBreakdown}</p> {/* Use pre-line for formatting */}
                 </div>
               )}
               {result.healthObservations && result.healthObservations.length > 0 && (
                 <div>
                   <h3 className="font-semibold text-md mb-2 flex items-center gap-1.5"><Info className="w-4 h-4 text-primary" /> Health Observations:</h3>
                   <ul className="list-disc list-inside text-sm space-y-1 pl-6 text-foreground/90">
                     {result.healthObservations.map((obs, index) => (
                       <li key={index}>{obs}</li>
                     ))}
                   </ul>
                 </div>
               )}
               {result.improvementSuggestions && result.improvementSuggestions.length > 0 && (
                 <div>
                   <h3 className="font-semibold text-md mb-2 flex items-center gap-1.5"><UtensilsCrossed className="w-4 h-4 text-primary" /> Improvement Suggestions:</h3>
                    <ul className="list-disc list-inside text-sm space-y-1 pl-6 text-foreground/90">
                     {result.improvementSuggestions.map((sug, index) => (
                       <li key={index}>{sug}</li>
                     ))}
                   </ul>
                 </div>
               )}
                {result.professionalRecommendation && (
                    <div>
                        <h3 className="font-semibold text-md mb-1 flex items-center gap-1.5"><User className="w-4 h-4 text-primary" /> Professional Consultation:</h3>
                        <p className="text-sm text-foreground/90 pl-6">{result.professionalRecommendation}</p>
                    </div>
                 )}

                {result.indianMedicalRecommendations && result.indianMedicalRecommendations.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-md mb-2 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-red-600" /> Dietitian/Nutritionist Recommendations in India (Verify Independently):</h3>
                    <ul className="space-y-2 pl-6">
                      {result.indianMedicalRecommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-foreground/90 border-l-2 border-red-500 pl-3 py-1">
                          <p className="font-medium">{rec.doctorName} - <span className="text-muted-foreground">{rec.specialty}</span></p>
                          <p>{rec.hospitalName}</p>
                          {rec.phoneNumber && <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground" /> {rec.phoneNumber}</p>}
                        </li>
                      ))}
                    </ul>
                     <p className="text-xs text-muted-foreground mt-2 pl-6">This is AI-generated information and requires verification. Please confirm details before acting.</p>
                  </div>
                )}
              
              <div className="border-t border-border pt-4">
                <Button
                  onClick={handleSaveResult}
                  className="w-full"
                  disabled={saving || saved || !userId}
                  variant={saved ? "default" : "default"}
                >
                  {saving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : saved ? (
                    <><CheckCircle className="mr-2 h-4 w-4" /> Saved to Dashboard</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Save to Dashboard</>
                  )}
                </Button>
              </div>

            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

