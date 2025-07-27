// Implemented by Gemini.
"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState, useEffect, useRef } from "react";
import { voiceDiagnosis } from "@/ai/flows/voice-diagnosis";
import type { VoiceDiagnosisInput, VoiceDiagnosisOutput } from "@/ai/flows/voice-diagnosis";
import { saveAnalysis } from "@/services/firebaseService"; // Updated import
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Mic, Stethoscope, Lightbulb, Info, Volume2, Upload, User, FileAudio, ExternalLink, MapPin, Phone, Save, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Basic Web Speech API Check (client-side only)
const supportsSpeechRecognition = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

// userId prop is now non-optional
interface VoiceDiagnosisProps {
  userId: string;
}

export function VoiceDiagnosis({ userId }: VoiceDiagnosisProps) {
  const [symptomsDescription, setSymptomsDescription] = useState("");
  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [result, setResult] = useState<VoiceDiagnosisOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const clearState = () => {
    setResult(null);
    setError(null);
    setSaved(false);
  };

  useEffect(() => {
    if (!supportsSpeechRecognition) {
      console.warn("Speech Recognition API not supported in this browser.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return; 

    const recognition = new SpeechRecognition();
    recognition.continuous = false; 
    recognition.interimResults = false; 
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSymptomsDescription(prev => prev ? prev + " " + transcript : transcript); 
      setAudioDataUri(null); 
      setAudioFileName(null); 
      setIsListening(false); 
      clearState();
       toast({
        title: "Voice Input Received",
        description: "Your description has been transcribed.",
      });
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      let errorMessage = "Speech recognition failed.";
      if (event.error === 'no-speech') {
          errorMessage = "No speech detected. Please try again.";
      } else if (event.error === 'audio-capture') {
          errorMessage = "Audio capture failed. Check microphone permissions.";
      } else if (event.error === 'not-allowed') {
          errorMessage = "Microphone access denied. Please allow microphone access in your browser settings.";
      }
      setError(errorMessage);
      setIsListening(false);
       toast({
        variant: "destructive",
        title: "Voice Input Error",
        description: errorMessage,
      });
    };

     recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop(); 
        }
    };
  }, [toast]); 

  const handleListen = () => {
    clearState();
    if (!supportsSpeechRecognition || !recognitionRef.current) {
      setError("Voice input is not supported or enabled in your browser.");
       toast({
        variant: "destructive",
        title: "Voice Input Not Supported",
        description: "Your browser does not support the Web Speech API.",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        setSymptomsDescription(""); 
        setAudioDataUri(null); 
        setAudioFileName(null); 
        if (audioFileRef.current) audioFileRef.current.value = ""; 
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
          console.error("Error starting speech recognition:", err);
          setError("Could not start voice input. Please try again.");
          setIsListening(false);
           toast({
              variant: "destructive",
              title: "Voice Input Error",
              description: "Could not start voice input.",
           });
      }
    }
  };

  const handleAudioFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    clearState();
    const file = event.target.files?.[0];
    if (file) {
      setSymptomsDescription(""); 
      setIsListening(false); 
       if (recognitionRef.current && isListening) {
           recognitionRef.current.stop(); 
       }

      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        if (!dataUri.startsWith('data:audio/')) {
            setError("Invalid file type. Please upload an audio file (e.g., MP3, WAV, OGG, M4A).");
            setAudioDataUri(null);
            setAudioFileName(null);
            if (audioFileRef.current) audioFileRef.current.value = ""; 
             toast({
                variant: "destructive",
                title: "Invalid File Type",
                description: "Please upload a valid audio file.",
             });
            return;
        }
        setAudioDataUri(dataUri);
        setAudioFileName(file.name); 
         toast({
            title: "Audio File Selected",
            description: `Selected: ${file.name}`,
         });
      };
      reader.onerror = () => {
          setError("Failed to read the audio file.");
          setAudioDataUri(null);
          setAudioFileName(null);
          if (audioFileRef.current) audioFileRef.current.value = ""; 
          toast({
            variant: "destructive",
            title: "File Read Error",
            description: "Could not read the selected audio file.",
          });
      }
      reader.readAsDataURL(file);
    } else {
        setAudioDataUri(null);
        setAudioFileName(null);
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
    if (!symptomsDescription && !audioDataUri) {
      setError("Please describe your symptoms using text, voice, or by uploading an audio file.");
      return;
    }
    
    setLoading(true);

    try {
      const input: VoiceDiagnosisInput = {
        userId, 
      };
      if (audioDataUri) {
        input.audioDataUri = audioDataUri;
      } else if (symptomsDescription) {
        input.symptomsDescription = symptomsDescription;
      } else {
        throw new Error("No input provided.");
      }

      const diagnosisResult = await voiceDiagnosis(input);
      setResult(diagnosisResult);
       toast({
        title: "Analysis Complete", 
        description: "Symptom analysis has finished successfully.",
      });
    } catch (err) {
      console.error("Voice diagnosis failed:", err);
       const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during diagnosis.";
      setError(errorMessage);
       toast({
        variant: "destructive",
        title: "Analysis Failed", 
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
      await saveAnalysis(userId, 'voiceDiagnoses', result);
      setSaved(true);
      toast({
        title: "Result Saved",
        description: "Symptom analysis has been saved to your dashboard.",
      });
    } catch (saveError) {
      console.error("Failed to save voice diagnosis:", saveError);
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


   const canSubmit = !loading && !!userId.trim() && (!!symptomsDescription || !!audioDataUri);


  return (
    <Card className="w-full border-none shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
           <Volume2 className="text-primary" /> Symptom Analysis 
        </CardTitle>
        <CardDescription>
          Describe your symptoms via microphone, text, or audio file upload for AI analysis. Your User ID is required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
         <div className="space-y-2">
            <label htmlFor="symptoms-text" className="text-sm font-medium">Describe Symptoms (Text)</label>
             <Textarea
               id="symptoms-text"
               placeholder="Type your symptoms here (e.g., headache, fever, cough, duration...)"
               value={symptomsDescription}
               onChange={(e) => {
                   setSymptomsDescription(e.target.value);
                   setAudioDataUri(null); 
                   setAudioFileName(null);
                   if (audioFileRef.current) audioFileRef.current.value = ""; 
                   clearState();
               }}
               className="resize-none"
               rows={3}
               disabled={loading || isListening || !userId.trim()}
             />
         </div>

         <div className="flex items-center justify-center text-sm text-muted-foreground before:flex-1 before:border-t before:border-border before:me-4 after:flex-1 after:border-t after:border-border after:ms-4">
            OR
         </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {supportsSpeechRecognition && (
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                onClick={handleListen}
                disabled={loading || !userId.trim()}
                className="w-full sm:w-auto flex-grow"
                 aria-label={isListening ? "Stop listening" : "Start voice input"}
              >
                <Mic className="mr-2 h-4 w-4" />
                {isListening ? "Stop Listening" : "Use Microphone"}
              </Button>
            )}
             <Button
                 type="button"
                 variant="outline"
                 onClick={() => audioFileRef.current?.click()}
                 disabled={loading || !userId.trim()}
                 className="w-full sm:w-auto flex-grow"
             >
                 <Upload className="mr-2 h-4 w-4" /> Upload Audio File
             </Button>
             <Input
                 id="audio-upload"
                 type="file"
                 accept="audio/*" 
                 ref={audioFileRef}
                 onChange={handleAudioFileChange}
                 className="hidden" 
                 disabled={loading || !userId.trim()}
             />
          </div>

           {isListening && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" /> Listening... Speak clearly.
                </p>
            )}
             {audioFileName && !loading && (
                 <div className="text-sm text-muted-foreground flex items-center justify-center gap-2 border border-border rounded-md p-2 bg-secondary">
                    <FileAudio className="h-4 w-4 text-primary"/>
                    <span>Selected: {audioFileName}</span>
                 </div>
             )}
            {!supportsSpeechRecognition && (
                <p className="text-xs text-destructive text-center">Live voice input not supported by your browser. Use text or upload file.</p>
            )}

          <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={!canSubmit}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing Symptoms...
              </>
            ) : (
              <>
                <Stethoscope className="mr-2 h-4 w-4" /> Analyze Symptoms
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
              <CardTitle className="text-lg font-semibold text-primary">Analysis Suggestions</CardTitle> 
            </CardHeader>
            <CardContent className="space-y-4">
              {result.potentialConditions && result.potentialConditions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-md mb-2 flex items-center gap-1"><Stethoscope className="w-4 h-4 text-primary" /> Potential Conditions:</h3>
                  <ul className="list-disc list-inside text-sm space-y-1 pl-6 text-foreground/90">
                    {result.potentialConditions.map((condition, index) => (
                      <li key={index}>{condition}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.clarifyingQuestions && result.clarifyingQuestions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-md mb-2 flex items-center gap-1"><Lightbulb className="w-4 h-4 text-primary" /> Clarifying Questions:</h3>
                   <ul className="list-disc list-inside text-sm space-y-1 pl-6 text-foreground/90">
                    {result.clarifyingQuestions.map((question, index) => (
                      <li key={index}>{question}</li>
                    ))}
                  </ul>
                </div>
              )}
               {result.doctorRecommendations && result.doctorRecommendations.length > 0 && (
                 <div>
                   <h3 className="font-semibold text-md mb-2 flex items-center gap-1"><User className="w-4 h-4 text-primary" /> Suggested Specialists:</h3>
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

// Helper type for SpeechRecognition (necessary because TypeScript doesn't have built-in types for vendor-prefixed APIs)
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

