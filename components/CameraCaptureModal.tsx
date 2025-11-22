import React, { useState, useRef, useEffect } from 'react';
import Spinner from './Spinner';

interface CameraCaptureModalProps {
  onClose: () => void;
  onCapture: (file: File) => void;
}

const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({ onClose, onCapture }) => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isCameraLoading, setIsCameraLoading] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let activeStream: MediaStream | null = null;
        const startCamera = async () => {
            setIsCameraLoading(true);
            setError(null);
            try {
                activeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                setStream(activeStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = activeStream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                if (err instanceof DOMException && err.name === "NotAllowedError") {
                    setError("Camera access was denied. Please allow camera permissions in your browser settings.");
                } else {
                    setError("Could not access camera. Please ensure it's not being used by another application.");
                }
            } finally {
                setIsCameraLoading(false);
            }
        };
        startCamera();

        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleTakePicture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                setCapturedImage(canvas.toDataURL('image/png'));
            }
        }
    };
    
    const handleRetake = () => {
        setCapturedImage(null);
    };

    const handleUsePicture = () => {
        if (canvasRef.current) {
            canvasRef.current.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `profile-picture-${Date.now()}.png`, { type: 'image/png' });
                    onCapture(file);
                }
            }, 'image/png');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[90] p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl relative flex flex-col p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Take a Profile Picture</h2>
                
                {error && (
                    <div className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-3 rounded-md text-sm text-center">
                        {error}
                    </div>
                )}
                
                <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center">
                    {isCameraLoading && <Spinner />}
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted
                        className={`w-full h-full object-cover ${capturedImage || isCameraLoading || error ? 'hidden' : ''}`}
                    />
                    {capturedImage && (
                        <img src={capturedImage} alt="Captured preview" className="w-full h-full object-cover" />
                    )}
                    <canvas ref={canvasRef} className="hidden"></canvas>
                </div>
                
                <div className="flex justify-center items-center gap-4">
                    {capturedImage ? (
                        <>
                            <button onClick={handleRetake} className="py-2 px-6 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium">Retake</button>
                            <button onClick={handleUsePicture} className="py-2 px-6 border border-transparent rounded-md text-white bg-indigo-600 hover:bg-indigo-700 text-sm font-medium">Use Picture</button>
                        </>
                    ) : (
                        <>
                            <button onClick={onClose} className="py-2 px-6 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium">Cancel</button>
                            <button onClick={handleTakePicture} disabled={!stream || isCameraLoading} className="py-2 px-6 border border-transparent rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium">Take Picture</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CameraCaptureModal;