// Background Service Worker for Instant Infographic
// Based on blog-to-image knowledge

// コンテキストメニューを作成
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'generate-diagram',
    title: '図解を生成',
    contexts: ['selection']
  });
});

// コンテキストメニューのクリックハンドラ
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'generate-diagram' && info.selectionText) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'GENERATION_STARTED' });
      const imageData = await generateDiagram(info.selectionText);
      await chrome.tabs.sendMessage(tab.id, { type: 'INSERT_IMAGE', imageData });
    } catch (error) {
      console.error('図解生成エラー:', error);
      await chrome.tabs.sendMessage(tab.id, { type: 'GENERATION_ERROR', error: error.message });
    }
  }
});

// Content Scriptからのメッセージハンドラ
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GENERATE_DIAGRAM') {
    generateDiagram(message.text, message.style)
      .then(imageData => sendResponse({ success: true, imageData }))
      .catch(error => {
        console.error('Generation error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.type === 'CHECK_API_KEY') {
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
      sendResponse({ hasApiKey: !!result.geminiApiKey });
    });
    return true;
  }
});

// ========================================
// プロンプト生成（blog-to-imageのノウハウを適用）
// ========================================

// インテント別フレーミング
const INTENT_FRAMES = {
  data: 'A clear data visualization showing',
  process: 'A step-by-step visual guide illustrating',
  concept: 'A concrete visual representation of the concept:',
  comparison: 'A comparative visualization showing the contrast between',
  highlight: 'A focused visual highlighting the key point:',
  eyecatch: 'An eye-catching, attention-grabbing visual that represents'
};

// スタイル別プロンプトテンプレート
const STYLE_TEMPLATES = {
  infographic: {
    name: 'インフォグラフィック',
    template: `Create a professional Japanese infographic in 16:9 aspect ratio.
Style: Modern educational infographic with structured sections, like the examples from business presentations.
Layout: Clear title at top, organized sections with headers, bullet points, and color-coded boxes.
Content: {content}
Include: Japanese text labels, icons next to text, numbered lists, and visual hierarchy.
Design: Professional blue/purple color scheme with white backgrounds and colored section headers.
Format: Like a professional slide or educational poster with readable Japanese text throughout.`
  },
  flowchart: {
    name: 'フローチャート',
    template: `Create a professional Japanese flowchart in 16:9 aspect ratio.
Style: Clean diagram with labeled boxes connected by arrows, like process documentation.
Layout: Clear flow from top to bottom or left to right with Japanese labels in each box.
Content: {content}
Include: Step labels in Japanese, directional arrows, decision diamonds if needed.
Design: Professional colors with clear contrast, white background.`
  },
  mindmap: {
    name: 'マインドマップ',
    template: `Create a Japanese concept map in 16:9 aspect ratio.
Style: Central topic with branching subtopics, each with Japanese labels.
Content: {content}
Layout: Radial layout with main concept in center, related concepts branching out.
Include: Japanese text for all nodes, icons alongside labels, color-coded branches.
Design: Clean professional style with readable text.`
  },
  comparison: {
    name: '比較図',
    template: `Create a Japanese comparison chart in 16:9 aspect ratio.
Style: Side-by-side or table format comparing items with Japanese labels.
Content: {content}
Layout: Clear columns or sections for each item being compared.
Include: Japanese headers, comparison criteria with labels, icons for visual interest.
Design: Contrasting colors for different sides, professional business style.`
  },
  timeline: {
    name: 'タイムライン',
    template: `Create a Japanese timeline infographic in 16:9 aspect ratio.
Style: Horizontal or vertical timeline with dated milestones and Japanese descriptions.
Content: {content}
Layout: Clear chronological progression with labeled events.
Include: Japanese text for each milestone, icons, date markers.
Design: Professional color scheme, clean lines connecting events.`
  },
  minimal: {
    name: 'ミニマル',
    template: `Create a minimalist Japanese infographic in 16:9 aspect ratio.
Style: Clean, simple design with essential information only.
Content: {content}
Layout: Generous white space, focused key message with supporting points.
Include: Clear Japanese title, brief labeled sections, simple icons.
Design: Limited color palette (2-3 colors), elegant typography.`
  }
};

// 品質要件サフィックス
const QUALITY_SUFFIX = `

CRITICAL REQUIREMENTS:
- Include clear, readable Japanese text for headings, labels, and key points
- Use structured sections with headers, bullet points, and organized content
- Combine icons/illustrations WITH text labels
- Professional infographic layout like educational materials or business presentations
- High quality, polished output suitable for professional use
- 16:9 aspect ratio strictly maintained
- Modern, clean design with proper visual hierarchy
- Use color-coded sections to organize information
- Include a clear title at the top`;

