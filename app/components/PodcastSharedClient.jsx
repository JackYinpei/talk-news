'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Card } from '@/app/components/ui/card';
import { Play, Pause, Loader2, Calendar, ChevronDown, Sparkles, Image as ImageIcon } from 'lucide-react';

const PODCAST_CDN_BASE_URL = process.env.NEXT_PUBLIC_PODCAST_CDN_BASE_URL || 'https://podcast.shiying.sh.cn';

// 生成最近 7 天的日期选项
function getLast7Days() {
    const days = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        let label;
        if (i === 0) {
            label = '今天';
        } else if (i === 1) {
            label = '昨天';
        } else {
            label = `${date.getMonth() + 1}月${date.getDate()}日`;
        }

        days.push({ value: dateStr, label });
    }

    return days;
}

function applyCdnBase(audioUrl) {
    if (!audioUrl) return '';
    try {
        const url = new URL(audioUrl);
        const cdnBase = new URL(PODCAST_CDN_BASE_URL);
        url.protocol = cdnBase.protocol;
        url.host = cdnBase.host;
        return url.toString();
    } catch (err) {
        return audioUrl;
    }
}

export default function PodcastSharedClient({ initialDate, initialPodcasts }) {
    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(initialDate || todayStr);

    // We now focus on a single podcast (daily_digest), but kept the structure generic enough.
    // initialPodcasts is likely an array. We look for the one with category 'daily_digest' or just take the first one.
    const getDailyDigest = (list) => list?.find(p => p.category === 'daily_digest') || list?.[0] || null;

    const [podcast, setPodcast] = useState(getDailyDigest(initialPodcasts));
    const [loading, setLoading] = useState(!initialPodcasts);
    const [generating, setGenerating] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

    const audioRef = useRef(null);
    const router = useRouter();

    const dateOptions = getLast7Days();
    const isToday = selectedDate === todayStr;

    // Load podcast for selected date
    useEffect(() => {
        if (initialDate && selectedDate === initialDate && initialPodcasts) {
            return;
        }

        async function loadPodcasts() {
            setLoading(true);
            setPodcast(null);
            try {
                const res = await fetch(`/api/podcast/list?date=${selectedDate}`);
                if (res.ok) {
                    const data = await res.json();
                    setPodcast(getDailyDigest(data.podcasts));
                }
            } catch (err) {
                console.error('Failed to load podcasts:', err);
            } finally {
                setLoading(false);
            }
        }

        // Only fetch if we don't have initial data for this date
        if (!initialPodcasts || selectedDate !== initialDate) {
            loadPodcasts();
        }
    }, [selectedDate, initialDate, initialPodcasts]);

    // Generate Podcast
    const generatePodcast = async () => {
        if (generating) return;

        setGenerating(true);
        try {
            // Updated to GET request based on route.js definition
            const res = await fetch(`/api/podcast/generate?date=${selectedDate}&force=true`, {
                method: 'GET',
            });

            if (res.ok) {
                const result = await res.json();
                if (result.status === 'success' || result.data) {
                    // Update the local state with the new data
                    const newPodcastData = result.data;
                    // Construct a podcast object similar to what DB returns
                    setPodcast({
                        ...newPodcastData,
                        script: newPodcastData.fullScript,
                        content: newPodcastData.items,
                        image_url: newPodcastData.allImages,
                        audio_url: newPodcastData.audioUrl,
                        category: 'daily_digest',
                        exists: true
                    });
                }
            }
        } catch (err) {
            console.error('Failed to generate podcast:', err);
        } finally {
            setGenerating(false);
        }
    };

    // Reset player on date change
    const prevDateRef = useRef(selectedDate);
    useEffect(() => {
        if (prevDateRef.current !== selectedDate) {
            setIsPlaying(false);
            setProgress(0);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            prevDateRef.current = selectedDate;
        }
    }, [selectedDate]);

    // Apply CDN
    const activeAudioUrl = podcast?.audio_url ? applyCdnBase(podcast.audio_url) : '';

    const togglePlay = () => {
        if (!audioRef.current || !activeAudioUrl) return;
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

    const handleSeek = (e) => {
        if (!audioRef.current) return;
        const val = e.target.value;
        const time = (val / 100) * audioRef.current.duration;
        audioRef.current.currentTime = time;
        setProgress(val);
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setProgress(0);
    };

    const selectedDateLabel = dateOptions.find(d => d.value === selectedDate)?.label || selectedDate;

    return (
        <div className="h-screen bg-neutral-950 text-white font-sans flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 p-4 md:p-8 max-w-7xl mx-auto w-full">

                {/* Header */}
                <header className="flex-none mb-4 md:mb-6 flex items-center justify-between gap-4">
                    <div
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => router.push('/')}
                    >
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-tr from-rose-500 to-orange-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0">
                            <span className="text-white font-bold text-base md:text-lg">P</span>
                        </div>
                        <div>
                            <h1 className="text-lg md:text-2xl font-bold tracking-tight">LingDaily Digest</h1>
                            <p className="text-neutral-400 text-[10px] md:text-xs uppercase tracking-widest font-medium hidden md:block">AI Generated • Daily Information</p>
                        </div>
                    </div>

                    {/* Date Picker */}
                    <div className="relative">
                        <button
                            onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
                            className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-neutral-300 hover:bg-neutral-800 transition-all"
                        >
                            <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                            {selectedDateLabel}
                            <ChevronDown className={`w-3 h-3 md:w-4 md:h-4 transition-transform ${dateDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {dateDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 overflow-hidden">
                                {dateOptions.map(option => (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            if (option.value !== todayStr) {
                                                router.push(`/podcasts/${option.value}`);
                                            } else {
                                                router.push('/podcasts');
                                            }
                                            setDateDropdownOpen(false);
                                        }}
                                        className={`w-full px-4 py-2 text-left text-sm hover:bg-neutral-800 transition-colors ${selectedDate === option.value ? 'bg-rose-500/20 text-rose-400' : 'text-neutral-300'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </header>

                {/* Main Content Area */}
                <div className="flex-1 min-h-0 bg-neutral-900/50 rounded-2xl border border-neutral-800 overflow-hidden backdrop-blur-sm relative flex flex-col">

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-6">
                                <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
                                <p>Loading content...</p>
                            </div>
                        ) : generating ? (
                            <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-rose-500/20 blur-xl rounded-full animate-pulse"></div>
                                    <Loader2 className="relative w-16 h-16 animate-spin text-rose-500" />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-lg font-medium text-white">Generating Podcast...</p>
                                    <p className="text-sm text-neutral-500">AI is analyzing news and synthesizing audio. Approx 2-3 mins.</p>
                                </div>
                            </div>
                        ) : podcast ? (
                            <div className="max-w-4xl mx-auto space-y-12 pb-24">

                                {/* 1. Full Script Section */}
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-1 h-6 bg-rose-500 rounded-full"></div>
                                        <h2 className="text-xl md:text-2xl font-bold text-white">Podcast Script</h2>
                                    </div>
                                    <div className="bg-neutral-900/80 rounded-xl p-6 border border-neutral-800/50 shadow-sm">
                                        <div className="prose prose-invert prose-neutral max-w-none leading-loose text-neutral-300 whitespace-pre-wrap">
                                            {podcast.script}
                                        </div>
                                    </div>
                                </section>

                                {/* Divider */}
                                <div className="h-px bg-gradient-to-r from-transparent via-neutral-800 to-transparent"></div>

                                {/* 2. News Items Logic */}
                                <section>
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                                        <h2 className="text-xl md:text-2xl font-bold text-white">News Details & Visuals</h2>
                                    </div>

                                    <div className="space-y-12">
                                        {Array.isArray(podcast.content) && podcast.content.map((item, idx) => (
                                            <div key={idx} className="group">
                                                <div className="flex flex-col gap-4">
                                                    {/* Title & Badge */}
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-neutral-800 text-xs font-mono text-neutral-400 border border-neutral-700">
                                                                {idx + 1}
                                                            </span>
                                                            {item.category && (
                                                                <span className="text-[10px] uppercase tracking-wider font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                                                                    {item.category}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h3 className="text-xl md:text-2xl font-bold text-neutral-100 leading-tight">
                                                            {item.newstitle}
                                                        </h3>
                                                    </div>

                                                    {/* Summary */}
                                                    <div className="text-neutral-400 leading-relaxed text-base md:text-lg">
                                                        {item.summary}
                                                    </div>

                                                    {/* Images Grid */}
                                                    {item.images && item.images.length > 0 && (
                                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {item.images.map((img, imgIdx) => (
                                                                <div key={imgIdx} className="relative aspect-video rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800">
                                                                    <img
                                                                        src={img}
                                                                        alt={`Visual for ${item.newstitle}`}
                                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                                        loading="lazy"
                                                                    />
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                            </div>
                        ) : (
                            // Empty State / Generate Prompt
                            <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-4">
                                <div className="w-24 h-24 rounded-2xl bg-neutral-800/50 flex items-center justify-center mb-4">
                                    <Sparkles className="w-10 h-10 text-rose-500 opacity-50" />
                                </div>
                                <div className="text-center space-y-3 max-w-md">
                                    <h3 className="text-xl font-bold text-white">No Digest Found</h3>
                                    <p className="text-sm text-neutral-400">
                                        The daily digest for {selectedDateLabel} hasn't been generated yet.
                                    </p>

                                    {isToday && (
                                        <button
                                            onClick={generatePodcast}
                                            className="mt-6 inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-bold text-sm rounded-full transition-all duration-300 transform hover:scale-105 shadow-xl shadow-rose-500/20"
                                        >
                                            <Play className="w-4 h-4 fill-current" />
                                            Generate Daily Digest
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Audio Player Bar */}
            {activeAudioUrl && (
                <div className="flex-none bg-black/90 border-t border-neutral-800 backdrop-blur-md p-4 pb-8 md:pb-4 z-50">
                    <div className="max-w-7xl mx-auto flex items-center gap-4 md:gap-6">
                        <audio
                            ref={audioRef}
                            src={activeAudioUrl}
                            onTimeUpdate={handleTimeUpdate}
                            onEnded={handleEnded}
                        />

                        <button
                            onClick={togglePlay}
                            className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/10 shrink-0"
                        >
                            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                        </button>

                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-white truncate text-sm md:text-base">
                                    {podcast?.title || 'Daily Digest'}
                                </h4>
                                <span className="text-xs text-neutral-400 font-mono">
                                    {formatTime(progress > 0 ? (progress / 100) * duration : 0)} / {formatTime(duration)}
                                </span>
                            </div>

                            <div className="group relative h-4 flex items-center cursor-pointer">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={progress}
                                    onChange={handleSeek}
                                    className="absolute w-full h-1.5 bg-neutral-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0 [&::-webkit-slider-thumb]:bg-rose-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-all group-hover:[&::-webkit-slider-thumb]:w-3 group-hover:[&::-webkit-slider-thumb]:h-3 z-10"
                                />
                                <div
                                    className="pointer-events-none absolute h-1.5 bg-gradient-to-r from-rose-500 to-orange-500 rounded-full transition-all duration-100"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
