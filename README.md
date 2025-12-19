# ZYS AI 实时语音助手

一个基于 Gemini API 的实时语音聊天应用，支持中文和日文对话，具有低延迟、高保真度的语音交互体验。

## 功能特性

- 🎤 **实时语音交互** - 支持中文和日文语音对话
- ⌨️ **键盘快捷键** - 支持自定义快捷键控制语音输入
- 🎨 **现代化 UI** - iOS 风格界面，支持深色/浅色主题
- 🐛 **调试控制台** - 内置调试日志查看器
- 📱 **响应式设计** - 适配桌面和移动设备

## 环境要求

- Node.js 18+ 
- Gemini API Key

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API Key

在项目根目录创建 `.env` 文件，添加你的 Gemini API Key：

```env
GEMINI_API_KEY=your_api_key_here
```

> **注意**: 请确保 `.env` 文件已添加到 `.gitignore` 中，不要将 API Key 提交到版本控制系统。

### 3. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

### 4. 构建生产版本

```bash
npm run build
```

构建完成后，可以使用 `npm run preview` 预览生产版本。

## 使用说明

1. **连接语音服务**: 点击麦克风按钮或按下快捷键（默认空格键）开始语音对话
2. **自定义快捷键**: 点击顶部设置图标，可以自定义语音输入的快捷键
3. **查看调试信息**: 点击顶部调试图标，查看详细的连接和交互日志
4. **切换主题**: 点击顶部主题图标，切换深色/浅色模式

## 技术栈

- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **@google/genai** - Gemini API SDK

## 项目结构

```
├── components/          # React 组件
│   ├── ChatBubble.tsx  # 聊天气泡组件
│   ├── DebugConsole.tsx # 调试控制台
│   ├── DynamicOrb.tsx  # 动态指示器
│   ├── Toast.tsx       # 提示消息
│   └── VoiceIndicator.tsx # 语音指示器
├── services/           # 服务层
│   ├── geminiLiveService.ts # Gemini 实时服务
│   └── debugLogger.ts  # 调试日志
├── utils/              # 工具函数
│   └── audioUtils.ts   # 音频处理工具
├── App.tsx             # 主应用组件
└── index.tsx           # 应用入口
```

## 许可证

MIT License
