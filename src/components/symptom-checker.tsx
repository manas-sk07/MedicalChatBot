// Implemented by Gemini.
"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { checkSymptoms } from "@/ai/flows/symptom-checker-flow"; // Import the Genkit flow
import type { CheckSymptomsInput, CheckSymptomsOutput } from "@/ai/flows/symptom-checker-flow";
import { saveAnalysis } from "@/services/firebaseService"; // Updated import
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ClipboardList, Lightbulb, Info, User, ExternalLink, MapPin, Phone, Save, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// userId prop is now non-optional
interface SymptomCheckerProps {
  userId: string;
}

export function SymptomChecker({ userId }: SymptomCheckerProps) {
  const [symptoms, setSymptoms] = useState("");
  const [result, setResult] = useState<CheckSymptomsOutput | null>(null);
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
    if (!symptoms) {
      setError("Please describe your symptoms.");
      return;
    }
    
    setLoading(true);

    try {
      const input: CheckSymptomsInput = {
        symptoms,
        userId, 
      };
      const checkerResult = await checkSymptoms(input);
      setResult(checkerResult);
      toast({
        title: "Symptom Check Complete",
        description: "The symptom analysis has finished successfully.",
      });
    } catch (err) {
      console.error("Symptom check failed:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during analysis.";
      setError(errorMessage);
       toast({
        variant: "destructive",
        title: "Symptom Check Failed",
        description: `Could not analyze symptoms: ${errorMessage}`,
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
      await saveAnalysis(userId, 'symptomChecks', result);
      setSaved(true);
      toast({
        title: "Result Saved",
        description: "Symptom check has been saved to your dashboard.",
      });
    } catch (saveError) {
      console.error("Failed to save symptom check:", saveError);
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

  const canSubmit = !loading && !!userId.trim() && !!symptoms;

  return (
    <Card className="w-full border-none shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <ClipboardList className="text-primary" /> Symptom Checker
        </CardTitle>
        <CardDescription>
          Describe your symptoms in detail for an AI-powered preliminary analysis and potential next steps. Your User ID is required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
             <label htmlFor="symptoms-description" className="text-sm font-medium">Symptoms Description</label>
            <Textarea
              id="symptoms-description"
              placeholder="Enter all your symptoms, including severity, duration, onset, and any related factors (e.g., 'Severe headache started yesterday, feeling nauseous, pain behind right eye, sensitive to light')..."
              value={symptoms}
              onChange={(e) => {
                setSymptoms(e.target.value);
                clearState();
              }}
              required
              className="resize-none"
              rows={5}
              disabled={loading || !userId.trim()}
            />
          </div>

          <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={!canSubmit}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking Symptoms...
              </>
            ) : (
              <>
                <ClipboardList className="mr-2 h-4 w-4" /> Check Symptoms
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
              <CardTitle className="text-lg font-semibold text-primary">Symptom Analysis Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.potentialConditions && result.potentialConditions.length > 0 && (
                 <div>
                   <h3 className="font-semibold text-md mb-2 flex items-center gap-1.5"><ClipboardList className="w-4 h-4 text-primary" /> Potential Conditions:</h3>
                   <ul className="list-disc list-inside text-sm space-y-1 pl-6 text-foreground/90">
                     {result.potentialConditions.map((condition, index) => (
                       <li key={index}>{condition}</li>
                     ))}
                   </ul>
                 </div>
              )}
               {result.urgency && (
                 <div>
                    <h3 className="font-semibold text-md mb-1 flex items-center gap-1.5">
                       <Info className={cn("w-4 h-4", result.urgency === 'High' ? 'text-destructive' : result.urgency === 'Medium' ? 'text-orange-500' : 'text-green-600')} />
                       Urgency Assessment:
                    </h3>
                    <p className={cn("text-sm pl-6", result.urgency === 'High' ? 'text-destructive font-medium' : result.urgency === 'Medium' ? 'text-orange-600' : 'text-green-700')}>
                        {result.urgency}
                    </p>
                    <p className="text-xs text-muted-foreground pl-6">{result.urgencyReasoning}</p>
                 </div>
               )}
               {result.suggestedNextSteps && result.suggestedNextSteps.length > 0 && (
                 <div>
                   <h3 className="font-semibold text-md mb-2 flex items-center gap-1.5"><Lightbulb className="w-4 h-4 text-primary" /> Suggested Next Steps:</h3>
                   <ul className="list-disc list-inside text-sm space-y-1 pl-6 text-foreground/90">
                     {result.suggestedNextSteps.map((step, index) => (
                       <li key={index}>{step}</li>
                     ))}
                   </ul>
                 </div>
               )}
               {result.doctorRecommendations && result.doctorRecommendations.length > 0 && (
                 <div>
                   <h3 className="font-semibold text-md mb-2 flex items-center gap-1.5"><User className="w-4 h-4 text-primary" /> Suggested Specialists:</h3>
                    <ul className="list-disc list-inside text-sm space-y-1 pl-6 text-foreground/90">
                     {result.doctorRecommendations.map((doctor, index) => (
                       <li key={index}>{doctor}</li>
                     ))}
                   </ul>
                 </div>
               )}

              {result.indianMedicalRecommendations && result.indianMedicalRecommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-md mb-2 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-red-600" /> Medical Recommendations in India (Verify Independently):</h3>
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

