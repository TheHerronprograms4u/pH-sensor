import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Info, Droplets } from 'lucide-react';

interface PhColor {
  ph: number;
  r: number;
  g: number;
  b: number;
  label: string;
}

const PH_SCALE: PhColor[] = [
  { ph: 0, r: 230, g: 27, b: 35, label: 'Strong Acid' },
  { ph: 1, r: 235, g: 50, b: 35, label: 'Strong Acid' },
  { ph: 2, r: 242, g: 104, b: 42, label: 'Acid' },
  { ph: 3, r: 247, g: 148, b: 38, label: 'Acid' },
  { ph: 4, r: 252, g: 194, b: 30, label: 'Weak Acid' },
  { ph: 5, r: 255, g: 235, b: 23, label: 'Weak Acid' },
  { ph: 6, r: 196, g: 214, b: 51, label: 'Weak Acid' },
  { ph: 7, r: 76, g: 175, b: 80, label: 'Neutral' },
  { ph: 8, r: 0, g: 153, b: 121, label: 'Weak Base' },
  { ph: 9, r: 0, g: 122, b: 146, label: 'Weak Base' },
  { ph: 10, r: 0, g: 94, b: 157, label: 'Base' },
  { ph: 11, r: 61, g: 61, b: 146, label: 'Base' },
  { ph: 12, r: 85, g: 55, b: 140, label: 'Strong Base' },
  { ph: 13, r: 96, g: 46, b: 128, label: 'Strong Base' },
  { ph: 14, r: 68, g: 31, b: 96, label: 'Strong Base' },
];

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedColor, setCapturedColor] = useState<{ r: number; g: number; b: number } | null>(null);
  const [detectedPh, setDetectedPh] = useState<PhColor | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setError(null);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera. Please ensure you have given permission.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const getClosestPh = (r: number, g: number, b: number): PhColor => {
    return PH_SCALE.reduce((prev, curr) => {
      const prevDist = Math.sqrt(
        Math.pow(r - prev.r, 2) + Math.pow(g - prev.g, 2) + Math.pow(b - prev.b, 2)
      );
      const currDist = Math.sqrt(
        Math.pow(r - curr.r, 2) + Math.pow(g - curr.g, 2) + Math.pow(b - curr.b, 2)
      );
      return currDist < prevDist ? curr : prev;
    });
  };

  const captureColor = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true });

      if (context) {
        // Set canvas size to video size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get color from the center (5x5 area for averaging)
        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);
        const imageData = context.getImageData(centerX - 2, centerY - 2, 5, 5).data;

        let r = 0, g = 0, b = 0;
        for (let i = 0; i < imageData.length; i += 4) {
          r += imageData[i];
          g += imageData[i + 1];
          b += imageData[i + 2];
        }

        const count = imageData.length / 4;
        const avgR = Math.round(r / count);
        const avgG = Math.round(g / count);
        const avgB = Math.round(b / count);

        setCapturedColor({ r: avgR, g: avgG, b: avgB });
        setDetectedPh(getClosestPh(avgR, avgG, avgB));
      }
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans flex flex-col items-center p-4">
      <header className="w-full max-w-md flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Droplets className="text-blue-500 w-8 h-8" />
          <h1 className="text-2xl font-bold tracking-tight">pH Sensor</h1>
        </div>
        <button 
          onClick={() => isCameraActive ? stopCamera() : startCamera()}
          className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 transition-colors"
        >
          <RefreshCw className={`w-6 h-6 ${isCameraActive ? '' : 'text-neutral-500'}`} />
        </button>
      </header>

      <main className="w-full max-w-md flex flex-col gap-6">
        {/* Camera Viewport */}
        <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-2xl">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <Info className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-neutral-400">{error}</p>
              <button 
                onClick={startCamera}
                className="mt-4 px-6 py-2 bg-blue-600 rounded-full font-medium"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Aiming Reticle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 border-2 border-white/50 rounded-full flex items-center justify-center">
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </>
          )}
        </div>

        {/* Action Button */}
        <button 
          onClick={captureColor}
          disabled={!isCameraActive}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-600 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Camera className="w-6 h-6" />
          Measure pH
        </button>

        {/* Results Panel */}
        {detectedPh && capturedColor && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
              <span className="text-neutral-400 font-medium">Measurement Result</span>
              <div 
                className="w-8 h-8 rounded-full border-2 border-white/20"
                style={{ backgroundColor: `rgb(${capturedColor.r}, ${capturedColor.g}, ${capturedColor.b})` }}
              />
            </div>
            
            <div className="flex items-end gap-3 mb-6">
              <span className="text-6xl font-black text-white leading-none">{detectedPh.ph}</span>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-blue-400 leading-tight">{detectedPh.label}</span>
                <span className="text-neutral-500 text-sm">pH Level</span>
              </div>
            </div>

            {/* Scale Visualization */}
            <div className="relative h-4 w-full bg-neutral-800 rounded-full overflow-hidden flex">
              {PH_SCALE.map((item) => (
                <div 
                  key={item.ph}
                  className="flex-1 h-full"
                  style={{ backgroundColor: `rgb(${item.r}, ${item.g}, ${item.b})` }}
                />
              ))}
              {/* Marker */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all duration-500"
                style={{ left: `${(detectedPh.ph / 14) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-neutral-500 font-mono">
              <span>0</span>
              <span>7</span>
              <span>14</span>
            </div>
          </div>
        )}

        <div className="bg-neutral-900/50 rounded-2xl p-4 border border-neutral-800/50">
          <p className="text-neutral-500 text-xs leading-relaxed">
            <Info className="inline w-3 h-3 mr-1 mb-0.5" />
            For best results, place the pH indicator strip in the center of the reticle under bright, neutral lighting. This app is for demonstration purposes and should not be used for critical scientific measurements.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;