// テキストからインテントを検出
function detectIntent(text) {
  // 数値/統計
  if (/\d+(?:\.\d+)?%/.test(text) || /統計|データ|結果|数/.test(text)) {
    return 'data';
  }
  // 手順
  if (/まず|次に|最後に|ステップ|手順|方法|やり方/.test(text)) {
    return 'process';
  }
  // 比較
  if (/比べ|対して|より|メリット|デメリット|違い|vs/.test(text)) {
    return 'comparison';
  }
  // 要点強調
  if (/重要|ポイント|注意|コツ|秘訣/.test(text)) {
    return 'highlight';
  }
  // デフォルト: 概念説明
  return 'concept';
}

// テキストから視覚要素を抽出（英語記述に変換）
function extractVisualElements(text) {
  const elements = [];

  // 数値/統計
  if (/\d+/.test(text) || /万円|価格|円/.test(text)) {
    elements.push('featuring charts, graphs, coins, or financial visualizations');
  }

  // 手順キーワード
  if (/まず|次に|最後に|ステップ|手順|完了/.test(text)) {
    elements.push('showing a sequential process flow with arrows and step indicators');
  }

  // 比較キーワード
  if (/比べ|対して|より|メリット|デメリット/.test(text)) {
    elements.push('with side-by-side comparison layout using contrasting colors');
  }

  // AI/テクノロジー
  if (/AI|人工知能|プロンプト|ChatGPT|機械学習/.test(text)) {
    elements.push('with AI/technology imagery like brain icons, neural networks, robots, or digital interfaces');
  }

  // 教育/学習
  if (/教育|学習|教材|入門|初心者|講座|セミナー/.test(text)) {
    elements.push('depicting education concepts with books, lightbulbs, graduation caps, or ascending steps');
  }

  // ビジネス/副業
  if (/ビジネス|副業|会社|売上|利益|収入|事業/.test(text)) {
    elements.push('with business imagery like briefcases, growth charts, handshakes, or professional figures');
  }

  // ターゲット/市場
  if (/ターゲット|市場|顧客|ユーザー/.test(text)) {
    elements.push('showing target audience or market segments with people icons and demographic visuals');
  }

  // プログラミング/技術
  if (/プログラミング|コード|開発|エンジニア|API|システム|ツール/.test(text)) {
    elements.push('with programming-related visuals like code brackets, screens, or developer icons');
  }

  if (elements.length === 0) {
    elements.push('abstract conceptual illustration with modern icons representing the key ideas');
  }

  return elements.join(', ');
}

// 完全なプロンプトを生成
function buildPrompt(text, style = 'infographic') {
  const template = STYLE_TEMPLATES[style] || STYLE_TEMPLATES.infographic;
  const intent = detectIntent(text);
  const frame = INTENT_FRAMES[intent];
  const visualElements = extractVisualElements(text);

  // テキストを要約（長すぎる場合は最初の500文字）
  const truncatedText = text.length > 500 ? text.substring(0, 500) + '...' : text;

  // コンテンツ記述を生成（実際のテキスト内容を含める）
  const contentDescription = `
Topic and content to visualize:
"""
${truncatedText}
"""

Visual approach: ${frame} ${visualElements}

Extract the key points from this text and create an infographic that presents this information clearly with Japanese labels and headers.`;

  // テンプレートに埋め込み
  let prompt = template.template.replace('{content}', contentDescription);

  // 品質要件を追加
  prompt += QUALITY_SUFFIX;

  console.log('Generated prompt:', prompt);
  return prompt;
}

// ========================================
// Gemini API呼び出し（gemini-3-pro-image-preview）
// ========================================

async function generateDiagram(text, style = 'infographic') {
  const { geminiApiKey } = await chrome.storage.sync.get(['geminiApiKey']);

  if (!geminiApiKey) {
    throw new Error('APIキーが設定されていません。拡張機能の設定からGemini APIキーを入力してください。');
  }

  const prompt = buildPrompt(text, style);

  // Gemini API呼び出し（gemini-3-pro-image-preview）
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE']
        }
      })
    }
  );

  const data = await response.json();
  console.log('API Response:', JSON.stringify(data, null, 2));

  if (!response.ok) {
    console.error('API Error:', data);
    throw new Error(data.error?.message || '画像生成に失敗しました');
  }

  const candidates = data.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error('画像が生成されませんでした。別のテキストで試してください。');
  }

  const parts = candidates[0].content?.parts;
  if (!parts) {
    throw new Error('レスポンスの形式が不正です');
  }

  for (const part of parts) {
    if (part.inlineData) {
      return {
        mimeType: part.inlineData.mimeType || 'image/png',
        data: part.inlineData.data
      };
    }
  }

  const textPart = parts.find(p => p.text);
  if (textPart) {
    throw new Error('画像が生成されませんでした: ' + textPart.text.substring(0, 100));
  }

  throw new Error('画像データが見つかりませんでした');
}
