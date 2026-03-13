import { useState, useRef, useEffect } from 'react';
import { Upload, Mic, Square, Play, Pause, Video, Image as ImageIcon, Music, RefreshCw, Volume2, VolumeX, Maximize, Minimize, Youtube, Wand2, Headphones, Palette } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const ANIMATION_STYLES = [
  "Cinematic 3D", "Pixar/Disney", "Anime", "Claymation", "Low Poly", "Cyberpunk", "Watercolor", "Stop Motion"
];

// Helper to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/png;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export default function AudioTo3DApp() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isFetchingYoutube, setIsFetchingYoutube] = useState(false);

  const [animationStyle, setAnimationStyle] = useState(ANIMATION_STYLES[0]);

  const [prompt, setPrompt] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

  const [bgmFile, setBgmFile] = useState<File | null>(null);
  const [bgmYoutubeUrl, setBgmYoutubeUrl] = useState('');
  const [isFetchingBgm, setIsFetchingBgm] = useState(false);
  const [bgmObjectUrl, setBgmObjectUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (bgmFile) {
      const url = URL.createObjectURL(bgmFile);
      setBgmObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setBgmObjectUrl(null);
    }
  }, [bgmFile]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Video Player State
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        audioRef.current?.pause();
      } else {
        videoRef.current.play();
        audioRef.current?.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      if (audioRef.current) audioRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
      if (!newMutedState && volume === 0) {
        setVolume(1);
        videoRef.current.volume = 1;
        if (audioRef.current) audioRef.current.volume = 1;
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (audioRef.current) audioRef.current.volume = newVolume;
      if (newVolume === 0) {
        setIsMuted(true);
        videoRef.current.muted = true;
        if (audioRef.current) audioRef.current.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
        if (audioRef.current) audioRef.current.muted = false;
      }
    }
  };

  const toggleFullscreen = async () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      await playerContainerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
      await document.exitFullscreen().catch(err => console.error(err));
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [0.5, 1, 1.25, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const newRate = rates[nextIndex];
    setPlaybackRate(newRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = newRate;
    }
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setProgress(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setProgress(time);
    }
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const handleYoutubeFetch = async () => {
    if (!youtubeUrl) return;
    setIsFetchingYoutube(true);
    setError(null);
    try {
      const res = await fetch(`/api/youtube?url=${encodeURIComponent(youtubeUrl)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch YouTube audio");
      }
      const blob = await res.blob();
      const file = new File([blob], "youtube-audio.webm", { type: "audio/webm" });
      setAudioFile(file);
      setYoutubeUrl('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsFetchingYoutube(false);
    }
  };

  const handleBgmUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBgmFile(file);
    }
  };

  const handleBgmYoutubeFetch = async () => {
    if (!bgmYoutubeUrl) return;
    setIsFetchingBgm(true);
    setError(null);
    try {
      const res = await fetch(`/api/youtube?url=${encodeURIComponent(bgmYoutubeUrl)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch YouTube audio for BGM");
      }
      const blob = await res.blob();
      const file = new File([blob], "bgm-audio.webm", { type: "audio/webm" });
      setBgmFile(file);
      setBgmYoutubeUrl('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsFetchingBgm(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
        setAudioFile(file);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Could not access microphone. Please allow permissions or upload an audio file.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const generatePromptFromAudio = async () => {
    if (!audioFile) {
      setError("Please provide an audio source first.");
      return;
    }

    setIsGeneratingPrompt(true);
    setError(null);

    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API key not found. Please ensure you have selected an API key.");
      }
      const ai = new GoogleGenAI({ apiKey });

      const audioBase64 = await fileToBase64(audioFile);
      
      const promptResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            inlineData: {
              data: audioBase64,
              mimeType: audioFile.type || 'audio/webm'
            }
          },
          `Listen to this audio carefully. Analyze its tempo, emotional tone, and specific sound effects. Write a clear, concise, and highly effective prompt for a video generation model to create a ${animationStyle} style animation. Describe the visual scene, camera movements, lighting, and actions that match the audio perfectly. Keep it under 400 characters and focus on the most impactful visual elements.`
        ],
        config: {
          systemInstruction: `You are an expert ${animationStyle} animation director. Translate audio into a vivid, concise visual prompt. Focus on core actions, lighting, and camera work that fit the ${animationStyle} aesthetic.`
        }
      });

      const generatedPrompt = promptResponse.text || "A stunning 3D animation matching the audio.";
      setPrompt(generatedPrompt);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate prompt.");
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const generateAnimation = async () => {
    if (!prompt) {
      setError("Please provide an animation prompt.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setVideoUrl(null);

    try {
      // Create a fresh instance to ensure we use the latest selected API key
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API key not found. Please ensure you have selected an API key.");
      }
      const ai = new GoogleGenAI({ apiKey });

      setLoadingMessage("Generating 3D animation with Veo... This may take a few minutes.");

      let imageBase64;
      if (imageFile) {
        imageBase64 = await fileToBase64(imageFile);
      }

      // Call Veo
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `${animationStyle} animation style. ${prompt}`,
        ...(imageFile && imageBase64 ? {
          image: {
            imageBytes: imageBase64,
            mimeType: imageFile.type || 'image/jpeg',
          }
        } : {}),
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      // 5. Poll for completion
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        setLoadingMessage("Still rendering your 3D animation... Veo is working its magic.");
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message}`);
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      
      if (!downloadLink) {
        throw new Error("No video URI returned from the model.");
      }

      setLoadingMessage("Fetching your video...");
      
      // Fetch the video with the API key header
      const videoResponse = await fetch(downloadLink, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
        },
      });

      if (!videoResponse.ok) {
        throw new Error("Failed to download the generated video.");
      }

      const videoBlob = await videoResponse.blob();
      const videoObjectUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(videoObjectUrl);

    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        // Reset API key state to force re-selection
        setError("API Key error. Please refresh the page and select your API key again.");
      } else {
        setError(err.message || "An error occurred during generation.");
      }
    } finally {
      setIsGenerating(false);
      setLoadingMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto space-y-12">
        
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-2xl mb-4">
            <Video className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">AI 3D Animation Studio</h1>
          <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
            Generate 3D animations from text, or bring your images to life. Add audio to auto-generate perfectly synced prompts and background music.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column: Inputs */}
          <div className="space-y-8">
            
            {/* Image Input */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-lg font-medium">
                <ImageIcon className="w-5 h-5 text-emerald-400" />
                <h2>1. Starting Image (Optional)</h2>
              </div>
              
              <div className="relative group">
                {imagePreview ? (
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl font-medium transition-colors">
                        Change Image
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center aspect-video rounded-2xl border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 text-zinc-500 mb-3" />
                    <span className="text-zinc-400 font-medium">Click to upload an image</span>
                    <span className="text-zinc-600 text-sm mt-1">JPG, PNG, WebP</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
              </div>
            </div>

            {/* Audio Input */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-lg font-medium">
                <Music className="w-5 h-5 text-emerald-400" />
                <h2>2. Audio Source (Optional)</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border transition-all duration-300 ${
                    isRecording 
                      ? 'bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_30px_-10px_rgba(239,68,68,0.4)]' 
                      : 'bg-zinc-950 border-zinc-800 hover:border-emerald-500/50 text-zinc-400 hover:text-emerald-400'
                  }`}
                >
                  {isRecording && (
                    <span className="absolute top-4 right-4 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                  {isRecording ? <Square className="w-8 h-8 mb-3 fill-current animate-pulse" /> : <Mic className="w-8 h-8 mb-3" />}
                  <span className="font-medium">{isRecording ? 'Recording...' : 'Record Audio'}</span>
                </button>

                <label className="flex flex-col items-center justify-center p-6 rounded-2xl border border-zinc-800 bg-zinc-950 hover:border-emerald-500/50 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 mb-3" />
                  <span className="font-medium">Upload Audio</span>
                  <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                </label>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <div className="relative flex-1">
                  <Youtube className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isFetchingYoutube ? 'text-emerald-500 animate-pulse' : 'text-zinc-500'}`} />
                  <input 
                    type="text" 
                    placeholder="Paste YouTube URL..." 
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    disabled={isFetchingYoutube}
                    className={`w-full bg-zinc-950 border rounded-xl py-3 pl-10 pr-4 focus:outline-none transition-all duration-300 ${
                      isFetchingYoutube 
                        ? 'border-emerald-500/50 text-zinc-500 bg-emerald-500/5 shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)]' 
                        : 'border-zinc-800 focus:border-emerald-500 text-zinc-50'
                    }`}
                  />
                </div>
                <button 
                  onClick={handleYoutubeFetch}
                  disabled={!youtubeUrl || isFetchingYoutube}
                  className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${
                    isFetchingYoutube
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent'
                  }`}
                >
                  {isFetchingYoutube ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    'Fetch'
                  )}
                </button>
              </div>

              {audioFile && (
                <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Music className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="truncate text-sm text-zinc-300">{audioFile.name}</span>
                  </div>
                  <button onClick={() => setAudioFile(null)} className="text-zinc-500 hover:text-red-400 text-sm font-medium px-2">
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Animation Style Selection */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-lg font-medium">
                <Palette className="w-5 h-5 text-emerald-400" />
                <h2>3. Animation Style</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {ANIMATION_STYLES.map(style => (
                  <button
                    key={style}
                    onClick={() => setAnimationStyle(style)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      animationStyle === style
                        ? 'bg-emerald-500 text-zinc-950'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-400'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-lg font-medium">
                  <Wand2 className="w-5 h-5 text-emerald-400" />
                  <h2>4. Animation Prompt</h2>
                </div>
                <button
                  onClick={generatePromptFromAudio}
                  disabled={!audioFile || isGeneratingPrompt}
                  className="text-sm px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isGeneratingPrompt ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  Auto-generate
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the 3D animation, or use the auto-generate button to create one from your audio..."
                className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-4 focus:outline-none focus:border-emerald-500 transition-colors resize-none text-zinc-300"
              />
            </div>

            {/* Background Music Input */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-lg font-medium">
                <Headphones className="w-5 h-5 text-emerald-400" />
                <h2>5. Background Music (Optional)</h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <label className="flex flex-col items-center justify-center p-6 rounded-2xl border border-zinc-800 bg-zinc-950 hover:border-emerald-500/50 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 mb-3" />
                  <span className="font-medium">Upload BGM</span>
                  <input type="file" accept="audio/*" className="hidden" onChange={handleBgmUpload} />
                </label>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <div className="relative flex-1">
                  <Youtube className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isFetchingBgm ? 'text-emerald-500 animate-pulse' : 'text-zinc-500'}`} />
                  <input 
                    type="text" 
                    placeholder="Paste YouTube URL for BGM..." 
                    value={bgmYoutubeUrl}
                    onChange={(e) => setBgmYoutubeUrl(e.target.value)}
                    disabled={isFetchingBgm}
                    className={`w-full bg-zinc-950 border rounded-xl py-3 pl-10 pr-4 focus:outline-none transition-all duration-300 ${
                      isFetchingBgm 
                        ? 'border-emerald-500/50 text-zinc-500 bg-emerald-500/5 shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)]' 
                        : 'border-zinc-800 focus:border-emerald-500 text-zinc-50'
                    }`}
                  />
                </div>
                <button 
                  onClick={handleBgmYoutubeFetch}
                  disabled={!bgmYoutubeUrl || isFetchingBgm}
                  className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${
                    isFetchingBgm
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent'
                  }`}
                >
                  {isFetchingBgm ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    'Fetch'
                  )}
                </button>
              </div>

              {bgmFile && (
                <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Headphones className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="truncate text-sm text-zinc-300">{bgmFile.name}</span>
                  </div>
                  <button onClick={() => setBgmFile(null)} className="text-zinc-500 hover:text-red-400 text-sm font-medium px-2">
                    Remove
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Output */}
          <div className="space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col h-full min-h-[400px]">
              <div className="flex items-center gap-3 text-lg font-medium mb-6">
                <Play className="w-5 h-5 text-emerald-400" />
                <h2>6. Generated Animation</h2>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center relative">
                {isGenerating ? (
                  <div className="text-center space-y-6">
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                      <Video className="absolute inset-0 m-auto w-8 h-8 text-emerald-400 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-medium">Creating Magic</h3>
                      <p className="text-zinc-400 text-sm max-w-xs mx-auto animate-pulse">{loadingMessage}</p>
                    </div>
                  </div>
                ) : videoUrl ? (
                  <div className="w-full space-y-4">
                    <div ref={playerContainerRef} className="relative group aspect-video rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-2xl flex items-center justify-center">
                      <video 
                        ref={videoRef}
                        src={videoUrl} 
                        autoPlay 
                        loop 
                        className="w-full h-full object-contain"
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onPlay={() => { setIsPlaying(true); audioRef.current?.play(); }}
                        onPause={() => { setIsPlaying(false); audioRef.current?.pause(); }}
                      />
                      {bgmObjectUrl && (
                        <audio ref={audioRef} src={bgmObjectUrl} loop />
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-3">
                        <input
                          type="range"
                          min={0}
                          max={duration || 100}
                          value={progress}
                          onChange={handleSeek}
                          className="w-full accent-emerald-500 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <button onClick={togglePlay} className="text-white hover:text-emerald-400 transition-colors focus:outline-none">
                              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                            </button>
                            
                            <div className="flex items-center gap-2 group/volume">
                              <button onClick={toggleMute} className="text-white hover:text-emerald-400 transition-colors focus:outline-none">
                                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                              </button>
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.05}
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="w-0 opacity-0 group-hover/volume:w-20 group-hover/volume:opacity-100 transition-all duration-300 accent-emerald-500 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                              />
                            </div>

                            <span className="text-xs text-zinc-300 font-mono font-medium">
                              {formatTime(progress)} / {formatTime(duration)}
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            <button onClick={cyclePlaybackRate} className="text-xs font-mono font-medium text-white hover:text-emerald-400 transition-colors focus:outline-none w-8 text-center" title="Playback Speed">
                              {playbackRate}x
                            </button>
                            <button onClick={toggleFullscreen} className="text-white hover:text-emerald-400 transition-colors focus:outline-none" title="Fullscreen">
                              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <a 
                      href={videoUrl} 
                      download="animation.mp4"
                      className="inline-flex items-center justify-center w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
                    >
                      Download Video
                    </a>
                  </div>
                ) : (
                  <div className="text-center space-y-4 text-zinc-500">
                    <div className="w-24 h-24 bg-zinc-950 rounded-full flex items-center justify-center mx-auto border border-zinc-800">
                      <Video className="w-10 h-10 opacity-50" />
                    </div>
                    <p>Your generated 3D animation will appear here.</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={generateAnimation}
                disabled={!prompt || isGenerating}
                className={`mt-6 w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
                  !prompt || isGenerating
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] hover:shadow-[0_0_60px_-15px_rgba(16,185,129,0.6)]'
                }`}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Generate 3D Animation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
