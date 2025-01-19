"use client";
import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Upload, Loader2, AlertTriangle, Info, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import '../styles/dashboard.css';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { AnalysisResponse, AnalysisData } from '@/types/analysis';

interface AnalysisResult extends AnalysisData {
  id: string;
  date: string;
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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

const API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';

const Dashboard: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setIsAnalyzing] = useState(false);
  const [uploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cameraMode] = useState<'environment' | 'user'>('environment');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please upload a JPEG or PNG image.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 10MB.';
    }
    return null;
  };

  const handleImageSelect = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file); // Changed from 'image' to 'file' to match FastAPI

      console.log('Sending request to:', `${API_URL}/predict`);

      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        body: formData,
        // Remove headers to let browser set correct Content-Type with boundary
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const result: AnalysisResponse = await response.json();
      console.log('API Response:', result);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Analysis failed');
      }

      const analysisData = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        ...result.data,
      };

      setAnalysisResult(analysisData);
      setAnalysisHistory(prev => [analysisData, ...prev]);
      setSelectedImage(URL.createObjectURL(file));
      
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setAnalysisResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageSelect(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setError('No file selected');
      return;
    }
    handleImageSelect(file);
  };

  const formatConfidence = (confidence: number): string => {
    return `${confidence.toFixed(1)}%`;
  };

  const startCamera = useCallback(async () => {
    try {
      // First stop any existing streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              resolve(true);
            };
          }
        });

        await videoRef.current.play();
        setIsCameraOpen(true);
        setCameraReady(true);
        setCameraError(null);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Could not access camera. Please check permissions and try again.');
      setIsCameraOpen(false);
      setCameraReady(false);
    }
  }, [cameraMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setCameraReady(false);
  }, []);

  const captureImage = useCallback(async () => {
    if (!videoRef.current || !isCameraReady) {
      setCameraError('Camera is not ready');
      return;
    }

    try {
      setIsCapturing(true);
      setError(null);

      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      
      // Use actual video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Draw current frame
      ctx.drawImage(video, 0, 0);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to capture image'));
          },
          'image/jpeg',
          0.95
        );
      });

      const file = new File([blob], 'retina-capture.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      // Set preview and process image
      setSelectedImage(URL.createObjectURL(blob));
      
      // Stop camera before processing
      stopCamera();
      
      // Process the image
      await handleImageSelect(file);
    } catch (error) {
      console.error('Error capturing:', error);
      setCameraError('Failed to capture image. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  }, [isCameraReady, handleImageSelect, stopCamera]);

  const renderSeverityScores = () => {
    if (!analysisResult?.severity_scores) return null;

    return Object.entries(analysisResult.severity_scores)
      .sort(([,a], [,b]) => b - a)
      .map(([level, score]) => (
        <div key={level} className="flex items-center gap-2">
          <span className="score-label">{level}:</span>
          <div className="progress-bar-container">
            <div 
              className={`
                progress-bar-fill 
                ${getProgressBarColorClass(score)}
                w-${Math.round(score / 10) * 10}
              `}
            />
          </div>
          <span className="score-value">
            {formatConfidence(score)}
          </span>
        </div>
      ));
  };

  const renderCamera = useCallback(() => (
    <div className="space-y-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted // Add muted attribute
          className="w-full h-full object-cover"
          aria-label="Camera preview"
        />
        {!isCameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
            <span className="ml-2 text-white">Starting camera...</span>
          </div>
        )}
        {isCapturing && (
          <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-700" />
            <span className="ml-2 text-gray-700">Capturing...</span>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={captureImage}
          disabled={!isCameraReady || isCapturing}
          className={`
            inline-flex items-center gap-2 px-6 py-3 rounded-full
            ${!isCameraReady || isCapturing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600 active:scale-95'
            }
            text-white font-medium transition-all transform
          `}
          aria-label="Capture photo"
        >
          {isCapturing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Capturing...</span>
            </>
          ) : (
            <>
              <Camera className="w-5 h-5" />
              <span>Capture Photo</span>
            </>
          )}
        </button>

        <button
          onClick={stopCamera}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-full transition-colors"
          aria-label="Stop camera"
        >
          Cancel
        </button>
      </div>
    </div>
  ), [isCameraReady, isCapturing, captureImage, stopCamera]);

  const renderAnalysisResults = () => {
    if (analyzing) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="relative">
            <ProgressRing progress={75} className="mb-4" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Analyzing image...</p>
        </div>
      );
    }

    if (!selectedImage) {
      return (
        <p className="text-gray-700 text-center">
          No image uploaded yet
        </p>
      );
    }

    if (error) {
      return (
        <div className="text-center text-red-600">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      );
    }

    if (!analysisResult) {
      return (
        <p className="text-gray-700 text-center">
          Upload an image to see analysis results
        </p>
      );
    }

    return (
      <div className="space-y-6 card-hover">
        <div className="flex items-center justify-between p-4 glassmorphism rounded-lg">
          <span className="text-gray-600 dark:text-gray-400">Severity Level:</span>
          <div className="flex items-center gap-2">
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${severityColors[analysisResult.severity]}`}>
              {analysisResult.severity}
            </span>
          </div>
        </div>
        
        {/* Enhanced confidence display */}
        <div className="flex items-center justify-between p-6 glassmorphism rounded-lg">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Confidence Score</h3>
            <p className={`text-sm ${getConfidenceLevel(analysisResult.confidence).color}`}>
              {getConfidenceLevel(analysisResult.confidence).message}
            </p>
          </div>
          <ProgressRing 
            progress={analysisResult.confidence} 
            size={80} 
            className="ml-4"
          />
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
              {renderSeverityScores()}
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
    );
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <main className="max-w-4xl mx-auto">
        {/* Floating Action Menu */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="floating-action-button glassmorphism group"
            aria-label="Quick analyze"
          >
            <Camera className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
          <button
            onClick={() => {
              setIsCameraOpen(true);
              startCamera();
            }}
            className="floating-action-button glassmorphism group bg-green-500"
            aria-label="Open camera"
          >
            <Upload className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Enhanced Header with Animation */}
        <header className="text-center mb-12 slide-up">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent 
                         filter drop-shadow-lg animate-gradient">
            Diabetic Retinopathy Detection
          </h1>
          <p className="text-gray-600 dark:text-gray-400 animate-float">
            Upload a retinal image for automated DR screening
          </p>
        </header>

        {/* Analysis Section with Glassmorphism */}
        <section className="glassmorphism p-8 rounded-lg shadow-lg transition-all fade-in">
          {isCameraOpen ? renderCamera() : (
            <div
              className={`drop-zone ${error ? 'drop-zone-error' : 'drop-zone-default'}`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                title="Select Image"
                onChange={handleFileChange}
              />
              
              {selectedImage ? (
                <div className="space-y-4">
                  <div className="relative h-64 w-full">
                    <Image
                      src={selectedImage || "/placeholder.svg"}
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
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading || analyzing}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        <span>Take Another Photo</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-12 h-12 mx-auto text-gray-400" />
                  <div>
                    <p className="text-gray-600">
                      Take a photo or upload a retinal image
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Supported formats: JPEG, PNG (max 10MB)
                    </p>
                  </div>
                  <div className="flex justify-center gap-4">
                    <button 
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-full transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Select image file"
                    >
                      <Upload className="w-5 h-5" />
                      <span>Select Image</span>
                    </button>
                    <button 
                      className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-full transition-colors"
                      onClick={() => {
                        setIsCameraOpen(true);
                        startCamera();
                      }}
                      aria-label="Start camera"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Use Camera</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {cameraError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                <p>{cameraError}</p>
              </div>
            </div>
          )}

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
              {renderAnalysisResults()}
            </div>
          </div>
        </section>

        {/* New Analysis History Section */}
        {analysisHistory.length > 0 && (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3 fade-in">
            {analysisHistory.map((result) => (
              <div 
                key={result.id} 
                className="glassmorphism p-6 rounded-lg shadow-md card-hover"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${severityColors[result.severity]}`}>
                    {result.severity}
                  </span>
                  <time className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(result.date).toLocaleDateString()}
                  </time>
                </div>
                <ProgressRing 
                  progress={result.confidence} 
                  size={60} 
                  className="mx-auto my-4"
                />
                {/* ...rest of history card content... */}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

// Helper function to get progress bar color class
function getProgressBarColorClass(score: number): string {
  if (score > CONFIDENCE_THRESHOLDS.HIGH) return 'progress-bar-fill-high';
  if (score > CONFIDENCE_THRESHOLDS.MODERATE) return 'progress-bar-fill-moderate';
  return 'progress-bar-fill-low';
}

export default Dashboard;

