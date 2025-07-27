// src/app/(app)/dashboard/page.tsx
"use client"; // Make this a client component

import { useEffect, useState } from 'react';
import { getUserAnalyses, AnalysisRecord } from '@/services/firebaseService'; // Path might need update if service file is renamed
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileText, Microscope, Stethoscope, BrainCircuit, Apple, UtensilsCrossed, Volume2, ClipboardList, FileImage, HeartPulse, MapPin, Phone, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams } from 'next/navigation'; // Hook for accessing search params in client components

// Helper function to get appropriate icon and title based on analysis type
const getAnalysisDisplayInfo = (type: AnalysisRecord['analysisType']) => {
  switch (type) {
    case 'imageAnalyses':
      return { icon: FileImage, title: 'Skin Image Analysis', variant: 'default' as const };
    case 'voiceDiagnoses':
      return { icon: Volume2, title: 'Symptom Analysis (Audio/Text)', variant: 'secondary' as const };
    case 'symptomChecks':
      return { icon: ClipboardList, title: 'Symptom Checker', variant: 'destructive' as const };
    case 'mentalHealthAssessments':
      return { icon: BrainCircuit, title: 'Mental Well-being Check-in', variant: 'default' as const };
    case 'dietaryAnalyses':
      return { icon: UtensilsCrossed, title: 'Dietary Analysis', variant: 'secondary' as const };
    default:
      return { icon: FileText, title: 'Unknown Analysis', variant: 'outline' as const };
  }
};

