
import React, { useState, useEffect } from 'react';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: string;
  onSave: (content: string) => void;
}

const PARTNER_TEMPLATE = `# 核心合作方名录 (Partner Directory)

当用户询问关于合作伙伴的信息时，请严格基于以下内容回答：

## 1. 公司名称: [示例科技 Example Tech]
- **简介**: 专注于人工智能底层算力的高科技企业。
- **合作领域**: 芯片供应, 算力支持。
- **联系人**: 张三 (CTO)

## 2. 公司名称: [示例物流 Example Logistics]
- **简介**: 全球前三的供应链解决方案提供商。
- **合作领域**: 全球物流配送。
- **备注**: 优先合作伙伴。
`;

const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({ isOpen, onClose, initialContent, onSave }) => {
  const [content, setContent] = useState(initialContent);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent, isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleSave = () => {
    onSave(content);
    handleClose();
  };

  const handleInsertTemplate = () => {
    if (content.trim().length > 0) {
      if (!confirm('This will replace your current content. Continue?')) return;
    }
    setContent(PARTNER_TEMPLATE);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setContent(text);
      };
      reader.readAsText(file);
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isClosing || !isOpen ? 'opacity-0' : 'opacity-100'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div 
        className={`relative w-full max-w-2xl bg-ios-light-card dark:bg-ios-dark-card rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 ${isClosing || !isOpen ? 'scale-95 translate-y-4' : 'scale-100 translate-y-0'}`}
      >
        <div className="flex flex-col h-[80vh] max-h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-ios-light-bg/50 dark:bg-ios-dark-bg/50 backdrop-blur-md">
            <h2 className="text-lg font-bold">Knowledge Base</h2>
            <button 
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-6 overflow-y-auto bg-ios-light-bg dark:bg-ios-dark-bg">
            <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-600 dark:text-blue-400">
              <p>Uploaded content will be injected into the AI's context. The model will prioritize this information during the conversation.</p>
            </div>
            
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste text here or use the template..."
              className="w-full h-64 p-4 rounded-xl bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none font-mono text-sm leading-relaxed"
            />
            
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer transition-colors text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import File
                  <input type="file" accept=".txt,.md,.json" onChange={handleFileUpload} className="hidden" />
                </label>
                
                <button 
                  onClick={handleInsertTemplate}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Insert Template
                </button>
              </div>

              <span className="text-xs text-gray-400">
                {content.length} characters
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-ios-light-bg/50 dark:bg-ios-dark-bg/50 backdrop-blur-md flex justify-end gap-3">
            <button 
              onClick={handleClose}
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-[#007AFF] hover:bg-blue-600 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseModal;
