'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Card } from '@/app/components/ui/card';
import { Play, Pause, Loader2, Calendar, ChevronDown, Sparkles } from 'lucide-react';

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

export default function PodcastSharedClient({ initialDate, initialPodcasts }) {
    const todayStr = new Date().toISOString().split('T')[0];
    // 如果没有传入 initialDate，默认为今天
    const [selectedDate, setSelectedDate] = useState(initialDate || todayStr);
    const [podcasts, setPodcasts] = useState(initialPodcasts || []);
    const [selectedCategory, setSelectedCategory] = useState('world');
    const [playingCategory, setPlayingCategory] = useState(null); // 正在播放的类别
    // 如果已经有 initialPodcasts，初始 loading 为 false，否则为 true
    const [loading, setLoading] = useState(!initialPodcasts);
    const [generating, setGenerating] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
    const audioRef = useRef(null);
    const router = useRouter();

    const dateOptions = getLast7Days();

    // 如果是今天，允许生成，否则隐藏生成按钮（或者改为获取存档状态）
    const isToday = selectedDate === todayStr;

    // 加载指定日期的 podcast 列表
    useEffect(() => {
        // 如果我们有 initialPodcasts 且日期匹配，不要重新 fetch
        // 但为了简单，如果用户切换日期，我们总是 fetch
        if (initialDate && selectedDate === initialDate && initialPodcasts) {
            // Already showing data
            return;
        }

        // 如果 selectedDate 改变了（且不是 initialDate 情况），我们需要 fetch
        // 注意：在 [date] 页面，initialDate 会随路由变化而变化，所以这通常由 parent 传递更新
        // 但如果是 client side navigation (date dropdown)，我们在这里处理

        async function loadPodcasts() {
            setLoading(true);
            try {
                const res = await fetch(`/api/podcast/list?date=${selectedDate}`);
                if (res.ok) {
                    const data = await res.json();
                    setPodcasts(data.podcasts || []);

                    // 自动选择第一个有数据的类别
                    const firstWithData = data.podcasts?.find(p => p.exists);
                    if (firstWithData) {
                        setSelectedCategory(firstWithData.category);
                        // 设置默认播放类别为第一个有数据的
                        if (!playingCategory) {
                            // 如果是从另一个日期切过来，可能不需要重置播放？或者重置？
                            // 原逻辑是重置的，见下方 useEffect
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load podcasts:', err);
            } finally {
                setLoading(false);
            }
        }

        // 如果是 client component 独立运行模式（比如 /podcasts/page.js 未传值）或者是切换了日期
        if (!initialPodcasts || selectedDate !== initialDate) {
            loadPodcasts();
        }

    }, [selectedDate, initialDate, initialPodcasts]);

    // 生成单个类别的 podcast
    const generatePodcast = async () => {
        if (generating) return;

        setGenerating(true);
        try {
            const res = await fetch('/api/podcast/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: selectedCategory })
            });

            if (res.ok) {
                const data = await res.json();
                // 更新 podcasts 列表
                setPodcasts(prev => prev.map(p =>
                    p.category === selectedCategory
                        ? { ...p, exists: true, title: data.title, summary: data.summary, script: data.script, audioUrl: data.audioUrl, imageUrl: data.imageUrl }
                        : p
                ));
                // 生成后自动设置为播放类别
                setPlayingCategory(selectedCategory);
            }
        } catch (err) {
            console.error('Failed to generate podcast:', err);
        } finally {
            setGenerating(false);
        }
    };

    // 当日期变化时，重置播放器
    useEffect(() => {
        // 只有当日期真的变了才重置 (initial -> client transition fix)
        // 简单处理：每次 selectedDate 变了都重置
        // 这里的逻辑需要在切换日期时停止播放

        // 注意：如果我们在 [date] 页面，路由变化会导致整个组件 unmount/mount 还是只是 props update？
        // Next.js App Router 同一布局下是 component update。

        // 但如果 initialDate 变了，说明是路由变了
        setSelectedDate(initialDate || selectedDate);
    }, [initialDate]);

    useEffect(() => {
        // 当选中的日期变化（用户点击下拉菜单）
        // 实际上我们在 dropdown clickHandler 里做了 router.push or setSelectedDate
    }, [selectedDate]);

    // Create a ref to track previous date to detect changes for audio reset
    const prevDateRef = useRef(selectedDate);
    useEffect(() => {
        if (prevDateRef.current !== selectedDate) {
            setIsPlaying(false);
            setProgress(0);
            setPlayingCategory(null);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            prevDateRef.current = selectedDate;
        }
    }, [selectedDate]);


    // 当播放类别变化时，重置进度
    useEffect(() => {
        if (playingCategory) { // Only reset if actually switching to a new category
            // But be careful not to reset if just play/pause toggled? 
            // playingCategory state holds the active category ID
        }
        // Original logic:
        // setProgress(0);
        // if (audioRef.current) audioRef.current.currentTime = 0;
    }, [playingCategory]);
    // The original logic reset progress every time playingCategory changed. 
    // This is fine.

    const currentPodcast = podcasts.find(p => p.category === selectedCategory);
    const playingPodcast = podcasts.find(p => p.category === playingCategory && p.exists);
    // 如果没有正在播放的，默认用第一个有数据的
    const firstAvailablePodcast = podcasts.find(p => p.exists);
    const activePodcast = playingPodcast || firstAvailablePodcast;

    // 播放指定类别
    const playCategory = (category) => {
        const podcast = podcasts.find(p => p.category === category && p.exists);
        if (podcast) {
            setPlayingCategory(category);
            setIsPlaying(true);
            setTimeout(() => {
                audioRef.current?.play().catch(e => console.error("Playback failed:", e));
            }, 100);
        }
    };

    const togglePlay = () => {
        if (!audioRef.current || !activePodcast?.audioUrl) return;
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
        const currentIndex = CATEGORIES.indexOf(playingCategory);
        let nextCategory = null;

        // Find the next category that has a podcast
        for (let i = currentIndex + 1; i < CATEGORIES.length; i++) {
            const cat = CATEGORIES[i];
            const podcast = podcasts.find(p => p.category === cat);
            if (podcast && podcast.exists && podcast.audioUrl) {
                nextCategory = cat;
                break;
            }
        }

        if (nextCategory) {
            setSelectedCategory(nextCategory);
            playCategory(nextCategory);
        } else {
            setIsPlaying(false);
            setProgress(0);
        }
    };

    const handleSeek = (e) => {
        if (!audioRef.current) return;
        const val = e.target.value;
        const time = (val / 100) * audioRef.current.duration;
        audioRef.current.currentTime = time;
        setProgress(val);
    };

    const selectedDateLabel = dateOptions.find(d => d.value === selectedDate)?.label || selectedDate;

    return (
        <div className="h-screen bg-neutral-950 text-white font-sans flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 p-4 md:p-8">
                {/* Header */}
                <header className="flex-none mb-4 md:mb-8 flex items-center justify-between gap-4">
                    <div
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => router.push('/')}
                    >
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-tr from-rose-500 to-orange-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0">
                            <span className="text-white font-bold text-base md:text-lg">P</span>
                        </div>
                        <div>
                            <h1 className="text-lg md:text-2xl font-bold tracking-tight">LingDaily</h1>
                            <p className="text-neutral-400 text-[10px] md:text-xs uppercase tracking-widest font-medium hidden md:block">AI Generated • Daily Updates</p>
                        </div>
                    </div>

                    {/* 日期选择器 */}
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
                                                // 如果是今天，跳转到 /podcasts 主页
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

                <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-4 md:gap-6 lg:gap-8">

                    {/* 类别卡片列表 - 小屏幕横向滚动 (固定高度)，大屏幕纵向列表 (满高) */}
                    <div className="flex-none lg:col-span-3 lg:h-full lg:overflow-hidden order-first">
                        <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto lg:h-full pb-2 lg:pb-0 lg:pr-2 custom-scrollbar">
                            {loading ? (
                                <div className="flex lg:flex-col items-center justify-center h-20 lg:h-40 w-full">
                                    <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-rose-500" />
                                </div>
                            ) : (
                                CATEGORIES.map(category => {
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
                                            {/* 背景渐变 */}
                                            <div className={`absolute inset-0 bg-gradient-to-br ${CATEGORY_COLORS[category]} opacity-10`} />

                                            {/* 背景图片 */}
                                            {hasData && podcast.imageUrl && podcast.imageUrl !== '/placeholder.jpg' && (
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
                                                    {!hasData && (
                                                        <span className="text-[10px] md:text-xs text-neutral-500">暂无</span>
                                                    )}
                                                </div>

                                                <h3 className="text-xs md:text-sm font-semibold text-white line-clamp-2 leading-tight">
                                                    {hasData ? podcast.title : `${CATEGORY_LABELS[category]} News`}
                                                </h3>
                                            </div>
                                        </Card>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* 右侧：内容区域 + 播放器 */}
                    <div className="flex-1 lg:col-span-9 flex flex-col min-h-0 bg-neutral-900/50 rounded-2xl border border-neutral-800 overflow-hidden backdrop-blur-sm relative">

                        {/* 滚动内容区域 */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-6">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-rose-500/20 blur-xl rounded-full"></div>
                                        <Loader2 className="relative w-16 h-16 animate-spin text-rose-500" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <p className="text-lg font-medium text-white">加载中...</p>
                                        <p className="text-sm text-neutral-500">正在获取 {selectedDateLabel} 的内容</p>
                                    </div>
                                </div>
                            ) : generating ? (
                                <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-6">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-rose-500/20 blur-xl rounded-full animate-pulse"></div>
                                        <Loader2 className="relative w-16 h-16 animate-spin text-rose-500" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <p className="text-lg font-medium text-white">正在生成 {CATEGORY_LABELS[selectedCategory]} 播客...</p>
                                        <p className="text-sm text-neutral-500">AI 正在分析新闻并合成音频，大约需要 2-3 分钟</p>
                                        <p className="text-xs text-neutral-600 mt-4">请耐心等待，不要关闭页面</p>
                                    </div>
                                </div>
                            ) : currentPodcast?.exists ? (
                                <div className="space-y-8">
                                    {/* 播客文稿 */}
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-lg font-bold text-rose-400 flex items-center gap-2">
                                                <span className="w-1 h-5 bg-rose-500 rounded-full"></span>
                                                播客文稿
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
                                                        正在播放
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play size={16} fill="currentColor" />
                                                        播放此文稿
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

                                    {/* 分割线 */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-neutral-700 to-transparent"></div>
                                        <span className="text-xs text-neutral-500 uppercase tracking-wider">新闻原文分析</span>
                                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-neutral-700 to-transparent"></div>
                                    </div>

                                    {/* 新闻原文 */}
                                    <div className="prose prose-invert prose-neutral max-w-none prose-headings:text-rose-400 prose-a:text-rose-400">
                                        <ReactMarkdown>{currentPodcast.summary}</ReactMarkdown>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-4">
                                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${CATEGORY_COLORS[selectedCategory]} opacity-20 flex items-center justify-center`}>
                                        <span className="text-3xl font-bold text-white opacity-50">
                                            {CATEGORY_LABELS[selectedCategory]?.[0]}
                                        </span>
                                    </div>
                                    <div className="text-center space-y-3">
                                        <p className="text-lg font-medium text-neutral-400">暂无内容</p>
                                        <p className="text-sm text-neutral-600">{selectedDateLabel} 的 {CATEGORY_LABELS[selectedCategory]} 播客尚未生成</p>

                                        {/* 仅在今天显示生成按钮 */}
                                        {isToday && (
                                            <>
                                                <button
                                                    onClick={generatePodcast}
                                                    className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-rose-500/25"
                                                >
                                                    <Sparkles className="w-5 h-5" />
                                                    立即生成
                                                </button>

                                                <p className="text-xs text-neutral-600 mt-2">生成时间约 2-3 分钟</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 音频播放器 - Flex item at the bottom */}
            {activePodcast?.audioUrl && (
                <div className="flex-none h-24 bg-neutral-950 border-t border-neutral-800 p-4 flex items-center gap-4 z-50 w-full relative">
                    <audio
                        ref={audioRef}
                        src={activePodcast.audioUrl}
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={handleEnded}
                    />

                    {/* 播放按钮 */}
                    <button
                        onClick={togglePlay}
                        className="w-14 h-14 rounded-full bg-white hover:bg-neutral-200 text-black flex items-center justify-center hover:scale-105 transition-all duration-300 active:scale-95 shadow-lg shadow-white/10 shrink-0"
                    >
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>

                    {/* 小图片 */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-neutral-800 shrink-0 border border-neutral-700 hidden sm:block">
                        {activePodcast.imageUrl && activePodcast.imageUrl !== '/placeholder.jpg' && (
                            <img src={activePodcast.imageUrl} className="w-full h-full object-cover" />
                        )}
                    </div>

                    {/* 标题 & 进度条 */}
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
                /* 小屏幕隐藏横向滚动条 */
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
