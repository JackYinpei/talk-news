export async function POST(request) {
  try {
    const { text, targetLang = 'zh-CN' } = await request.json();
    
    if (!text) {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    // 简单的模拟翻译API，实际项目中应该调用真实的翻译服务
    // 这里只是为了演示，返回一个简单的翻译结果
    const translation = `[翻译] ${text}`;
    
    return Response.json({ 
      translation,
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