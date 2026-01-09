// Notion Diagram Generator - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const toggleApiKeyBtn = document.getElementById('toggleApiKey');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  const apiKeyStatus = document.getElementById('apiKeyStatus');
  const styleRadios = document.querySelectorAll('input[name="style"]');

  // 保存済み設定を読み込み
  loadSettings();

  // APIキー表示/非表示切り替え
  toggleApiKeyBtn.addEventListener('click', () => {
    const type = apiKeyInput.type === 'password' ? 'text' : 'password';
    apiKeyInput.type = type;
  });

  // APIキー保存
  saveApiKeyBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus('APIキーを入力してください', 'error');
      return;
    }

    // APIキーの検証
    saveApiKeyBtn.textContent = '検証中...';
    saveApiKeyBtn.disabled = true;

    const isValid = await validateApiKey(apiKey);

    if (isValid) {
      chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
        showStatus('APIキーを保存しました', 'success');
      });
    } else {
      showStatus('無効なAPIキーです。正しいキーを入力してください。', 'error');
    }

    saveApiKeyBtn.textContent = '保存';
    saveApiKeyBtn.disabled = false;
  });

  // スタイル変更
  styleRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      chrome.storage.sync.set({ diagramStyle: radio.value });
    });
  });

  // 設定読み込み
  function loadSettings() {
    chrome.storage.sync.get(['geminiApiKey', 'diagramStyle'], (result) => {
      if (result.geminiApiKey) {
        apiKeyInput.value = result.geminiApiKey;
        showStatus('APIキー設定済み', 'success');
      }

      if (result.diagramStyle) {
        const radio = document.querySelector(`input[value="${result.diagramStyle}"]`);
        if (radio) radio.checked = true;
      }
    });
  }

  // ステータス表示
  function showStatus(message, type) {
    apiKeyStatus.textContent = message;
    apiKeyStatus.className = `status ${type}`;
  }

  // APIキー検証
  async function validateApiKey(apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      return response.ok;
    } catch (error) {
      return false;
    }
  }
});
