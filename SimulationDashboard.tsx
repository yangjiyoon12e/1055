
import React, { useEffect, useState } from 'react';
import { SimulationResult, Article, Comment, Reply } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, AreaChart, Area, CartesianGrid } from 'recharts';
import { generateReplyReaction } from '../services/geminiService';

interface SimulationDashboardProps {
  result: SimulationResult;
  article: Article;
  onReset: () => void;
  onFollowUp: () => void;
}

const SimulationDashboard: React.FC<SimulationDashboardProps> = ({ result, article, onReset, onFollowUp }) => {
  const [displayedScore, setDisplayedScore] = useState(0);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  
  // Local state for comments to allow user interaction (replies)
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [replyingTo, setReplyingTo] = useState<number | null>(null); // Index of the comment being replied to
  const [replyText, setReplyText] = useState<string>("");
  const [generatingReplyId, setGeneratingReplyId] = useState<number | null>(null);

  useEffect(() => {
    // Initialize local comments when result changes
    setLocalComments(result.comments);
  }, [result]);

  // Extract unique platforms for the filter
  const availablePlatforms = ['ALL', ...Array.from(new Set(localComments.map(c => c.platform)))];

  // Filter comments based on selection
  const filteredComments = selectedPlatform === 'ALL' 
    ? localComments 
    : localComments.filter(c => c.platform === selectedPlatform);

  const handleSubmitReply = async (targetCommentIdx: number, targetComment: Comment) => {
    if (!replyText.trim()) return;

    // 1. Add Reporter's Reply immediately (Optimistic UI)
    const reporterReply: Reply = {
      username: article.author || '기자',
      content: replyText,
      likes: 0
    };

    const reporterReplyText = replyText; // capture for closure
    setReplyText("");
    setReplyingTo(null);
    setGeneratingReplyId(targetCommentIdx); // Start loading state for AI response

    setLocalComments(prev => prev.map((c, i) => {
      if (i === targetCommentIdx) {
        return { ...c, replies: [...c.replies, reporterReply] };
      }
      return c;
    }));

    // 2. Call AI for reactions
    try {
        const aiReplies = await generateReplyReaction(article, targetComment, reporterReplyText);
        
        // 3. Add AI replies
        if (aiReplies && aiReplies.length > 0) {
            setLocalComments(prev => prev.map((c, i) => {
                if (i === targetCommentIdx) {
                    return { ...c, replies: [...c.replies, ...aiReplies] };
                }
                return c;
            }));
        }
    } catch (error) {
        console.error("Failed to generate AI reply reaction", error);
    } finally {
        setGeneratingReplyId(null);
    }
  };

  useEffect(() => {
    let start = 0;
    const end = result.viralityScore;
    if (start === end) return;

    const duration = 1500;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayedScore(end);
        clearInterval(timer);
      } else {
        setDisplayedScore(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [result.viralityScore]);

  const getScoreColor = (score: number) => {
    if (score < 30) return 'text-gray-500';
    if (score < 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const sentimentData = [
    { name: '긍정', value: localComments.filter(c => c.sentiment === 'positive').length, color: '#4ade80' },
    { name: '중립', value: localComments.filter(c => c.sentiment === 'neutral').length, color: '#94a3b8' },
    { name: '부정', value: localComments.filter(c => c.sentiment === 'negative').length, color: '#f87171' },
  ];

  const getPlatformStyle = (platform: string) => {
    // New Modern Categorization
    if (platform === 'SNS' || platform.includes('SNS')) {
        return 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-200'; // Integrated SNS style
    } else if (platform.includes('여초')) {
        return 'bg-pink-50 text-pink-700 border-pink-200 font-medium'; // Female-dominated
    } else if (platform.includes('남초')) {
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium'; // Male-dominated
    } else if (platform.includes('익명')) {
        return 'bg-gray-700 text-gray-100 border-gray-600 font-bold'; // Anonymous (Darker/Edgy)
    } else if (platform.includes('뉴스 포털')) {
        return 'bg-green-50 text-green-800 border-green-200'; // Naver-like Green
    }

    // Specific legacy/Time Machine platforms
    else if (platform.includes('인스타그램') || platform.includes('인스타')) {
        return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200';
    } else if (platform.includes('트위터') || platform.includes('X')) {
        return 'bg-sky-100 text-sky-800 border-sky-200';
    } else if (platform.includes('페이스북')) {
        return 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (platform.includes('싸이월드')) {
        return 'bg-orange-100 text-orange-800 border-orange-200';
    } else if (platform.includes('하이텔') || platform.includes('천리안') || platform.includes('나우누리') || platform.includes('PC통신')) {
        return 'bg-blue-900 text-white border-blue-800 font-mono';
    } else if (platform.includes('신문') || platform.includes('투고') || platform.includes('대자보')) {
        return 'bg-stone-200 text-stone-800 border-stone-300 font-serif';
    } else if (platform.includes('뉴럴') || platform.includes('화성') || platform.includes('미래')) {
        return 'bg-cyan-900 text-cyan-300 border-cyan-500 shadow-cyan-500/50';
    } else {
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const MetricCard = ({ title, value, max = 100, colorClass }: { title: string, value: number, max?: number, colorClass: string }) => (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs font-bold text-gray-500 uppercase">{title}</span>
        <span className={`text-xl font-black ${colorClass}`}>{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-1000 ${colorClass.replace('text-', 'bg-')}`} 
          style={{ width: `${(value / max) * 100}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Stats (Stacked) */}
      <div className="space-y-2">
        {article.isEmergencyMode && (
          <div className="bg-red-900 border-4 border-red-600 text-white text-center py-4 font-black tracking-widest uppercase rounded shadow-2xl animate-pulse">
             🚨 긴급 속보: 유일한 생존 언론사 🚨
          </div>
        )}
        {article.isCrazyMode && (
          <div className="bg-purple-600 text-white text-center py-2 font-bold tracking-widest uppercase rounded shadow-lg animate-pulse">
             🦄 광기 기자 모드 - 대중 신뢰도: 0% 🦄
          </div>
        )}
        {article.isFakeNews && (
          <div className="bg-orange-600 text-white text-center py-2 font-bold tracking-widest uppercase rounded shadow-lg animate-pulse">
            ⚠️ 가짜 뉴스 시뮬레이션 - 현실 왜곡 중 ⚠️
          </div>
        )}
        {article.isTimeMachineMode && (
          <div className="bg-amber-700 text-amber-100 text-center py-2 font-serif font-bold tracking-widest uppercase rounded shadow-lg">
            🕰️ 타임머신 모드 가동: 서기 {article.targetYear}년 🕰️
          </div>
        )}
      </div>

      {/* Main Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Virality Card (Large) */}
        <div className={`bg-white p-6 rounded-lg shadow-md border-t-4 ${article.isEmergencyMode ? 'border-red-900' : article.isCrazyMode ? 'border-purple-600' : article.isFakeNews ? 'border-orange-600' : article.isTimeMachineMode ? 'border-amber-600' : 'border-blue-900'} md:col-span-1`}>
          <h3 className="text-sm font-bold text-gray-500 uppercase">화제성 지수</h3>
          <div className="flex items-end mt-2">
            <span className={`text-6xl font-black ${getScoreColor(displayedScore)}`}>{displayedScore}</span>
            <span className="text-xl text-gray-400 mb-2 ml-1">/ 100</span>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-gray-300 md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard title="신뢰도" value={result.reliabilityScore} colorClass={result.reliabilityScore > 70 ? 'text-green-600' : result.reliabilityScore < 40 ? 'text-red-600' : 'text-yellow-600'} />
            <MetricCard title="논란 지수" value={result.controversyScore} colorClass={result.controversyScore > 70 ? 'text-red-600' : 'text-gray-600'} />
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex flex-col justify-center">
                 <span className="text-xs font-bold text-gray-500 uppercase mb-1">예상 도달</span>
                 <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>조회수</span>
                    <span className="font-bold">{result.viewCountEstimate.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
                    <span>공유 수</span>
                    <span className="font-bold">{result.shareCount.toLocaleString()}</span>
                 </div>
            </div>
        </div>
      </div>

      {/* Market Impact Analysis (Stocks, Crypto, Forex) */}
      {result.stockAnalysis && result.stockAnalysis.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-gray-200">
                 <h3 className="font-bold text-slate-700">📉 시장 반응 분석</h3>
            </div>
            
            {/* Grid for multiple indices */}
            <div className={`grid grid-cols-1 ${result.stockAnalysis.length > 1 ? 'lg:grid-cols-2' : ''} gap-6 p-6`}>
                {result.stockAnalysis.map((stockData, sIdx) => {
                    const isStockUp = stockData.endValue >= stockData.startValue;
                    const stockColor = isStockUp ? '#ef4444' : '#3b82f6';
                    const stockDiff = stockData.endValue - stockData.startValue;
                    const stockPercent = (stockDiff / stockData.startValue) * 100;

                    // Handle currency/crypto formatting roughly
                    const isCurrency = stockData.indexName.includes('환율') || stockData.indexName.includes('USD');
                    const valueFormatter = (val: number) => val.toLocaleString(undefined, { maximumFractionDigits: 2 });

                    return (
                        <div key={sIdx} className="space-y-4">
                            {/* Header for this specific index */}
                            <div className="flex justify-between items-center bg-white p-3 rounded border border-gray-100 shadow-sm">
                                <span className="font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded text-sm">
                                    {stockData.indexName}
                                </span>
                                <div className={`text-lg font-mono font-bold ${isStockUp ? 'text-red-600' : 'text-blue-600'}`}>
                                    {valueFormatter(stockData.endValue)} 
                                    <span className="text-sm ml-2">
                                        {isStockUp ? '▲' : '▼'} {Math.abs(stockDiff).toFixed(2)} ({stockPercent > 0 ? '+' : ''}{stockPercent.toFixed(2)}%)
                                    </span>
                                </div>
                            </div>

                            {/* Chart */}
                            <div className="h-48 border border-gray-100 rounded p-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stockData.graphData}>
                                        <defs>
                                            <linearGradient id={`colorValue${sIdx}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={stockColor} stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor={stockColor} stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                                        <YAxis domain={['auto', 'auto']} hide />
                                        <Tooltip 
                                            contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                            itemStyle={{color: '#374151', fontWeight: 'bold'}}
                                            formatter={(value: number) => [value.toLocaleString(undefined, {maximumFractionDigits: 2}), '수치']}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="value" 
                                            stroke={stockColor} 
                                            strokeWidth={2}
                                            fillOpacity={1} 
                                            fill={`url(#colorValue${sIdx})`} 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            
                            {/* Market Commentary for this index */}
                            <p className="text-xs text-gray-500 font-medium italic border-l-2 border-gray-300 pl-2">
                                "{stockData.marketCommentary}"
                            </p>

                            {/* Sectors/Related Items */}
                            <div>
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">관련 항목/종목 변동</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {stockData.affectedSectors.map((sector, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-xs bg-gray-50 px-2 py-1 rounded">
                                            <span className="text-gray-600 truncate mr-2">{sector.name}</span>
                                            <span className={`font-mono font-bold ${sector.change > 0 ? 'text-red-600' : sector.change < 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                                                {sector.change > 0 ? '+' : ''}{sector.change}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Extra Indices (Social Metrics) - Shared across all */}
            {result.extraIndices && (
                <div className="bg-slate-50 p-6 border-t border-gray-200">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">종합 사회 지표</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-600">국가 불안도</span>
                                    <span className="font-bold text-gray-800">{result.extraIndices.nationalAnxiety}/100</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div className="bg-orange-500 h-1.5 rounded-full" style={{width: `${result.extraIndices.nationalAnxiety}%`}}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-600">경제 안정성</span>
                                    <span className="font-bold text-gray-800">{result.extraIndices.economicStability}/100</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{width: `${result.extraIndices.economicStability}%`}}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-600">대중 분노</span>
                                    <span className="font-bold text-gray-800">{result.extraIndices.angerIndex}/100</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div className="bg-red-600 h-1.5 rounded-full" style={{width: `${result.extraIndices.angerIndex}%`}}></div>
                                </div>
                            </div>
                        </div>
                </div>
            )}
        </div>
      )}

      {/* Rival Media Coverage Section */}
      {result.otherMediaCoverage && result.otherMediaCoverage.length > 0 && (
         <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 shadow-sm">
             <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
                {article.isTimeMachineMode ? `${article.targetYear}년 타 언론사 보도` : '타 언론사 실시간 보도'}
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {result.otherMediaCoverage.map((media, idx) => (
                    <div key={idx} className="bg-white p-4 rounded border-l-4 border-slate-400 shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-xs font-bold text-slate-500 mb-1">{media.mediaName}</div>
                        <div className="font-serif font-bold text-lg text-slate-800 leading-tight">"{media.headline}"</div>
                    </div>
                 ))}
             </div>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Editor Feedback & Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Editor Feedback */}
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-gray-800 relative overflow-hidden">
             <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">
                {article.isEmergencyMode ? '생존자 통신 채널' : article.isCrazyMode ? '정신건강 상담 센터' : article.isFakeNews ? '비밀 채널 메시지' : '편집장 코멘트'}
             </h3>
             <p className="text-lg font-medium text-gray-800 italic relative z-10 leading-relaxed">
               "{result.editorFeedback}"
             </p>
          </div>

          <div className={`bg-white p-8 rounded-lg shadow-sm border ${
              article.isEmergencyMode ? 'border-red-900 bg-red-50' :
              article.isCrazyMode ? 'border-purple-200 bg-purple-50' :
              article.isFakeNews ? 'border-red-200 bg-red-50' : 
              article.isTimeMachineMode ? 'border-amber-200 bg-amber-50' : 'border-gray-200'
          }`}>
            <div className="flex flex-wrap gap-2 mb-4">
                {article.isEmergencyMode && <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-red-900 text-white animate-pulse">긴급 속보</span>}
                {article.isCrazyMode && <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-purple-600 text-white">미친 기자</span>}
                {article.isFakeNews && <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-orange-600 text-white">가짜 뉴스</span>}
                {article.isTimeMachineMode && <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-amber-600 text-white">기록물: {article.targetYear}년</span>}
                {!article.isEmergencyMode && !article.isCrazyMode && !article.isFakeNews && !article.isTimeMachineMode && (
                   <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-600">{article.category}</span>
                )}
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-2 leading-tight">
              {article.title}
            </h1>
            <p className="text-sm text-gray-500 mb-6 border-b border-gray-200 pb-4">
              {article.author} 기자 · {article.isTimeMachineMode ? `${article.targetYear}년 ${new Date().getMonth()+1}월 ${new Date().getDate()}일` : new Date(article.timestamp).toLocaleDateString()}
            </p>
            <div className={`prose max-w-none text-gray-700 text-sm md:text-base line-clamp-4 ${article.isTimeMachineMode ? 'font-serif' : ''}`}>
              {article.content}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-bold text-blue-300 uppercase mb-2">사회적 파장</h3>
                <p className="text-sm leading-relaxed opacity-90">
                  {result.impactSummary}
                </p>
             </div>

             <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">여론 분포</h3>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sentimentData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={40} tick={{fontSize: 12}} />
                      <Tooltip cursor={{fill: 'transparent'}} />
                      <Bar dataKey="value" barSize={16} radius={[0, 4, 4, 0]}>
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: Comments Feed */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 h-full flex flex-col max-h-[900px]">
            <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-lg">
              <h3 className="font-bold text-gray-800 mb-3">커뮤니티 반응 ({filteredComments.length})</h3>
              
              {/* Platform Filters */}
              <div className="flex flex-wrap gap-2">
                {availablePlatforms.map((platform) => (
                  <button
                    key={platform}
                    onClick={() => setSelectedPlatform(platform)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      selectedPlatform === platform 
                        ? 'bg-gray-800 text-white border-gray-800' 
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {platform === 'ALL' ? '전체' : platform}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-hide bg-gray-50">
              {filteredComments.map((comment, idx) => (
                <div key={idx} className="space-y-2 animate-fade-in">
                  {/* Main Comment */}
                  <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${getPlatformStyle(comment.platform)} font-bold`}>
                          {comment.platform}
                        </span>
                        <span className="font-bold text-sm text-gray-900">{comment.username}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        comment.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                        comment.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {comment.likes} 👍
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 leading-snug break-keep">
                      {comment.content}
                    </p>
                    
                    {/* Reply Input Form */}
                    {replyingTo === idx ? (
                      <div className="mt-2 flex gap-2 animate-fade-in border-t border-gray-100 pt-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                          placeholder="답글 작성..."
                          autoFocus
                          onKeyPress={(e) => e.key === 'Enter' && handleSubmitReply(idx, comment)}
                        />
                        <button
                          onClick={() => handleSubmitReply(idx, comment)}
                          className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700 font-bold whitespace-nowrap"
                        >
                          등록
                        </button>
                        <button
                          onClick={() => { setReplyingTo(null); setReplyText(""); }}
                          className="text-gray-500 text-xs px-2 hover:text-gray-700 whitespace-nowrap"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReplyingTo(idx)}
                        className="text-xs text-blue-500 hover:text-blue-700 font-medium mt-2 flex items-center"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                        답글 달기
                      </button>
                    )}
                  </div>

                  {/* Replies (Nested) */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-4 pl-3 border-l-2 border-gray-200 space-y-2">
                      {comment.replies.map((reply, rIdx) => (
                        <div key={rIdx} className={`p-2 rounded text-sm relative animate-fade-in ${reply.username === (article.author || '기자') ? 'bg-blue-50 border border-blue-100' : 'bg-gray-100'}`}>
                          <div className="absolute top-3 -left-4 w-3 h-[1px] bg-gray-300"></div>
                          <div className="flex justify-between items-center mb-1">
                            <span className={`font-bold text-xs ${reply.username === (article.author || '기자') ? 'text-blue-700' : 'text-gray-700'}`}>
                              ↳ {reply.username} {reply.username === (article.author || '기자') && <span className="bg-blue-200 text-blue-800 text-[10px] px-1 rounded ml-1">작성자</span>}
                            </span>
                            <span className="text-[10px] text-gray-500">{reply.likes} 👍</span>
                          </div>
                          <p className="text-gray-600 text-xs">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {generatingReplyId === idx && (
                     <div className="ml-4 pl-3 border-l-2 border-gray-200 pt-2">
                        <div className="p-2 rounded bg-gray-50 border border-gray-100 flex items-center gap-2">
                           <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                           <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                           <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                           <span className="text-xs text-gray-400 ml-1">독자가 답글 입력 중...</span>
                        </div>
                     </div>
                  )}
                </div>
              ))}
              {filteredComments.length === 0 && (
                <div className="text-center text-gray-400 py-8 text-sm">
                  해당 플랫폼의 반응이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-8 gap-4">
        <button 
          onClick={onFollowUp}
          className={`
            border-2 text-white px-8 py-3 font-bold uppercase transition-colors rounded-full shadow-lg
            ${article.isEmergencyMode ? 'bg-gray-800 border-gray-800 hover:bg-black' : article.isCrazyMode ? 'bg-fuchsia-800 border-fuchsia-800 hover:bg-fuchsia-900' : 'bg-slate-700 border-slate-700 hover:bg-slate-800'}
          `}
        >
          후속 기사 작성
        </button>
        <button 
          onClick={onReset}
          className={`
            border-2 text-white px-8 py-3 font-bold uppercase transition-colors rounded-full shadow-lg
            ${article.isEmergencyMode ? 'bg-red-900 border-red-900 hover:bg-black' : article.isCrazyMode ? 'bg-purple-700 border-purple-700 hover:bg-purple-800' : article.isFakeNews ? 'bg-red-700 border-red-700 hover:bg-red-800' : article.isTimeMachineMode ? 'bg-amber-700 border-amber-700 hover:bg-amber-800' : 'bg-gray-800 border-gray-800 hover:bg-gray-900'}
          `}
        >
          {article.isEmergencyMode ? '새 긴급 타전' : article.isCrazyMode ? '새 헛소리' : article.isFakeNews ? '새 찌라시' : article.isTimeMachineMode ? '다른 시대로 이동' : '새 기사 작성'}
        </button>
      </div>
    </div>
  );
};

export default SimulationDashboard;
