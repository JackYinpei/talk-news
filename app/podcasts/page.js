
'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Play, Pause, RefreshCw, Loader2 } from 'lucide-react';

export default function PodcastPage() {
    const [status, setStatus] = useState('idle'); // idle, generating, ready, error
    const [data, setData] = useState(null);
    const [category, setCategory] = useState('world');
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(null);

    // Initial load
    useEffect(() => {
        // Automatically generate on first load or wait for user?
        // Let's generate to show something immediately as per "page generation" context.
        generatePodcast();
    }, []);

    const generatePodcast = async () => {
        setStatus('generating');
        setIsPlaying(false);
        setProgress(0);

        try {
            const res = await fetch('/api/podcast/generate', {
                method: 'POST',
                body: JSON.stringify({ category }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Generation failed');
            }

            const result = await res.json();
            setData(result);
            setStatus('ready');
        } catch (e) {
            console.error(e);
            setStatus('error');
        }
    };

    const togglePlay = () => {
        if (!audioRef.current || !data?.audioUrl) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(e => console.error("Playback failed:", e));
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const curr = audioRef.current.currentTime;
            const dur = audioRef.current.duration;
            if (dur > 0) {
                setProgress((curr / dur) * 100);
                setDuration(dur);
            }
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setProgress(0);
    };

    const handleSeek = (e) => {
        if (!audioRef.current) return;
        const val = e.target.value;
        const time = (val / 100) * audioRef.current.duration;
        audioRef.current.currentTime = time;
        setProgress(val);
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-8 font-sans">
            {/* Header / Logo */}
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-tr from-rose-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                        <span className="text-white font-bold text-lg">P</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">LingDaily Podcasts</h1>
                        <p className="text-neutral-400 text-xs uppercase tracking-widest font-medium">AI Generated • Daily Updates</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        disabled={status === 'generating'}
                        className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all uppercase font-medium tracking-wide text-neutral-300"
                    >
                        {['world', 'tech', 'business', 'science', 'sports', 'ai', 'crypto', 'gaming'].map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>

                    <Button
                        onClick={generatePodcast}
                        disabled={status === 'generating'}
                        variant="default" // Assuming shadcn default
                        className="bg-rose-600 hover:bg-rose-700 text-white font-medium px-4 h-10"
                    >
                        {status === 'generating' ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        {status === 'generating' ? 'Creating...' : 'Generate New'}
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 h-auto lg:h-[calc(100vh-140px)]">

                {/* Left Column: Card */}
                <div className="lg:col-span-4 flex flex-col">
                    <Card className="bg-neutral-900 border-neutral-800 overflow-hidden relative group h-[400px] lg:h-[500px] shadow-2xl rounded-2xl ring-1 ring-white/5">
                        {/* Background Image */}
                        <div className="absolute inset-0">
                            {data?.imageUrl ? (
                                <img src={data.imageUrl} alt="Cover" className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-1000 ease-out" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500 text-white shadow-lg shadow-rose-500/30">
                                    {category}
                                </span>
                                <span className="text-xs text-neutral-300 font-medium bg-black/30 backdrop-blur px-2 py-0.5 rounded-full border border-white/10">
                                    Daily Briefing
                                </span>
                            </div>

                            <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-3 drop-shadow-md">
                                {data?.title || (status === 'generating' ? 'Analyzing Global News Sources...' : 'Select a Category')}
                            </h2>

                            <p className="text-neutral-300 text-sm line-clamp-3 leading-relaxed opacity-90">
                                {data ? 'Deep dive analysis generated by Gemini 2.0.' : 'Ready to synthesize the latest headlines into a personalized podcast.'}
                            </p>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Summary + Player */}
                <div className="lg:col-span-8 flex flex-col h-[600px] lg:h-full bg-neutral-900/50 rounded-2xl border border-neutral-800 overflow-hidden backdrop-blur-sm relative">

                    {/* Scrollable Summary */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                        {status === 'generating' ? (
                            <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-rose-500/20 blur-xl rounded-full"></div>
                                    <Loader2 className="relative w-16 h-16 animate-spin text-rose-500" />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-lg font-medium text-white">Synthesizing Audio & Script</p>
                                    <p className="text-sm text-neutral-500">Processing real-time news data...</p>
                                </div>
                            </div>
                        ) : status === 'error' ? (
                            <div className="flex flex-col items-center justify-center h-full text-red-400 gap-2">
                                <p>Failed to generate content.</p>
                                <Button size="sm" variant="outline" onClick={generatePodcast}>Try Again</Button>
                            </div>
                        ) : data ? (
                            <div className="prose prose-invert prose-neutral max-w-none prose-headings:text-rose-400 prose-a:text-rose-400">
                                <ReactMarkdown>{data.summary}</ReactMarkdown>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-neutral-600">
                                Waiting for input...
                            </div>
                        )}
                    </div>

                    {/* Audio Player Bar */}
                    <div className={`h-24 bg-neutral-950/80 backdrop-blur-md border-t border-neutral-800 p-4 flex items-center gap-4 z-20 transition-all duration-500 ${data?.audioUrl ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 absolute bottom-0 w-full'}`}>
                        {data?.audioUrl && (
                            <>
                                <audio
                                    ref={audioRef}
                                    src={data.audioUrl}
                                    onTimeUpdate={handleTimeUpdate}
                                    onEnded={handleEnded}
                                />

                                {/* Play Button */}
                                <button
                                    onClick={togglePlay}
                                    className="w-14 h-14 rounded-full bg-white hover:bg-neutral-200 text-black flex items-center justify-center hover:scale-105 transition-all duration-300 active:scale-95 shadow-lg shadow-white/10 shrink-0"
                                >
                                    {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                                </button>

                                {/* Image Small */}
                                <div className="w-14 h-14 rounded-lg overflow-hidden bg-neutral-800 shrink-0 border border-neutral-700 hidden sm:block">
                                    {data.imageUrl && <img src={data.imageUrl} className="w-full h-full object-cover" />}
                                </div>

                                {/* Title & Progress */}
                                <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-white truncate pr-4">{data.title}</span>
                                        <span className="text-xs text-neutral-400 font-mono hidden sm:block">{formatTime(audioRef.current?.currentTime || 0)} / {formatTime(duration)}</span>
                                    </div>

                                    <div className="group relative h-4 flex items-center">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={progress}
                                            onChange={handleSeek}
                                            className="absolute w-full h-1.5 bg-neutral-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0 [&::-webkit-slider-thumb]:bg-rose-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-all group-hover:[&::-webkit-slider-thumb]:w-3 group-hover:[&::-webkit-slider-thumb]:h-3"
                                        />
                                        <div
                                            className="pointer-events-none absolute h-1.5 bg-rose-600 rounded-full transition-all duration-100"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}
