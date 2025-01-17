"use client";
import { useState, useRef } from 'react';
import Image from 'next/image';
import { 
  Upload, 
  Loader2, 
  AlertTriangle, 
  Info,
  CheckCircle,
  AlertCircle 
} from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import './styles/results.css';

interface AnalysisResult {
  severity: string;
  confidence: number;
  severity_scores: Record<string, number>;
  processing_time: number;
}

const severityColors: Record<string, string> = {
  'No DR': 'bg-green-100 text-green-800',
  'Mild DR': 'bg-yellow-100 text-yellow-800',
  'Moderate DR': 'bg-orange-100 text-orange-800',
  'Severe DR': 'bg-red-100 text-red-800',
  'Proliferative DR': 'bg-red-200 text-red-900'
};

const CONFIDENCE_THRESHOLDS = {
  HIGH: 70,
  MODERATE: 50,
  LOW: 30
};

const getConfidenceLevel = (confidence: number): {color: string; message: string; icon: React.ReactNode} => {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return { 
    color: 'text-green-600',
    message: 'High confidence prediction',
    icon: <CheckCircle className="w-5 h-5" />
  };
  if (confidence >= CONFIDENCE_THRESHOLDS.MODERATE) return { 
    color: 'text-yellow-600',
    message: 'Moderate confidence - consider second opinion',
    icon: <AlertCircle className="w-5 h-5" />
  };
  return { 
    color: 'text-red-600',
    message: 'Low confidence - results may not be reliable',
    icon: <AlertTriangle className="w-5 h-5" />
  };
};

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (file: File) => {
    // Reset states
    setError(null);
    setAnalysisResult(null);

    // Validate file type and size
    if (!file.type.includes('image/')) {
      setError('Please select a valid image file (JPEG, PNG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    try {
      setSelectedImage(URL.createObjectURL(file));
      setUploading(true);
      setAnalyzing(true);
      
      const formData = new FormData();
      formData.append('file', file);

      const isDev = process.env.NEXT_PUBLIC_APP_ENV === 'development';
      if (isDev) {
        console.log('Running in development mode');
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Server response:', result);
        throw new Error(result.error || `Server error: ${response.status}`);
      }

      if (result.success && result.result) {
        setAnalysisResult(result.result);
      } else {
        throw new Error(result.error || 'Failed to analyze image');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error processing image');
      setAnalysisResult(null);
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageSelect(file);
  };

  const formatConfidence = (confidence: number): string => {
    return `${confidence.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <main className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Diabetic Retinopathy Detection</h1>
          <p className="text-gray-600">Upload a retinal image for automated DR screening</p>
        </header>

        <section className="bg-white p-8 rounded-lg shadow-lg">
          <div
            className={`
              border-2 border-dashed rounded-lg p-12 text-center transition-colors
              ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-blue-400'}
            `}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              title="Select Image"
              onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
            />
            
            {selectedImage ? (
              <div className="space-y-4">
                <div className="relative h-64 w-full">
                  <Image
                    src={selectedImage}
                    alt="Selected retinal image"
                    fill
                    className="object-contain rounded-lg"
                  />
                </div>
                <button 
                  className={`
                    inline-flex items-center gap-2 px-6 py-3 rounded-full
                    ${uploading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-500 hover:bg-blue-600'
                    } 
                    text-white font-medium transition-colors
                  `}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || analyzing}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>Select Another Image</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-12 h-12 mx-auto text-gray-400" />
                <div>
                  <p className="text-gray-600">
                    Drag and drop your retinal image here, or click to select
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Supported formats: JPEG, PNG (max 10MB)
                  </p>
                </div>
                <button 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-full transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-5 h-5" />
                  <span>Select Image</span>
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
            <div className="p-6 bg-white rounded-lg shadow-sm">
              {analyzing ? (
                <div className="flex items-center justify-center">
                  <p className="text-gray-700">Analyzing image...</p>
                </div>
              ) : analysisResult ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Severity Level:</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${severityColors[analysisResult.severity]}`}>
                        {analysisResult.severity}
                      </span>
                      {analysisResult.confidence < CONFIDENCE_THRESHOLDS.MODERATE && (
                        <Tooltip tooltip="Low confidence prediction">
                          <Info className="confidence-indicator" />
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  
                  {/* Enhanced confidence display */}
                  <div className="flex flex-col gap-2 p-4 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Confidence:</span>
                      <div className="flex items-center gap-2">
                        {getConfidenceLevel(analysisResult.confidence).icon}
                        <span className={`font-medium ${getConfidenceLevel(analysisResult.confidence).color}`}>
                          {formatConfidence(analysisResult.confidence)}
                        </span>
                      </div>
                    </div>
                    <p className={`text-sm ${getConfidenceLevel(analysisResult.confidence).color}`}>
                      {getConfidenceLevel(analysisResult.confidence).message}
                    </p>
                  </div>

                  {/* Update severity scores visualization */}
                  {analysisResult.severity_scores && (
                    <div className="mt-4 pt-4 border-t">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        Detailed Scores
                        <Tooltip tooltip="Confidence scores for each severity level">
                          <Info className="confidence-indicator" />
                        </Tooltip>
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(analysisResult.severity_scores)
                          .sort(([,a], [,b]) => b - a)
                          .map(([level, score]) => (
                            <div key={level} className="flex items-center gap-2">
                              <span className="score-label">{level}:</span>
                              <div className="progress-bar">
                                <div 
                                  className={`progress-bar-fill ${
                                    score > CONFIDENCE_THRESHOLDS.HIGH 
                                      ? 'progress-bar-fill-high'
                                      : score > CONFIDENCE_THRESHOLDS.MODERATE 
                                      ? 'progress-bar-fill-moderate'
                                      : 'progress-bar-fill-low'
                                  } w-progress-${Math.round((score / 100) * 4) * 25}`}
                                />
                              </div>
                              <span className="score-value">
                                {formatConfidence(score)}
                              </span>
                            </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enhanced recommendations */}
                  {analysisResult.confidence < CONFIDENCE_THRESHOLDS.MODERATE && (
                    <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                      <div className="flex gap-2 items-start text-yellow-800">
                        <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium mb-2">Due to the low confidence scores:</p>
                          <ul className="list-disc ml-5 space-y-1">
                            <li>Consult with a healthcare professional for accurate diagnosis</li>
                            <li>Consider retaking the image with better lighting and focus</li>
                            <li>Use this result only as a preliminary screening tool</li>
                            <li>Regular eye examinations are recommended for diabetic patients</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-700 text-center">
                  {selectedImage ? 'Analysis complete' : 'No image analyzed yet'}
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