// Component to render the details of a specific analysis result
const AnalysisResultDetails: React.FC<{ result: any; type: AnalysisRecord['analysisType'] }> = ({ result, type }) => {
    // Common fields
    const assessment = result.assessment;
    const recommendations = result.recommendations || result.suggestedNextSteps || result.improvementSuggestions;
    const doctorRecommendations = result.doctorRecommendations || result.resourceSuggestions; // Combine doctor/resource suggestions
    const indianMedicalRecommendations = result.indianMedicalRecommendations;

    // Specific fields based on type
    const potentialConditions = result.potentialConditions;
    const clarifyingQuestions = result.clarifyingQuestions;
    const urgency = result.urgency;
    const urgencyReasoning = result.urgencyReasoning;
    const crisisWarning = result.crisisWarning;
    const nutritionalBreakdown = result.nutritionalBreakdown;
    const healthObservations = result.healthObservations;
    const professionalRecommendation = result.professionalRecommendation; // Specific to dietary

    return (
        <div className="space-y-3 text-sm text-foreground/90">
            {assessment && <div><strong>Assessment:</strong> <p className="pl-4">{assessment}</p></div>}
            {potentialConditions && potentialConditions.length > 0 && (
                <div><strong>Potential Conditions:</strong>
                    <ul className="list-disc pl-8">
                        {potentialConditions.map((cond: string, i: number) => <li key={i}>{cond}</li>)}
                    </ul>
                </div>
            )}
             {urgency && (
                <div><strong>Urgency:</strong> <Badge variant={urgency === 'High' ? 'destructive' : urgency === 'Medium' ? 'secondary' : 'default'} className="ml-2">{urgency}</Badge>
                   {urgencyReasoning && <p className="pl-4 text-xs text-muted-foreground">{urgencyReasoning}</p>}
                </div>
             )}
            {recommendations && recommendations.length > 0 && (
                <div><strong>Recommendations / Next Steps:</strong>
                    <ul className="list-disc pl-8">
                        {Array.isArray(recommendations) ? recommendations.map((rec: string, i: number) => <li key={i}>{rec}</li>) : <li>{recommendations}</li>}
                    </ul>
                </div>
            )}
             {nutritionalBreakdown && <div><strong>Nutritional Breakdown:</strong> <p className="pl-4 whitespace-pre-line">{nutritionalBreakdown}</p></div>}
             {healthObservations && healthObservations.length > 0 && (
                <div><strong>Health Observations:</strong>
                    <ul className="list-disc pl-8">
                        {healthObservations.map((obs: string, i: number) => <li key={i}>{obs}</li>)}
                    </ul>
                </div>
             )}
            {clarifyingQuestions && clarifyingQuestions.length > 0 && (
                <div><strong>Clarifying Questions:</strong>
                    <ul className="list-disc pl-8">
                        {clarifyingQuestions.map((q: string, i: number) => <li key={i}>{q}</li>)}
                    </ul>
                </div>
            )}
            {doctorRecommendations && doctorRecommendations.length > 0 && (
                <div><strong>Suggested Specialists / Resources:</strong>
                    <ul className="list-disc pl-8">
                        {doctorRecommendations.map((doc: string, i: number) => <li key={i}>{doc}</li>)}
                    </ul>
                </div>
            )}
            {professionalRecommendation && type === 'dietaryAnalyses' && (
                 <div><strong>Professional Consultation:</strong> <p className="pl-4">{professionalRecommendation}</p></div>
            )}
             {crisisWarning && (
                 <div className="text-destructive p-2 border border-destructive/50 rounded-md bg-destructive/10"><strong>Crisis Warning:</strong> {crisisWarning}</div>
             )}
             {indianMedicalRecommendations && indianMedicalRecommendations.length > 0 && (
                <div>
                    <h4 className="font-semibold text-md flex items-center gap-1.5 mt-3 mb-1"><MapPin className="w-4 h-4 text-red-600" /> Medical Recommendations in India (Verify Independently):</h4>
                    <ul className="space-y-2 pl-4">
                      {indianMedicalRecommendations.map((rec: any, i: number) => (
                        <li key={i} className="text-sm border-l-2 border-red-500 pl-3 py-1 bg-secondary/30 rounded-r-md">
                          <p className="font-medium">{rec.doctorName} - <span className="text-muted-foreground">{rec.specialty}</span></p>
                          <p>{rec.hospitalName}</p>
                          {rec.phoneNumber && <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground" /> {rec.phoneNumber}</p>}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2 pl-4">This is AI-generated information. Please verify all details independently before acting.</p>
                </div>
            )}
        </div>
    );
};


export default function DashboardPage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    if (userId) {
      setLoading(true);
      setError(null);
      getUserAnalyses(userId)
        .then(data => {
          setAnalyses(data);
        })
        .catch(err => {
          console.error("Failed to load analyses from localStorage:", err);
          setError("Failed to load analysis history.");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
        setLoading(false);
    }
  }, [userId]);


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-secondary">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-secondary">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-destructive">User ID Missing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please provide a User ID in the URL to view the dashboard (e.g., /dashboard?userId=your_id).</p>
             <p className="mt-4 text-sm">Go back to the <a href="/" className="text-primary hover:underline">main page</a> to enter your User ID.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-secondary">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-destructive">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
             <p className="mt-4 text-sm">Please try refreshing the page or go back to the <a href={`/?userId=${userId}`} className="text-primary hover:underline">main page</a>.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
       <Card className="mb-8 shadow-md">
         <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                <HeartPulse /> User Dashboard
            </CardTitle>
            <CardDescription>
                Showing analysis history for User ID: <span className="font-semibold text-primary">{userId}</span>
            </CardDescription>
         </CardHeader>
       </Card>

      {analyses.length === 0 ? (
         <Card className="text-center py-10">
             <CardContent>
                <p className="text-muted-foreground">No analysis history found for this User ID.</p>
                <p className="mt-2 text-sm">Go to the <a href={`/?userId=${userId}`} className="text-primary hover:underline">main page</a> to perform an analysis.</p>
            </CardContent>
         </Card>
      ) : (
        <Accordion type="single" collapsible className="w-full space-y-4">
          {analyses.map((analysis, index) => {
            const { icon: Icon, title, variant } = getAnalysisDisplayInfo(analysis.analysisType);
            const timestampDate = new Date(analysis.timestamp); // Timestamp is now an ISO string

            return (
              <AccordionItem key={analysis.id || index} value={`item-${analysis.id || index}`} className="bg-card border rounded-lg shadow-sm overflow-hidden">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-secondary/50">
                  <div className="flex items-center gap-4 flex-grow">
                    <Icon className="w-5 h-5 text-primary" />
                    <div className="flex-grow text-left">
                         <span className="font-semibold">{title}</span>
                         <p className="text-xs text-muted-foreground mt-1">
                           {formatDistanceToNow(timestampDate, { addSuffix: true })}
                           {' '} - {timestampDate.toLocaleString()}
                         </p>
                    </div>
                     <Badge variant={variant} className="ml-auto mr-4">{analysis.analysisType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace('Analyses', 'Analysis').replace('Diagnoses', 'Diagnosis').replace('Assessments', 'Assessment').replace('Checks', 'Check')}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 pt-2 border-t border-border">
                    <AnalysisResultDetails result={analysis.result} type={analysis.analysisType} />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

// Removed: export const dynamic = 'force-dynamic'; as it's client-rendered.
// dynamic export is for server components/route handlers.
