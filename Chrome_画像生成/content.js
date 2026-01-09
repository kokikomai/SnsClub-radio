// Content Script for Instant Infographic

let floatingButton = null;
let loadingOverlay = null;
let selectedText = '';
let selectionRange = null;

// 初期化
function init() {
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);

  // クリックで閉じる
  document.addEventListener('mousedown', (e) => {
    if (floatingButton && !floatingButton.contains(e.target)) {
      setTimeout(() => hideFloatingButton(), 50);
    }
  });

  chrome.runtime.onMessage.addListener(handleMessage);
  console.log('[Instant Infographic] Content script loaded');
}

// テキスト選択ハンドラ
function handleTextSelection(e) {
  if (floatingButton && floatingButton.contains(e.target)) {
    return;
  }

  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text && text.length > 10) {
      selectedText = text;
      try {
        selectionRange = selection.getRangeAt(0).cloneRange();
      } catch (err) {
        console.log('Range error:', err);
      }
      showFloatingButton();
    }
  }, 50);
}

// フローティングボタンを表示
function showFloatingButton() {
  hideFloatingButton();

  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  floatingButton = document.createElement('div');
  floatingButton.className = 'ndg-floating-button';
  floatingButton.innerHTML = `
    <div class="ndg-main-btn" title="図解を生成">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
      <span>図解生成</span>
      <svg class="ndg-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6,9 12,15 18,9"/>
      </svg>
    </div>
    <div class="ndg-style-menu">
      <button class="ndg-style-item" data-style="infographic">
        <span class="ndg-style-icon">📊</span>
        <span>インフォグラフィック</span>
      </button>
      <button class="ndg-style-item" data-style="flowchart">
        <span class="ndg-style-icon">🔀</span>
        <span>フローチャート</span>
      </button>
      <button class="ndg-style-item" data-style="mindmap">
        <span class="ndg-style-icon">🧠</span>
        <span>マインドマップ</span>
      </button>
      <button class="ndg-style-item" data-style="comparison">
        <span class="ndg-style-icon">⚖️</span>
        <span>比較図</span>
      </button>
      <button class="ndg-style-item" data-style="timeline">
        <span class="ndg-style-icon">📅</span>
        <span>タイムライン</span>
      </button>
      <button class="ndg-style-item" data-style="minimal">
        <span class="ndg-style-icon">✨</span>
        <span>ミニマル</span>
      </button>
    </div>
  `;

  floatingButton.style.cssText = `
    position: fixed;
    left: ${Math.min(rect.left + rect.width / 2, window.innerWidth - 120)}px;
    top: ${Math.min(rect.bottom + 8, window.innerHeight - 250)}px;
    transform: translateX(-50%);
    z-index: 2147483647;
  `;

  document.body.appendChild(floatingButton);

  // メインボタンクリック → メニュー表示
  const mainBtn = floatingButton.querySelector('.ndg-main-btn');
  mainBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const menu = floatingButton.querySelector('.ndg-style-menu');
    menu.classList.toggle('show');
    mainBtn.classList.toggle('active');
  });

  // スタイルボタンクリック → 生成開始
  const styleItems = floatingButton.querySelectorAll('.ndg-style-item');
  styleItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const style = item.dataset.style;
      console.log('Style selected:', style);
      generateDiagram(style);
    });
  });
}

// フローティングボタンを非表示
function hideFloatingButton() {
  if (floatingButton) {
    floatingButton.remove();
    floatingButton = null;
  }
}

// 図解生成をリクエスト
async function generateDiagram(style) {
  console.log('generateDiagram:', style, 'text:', selectedText.substring(0, 50) + '...');
  hideFloatingButton();

  // APIキーの確認
  let apiKeyResult;
  try {
    apiKeyResult = await chrome.runtime.sendMessage({ type: 'CHECK_API_KEY' });
  } catch (e) {
    console.error('Communication error:', e);
    showNotification('ページをリロード（F5）してから再試行してください', 'error');
    return;
  }

  if (!apiKeyResult?.hasApiKey) {
    showNotification('APIキーが未設定です。拡張機能アイコンをクリックして設定してください。', 'error');
    return;
  }

  showLoading();

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GENERATE_DIAGRAM',
      text: selectedText,
      style: style
    });

    console.log('Generation response:', response);
    completeProgress();
    await new Promise(r => setTimeout(r, 300)); // 完了表示を少し見せる
    hideLoading();

    if (response?.success) {
      showImagePreview(response.imageData);
      showNotification('図解を生成しました！', 'success');
    } else {
      showNotification(response?.error || '図解の生成に失敗しました', 'error');
    }
  } catch (error) {
    console.error('Generation error:', error);
    hideLoading();
    showNotification('エラー: ' + error.message, 'error');
  }
}

