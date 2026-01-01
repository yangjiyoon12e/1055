
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Article, SimulationResult, Comment, Reply, ArticleCategory } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to handle 429 errors with exponential backoff
async function retryRequest<T>(requestFn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await requestFn();
  } catch (error: any) {
    if (retries > 0 && (error?.status === 429 || error?.code === 429 || error?.message?.includes('429'))) {
      console.warn(`Rate limit hit. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(requestFn, retries - 1, delay * 2);
    }
    throw error;
  }
}

const getEraContext = (article: Article): string => {
  const currentYear = new Date().getFullYear();
  const targetYear = article.isTimeMachineMode && article.targetYear ? parseInt(article.targetYear) : currentYear;

  if (article.isTimeMachineMode) {
    if (targetYear < 1990) return `${targetYear}년도입니다. 인터넷이 없으므로 신문 투고, 라디오 사연, 대자보 등의 말투(하오체, 읍니다 등)를 사용하세요.`;
    if (targetYear < 2000) return `${targetYear}년도 PC통신 시대(하이텔, 천리안) 말투(~셈, ~임, 방가)를 사용하세요.`;
    if (targetYear < 2010) return `${targetYear}년도 싸이월드/초기 인터넷 감성(이모티콘, 펌킨족 등)을 반영하세요.`;
    if (targetYear > currentYear + 5) return `${targetYear}년도 미래 시대입니다.`;
    return `${targetYear}년도의 시대상을 반영하세요.`;
  }
  return "현대(2024년)의 인터넷 댓글 말투를 사용하세요.";
};

export const generateRandomArticle = async (currentArticle: Article): Promise<Partial<Article>> => {
  const modelId = "gemini-3-flash-preview";
  
  const eraContext = getEraContext(currentArticle);
  
  let modeInstruction = "일반적인 뉴스 기사를 랜덤한 주제로 작성하세요.";
  if (currentArticle.isEmergencyMode) modeInstruction = "국가 비상사태, 전쟁, 재난 등 매우 위급한 상황에 대한 속보를 작성하세요.";
  else if (currentArticle.isCrazyMode) modeInstruction = "논리적으로 말이 안 되거나, 기자가 미쳐버린 듯한 기괴한 내용의 기사를 작성하세요.";
  else if (currentArticle.isFakeNews) modeInstruction = "사실이 아닌 내용을 사실인 것처럼 교묘하게 꾸민 선동성 가짜 뉴스를 작성하세요.";

  const prompt = `
    당신은 창의적인 기자입니다. 다음 조건에 맞춰 **랜덤한 뉴스 기사**를 하나 작성해주세요.
    
    1. **시대적 배경**: ${eraContext}
    2. **작성 톤앤매너**: ${modeInstruction}
    3. **필수 조건**: 기사의 **제목(Title)과 본문(Content)의 내용은 반드시 일치**해야 하며, 육하원칙에 따라 그럴듯하게 작성해야 합니다.
    4. **카테고리**: 정치, 경제, 사회, 연예, IT/과학, 스포츠, 오피니언 중 하나를 랜덤하게 선택하세요.

    결과는 반드시 다음 JSON 스키마를 따르세요.
  `;

  try {
    const response = await retryRequest<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: ["title", "content", "category"],
        },
      },
    }));

    if (response.text) {
      const data = JSON.parse(response.text);
      // Ensure category matches enum roughly, otherwise default to SOCIETY
      let category = ArticleCategory.SOCIETY;
      const catStr = data.category;
      if (Object.values(ArticleCategory).includes(catStr as ArticleCategory)) {
        category = catStr as ArticleCategory;
      }

      return {
        title: data.title,
        content: data.content,
        category: category
      };
    }
    throw new Error("No text generated");
  } catch (e) {
    console.error("Failed to generate random article", e);
    return {
      title: "기사 생성 실패",
      content: "AI 연결 상태를 확인해주세요.",
      category: ArticleCategory.SOCIETY
    };
  }
};

export const analyzeArticle = async (article: Article): Promise<SimulationResult> => {
  const modelId = "gemini-3-flash-preview";
  
  const currentYear = new Date().getFullYear();
  const targetYear = article.isTimeMachineMode && article.targetYear ? parseInt(article.targetYear) : currentYear;

  // 1. Era Context (Base)
  let eraContextFull = "";
  if (article.isTimeMachineMode) {
    if (targetYear < 1990) {
      eraContextFull = `
        **[시대 설정: ${targetYear}년]**
        - **인터넷이 없거나 매우 제한적입니다.**
        - 'SNS'나 '온라인 댓글' 대신 **'신문 독자 투고', '라디오 사연', '다방에서의 대화', '대자보'** 형식을 'comments' 배열에 담아주세요.
        - 말투는 ${targetYear}년도의 시대상을 반영한 고풍스럽거나 투박한 말투를 사용하세요. (예: "~읍니다", "~하오")
        - 플랫폼(platform) 필드 예시: '조선일보 독자투고', '라디오 엽서', '서울 다방', '대학가 대자보'.
        - **타 언론사 보도**: 당시 존재했던 신문사/방송사(동아일보, 경향신문, KBS, MBC 등)의 진지한 헤드라인 스타일.
      `;
    } else if (targetYear >= 1990 && targetYear < 2000) {
      eraContextFull = `
        **[시대 설정: ${targetYear}년]**
        - **PC통신 시대입니다.** (하이텔, 천리안, 나우누리)
        - 파란 화면의 채팅방 감성, "~셈", "~임", "방가방가" 등의 초기 통신 언어를 적극 반영하세요.
        - 플랫폼(platform) 필드 예시: '하이텔 광장', '천리안 게시판', '나우누리 유머란', 'PC방'.
        - **타 언론사 보도**: 90년대 신문/방송 스타일 + 스포츠신문(스포츠서울 등)의 자극적인 헤드라인.
      `;
    } else if (targetYear >= 2000 && targetYear < 2010) {
      eraContextFull = `
        **[시대 설정: ${targetYear}년]**
        - **싸이월드, 버디버디, 다음 카페 전성기입니다.**
        - "퍼가요~♡", "일촌평", 오글거리는 감성 글, 2000년대 초반 이모티콘((-_-), OTL)을 사용하세요.
        - 스마트폰은 아직 대중화되지 않았습니다.
        - 플랫폼(platform) 필드 예시: '싸이월드 미니홈피', '다음 카페', '네이버 붐', '버디버디 상태메시지'.
        - **타 언론사 보도**: 인터넷 뉴스 태동기. '딴지일보', '오마이뉴스' 등 대안 언론의 등장 반영.
      `;
    } else if (targetYear > currentYear + 5) {
      eraContextFull = `
        **[시대 설정: ${targetYear}년 (미래)]**
        - **미래 기술 시대입니다.**
        - 홀로그램, 뉴럴 링크, 화성 거주민 등 미래적 요소를 반영하세요.
        - 플랫폼(platform) 필드 예시: '뉴럴넷 링크', '화성 식민지 게시판', 'AI 통합 네트워크', '가상현실 로비'.
        - **타 언론사 보도**: 'AI 뉴스 봇', '화성 일보', '갤럭시 네트워크 뉴스' 등 미래지향적 매체명.
      `;
    } else {
      eraContextFull = `
        **[시대 설정: ${targetYear}년]**
        - 해당 연도의 실제 기술 수준과 유행하는 SNS 플랫폼을 반영하되, 아래의 분류 기준(SNS 통합, 커뮤니티 세분화)을 따르세요.
        - **타 언론사 보도**: 현대의 다양한 매체(종편, 인터넷 신문, 유튜브 렉카 등)를 반영하세요.
      `;
    }
  } else {
    eraContextFull = `
        **[시대 설정: 현재]**
        - 타 언론사 보도 생성 시: 메이저 언론사, 인터넷 언론사, 경제지, 또는 유튜브 '사이버 렉카' 스타일의 자극적인 썸네일 제목 등을 다양하게 포함하세요.
    `;
  }

  // 2. Mode Instructions (Combine Multiple)
  const modeInstructions: string[] = [];

  if (article.isEmergencyMode) {
    modeInstructions.push(`
      **[모드: 국가 비상사태/언론 독점]**
      - 국민들은 정보를 얻을 수 있는 유일한 창구인 이 기사에 필사적입니다.
      - "다른 뉴스는 다 끊겼어", "살려주세요" 등의 절박한 반응이 주를 이룹니다.
      - **타 언론사 보도**: 비어있거나 '신호 없음', '송출 중단' 등으로 표기.
      - **금융 시장**: 대폭락, 거래 정지, 또는 화폐 가치 급락(환율 폭등)을 시뮬레이션하세요.
    `);
  }

  if (article.isCrazyMode) {
    modeInstructions.push(`
      **[모드: 미친 기자]**
      - 대중은 기자를 '완전히 미친 사람', '정신 나간 사람'으로 취급합니다.
      - **금융 시장**: 기이한 테마주(예: 알루미늄 호일, 정신병원 관련주)가 급등락하거나, 밈 코인(Meme Coin)이 폭등하는 등 비이성적 흐름.
    `);
  }

  if (article.isFakeNews) {
    modeInstructions.push(`
      **[모드: 가짜 뉴스/선동]**
      - 팩트 여부와 관계없이 선동과 음모론 확산에 초점을 맞춥니다.
      - **금융 시장**: 특정 작전주 띄우기나 공포 조성을 통한 투매 유도.
    `);
  }

  if (modeInstructions.length === 0) {
    modeInstructions.push(`
      **[일반 모드]**
      - 기사의 논조와 품질에 따른 현실적인 반응을 보여주세요.
      - **금융 시장**: 기사 내용과 가장 연관성 높은 지표가 합리적으로 움직입니다.
    `);
  }

  const previousContext = article.previousArticleContext ? `
    **[이전 기사 맥락 있음]**
    이 기사는 후속 보도입니다: ${article.previousArticleContext}
  ` : "";

  const prompt = `
    당신은 '기자 시뮬레이터' 게임의 엔진입니다. 
    사용자가 작성한 기사 내용을 분석하여 대중의 반응과 경제적 파장을 시뮬레이션하세요.
    
    ${eraContextFull}
    ${previousContext}

    기사 제목: ${article.title}
    카테고리: ${article.category}
    내용: ${article.content}
    작성자: ${article.author}

    <활성화된 모드 지시사항>
    ${modeInstructions.join('\n')}
    </활성화된 모드 지시사항>

    요청 사항:
    1. **댓글 (Comments) - 엄격한 구조 준수**:
       - 다음 **10가지 플랫폼**을 대상으로 **총 20개 ~ 25개의 댓글**을 생성하세요.
       - **각 플랫폼당 최소 2개**의 댓글을 기본적으로 생성하고, 남는 0~5개는 무작위로 분배하세요.
       - **모든 댓글에는 반드시 1개의 대댓글(Reply)이 달려야 합니다.** (필수 조건)
       
       **[대상 플랫폼 목록]**:
       1. **네이버 뉴스** (4050 세대, 진지함, 존댓말, 정치색 강함)
       2. **유튜브** (어린 연령층, "ㄹㅇㅋㅋ", 영상 본 듯한 반응)
       3. **인스타그램** (감성적, 해시태그 #, "ㅠㅠ", 이모지 남발)
       4. **트위터(X)** (짧고 날카로움, 덕질 말투, 리트윗 유도)
       5. **에펨코리아** (2030 남성, 반말, 축구/게임 비유, 거친 표현)
       6. **더쿠** (2030 여성, 반말, "~함", 공감 유도, "미친...")
       7. **블라인드** (직장인, 냉소적, 회사 인증 부심, "형들...")
       8. **디시인사이드** (최대 커뮤니티, 극도로 거친 반말, 냉소적, 유동닉)
       9. **네이트판** (여성 중심, 드라마틱한 사연 말투, "베플" 언급, 감정적 호소)
       10. **카카오톡 오픈채팅** (실시간 반응, 짧은 단문 연타, "#방장님", 주식/코인방 느낌)
       
       *(만약 타임머신 모드라면, 위 10개 플랫폼을 해당 시대에 맞는 매체/장소로 대체하여 각각 2개 이상 생성하세요.)*

       - **페르소나 다양화**: 극대노형, 팩트체크형, 드립형, 공포형, 음모론자, 주식무새, 무지성 옹호 등.
       - 좋아요 수: 베스트 댓글(수천 개)과 무관심 댓글(0~10개)을 현실적으로 분포시키세요.

    2. **금융 및 사회 지표**: 
       - 기사 내용에 따라 가장 관련성 높은 주식/코인/환율 지표를 변동시키세요.
       - 사회적 불안도, 분노 지수 등을 측정하세요.
    
    3. **안전 및 필터링 가이드라인 (최우선 순위 - 엄격 적용)**: 
       - **욕설, 비속어, 저속한 표현은 예외 없이 글자 전체를 '***'로 마스킹 처리하세요.**
       - **절대 한 글자도 남기지 마세요.** (예: "병신" -> "***", "시발" -> "***", "개새끼" -> "***")
       - 앞글자 노출 금지, 초성 노출 금지. 무조건 전체를 *** 처리합니다.
       - 문맥상 욕설이 필요하다면 그 위치에 *** 만 남겨두세요.
       - 혐오 표현, 차별 발언은 생성하지 마세요.
  `;

  try {
    const response = await retryRequest<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: "You are a creative writing AI designed to simulate realistic Korean netizen reactions and financial market impacts. Output must be in valid JSON format.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            viralityScore: { type: Type.NUMBER },
            reliabilityScore: { type: Type.NUMBER },
            controversyScore: { type: Type.NUMBER },
            publicSentiment: { type: Type.STRING },
            editorFeedback: { type: Type.STRING },
            impactSummary: { type: Type.STRING },
            viewCountEstimate: { type: Type.INTEGER },
            shareCount: { type: Type.INTEGER },
            
            stockAnalysis: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        indexName: { type: Type.STRING },
                        startValue: { type: Type.NUMBER },
                        endValue: { type: Type.NUMBER },
                        marketCommentary: { type: Type.STRING },
                        graphData: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    time: { type: Type.STRING },
                                    value: { type: Type.NUMBER },
                                },
                                required: ["time", "value"]
                            }
                        },
                        affectedSectors: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    change: { type: Type.NUMBER },
                                },
                                required: ["name", "change"]
                            }
                        }
                    },
                    required: ["indexName", "startValue", "endValue", "graphData", "affectedSectors", "marketCommentary"]
                }
            },
            
            extraIndices: {
                type: Type.OBJECT,
                properties: {
                    nationalAnxiety: { type: Type.NUMBER },
                    economicStability: { type: Type.NUMBER },
                    angerIndex: { type: Type.NUMBER },
                },
                required: ["nationalAnxiety", "economicStability", "angerIndex"]
            },

            otherMediaCoverage: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  mediaName: { type: Type.STRING },
                  headline: { type: Type.STRING },
                },
                required: ["mediaName", "headline"],
              },
            },
            comments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  platform: { type: Type.STRING },
                  username: { type: Type.STRING },
                  content: { type: Type.STRING },
                  likes: { type: Type.INTEGER },
                  sentiment: { type: Type.STRING, enum: ["positive", "negative", "neutral"] },
                  replies: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                         username: { type: Type.STRING },
                         content: { type: Type.STRING },
                         likes: { type: Type.INTEGER },
                      },
                      required: ["username", "content", "likes"]
                    }
                  }
                },
                required: ["platform", "username", "content", "likes", "sentiment", "replies"],
              },
            },
          },
          required: ["viralityScore", "reliabilityScore", "controversyScore", "publicSentiment", "editorFeedback", "impactSummary", "viewCountEstimate", "shareCount", "comments", "otherMediaCoverage", "stockAnalysis", "extraIndices"],
        },
      },
    }));

    if (response.text) {
      return JSON.parse(response.text) as SimulationResult;
    } else {
      throw new Error("No response text generated");
    }
  } catch (error) {
    console.error("Simulation failed:", error);
    return {
      viralityScore: 0,
      reliabilityScore: 0,
      controversyScore: 0,
      publicSentiment: "Error",
      editorFeedback: "시스템 오류: AI 응답 지연. 잠시 후 다시 시도해주세요.",
      impactSummary: "데이터 전송 실패.",
      viewCountEstimate: 0,
      shareCount: 0,
      comments: [],
      otherMediaCoverage: [],
    };
  }
};

export const generateReplyReaction = async (
  article: Article, 
  originalComment: Comment, 
  reporterReply: string
): Promise<Reply[]> => {
  const modelId = "gemini-3-flash-preview";
  const eraContext = getEraContext(article);
  
  const prompt = `
    상황: 사용자가 작성한 기사에 달린 댓글에 대해, 기자(사용자)가 답글을 달았습니다.
    이에 대한 네티즌들의 재반응(답글의 답글)을 1~2개 생성해주세요.

    ${eraContext}
    
    모드 상태:
    ${article.isEmergencyMode ? "- [국가 비상사태]" : ""}
    ${article.isCrazyMode ? "- [미친 기자 취급]" : ""}
    ${article.isFakeNews ? "- [가짜 뉴스 논란]" : ""}

    기사 제목: ${article.title}
    
    원 댓글 작성자: ${originalComment.username}
    원 댓글 내용: ${originalComment.content}
    플랫폼: ${originalComment.platform}

    기자(사용자)의 답글: ${reporterReply}

    지시사항:
    1. 기자의 답글에 대해 네티즌들이 보일 법한 리얼한 반응을 작성하세요.
    2. 다양한 성향(옹호, 비꼬기, 무시, 반박 등)을 반영하세요.
    3. 작성자는 원 댓글 작성자일 수도 있고, 제3자일 수도 있습니다.
    4. **안전 및 필터링 가이드라인 (최우선)**:
       - **욕설, 비속어는 무조건 전체를 '***' 처리하세요.**
       - **단 한 글자도 남기지 마세요.** (예: "병신" -> "***", "개XX" -> "***")
       - 혐오 표현 및 특정 극단적 커뮤니티의 반사회적 용어 절대 사용 금지.
  `;

  try {
    const response = await retryRequest<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              username: { type: Type.STRING },
              content: { type: Type.STRING },
              likes: { type: Type.INTEGER },
            },
            required: ["username", "content", "likes"],
          },
        },
      },
    }));

    if (response.text) {
      return JSON.parse(response.text) as Reply[];
    }
    return [];
  } catch (e) {
    console.error("Failed to generate replies", e);
    return [];
  }
}
