import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, Timestamp, addDoc } from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export interface AnalysisRecord {
  id: string;
  userId: string;
  analysisType: 'imageAnalyses' | 'voiceDiagnoses' | 'dietaryAnalyses' | 'symptomChecks' | 'mentalHealthAssessments';
  timestamp: Date;
  result: any; // You can make this more specific based on your needs
}

export async function getUserAnalyses(userId: string): Promise<AnalysisRecord[]> {
  try {
    const analysesRef = collection(db, 'analyses');
    const q = query(analysesRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        analysisType: data.analysisType,
        timestamp: (data.timestamp as Timestamp).toDate(),
        result: data.result
      };
    });
  } catch (error) {
    console.error('Error fetching user analyses:', error);
    throw error;
  }
}

export async function saveAnalysis(userId: string, analysisType: AnalysisRecord['analysisType'], result: any): Promise<void> {
  try {
    const analysesRef = collection(db, 'analyses');
    await addDoc(analysesRef, {
      userId,
      analysisType,
      timestamp: Timestamp.now(),
      result
    });
  } catch (error) {
    console.error('Error saving analysis:', error);
    throw error;
  }
} 