// ローディング表示（進捗付き）
let progressInterval = null;

function showLoading() {
  loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'ndg-loading-overlay';
  loadingOverlay.innerHTML = `
    <div class="ndg-loading-content">
      <div class="ndg-progress-container">
        <div class="ndg-progress-bar">
          <div class="ndg-progress-fill" style="width: 0%"></div>
        </div>
        <span class="ndg-progress-text">0%</span>
      </div>
      <p class="ndg-loading-status">テキストを分析中...</p>
      <p class="ndg-loading-sub">AIがインフォグラフィックを作成しています</p>
    </div>
  `;
  document.body.appendChild(loadingOverlay);

  // 進捗アニメーション開始
  startProgressAnimation();
}

function startProgressAnimation() {
  const progressFill = loadingOverlay?.querySelector('.ndg-progress-fill');
  const progressText = loadingOverlay?.querySelector('.ndg-progress-text');
  const statusText = loadingOverlay?.querySelector('.ndg-loading-status');

  if (!progressFill || !progressText || !statusText) return;

  let progress = 0;
  const stages = [
    { percent: 15, text: 'テキストを分析中...' },
    { percent: 30, text: 'プロンプトを生成中...' },
    { percent: 50, text: '画像を生成中...' },
    { percent: 70, text: 'レンダリング中...' },
    { percent: 85, text: '仕上げ処理中...' },
    { percent: 95, text: 'もうすぐ完了...' }
  ];
  let stageIndex = 0;

  progressInterval = setInterval(() => {
    if (progress < 95) {
      // 20-30秒の生成時間に合わせた進捗
      const increment = progress < 50 ? 2 : progress < 80 ? 1 : 0.3;
      progress = Math.min(95, progress + increment);

      progressFill.style.width = `${progress}%`;
      progressText.textContent = `${Math.round(progress)}%`;

      // ステージに応じてステータスを更新
      if (stageIndex < stages.length && progress >= stages[stageIndex].percent) {
        statusText.textContent = stages[stageIndex].text;
        stageIndex++;
      }
    }
  }, 300);
}

function completeProgress() {
  const progressFill = loadingOverlay?.querySelector('.ndg-progress-fill');
  const progressText = loadingOverlay?.querySelector('.ndg-progress-text');
  const statusText = loadingOverlay?.querySelector('.ndg-loading-status');

  if (progressFill && progressText && statusText) {
    progressFill.style.width = '100%';
    progressText.textContent = '100%';
    statusText.textContent = '完了！';
  }
}

function hideLoading() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
  if (loadingOverlay) {
    loadingOverlay.remove();
    loadingOverlay = null;
  }
}

// 画像プレビューモーダル
function showImagePreview(imageData) {
  const modal = document.createElement('div');
  modal.className = 'ndg-preview-modal';
  modal.innerHTML = `
    <div class="ndg-preview-content">
      <div class="ndg-preview-header">
        <h3>図解が完成しました</h3>
        <button class="ndg-close-btn">&times;</button>
      </div>
      <div class="ndg-preview-image">
        <img src="data:${imageData.mimeType};base64,${imageData.data}" alt="Generated Diagram" />
      </div>
      <div class="ndg-preview-actions">
        <button class="ndg-action-btn ndg-copy-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          コピー
        </button>
        <button class="ndg-action-btn ndg-download-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          ダウンロード
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('.ndg-close-btn').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  modal.querySelector('.ndg-copy-btn').onclick = async () => {
    try {
      const byteChars = atob(imageData.data);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: imageData.mimeType });
      await navigator.clipboard.write([new ClipboardItem({ [imageData.mimeType]: blob })]);
      showNotification('クリップボードにコピーしました', 'success');
    } catch (e) {
      console.error('Copy error:', e);
      showNotification('コピーに失敗しました', 'error');
    }
  };

  modal.querySelector('.ndg-download-btn').onclick = () => {
    const link = document.createElement('a');
    link.href = `data:${imageData.mimeType};base64,${imageData.data}`;
    link.download = `infographic-${Date.now()}.png`;
    link.click();
    showNotification('ダウンロードしました', 'success');
  };
}

// 通知表示
function showNotification(message, type = 'info') {
  // 既存の通知を削除
  document.querySelectorAll('.ndg-notification').forEach(n => n.remove());

  const notification = document.createElement('div');
  notification.className = `ndg-notification ndg-notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.classList.add('show'), 10);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Backgroundからのメッセージ
function handleMessage(message) {
  switch (message.type) {
    case 'GENERATION_STARTED':
      showLoading();
      break;
    case 'INSERT_IMAGE':
      hideLoading();
      showImagePreview(message.imageData);
      break;
    case 'GENERATION_ERROR':
      hideLoading();
      showNotification(message.error, 'error');
      break;
  }
}

init();
