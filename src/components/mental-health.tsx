// Implemented by Gemini.
"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { assessMentalHealth } from "@/ai/flows/mental-health-flow"; // Import the Genkit flow
import type { AssessMentalHealthInput, AssessMentalHealthOutput } from "@/ai/flows/mental-health-flow";
import { saveAnalysis } from "@/services/firebaseService"; // Updated import
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, BrainCircuit, Smile, Info, User, ExternalLink, MessageSquareWarning, MapPin, Phone, Save, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// userId prop is now non-optional
interface MentalHealthProps {
  userId: string;
}

export function MentalHealth({ userId }: MentalHealthProps) {
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<AssessMentalHealthOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const clearState = () => {
    setResult(null);
    setError(null);
    setSaved(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clearState();
    if (!userId.trim()) {
        setError("User ID is required to perform analysis.");
        toast({ variant: "destructive", title: "User ID Missing", description: "Please enter your User ID on the main page."});
        return;
    }
    if (!description) {
      setError("Please describe how you're feeling or your concerns.");
      return;
    }
    
    setLoading(true);

    try {
      const input: AssessMentalHealthInput = {
        description,
        userId, 
      };
      const assessmentResult = await assessMentalHealth(input);
      setResult(assessmentResult);
      toast({
        title: "Mental Health Assessment Complete",
        description: "The preliminary analysis has finished.",
      });
    } catch (err) {
      console.error("Mental health assessment failed:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during analysis.";
      setError(errorMessage);
       toast({
        variant: "destructive",
        title: "Assessment Failed",
        description: `Could not complete the assessment: ${errorMessage}`,
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
      await saveAnalysis(userId, 'mentalHealthAssessments', result);
      setSaved(true);
      toast({
        title: "Result Saved",
        description: "Mental health assessment has been saved to your dashboard.",
      });
    } catch (saveError) {
      console.error("Failed to save mental health assessment:", saveError);
      const errorMessage = saveError instanceof Error ? saveError.message : "An unexpected error occurred.";
      setError(`Failed to save result: ${errorMessage}`);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: `Could not save the assessment: ${errorMessage}`,
      });
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = !loading && !!userId.trim() && !!description;

  return (
    <Card className="w-full border-none shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <BrainCircuit className="text-primary" /> Mental Well-being Check-in
        </CardTitle>
        <CardDescription>
          Describe your current feelings, mood, stress levels, or any mental health concerns for a preliminary AI analysis and resource suggestions. This is not a diagnosis or therapy replacement. Your User ID is required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
             <label htmlFor="mental-health-description" className="text-sm font-medium">Describe Your Feelings</label>
            <Textarea
              id="mental-health-description"
              placeholder="Describe your mood, feelings, stress, sleep patterns, or specific concerns (e.g., 'Feeling constantly anxious lately, having trouble sleeping', 'Lost interest in hobbies I used to enjoy', 'Overwhelmed with work stress')..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                clearState();
              }}
              required
              className="resize-none"
              rows={6}
              disabled={loading || !userId.trim()}
            />
          </div>

          <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={!canSubmit}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <Smile className="mr-2 h-4 w-4" /> Analyze Feelings
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
              <CardTitle className="text-lg font-semibold text-primary">Preliminary Analysis & Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               {result.assessment && (
                 <div>
                   <h3 className="font-semibold text-md mb-1 flex items-center gap-1.5"><BrainCircuit className="w-4 h-4 text-primary" /> Preliminary Assessment:</h3>
                   <p className="text-sm text-foreground/90 pl-6">{result.assessment}</p>
                 </div>
               )}
               {result.recommendations && result.recommendations.length > 0 && (
                 <div>
                   <h3 className="font-semibold text-md mb-2 flex items-center gap-1.5"><Smile className="w-4 h-4 text-primary" /> Recommendations & Strategies:</h3>
                   <ul className="list-disc list-inside text-sm space-y-1 pl-6 text-foreground/90">
                     {result.recommendations.map((rec, index) => (
                       <li key={index}>{rec}</li>
                     ))}
                   </ul>
                 </div>
               )}
               {result.resourceSuggestions && result.resourceSuggestions.length > 0 && (
                 <div>
                   <h3 className="font-semibold text-md mb-2 flex items-center gap-1.5"><User className="w-4 h-4 text-primary" /> Suggested Resources & Professionals:</h3>
                    <ul className="list-disc list-inside text-sm space-y-1 pl-6 text-foreground/90">
                     {result.resourceSuggestions.map((res, index) => (
                       <li key={index}>{res}</li>
                     ))}
                   </ul>
                 </div>
               )}
                {result.crisisWarning && (
                    <Alert variant="destructive" className="mt-4">
                        <MessageSquareWarning className="h-4 w-4" />
                        <AlertTitle>Important Note</AlertTitle>
                        <AlertDescription>
                            {result.crisisWarning} If you are in crisis or need immediate support, please reach out to a crisis hotline or mental health professional right away. Help is available.
                        </AlertDescription>
                    </Alert>
                )}

                {result.indianMedicalRecommendations && result.indianMedicalRecommendations.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-md mb-2 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-red-600" /> Mental Health Resources in India (Verify Independently):</h3>
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

