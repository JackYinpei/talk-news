# Talk News

Talk News 是一款创新的语言学习应用，它将实时新闻阅读与互动式对话相结合，帮助用户在真实语境中学习和练习外语。

## 功能特性

- **双语新闻流**：应用主界面左侧展示实时新闻，用户可以选择源语言和目标语言，所有新闻标题和摘要都会被翻译成目标语言，方便对照学习。
- **互动对话**：主界面右侧是一个聊天机器人，用户可以就所读新闻或任何其他话题，用所学语言进行开放式对话。
- **个性化语言设置**：首次使用时，用户需要选择自己的母语和想要学习的语言，应用会根据用户的选择提供个性化的学习体验。

## 快速开始

1.  **安装依赖**
    ```bash
    npm install
    ```

2.  **运行开发服务器**
    ```bash
    npm run dev
    ```

3.  在浏览器中打开 `http://localhost:3000` 查看应用。

## 应用截图

### 1. 语言选择

首次进入应用，系统会引导用户选择他们的母语和想要学习的语言。

![语言选择](/public/readme-images/languageselect.png)

### 2. 新闻阅读与实时对话

主界面分为左右两部分，左边是实时新闻流，右边是与AI的对话窗口。

![主界面](/public/readme-images/newsfeed.png)

### 3. 实时对话

用户可以随时在右侧的对话框中用目标语言进行练习。

![实时对话](/public/readme-images/realtimechat.png)

## 技术栈

- [Next.js](https://nextjs.org/) - React 框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Google Generative AI](https://ai.google.dev/) - 提供对话和翻译能力
