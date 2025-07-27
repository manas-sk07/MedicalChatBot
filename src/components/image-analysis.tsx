// Implemented by Gemini.
"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { analyzeImage } from "@/ai/flows/analyze-image";
import type { AnalyzeImageInput, AnalyzeImageOutput } from "@/ai/flows/analyze-image";
import { saveAnalysis } from "@/services/firebaseService"; // Updated import
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Upload, FileImage, Microscope, Info, User, ExternalLink, MapPin, Phone, Save, CheckCircle } from "lucide-react";
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// userId prop is now non-optional
interface ImageAnalysisProps {
  userId: string;
}

export function ImageAnalysis({ userId }: ImageAnalysisProps) {
  const [description, setDescription] = useState("");
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeImageOutput | null>(null);
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

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    clearState();
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        if (!dataUri.startsWith('data:image/')) {
            setError("Invalid file type. Please upload an image (PNG, JPG, WEBP, etc.).");
            setPhotoDataUri(null);
            if (event.target) event.target.value = ""; 
             toast({
                variant: "destructive",
                title: "Invalid File Type",
                description: "Please upload a valid image file.",
             });
            return;
        }
        setPhotoDataUri(dataUri);
         toast({
            title: "Image Selected",
            description: `Selected: ${file.name}`,
         });
      };
      reader.onerror = () => {
          setError("Failed to read the image file.");
          setPhotoDataUri(null);
           if (event.target) event.target.value = ""; 
            toast({
              variant: "destructive",
              title: "File Read Error",
              description: "Could not read the selected image file.",
            });
      }
      reader.readAsDataURL(file);
    } else {
        setPhotoDataUri(null);
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
    if (!photoDataUri || !description) {
      setError("Please provide both an image and a description.");
      return;
    }
    
    setLoading(true);

    try {
      const input: AnalyzeImageInput = {
        photoDataUri,
        description,
        userId, 
      };
      const analysisResult = await analyzeImage(input);
      setResult(analysisResult);
      toast({
        title: "Analysis Complete",
        description: "The image analysis has finished successfully.",
      });
    } catch (err) {
      console.error("Image analysis failed:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during analysis.";
      setError(errorMessage);
       toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: `Could not analyze the image: ${errorMessage}`,
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
      await saveAnalysis(userId, 'imageAnalyses', result);
      setSaved(true);
      toast({
        title: "Result Saved",
        description: "Image analysis has been saved to your dashboard.",
      });
    } catch (saveError) {
      console.error("Failed to save image analysis:", saveError);
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

  const canSubmit = !loading && !!userId.trim() && !!photoDataUri && !!description;

  return (
    <Card className="w-full border-none shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <FileImage className="text-primary" /> Image-Based Assessment
        </CardTitle>
        <CardDescription>
          Upload an image of your skin condition and provide a brief description for AI analysis. This is not a diagnosis. Your User ID is required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="image-upload" className="text-sm font-medium">Upload Image</label>
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="cursor-pointer file:text-accent file:font-semibold"
              disabled={loading || !userId.trim()}
            />
             {photoDataUri && !loading && (
              <div className="mt-4 border rounded-md overflow-hidden w-32 h-32 relative shadow-sm">
                 <Image
                    src={photoDataUri}
                    alt="Uploaded condition"
                    layout="fill"
                    objectFit="cover"
                    data-ai-hint="skin condition rash mole"
                  />
              </div>
            )}
          </div>

          <div className="space-y-2">
             <label htmlFor="description" className="text-sm font-medium">Description</label>
            <Textarea
              id="description"
              placeholder="Describe the condition, symptoms (e.g., itching, pain), duration, and any other relevant details..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                clearState();
              }}
              required
              className="resize-none"
              rows={4}
              disabled={loading || !userId.trim()}
            />
          </div>

          <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={!canSubmit}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing Image...
              </>
            ) : (
              <>
                <Microscope className="mr-2 h-4 w-4" /> Analyze Condition
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
              <CardTitle className="text-lg font-semibold text-primary">Analysis Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-md mb-1 flex items-center gap-1.5"><Microscope className="w-4 h-4 text-primary"/> Preliminary Assessment:</h3>
                 <p className="text-sm text-foreground/90 pl-6">{result.assessment}</p>
              </div>
              <div>
                <h3 className="font-semibold text-md mb-1 flex items-center gap-1.5"><Info className="w-4 h-4 text-primary"/> Recommendations:</h3>
                 <p className="text-sm text-foreground/90 pl-6">{result.recommendations}</p>
              </div>
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

