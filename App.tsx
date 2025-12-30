import React, { useState } from 'react';
import ArticleEditor from './ArticleEditor';
import SimulationDashboard from './SimulationDashboard';
import { Article, INITIAL_ARTICLE, SimulationResult } from './types';
import { analyzeArticle } from './geminiService';

enum AppState {
  EDITOR,
  SIMULATING,
  RESULT
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.EDITOR);
  const [article, setArticle] = useState<Article>(INITIAL_ARTICLE);
  const [result, setResult] = useState<SimulationResult | null>(null);
  
  // History State
  const [history, setHistory] = useState<{ article: Article, result: SimulationResult }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Secret Mode State
  const [secretClickCount, setSecretClickCount] = useState(0);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");

  const handlePublish = async () => {
    setAppState(AppState.SIMULATING);
    try {
      const simulationResult = await analyzeArticle(article);
      setResult(simulationResult);
      
      // Save to history
      setHistory(prev => [{ article: { ...article }, result: simulationResult }, ...prev]);
      
      setAppState(AppState.RESULT);
    } catch (error) {
      console.error("Failed to simulate", error);
      alert("AI 시뮬레이션 중 오류가 발생했습니다.");
      setAppState(AppState.EDITOR);
    }
  };

  const handleReset = () => {
    setArticle({
      ...INITIAL_ARTICLE,
      timestamp: new Date().toISOString()
    });
    setResult(null);
    setAppState(AppState.EDITOR);
    setSecretClickCount(0); // Reset secret count
  };

  const handleFollowUp = () => {
    // Save current context
    const context = `
      [직전 기사]
      제목: ${article.title}
      내용: ${article.content}
      대중 여론: ${result?.publicSentiment}
      사회적 파장: ${result?.impactSummary}
    `;

    setArticle({
      ...INITIAL_ARTICLE,
      category: article.category,
      author: article.author,
      isCrazyMode: article.isCrazyMode,
      isEmergencyMode: article.isEmergencyMode,
      isFakeNews: article.isFakeNews,
      isTimeMachineMode: article.isTimeMachineMode, // Preserve Time Machine mode
      targetYear: article.targetYear, // Preserve Year
      previousArticleContext: context, // Set context for next article
      timestamp: new Date().toISOString()
    });
    setResult(null);
    setAppState(AppState.EDITOR);
    setSecretClickCount(0);
  };
  
  const handleLoadHistory = (item: { article: Article, result: SimulationResult }) => {
      setArticle(item.article);
      setResult(item.result);
      setAppState(AppState.RESULT);
      setShowHistory(false);
  };

  const handleSecretClick = () => {
    const newCount = secretClickCount + 1;
    setSecretClickCount(newCount);
    if (newCount >= 4) {
      setShowPinModal(true);
      setSecretClickCount(0);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === "0000") {
      setArticle(prev => ({
        ...prev,
        isCrazyMode: false,
        isEmergencyMode: false,
        isFakeNews: false,
        isTimeMachineMode: false
      }));
      setShowPinModal(false);
      setPinInput("");
      alert("✅ 시스템 정상화 ✅\n모든 특수 모드가 해제되었습니다.");
    } else if (pinInput === "6666") {
      // Allow mixing: just add crazy mode to current state
      setArticle(prev => ({ ...prev, isCrazyMode: true }));
      setShowPinModal(false);
      setPinInput("");
      alert("🦄 광기 모드가 추가되었습니다 🦄\n(CRAZY MODE ADDED)");
    } else if (pinInput === "9453") {
      // Allow mixing: just add emergency mode
      setArticle(prev => ({ ...prev, isEmergencyMode: true }));
      setShowPinModal(false);
      setPinInput("");
      alert("🚨 긴급 재난 모드가 추가되었습니다 🚨\n(EMERGENCY MODE ADDED)");
    } else {
      alert("접근 거부: 잘못된 보안 코드입니다.");
      setPinInput("");
      setShowPinModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans relative">
      {/* Crazy Mode Screen Effect */}
      {article.isCrazyMode && <div className="crazy-mode-screen-effect"></div>}
      
      {/* Emergency Mode Screen Effect */}
      {article.isEmergencyMode && <div className="emergency-mode-screen-effect"></div>}

      {/* Secret PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/80 z-[99999] flex items-center justify-center backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-xl shadow-2xl w-full max-w-sm text-center">
            <h3 className="text-xl font-mono text-red-500 font-bold mb-4 tracking-widest animate-pulse">
              시스템 강제 접속
            </h3>
            <p className="text-gray-400 text-sm mb-6 font-mono">관리자 접근 코드를 입력하십시오.</p>
            <form onSubmit={handlePinSubmit}>
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 text-white text-center text-3xl tracking-[1rem] py-3 rounded mb-6 focus:outline-none focus:border-red-500 font-mono"
                placeholder="____"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 bg-gray-700 text-white py-2 rounded font-mono hover:bg-gray-600 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white py-2 rounded font-mono font-bold hover:bg-red-700 transition-colors"
                >
                  실행
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Drawer/Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-[60] flex justify-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setShowHistory(false)}></div>
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800">🗄️ 기사 보관소 ({history.length})</h2>
                    <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-black">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-100">
                    {history.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">
                            보관된 기사가 없습니다.<br/>첫 기사를 작성해보세요!
                        </div>
                    ) : (
                        history.map((item, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => handleLoadHistory(item)}
                                className="w-full text-left bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all group"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex gap-1">
                                      {item.article.isEmergencyMode && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">긴급</span>}
                                      {item.article.isCrazyMode && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">광기</span>}
                                      {item.article.isFakeNews && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700">가짜/선동</span>}
                                      {!item.article.isEmergencyMode && !item.article.isCrazyMode && !item.article.isFakeNews && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">{item.article.category}</span>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-400">{new Date(item.article.timestamp).toLocaleDateString()}</span>
                                </div>
                                <h4 className="font-serif font-bold text-gray-900 leading-tight group-hover:text-blue-800 line-clamp-2 mt-1">
                                    {item.article.title}
                                </h4>
                                <div className="mt-2 flex items-center text-xs text-gray-500 gap-3">
                                    <span>🔥 화제성 {item.result.viralityScore}</span>
                                    <span>💬 댓글 {item.result.comments.length}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-serif font-black tracking-tighter bg-white text-slate-900 px-2 py-1 transform -rotate-2">
                DAILY TRUTH
              </span>
              <button 
                onClick={handleSecretClick}
                className="ml-4 text-xs md:text-sm font-light text-gray-300 tracking-widest uppercase border-l border-gray-700 pl-4 hover:text-white transition-colors focus:outline-none text-left"
              >
                기자 시뮬레이터 v1.0
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                 onClick={() => setShowHistory(true)}
                 className="flex items-center text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-slate-800"
              >
                 <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                 기록 보관소
                 {history.length > 0 && <span className="ml-2 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{history.length}</span>}
              </button>
              <div className="hidden md:flex text-xs text-gray-400">
                <span>{new Date().toLocaleDateString()} 발행</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {appState === AppState.EDITOR || appState === AppState.SIMULATING ? (
          <div className="animate-fade-in-up">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-serif font-bold text-gray-800 mb-2">오늘의 특종을 작성하세요</h2>
              <p className="text-gray-600">당신의 펜 끝에서 세상이 어떻게 변하는지 지켜보십시오.</p>
            </div>
            <ArticleEditor 
              article={article} 
              setArticle={setArticle} 
              onPublish={handlePublish}
              isSimulating={appState === AppState.SIMULATING}
            />
          </div>
        ) : (
          result && (
            <div className="animate-fade-in">
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-2xl font-serif font-bold text-gray-800">발행 결과 리포트</h2>
                <button onClick={handleReset} className="md:hidden text-sm text-blue-600 font-bold">
                    새 기사 쓰기 &rarr;
                </button>
              </div>
              <SimulationDashboard 
                result={result} 
                article={article} 
                onReset={handleReset} 
                onFollowUp={handleFollowUp}
              />
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-200 border-t border-gray-300 mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2024 기자 시뮬레이터. Powered by Google Gemini.</p>
          <p className="mt-2 text-xs">이 시뮬레이션은 허구이며 AI에 의해 생성되었습니다.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;