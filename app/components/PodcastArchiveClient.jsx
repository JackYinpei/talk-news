'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Play, Pause, ChevronLeft, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['world', 'tech', 'business', 'science', 'sports', 'ai', 'crypto', 'gaming'];

const CATEGORY_LABELS = {
    world: 'World',
    tech: 'Tech',
    business: 'Business',
    science: 'Science',
    sports: 'Sports',
    ai: 'AI',
    crypto: 'Crypto',
    gaming: 'Gaming'
};

const CATEGORY_COLORS = {
    world: 'from-rose-500 to-orange-500',
    tech: 'from-blue-500 to-cyan-500',
    business: 'from-emerald-500 to-teal-500',
    science: 'from-purple-500 to-pink-500',
    sports: 'from-amber-500 to-yellow-500',
    ai: 'from-indigo-500 to-violet-500',
    crypto: 'from-orange-500 to-amber-500',
    gaming: 'from-pink-500 to-rose-500'
};

export default function PodcastArchiveClient({ date, initialPodcasts }) {
    const router = useRouter();
    const [podcasts, setPodcasts] = useState(initialPodcasts || []);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [playingCategory, setPlayingCategory] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(null);

    // Initial load: select first available category
    useEffect(() => {
        if (!selectedCategory && podcasts.length > 0) {
            const firstWithData = podcasts.find(p => p.exists);
            if (firstWithData) {
                setSelectedCategory(firstWithData.category);
            } else {
                setSelectedCategory('world'); // Default fallback
            }
        }
    }, [podcasts]);

    // Cleanup audio on unmount or date change (though this component unmounts on nav)
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, []);

    // Reset player when playback category changes
    useEffect(() => {
        setProgress(0);
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            if (isPlaying && playingCategory) {
                audioRef.current.play().catch(console.error);
            }
        }
    }, [playingCategory]);


    const currentPodcast = podcasts.find(p => p.category === selectedCategory);
    const playingPodcast = podcasts.find(p => p.category === playingCategory && p.exists);
    const activePodcast = playingPodcast || (podcasts.find(p => p.exists && p.category === selectedCategory) || podcasts.find(p => p.exists));


    const playCategory = (category) => {
        const podcast = podcasts.find(p => p.category === category && p.exists);
        if (podcast) {
            setPlayingCategory(category);
            setIsPlaying(true);
            // Wait for render to ensure audio element is present/updated? relative to state
            // Actually React ref should be stable.
            setTimeout(() => {
                audioRef.current?.play().catch(console.error);
            }, 50);
        }
    };

    const togglePlay = () => {
        if (!audioRef.current || !activePodcast?.audioUrl) return;

        // If we haven't started playing anything yet, but hit play on the bar
        if (!playingCategory && activePodcast) {
            setPlayingCategory(activePodcast.category);
            setIsPlaying(true);
            setTimeout(() => audioRef.current?.play(), 50);
            return;
        }

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(console.error);
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

        <div className="h-screen bg-neutral-950 text-white font-sans flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 p-4 md:p-8">
                {/* Header */}
                <header className="flex-none mb-4 md:mb-8 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-tr from-rose-500 to-orange-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0">
                            <span className="text-white font-bold text-base md:text-lg">P</span>
                        </div>
                        <div>
                            <h1 className="text-lg md:text-2xl font-bold tracking-tight">LingDaily</h1>
                            <p className="text-neutral-400 text-[10px] md:text-xs uppercase tracking-widest font-medium flex items-center gap-2">
                                <Calendar className="w-3 h-3 md:w-4 md:h-4" /> {date} Archive
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={() => router.push('/podcasts')}
                        variant="outline"
                        className="border-neutral-800 hover:bg-neutral-800 text-neutral-300 gap-2 h-8 md:h-10 px-3 md:px-4 text-xs md:text-sm"
                    >
                        <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                        <span className="hidden md:inline">Back to Today</span>
                        <span className="md:hidden">Back</span>
                    </Button>
                </header>

                <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-4 md:gap-6 lg:gap-8">
                    <div className="flex-none lg:col-span-3 lg:h-full lg:overflow-hidden order-first">
                        <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto pb-2 lg:pb-0 lg:pr-2 custom-scrollbar"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {CATEGORIES.map(category => {
                                const podcast = podcasts.find(p => p.category === category);
                                const hasData = podcast?.exists;
                                const isSelected = selectedCategory === category;

                                return (
                                    <Card
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={`
                                            relative overflow-hidden rounded-xl border transition-all duration-300 flex-shrink-0 cursor-pointer
                                            w-[160px] md:w-[200px] lg:w-full
                                            ${isSelected ? 'ring-2 ring-rose-500 border-rose-500/50' : 'border-neutral-800'}
                                            ${hasData ? 'bg-neutral-900' : 'bg-neutral-900/50'}
                                        `}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-br ${CATEGORY_COLORS[category]} opacity-10`} />

                                        {hasData && podcast.imageUrl && (
                                            <div className="absolute inset-0">
                                                <img
                                                    src={podcast.imageUrl}
                                                    alt=""
                                                    className="w-full h-full object-cover opacity-20"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/80 to-transparent" />
                                            </div>
                                        )}

                                        <div className="relative p-3 md:p-4">
                                            <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                                                <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${CATEGORY_COLORS[category]} text-white shadow-lg`}>
                                                    {CATEGORY_LABELS[category]}
                                                </span>
                                                {!hasData && <span className="text-[10px] md:text-xs text-neutral-500">N/A</span>}
                                            </div>

                                            <h3 className="text-xs md:text-sm font-semibold text-white line-clamp-2 leading-tight">
                                                {hasData ? podcast.title : `${CATEGORY_LABELS[category]} News`}
                                            </h3>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex-1 lg:col-span-9 flex flex-col min-h-0 bg-neutral-900/50 rounded-2xl border border-neutral-800 overflow-hidden backdrop-blur-sm relative">
                        <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
                            {currentPodcast?.exists ? (
                                <div className="space-y-8">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-lg font-bold text-rose-400 flex items-center gap-2">
                                                <span className="w-1 h-5 bg-rose-500 rounded-full"></span>
                                                Transcript
                                            </h2>
                                            <button
                                                onClick={() => {
                                                    if (playingCategory === selectedCategory && isPlaying) {
                                                        audioRef.current?.pause();
                                                        setIsPlaying(false);
                                                    } else {
                                                        playCategory(selectedCategory);
                                                    }
                                                }}
                                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${playingCategory === selectedCategory && isPlaying
                                                    ? 'bg-rose-500 text-white'
                                                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                                                    }`}
                                            >
                                                {playingCategory === selectedCategory && isPlaying ? (
                                                    <>
                                                        <Pause size={16} fill="currentColor" />
                                                        Playing
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play size={16} fill="currentColor" />
                                                        Play This
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        <div className="bg-neutral-900/50 rounded-xl p-6 border border-neutral-800">
                                            <p className="text-neutral-200 leading-relaxed whitespace-pre-wrap">
                                                {currentPodcast.script}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-neutral-700 to-transparent"></div>
                                        <span className="text-xs text-neutral-500 uppercase tracking-wider">Analysis</span>
                                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-neutral-700 to-transparent"></div>
                                    </div>

                                    <div className="prose prose-invert prose-neutral max-w-none prose-headings:text-rose-400 prose-a:text-rose-400">
                                        <ReactMarkdown>{currentPodcast.summary}</ReactMarkdown>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-4">
                                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${selectedCategory ? CATEGORY_COLORS[selectedCategory] : 'from-gray-700 to-gray-800'} opacity-20 flex items-center justify-center`}>
                                        <span className="text-3xl font-bold text-white opacity-50">{selectedCategory ? CATEGORY_LABELS[selectedCategory]?.[0] : '?'}</span>
                                    </div>
                                    <div className="text-center space-y-3">
                                        <p className="text-lg font-medium text-neutral-400">Content Not Available</p>
                                        <p className="text-sm text-neutral-600">No podcast was recorded for {selectedCategory ? CATEGORY_LABELS[selectedCategory] : 'this category'} on {date}.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {activePodcast?.audioUrl && (
                <div className="flex-none h-24 bg-neutral-950 border-t border-neutral-800 p-4 flex items-center gap-4 z-50 w-full relative">
                    <audio
                        ref={audioRef}
                        src={activePodcast.audioUrl}
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={handleEnded}
                    />
                    <button
                        onClick={togglePlay}
                        className="w-14 h-14 rounded-full bg-white hover:bg-neutral-200 text-black flex items-center justify-center hover:scale-105 transition-all duration-300 active:scale-95 shadow-lg shadow-white/10 shrink-0"
                    >
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>

                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-neutral-800 shrink-0 border border-neutral-700 hidden sm:block">
                        {activePodcast.imageUrl && <img src={activePodcast.imageUrl} className="w-full h-full object-cover" />}
                    </div>

                    <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${CATEGORY_COLORS[activePodcast.category]} text-white`}>
                                    {CATEGORY_LABELS[activePodcast.category]}
                                </span>
                                <span className="text-sm font-bold text-white truncate">{activePodcast.title}</span>
                            </div>
                            <span className="text-xs text-neutral-400 font-mono hidden sm:block ml-2">
                                {formatTime(audioRef.current?.currentTime || 0)} / {formatTime(duration)}
                            </span>
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
                </div>
            )}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
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
                @media (max-width: 1023px) {
                    .custom-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
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
