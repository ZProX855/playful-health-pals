
import React, { useState, useRef } from 'react';
import { Upload, Camera, Image, X, CheckCircle, EggIcon, Loader } from 'lucide-react';
import { recognizeMeal } from '../services/api';
import { toast } from 'sonner';

interface MealData {
  foodIdentified: string;
  nutritionInfo: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  recommendations: string;
}

const MealRecognition: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<MealData | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsUploading(true);
    setAnalyzeError(null);
    const file = e.target.files?.[0];
    
    if (file) {
      // Check if the file is an image
      if (!file.type.match('image.*')) {
        toast.error('Please select an image file');
        setIsUploading(false);
        return;
      }
      
      // Check file size (max 10MB to accommodate larger images)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size should be less than 10MB');
        setIsUploading(false);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setIsUploading(false);
        setResult(null); // Clear previous results
        // Auto-analyze the image after upload
        analyzeImage(reader.result as string);
      };
      reader.onerror = () => {
        toast.error('Error reading the image file');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } else {
      setIsUploading(false);
    }
  };
  
  const analyzeImage = async (imageData: string) => {
    if (!imageData) {
      toast.error('Please upload an image first');
      return;
    }
    
    setIsAnalyzing(true);
    setAnalyzeError(null);
    
    try {
      // Analyze with a timeout to handle long-running requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Analysis timeout')), 30000)
      );
      
      const analysisPromise = recognizeMeal(imageData);
      
      // Race between the analysis and the timeout
      const mealData = await Promise.race([
        analysisPromise,
        timeoutPromise
      ]) as MealData;
      
      if (mealData.foodIdentified === "Could not identify the meal") {
        setAnalyzeError("Could not identify the food in this image. Please try a clearer image of food.");
      } else {
        setResult(mealData);
      }
    } catch (error) {
      console.error("Meal recognition error:", error);
      let errorMessage = "Error analyzing the meal. Please try again.";
      
      if (error instanceof Error) {
        if (error.message === 'Analysis timeout') {
          errorMessage = "Analysis took too long. Please try a different image or try again later.";
        } else if (error.message.includes("API")) {
          errorMessage = "AI service temporarily unavailable. Please try again in a few moments.";
        }
      }
      
      toast.error(errorMessage);
      setAnalyzeError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleAnalyze = () => {
    if (selectedImage) {
      analyzeImage(selectedImage);
    }
  };
  
  const handleReset = () => {
    setSelectedImage(null);
    setResult(null);
    setAnalyzeError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Format recommendations with emojis and bullet points if they don't already have them
  const formatRecommendations = (text: string) => {
    if (!text) return '';
    
    // Check if the text already has bullet points or emojis
    if (text.includes('•') || text.includes('- ') || /[\u{1F300}-\u{1F6FF}]/u.test(text)) {
      return text;
    }
    
    // Split by lines and add emoji bullets
    const bullets = ['🥗', '💪', '🍽️', '👍', '✨'];
    return text.split('\n')
      .filter(line => line.trim().length > 0)
      .map((line, index) => {
        const emoji = bullets[index % bullets.length];
        return `${emoji} ${line}`;
      })
      .join('\n');
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="glass-panel p-6">
        <div className="mb-6">
          <h3 className="text-xl font-medium text-wellness-darkGreen mb-2">AI Meal Recognition</h3>
          <p className="text-wellness-charcoal text-sm">Upload a photo of your meal to get nutritional information and personalized recommendations.</p>
        </div>
        
        {!selectedImage ? (
          <div 
            className="border-2 border-dashed border-wellness-softGreen rounded-xl p-8 text-center bg-white bg-opacity-50 mb-6"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = e.dataTransfer.files;
              if (files.length > 0) {
                const file = files[0];
                if (file.type.match('image.*')) {
                  const dummyEvent = {
                    target: {
                      files: [file]
                    }
                  } as unknown as React.ChangeEvent<HTMLInputElement>;
                  handleImageChange(dummyEvent);
                } else {
                  toast.error('Please drop an image file');
                }
              }
            }}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              ref={fileInputRef}
            />
            {isUploading ? (
              <div className="flex flex-col items-center justify-center h-40">
                <div className="w-10 h-10 border-4 border-wellness-mediumGreen border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-wellness-darkGreen">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <div className="w-20 h-20 rounded-full bg-wellness-softGreen/50 flex items-center justify-center">
                  <Image className="h-10 w-10 text-wellness-darkGreen" />
                </div>
                <div>
                  <p className="text-wellness-darkGreen font-medium">Drag and drop an image here, or</p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 btn-secondary rounded-lg flex items-center justify-center gap-2 mx-auto"
                  >
                    <Upload className="h-5 w-5" />
                    Upload Image
                  </button>
                </div>
                <p className="text-sm text-wellness-charcoal/70">
                  Supported formats: JPG, PNG, WEBP (Max: 10MB)<br/>
                  Try to use clear, well-lit food images for best results
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-6">
            <div className="relative rounded-xl overflow-hidden mb-4">
              <img
                src={selectedImage}
                alt="Selected meal"
                className="w-full h-auto rounded-xl max-h-80 object-cover"
              />
              <button
                onClick={handleReset}
                className="absolute top-2 right-2 bg-wellness-darkGreen text-white p-1 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {isAnalyzing && (
              <div className="flex justify-center items-center py-8">
                <div className="flex flex-col items-center space-y-2">
                  <Loader className="h-10 w-10 text-wellness-darkGreen animate-spin" />
                  <p className="text-wellness-darkGreen">Analyzing your meal with Gemini Vision AI...</p>
                </div>
              </div>
            )}
            
            {analyzeError && !isAnalyzing && !result && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Analysis Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{analyzeError}</p>
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleAnalyze}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {!isAnalyzing && !analyzeError && !result && (
              <button
                onClick={handleAnalyze}
                className="btn-primary rounded-lg w-full flex items-center justify-center gap-2"
              >
                <Camera className="h-5 w-5" />
                Analyze Meal
              </button>
            )}
            
            {result && (
              <div className="animate-fade-in">
                <div className="bg-white bg-opacity-70 rounded-xl p-4 shadow-sm border border-wellness-softGreen/30 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-wellness-darkGreen" />
                    <h4 className="font-medium text-wellness-darkGreen">Identified Meal</h4>
                  </div>
                  
                  <div className="p-3 bg-wellness-softGreen/20 rounded-lg mb-4">
                    <p className="text-wellness-darkGreen">{result.foodIdentified}</p>
                  </div>
                  
                  <h4 className="font-medium text-wellness-darkGreen mb-2">Nutrition Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                    <div className="bg-wellness-softGreen/40 p-2 rounded-lg text-center flex flex-col justify-center">
                      <div className="text-sm text-wellness-charcoal">Calories</div>
                      <div className="font-medium text-wellness-darkGreen text-lg">{result.nutritionInfo.calories}</div>
                    </div>
                    <div className="bg-wellness-softGreen/40 p-2 rounded-lg text-center flex flex-col justify-center">
                      <div className="text-sm text-wellness-charcoal">Protein</div>
                      <div className="font-medium text-wellness-darkGreen text-lg">{result.nutritionInfo.protein}g</div>
                    </div>
                    <div className="bg-wellness-softGreen/40 p-2 rounded-lg text-center flex flex-col justify-center">
                      <div className="text-sm text-wellness-charcoal">Carbs</div>
                      <div className="font-medium text-wellness-darkGreen text-lg">{result.nutritionInfo.carbs}g</div>
                    </div>
                    <div className="bg-wellness-softGreen/40 p-2 rounded-lg text-center flex flex-col justify-center">
                      <div className="text-sm text-wellness-charcoal">Fats</div>
                      <div className="font-medium text-wellness-darkGreen text-lg">{result.nutritionInfo.fats}g</div>
                    </div>
                    <div className="bg-wellness-softGreen/40 p-2 rounded-lg text-center flex flex-col justify-center">
                      <div className="text-sm text-wellness-charcoal">Fiber</div>
                      <div className="font-medium text-wellness-darkGreen text-lg">{result.nutritionInfo.fiber}g</div>
                    </div>
                  </div>
                  
                  <div className="bg-wellness-softGreen/30 p-3 rounded-lg">
                    <h4 className="font-medium text-wellness-darkGreen mb-1">Recommendations</h4>
                    <div className="text-sm text-wellness-charcoal whitespace-pre-line">
                      {formatRecommendations(result.recommendations)}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-2 px-4 bg-wellness-softGreen text-wellness-darkGreen rounded-lg hover:bg-wellness-softGreen/80 transition-colors"
                  >
                    Analyze Another Meal
                  </button>
                  <button
                    onClick={() => {
                      // In a real app, this would save the meal to the user's history
                      toast.success('Meal saved to your history!');
                    }}
                    className="flex-1 py-2 px-4 bg-wellness-darkGreen text-white rounded-lg hover:bg-wellness-darkGreen/90 transition-colors"
                  >
                    Save to History
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MealRecognition;
