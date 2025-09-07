import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
  httpOptions: {
    baseUrl: process.env.GOOGLE_GEMINI_BASE_URL
  }
});

export async function POST(request) {
  try {
    const { text, targetLang = 'zh-CN' } = await request.json();
    
    if (!text) {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    const languageMap = {
      'zh-CN': '简体中文',
      'zh-TW': '繁體中文',
      'en': 'English',
      'ja': '日本語',
      'ko': '한국어',
      'fr': 'Français',
      'de': 'Deutsch',
      'es': 'Español',
      'pt': 'Português',
      'it': 'Italiano'
    };

    const targetLanguageName = languageMap[targetLang] || targetLang;
    
    const prompt = `请将以下文本翻译成${targetLanguageName}，只返回翻译结果，不要添加任何说明：\n\n${text}`;

    // const response = await ai.models.generateContent({
    //   model: "gemini-2.5-flash",
    //   contents: prompt,
    // });

    // const translation = response.text?.trim();
    
    // if (!translation) {
    //   throw new Error('No translation received from Gemini');
    // }

    return Response.json({ 
      text,
      sourceText: text,
      targetLanguage: targetLang
    });

  } catch (error) {
    console.error('Translation API error:', error);
    return Response.json(
      { error: 'Translation failed' }, 
      { status: 500 }
    );
  }
}