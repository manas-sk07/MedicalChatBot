
// Implemented by Gemini.
"use client"; 

import { useState, useEffect } from "react"; 
import Link from 'next/link'; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageAnalysis } from "@/components/image-analysis";
import { VoiceDiagnosis } from "@/components/voice-diagnosis";
import { SymptomChecker } from "@/components/symptom-checker"; 
import { MentalHealth } from "@/components/mental-health"; 
import { DietaryAnalysis } from "@/components/dietary-analysis"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label"; 
import { Button } from "@/components/ui/button"; 
import { User, LayoutDashboard, LogOut, LogIn, MessageCircleHeart } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [inputUserId, setInputUserId] = useState("");
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const { toast } = useToast();

   useEffect(() => { 
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlUserId = params.get('userId');
      if (urlUserId) {
        setActiveUserId(urlUserId);
        setInputUserId(urlUserId); // Sync input field if userId is in URL
      }
    }
  }, []); 

  const handleLogin = () => {
    if (!inputUserId.trim()) {
      toast({ variant: "destructive", title: "User ID Required", description: "Please enter a User ID to log in." });
      return;
    }
    setActiveUserId(inputUserId.trim());
    // Add userId to URL query params
    if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('userId', inputUserId.trim());
        window.history.replaceState({}, '', url.toString());
    }
    toast({ title: "Logged In", description: `User ID set to: ${inputUserId.trim()}` });
  };


  const handleLogout = () => {
    setActiveUserId(null);
    setInputUserId(""); // Clear the input field on logout
    // Clear userId from URL query params
    if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('userId');
        window.history.replaceState({}, '', url.toString());
    }
    toast({ title: "Logged Out", description: "User ID has been cleared." });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-secondary">
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
            <MessageCircleHeart className="w-8 h-8" /> AI Medical Chatbot
            </CardTitle>
          <CardDescription className="text-muted-foreground">
            AI-powered preliminary health insights. {activeUserId ? `Logged in as ${activeUserId}.` : "Enter your User ID to begin."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* User ID Input & Dashboard/Logout/Login Links */}
          <div className="mb-6 px-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-grow w-full">
                <Label htmlFor="user-id" className="text-sm font-medium flex items-center gap-1.5 mb-2">
                    <User className="w-4 h-4 text-muted-foreground"/> User ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="user-id"
                  type="text"
                  placeholder="Enter your unique User ID (e.g., user123)"
                  value={inputUserId}
                  onChange={(e) => setInputUserId(e.target.value)}
                  className="w-full"
                  required 
                  disabled={!!activeUserId} // Disable input if logged in
                />
                {!activeUserId && <p className="text-xs text-muted-foreground mt-1">This ID is required to group your analyses and view history.</p>}
                {activeUserId && <p className="text-xs text-muted-foreground mt-1">Logged in as: <span className="font-semibold text-primary">{activeUserId}</span></p>}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                {activeUserId ? (
                    <>
                        <Link href={`/dashboard?userId=${encodeURIComponent(activeUserId)}`} passHref legacyBehavior>
                            <Button variant="outline" className="w-full sm:w-auto sm:mt-6">
                                <LayoutDashboard className="mr-2 h-4 w-4" /> View Dashboard
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto sm:mt-6"
                            onClick={handleLogout}
                        >
                            <LogOut className="mr-2 h-4 w-4" /> Logout
                        </Button>
                    </>
                ) : (
                    <Button
                        variant="default"
                        className="w-full sm:w-auto sm:mt-6"
                        onClick={handleLogin}
                        disabled={!inputUserId.trim()}
                    >
                        <LogIn className="mr-2 h-4 w-4" /> Login
                    </Button>
                )}
            </div>
          </div>


          {/* Tabs */}
          <Tabs defaultValue="image" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 mb-6">
              <TabsTrigger value="image">Image Analysis</TabsTrigger>
              <TabsTrigger value="voice">Symptom Analysis</TabsTrigger>
              <TabsTrigger value="symptom-checker">Symptom Checker</TabsTrigger>
              <TabsTrigger value="mental-health">Mental Health</TabsTrigger>
              <TabsTrigger value="dietary">Dietary Analysis</TabsTrigger>
            </TabsList>
            <TabsContent value="image">
              <ImageAnalysis userId={activeUserId ?? ""} />
            </TabsContent>
            <TabsContent value="voice">
              <VoiceDiagnosis userId={activeUserId ?? ""} />
            </TabsContent>
            <TabsContent value="symptom-checker">
              <SymptomChecker userId={activeUserId ?? ""} />
            </TabsContent>
            <TabsContent value="mental-health">
               <MentalHealth userId={activeUserId ?? ""} />
            </TabsContent>
            <TabsContent value="dietary">
              <DietaryAnalysis userId={activeUserId ?? ""} />
            </TabsContent>
          </Tabs>

        </CardContent>
      </Card>
    </div>
  );
}

