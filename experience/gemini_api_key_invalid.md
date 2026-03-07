# 解决 Gemini Token "API key not valid" 问题

**问题描述**: 
在使用 `@google/genai` 库请求 Gemini Realtime API 生成 token (调用 `client.authTokens.create`) 时，即使在 `.env.local` 里面配置了正确的 `GEMINI_API_KEY`，甚至 `curl` 测试也有效，但 Next.js 后端报错 `API key not valid. Please pass a valid API key.`（或者抛出 400 错误）。

**问题原因**:
1. **环境变量热更新问题**: 在启动 Next.js (`npm run dev`) 之后，如果再去修改 `.env.local` 文件，后台正在运行的终端不一定能热加载最新的 API Key，可能仍然缓存或读取着旧的、失效的 Key。
2. **终端进程存在缓存或全局变量干扰**: 运行项目所在的 bash/shell 环境中，可能定义了一个全局的环境变量 (`export GEMINI_API_KEY=...`)，Next.js 服务在读取时会优先读取终端的系统级变量，而不是覆盖读取 `.env.local` 中的变量。
3. **格式不干净**: 当从不同环境读取 API Key 时，其尾部或者头部不小心带有隐藏的空格符或换行符，这也将导致验证直接失效。

**解决经验与手段**:
1. **防患未然的修剪截取处理 (Trim)**:
   在后端加载和传递环境变量给 `GoogleGenAI` 时，强制进行一下 `.trim()` 操作，排除无意中出现的首尾空格/空行问题：
   ```javascript
   // Prefer server-side keys
   const rawApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
   const apiKey = rawApiKey ? rawApiKey.trim() : "";
   
   if (!apiKey) {
       return NextResponse.json({ error: 'Server API key not configured' }, { status: 500 });
   }
   const client = new GoogleGenAI({ apiKey });
   ```

2. **强行打断并重启运行环境 (重要!)**:
   当你在 `route.js` 或者 `.env.local` 中进行更迭后遭遇始终报 Key 失效的错：不要怀疑是自己代码或者是大模型本身的 BUG，**务必在控制台终端按下 `Ctrl + C`，彻底终止并重启 `npm run dev`**！
   如果实在不放心，甚至可以在重启前先跑一下 `unset GEMINI_API_KEY` 来规避系统残留设定。
