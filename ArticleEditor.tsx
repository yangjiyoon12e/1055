import React from 'react';
import { Article, ArticleCategory } from '../types';

interface ArticleEditorProps {
  article: Article;
  setArticle: React.Dispatch<React.SetStateAction<Article>>;
  onPublish: () => void;
  isSimulating: boolean;
}

const ArticleEditor: React.FC<ArticleEditorProps> = ({ article, setArticle, onPublish, isSimulating }) => {
  const handleChange = (field: keyof Article, value: string | boolean) => {
    // Allow overlapping modes: simply update the specific field without resetting others
    setArticle(prev => ({ ...prev, [field]: value }));
  };

  const handleRewrite = () => {
    if (confirm("제목과 본문을 초기화하시겠습니까? (설정은 유지됩니다)")) {
        setArticle(prev => ({
            ...prev,
            title: '',
            content: ''
        }));
    }
  };

  const getThemeColor = () => {
    // Prioritize themes for border/shadow if multiple are active, or mix them?
    // For UI cleanliness, we prioritize the most "intense" color for the border.
    if (article.isEmergencyMode) return 'darkRed';
    if (article.isCrazyMode) return 'purple';
    if (article.isFakeNews) return 'red';
    if (article.isTimeMachineMode) return 'amber';
    return 'gray';
  };

  const theme = getThemeColor();
  
  const borderColor = {
      darkRed: 'border-red-900 shadow-red-900/50',
      purple: 'border-purple-500 shadow-purple-200',
      red: 'border-red-500 shadow-red-100',
      amber: 'border-amber-600 shadow-amber-200',
      gray: 'border-gray-200'
  }[theme];

  const headerBg = {
      darkRed: 'bg-black border-b-4 border-red-700',
      purple: 'bg-purple-900',
      red: 'bg-red-900',
      amber: 'bg-amber-800',
      gray: 'bg-gray-800'
  }[theme];

  const focusBorder = {
      darkRed: 'focus:border-red-900 bg-red-50/50',
      purple: 'focus:border-purple-500 bg-purple-50',
      red: 'focus:border-red-500 bg-red-50',
      amber: 'focus:border-amber-600 bg-amber-50',
      gray: 'focus:border-gray-300 border-gray-100'
  }[theme];

  const buttonClass = {
      darkRed: 'bg-red-900 hover:bg-black text-red-500 border border-red-500 animate-pulse',
      purple: 'bg-purple-700 hover:bg-purple-600 shadow-purple-500/50',
      red: 'bg-red-700 hover:bg-red-600 shadow-red-500/50',
      amber: 'bg-amber-700 hover:bg-amber-800 shadow-amber-500/50',
      gray: 'bg-blue-900 hover:bg-blue-800'
  }[theme];

  return (
    <div className={`bg-white rounded-lg shadow-xl overflow-hidden border transition-colors duration-500 ${borderColor}`}>
      <div className={`p-4 flex justify-between items-center transition-colors duration-500 ${headerBg}`}>
        <div className="flex items-center space-x-2 text-white">
          <div className={`w-3 h-3 rounded-full animate-pulse ${article.isEmergencyMode ? 'bg-red-600' : article.isCrazyMode ? 'bg-fuchsia-400' : article.isFakeNews ? 'bg-yellow-400' : article.isTimeMachineMode ? 'bg-amber-400' : 'bg-red-500'}`}></div>
          <span className="font-bold text-sm tracking-wider flex gap-2">
            {article.isEmergencyMode && <span>[긴급]</span>}
            {article.isCrazyMode && <span>[광기]</span>}
            {article.isFakeNews && <span>[선동]</span>}
            {article.isTimeMachineMode && <span>[시간여행]</span>}
            {!article.isEmergencyMode && !article.isCrazyMode && !article.isFakeNews && !article.isTimeMachineMode && <span>CMS: 기사 작성 시스템</span>}
          </span>
        </div>
        <div className="text-xs text-gray-400">
          {new Date().toLocaleDateString()} | {article.author}
        </div>
      </div>
      
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        {/* Previous Article Context Indicator */}
        {article.previousArticleContext && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 text-sm text-blue-800 flex items-center animate-fade-in">
             <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
             </svg>
             <strong>이전 기사에 이은 후속 보도입니다.</strong> 독자들이 지난 기사의 내용을 기억합니다.
          </div>
        )}

        {/* Toggles Row */}
        <div className="flex flex-col sm:flex-row justify-end items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-6 mb-4">
          
          {/* Time Machine Toggle */}
          <div className="flex items-center gap-2">
            <label className="flex items-center cursor-pointer group">
              <div className="mr-3 text-right">
                  <div className={`text-sm font-bold ${article.isTimeMachineMode ? 'text-amber-700' : 'text-gray-500 group-hover:text-amber-500'}`}>타임머신 모드</div>
                  <div className="text-xs text-gray-400">과거/미래 접속</div>
              </div>
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={article.isTimeMachineMode || false} 
                  onChange={(e) => handleChange('isTimeMachineMode', e.target.checked)}
                  disabled={isSimulating}
                />
                <div className={`block w-14 h-8 rounded-full transition-colors ${article.isTimeMachineMode ? 'bg-amber-600' : 'bg-gray-300'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform transform ${article.isTimeMachineMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </div>
            </label>
            
            {/* Year Input (Only visible when Time Machine is on) */}
            {article.isTimeMachineMode && (
              <div className="animate-fade-in flex items-center border-b-2 border-amber-500">
                <input 
                  type="number" 
                  value={article.targetYear}
                  onChange={(e) => handleChange('targetYear', e.target.value)}
                  className="w-20 text-center font-mono font-bold text-amber-900 bg-transparent outline-none"
                  placeholder="연도"
                  min="1900"
                  max="2100"
                />
                <span className="text-xs font-bold text-amber-700 mr-2">년</span>
              </div>
            )}
          </div>

          {/* Fake News Toggle */}
          <label className="flex items-center cursor-pointer group">
            <div className="mr-3 text-right">
                <div className={`text-sm font-bold ${article.isFakeNews ? 'text-red-700' : 'text-gray-500 group-hover:text-red-500'}`}>가짜 뉴스 모드</div>
                <div className="text-xs text-gray-400">선동 및 날조</div>
            </div>
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={article.isFakeNews || false} 
                onChange={(e) => handleChange('isFakeNews', e.target.checked)}
                disabled={isSimulating}
              />
              <div className={`block w-14 h-8 rounded-full transition-colors ${article.isFakeNews ? 'bg-red-600' : 'bg-gray-300'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform transform ${article.isFakeNews ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </div>
          </label>
        </div>

        {/* Category & Author Row */}
        <div className="flex gap-4">
          <div className="w-1/3">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">카테고리</label>
            <select 
              value={article.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full border-b-2 border-gray-300 py-2 focus:border-black outline-none bg-transparent font-medium"
              disabled={isSimulating}
            >
              {Object.values(ArticleCategory).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="w-2/3">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">기자명</label>
            <input 
              type="text" 
              value={article.author}
              onChange={(e) => handleChange('author', e.target.value)}
              className="w-full border-b-2 border-gray-300 py-2 focus:border-black outline-none bg-transparent"
              placeholder="이름 입력"
              disabled={isSimulating}
            />
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">헤드라인</label>
          <input 
            type="text" 
            value={article.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full text-3xl font-serif font-bold placeholder-gray-300 border-none outline-none leading-tight"
            placeholder={
                article.isEmergencyMode ? "긴급 보도: 국민들에게 전할 진실을 입력하십시오." :
                article.isCrazyMode ? "대중이 비웃을만한 제목을 입력하세요..." :
                "기사 제목을 입력하세요..."
            }
            disabled={isSimulating}
          />
        </div>

        <div className="border-t border-gray-200 my-4"></div>

        {/* Content */}
        <div className="relative">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">본문</label>
          <textarea 
            value={article.content}
            onChange={(e) => handleChange('content', e.target.value)}
            className={`w-full h-96 p-4 text-lg leading-relaxed text-gray-800 placeholder-gray-300 border rounded outline-none resize-none shadow-inner transition-colors ${focusBorder}`}
            placeholder={
                article.isEmergencyMode ? "상황이 위급합니다. 신속하게 기사를 작성하세요..." :
                "육하원칙에 의거하여 기사를 작성해주세요."
            }
            disabled={isSimulating}
          />
        </div>

        {/* Action Bar */}
        <div className="flex justify-end pt-4 space-x-3">
          <button
             onClick={handleRewrite}
             disabled={isSimulating || (!article.title && !article.content)}
             className="px-4 py-3 text-gray-500 hover:text-gray-800 font-bold text-sm uppercase transition-colors rounded hover:bg-gray-100 disabled:opacity-50"
          >
             다시 쓰기
          </button>
          <button
            onClick={onPublish}
            disabled={!article.title || !article.content || isSimulating}
            className={`
              px-8 py-3 font-bold text-white tracking-widest uppercase transition-all transform duration-200 rounded shadow-lg
              ${(!article.title || !article.content) ? 'bg-gray-300 cursor-not-allowed' : `${buttonClass} hover:scale-105`}
              ${isSimulating ? 'cursor-wait opacity-80' : ''}
            `}
          >
            {isSimulating ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {article.isEmergencyMode ? '긴급 전송' : '기사 송고'}
              </span>
            ) : (
                '기사 발행'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArticleEditor;