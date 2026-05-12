const fs = require('fs');
const path = require('path');

async function fetchNews() {
  const newsItems = [];
  
  try {
    const response = await fetch(
      'https://newsapi.org/v2/top-headlines?country=us&category=general&pageSize=10&apiKey=demo',
      { headers: { 'User-Agent': 'News-Radio/1.0' } }
    );
    const data = await response.json();
    if (data.articles) {
      data.articles.forEach(article => {
        newsItems.push({
          category: '国际',
          title: article.title || '新闻标题',
          content: article.description || article.title || '新闻内容'
        });
      });
    }
  } catch (e) {
    console.log('NewsAPI fetch failed, using fallback');
  }

  if (newsItems.length === 0) {
    return getFallbackNews();
  }
  
  return newsItems;
}

function getFallbackNews() {
  return [
    { category: '国际', title: '全球关注重大国际事件', content: '国际社会持续关注全球重大事件的发展动态，各国领导人就重要议题展开对话与合作。' },
    { category: '国际', title: '国际经济形势分析', content: '全球经济格局持续演变，主要经济体发布最新经济数据，市场关注未来走势。' },
    { category: '国际', title: '科技领域国际合作', content: '各国在科技领域加强合作，共同推动技术创新与产业发展。' },
    { category: '国内', title: '国内经济稳步发展', content: '国内经济保持稳健增长态势，各项经济指标表现良好，市场信心持续增强。' },
    { category: '国内', title: '科技创新成果显著', content: '我国在科技创新领域取得重要突破，多项技术达到国际先进水平。' },
    { category: '国内', title: '民生政策持续优化', content: '政府出台多项惠民政策，持续改善民生福祉，提升人民生活质量。' },
    { category: '财经', title: '金融市场动态', content: '金融市场运行平稳，投资者情绪稳定，市场交易活跃。' },
    { category: '财经', title: '产业升级加速推进', content: '传统产业转型升级步伐加快，新兴产业蓬勃发展。' },
    { category: '科技', title: '人工智能应用拓展', content: 'AI技术在各行业广泛应用，推动数字化转型深入发展。' },
    { category: '科技', title: '新能源技术突破', content: '新能源领域取得重要技术突破，清洁能源占比持续提升。' },
    { category: '社会', title: '社会民生持续改善', content: '教育、医疗、住房等民生领域改革深入推进，群众获得感不断增强。' },
    { category: '社会', title: '文化活动丰富多彩', content: '各地举办丰富多彩的文化活动，丰富群众精神文化生活。' }
  ];
}

function generateHTML(newsItems) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  });

  const categoryColors = {
    '国际': '#e74c3c',
    '国内': '#3498db',
    '财经': '#f39c12',
    '科技': '#9b59b6',
    '社会': '#1abc9c'
  };

  const newsHTML = newsItems.map((item, index) => `
      <div class="news-item" id="news-${index}">
        <span class="news-tag" style="background-color: ${categoryColors[item.category] || '#666'}">${item.category}</span>
        <div class="news-title">${index + 1}. ${item.title}</div>
        <div class="news-content">${item.content}</div>
      </div>`).join('');

  const newsDataJSON = JSON.stringify(newsItems.map(item => ({
    category: item.category,
    title: item.title,
    content: item.content
  })));

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  <title>每日新闻播报 - ${dateStr}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      color: #fff;
      padding: 20px;
      -webkit-tap-highlight-color: transparent;
    }
    .container { max-width: 800px; margin: 0 auto; }
    .header {
      text-align: center;
      padding: 30px 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
      background: linear-gradient(90deg, #00d2ff, #3a7bd5);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .header .date { color: #888; font-size: 16px; }
    .section { margin-bottom: 30px; }
    .section-title {
      font-size: 20px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #3a7bd5;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .news-item {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 15px;
      margin-bottom: 15px;
      transition: all 0.3s;
      border-left: 3px solid transparent;
    }
    .news-item.active {
      background: rgba(58, 123, 213, 0.15);
      border-left-color: #3a7bd5;
    }
    .news-tag {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      margin-bottom: 8px;
    }
    .news-title { font-size: 16px; font-weight: 600; margin-bottom: 8px; line-height: 1.4; }
    .news-content { font-size: 14px; color: #aaa; line-height: 1.6; }
    .controls {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(26, 26, 46, 0.98);
      padding: 15px 20px;
      padding-bottom: max(15px, env(safe-area-inset-bottom));
      display: flex;
      flex-direction: column;
      gap: 12px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-top: 1px solid rgba(255,255,255,0.1);
      z-index: 100;
    }
    .btn-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
    .btn {
      padding: 14px 28px;
      border: none;
      border-radius: 25px;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s;
      font-weight: 600;
      -webkit-user-select: none;
      user-select: none;
      touch-action: manipulation;
    }
    .btn-primary {
      background: linear-gradient(90deg, #00d2ff, #3a7bd5);
      color: white;
      min-width: 140px;
    }
    .btn-primary:active { transform: scale(0.95); opacity: 0.9; }
    .btn-secondary {
      background: rgba(255,255,255,0.1);
      color: white;
    }
    .btn-secondary:active { background: rgba(255,255,255,0.2); }
    .settings { display: flex; gap: 15px; justify-content: center; align-items: center; flex-wrap: wrap; }
    .setting-item { display: flex; align-items: center; gap: 6px; }
    .setting-item label { font-size: 13px; color: #888; }
    .setting-item input[type="range"] {
      width: 80px;
      accent-color: #3a7bd5;
    }
    .setting-item span { font-size: 13px; color: #aaa; min-width: 30px; }
    .status {
      text-align: center;
      font-size: 14px;
      color: #888;
      min-height: 20px;
    }
    .progress-bar {
      width: 100%;
      height: 3px;
      background: rgba(255,255,255,0.1);
      border-radius: 2px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #00d2ff, #3a7bd5);
      width: 0%;
      transition: width 0.3s;
    }
    .content { padding-bottom: 220px; }
    .update-time {
      text-align: center;
      color: #666;
      font-size: 12px;
      margin-top: 20px;
    }
    .unsupported {
      background: rgba(231, 76, 60, 0.2);
      border: 1px solid #e74c3c;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin-bottom: 20px;
    }
    .unsupported p { color: #e74c3c; margin-bottom: 10px; }
    .unsupported a { color: #3a7bd5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>每日新闻播报</h1>
      <div class="date">${dateStr}</div>
    </div>
    <div id="unsupportedMsg" style="display:none" class="unsupported">
      <p>您的浏览器不支持语音播报功能</p>
      <p>请使用 Chrome、Safari 或 Edge 浏览器打开此页面</p>
    </div>
    <div class="content">
      <div class="section">
        <div class="section-title">今日要闻</div>
        ${newsHTML}
      </div>
    </div>
    <div class="update-time">更新时间: ${today.toLocaleString('zh-CN')}</div>
  </div>
  <div class="controls">
    <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
    <div class="status" id="status">点击"开始播报"收听今日新闻</div>
    <div class="btn-row">
      <button class="btn btn-primary" id="playBtn">开始播报</button>
      <button class="btn btn-secondary" id="pauseBtn" style="display:none">暂停</button>
      <button class="btn btn-secondary" id="stopBtn" style="display:none">停止</button>
    </div>
    <div class="settings">
      <div class="setting-item">
        <label>语速</label>
        <input type="range" id="rate" min="0.5" max="2" step="0.1" value="1">
        <span id="rateValue">1.0x</span>
      </div>
      <div class="setting-item">
        <label>音调</label>
        <input type="range" id="pitch" min="0.5" max="2" step="0.1" value="1">
        <span id="pitchValue">1.0</span>
      </div>
    </div>
  </div>
  <script>
    (function() {
      var newsData = ${newsDataJSON};
      var synth = window.speechSynthesis || window.webkitSpeechSynthesis;
      var isPlaying = false;
      var isPaused = false;
      var currentChunk = 0;
      var chunks = [];
      var voices = [];
      var voicesLoaded = false;
      var isInitialized = false;

      if (!synth) {
        document.getElementById('unsupportedMsg').style.display = 'block';
        document.getElementById('playBtn').style.display = 'none';
        return;
      }

      function loadVoices() {
        voices = synth.getVoices();
        if (voices.length > 0) {
          voicesLoaded = true;
        }
      }

      loadVoices();
      if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = function() {
          loadVoices();
        };
      }

      function getChineseVoice() {
        if (!voicesLoaded) {
          voices = synth.getVoices();
        }
        for (var i = 0; i < voices.length; i++) {
          if (voices[i].lang === 'zh-CN') return voices[i];
        }
        for (var i = 0; i < voices.length; i++) {
          if (voices[i].lang.indexOf('zh') === 0) return voices[i];
        }
        for (var i = 0; i < voices.length; i++) {
          if (voices[i].lang.indexOf('cmn') !== -1) return voices[i];
        }
        return null;
      }

      function splitTextIntoChunks(text, maxLen) {
        maxLen = maxLen || 180;
        var result = [];
        var sentences = text.split(/(?<=[。！？；\\n])/);
        var current = '';
        for (var i = 0; i < sentences.length; i++) {
          if ((current + sentences[i]).length > maxLen && current.length > 0) {
            result.push(current);
            current = sentences[i];
          } else {
            current += sentences[i];
          }
        }
        if (current.length > 0) {
          result.push(current);
        }
        return result;
      }

      function buildNewsText() {
        var text = '每日新闻播报。';
        for (var i = 0; i < newsData.length; i++) {
          text += newsData[i].category + '新闻。' + newsData[i].title + '。' + newsData[i].content + '。';
        }
        text += '以上是今日新闻摘要，祝您有美好的一天。';
        return text;
      }

      function initEngine(callback) {
        if (isInitialized) {
          callback();
          return;
        }
        var warmup = new SpeechSynthesisUtterance('');
        warmup.volume = 0;
        warmup.rate = 1;
        warmup.lang = 'zh-CN';
        warmup.onend = function() {
          isInitialized = true;
          loadVoices();
          callback();
        };
        warmup.onerror = function() {
          isInitialized = true;
          callback();
        };
        synth.speak(warmup);
        setTimeout(function() {
          if (!isInitialized) {
            isInitialized = true;
            synth.cancel();
            callback();
          }
        }, 1000);
      }

      function highlightNews(chunkIndex) {
        var items = document.querySelectorAll('.news-item');
        for (var i = 0; i < items.length; i++) {
          items[i].classList.remove('active');
        }
        var newsIdx = 0;
        var charCount = 0;
        var fullText = '';
        for (var i = 0; i <= chunkIndex && i < chunks.length; i++) {
          fullText += chunks[i];
        }
        var prefix = '每日新闻播报。';
        var remaining = fullText;
        if (remaining.indexOf(prefix) === 0) {
          remaining = remaining.substring(prefix.length);
        }
        for (var i = 0; i < newsData.length; i++) {
          var newsText = newsData[i].category + '新闻。' + newsData[i].title + '。' + newsData[i].content + '。';
          if (remaining.length >= newsText.length) {
            remaining = remaining.substring(newsText.length);
            newsIdx = i + 1;
          } else {
            newsIdx = i;
            break;
          }
        }
        if (newsIdx > 0) newsIdx--;
        if (items[newsIdx]) {
          items[newsIdx].classList.add('active');
        }
        var progress = ((chunkIndex + 1) / chunks.length) * 100;
        document.getElementById('progressFill').style.width = progress + '%';
      }

      function speakChunk() {
        if (currentChunk >= chunks.length) {
          onSpeechEnd();
          return;
        }

        var utterance = new SpeechSynthesisUtterance(chunks[currentChunk]);
        utterance.lang = 'zh-CN';
        utterance.rate = parseFloat(document.getElementById('rate').value);
        utterance.pitch = parseFloat(document.getElementById('pitch').value);
        utterance.volume = 1;

        var voice = getChineseVoice();
        if (voice) {
          utterance.voice = voice;
        }

        utterance.onstart = function() {
          highlightNews(currentChunk);
        };

        utterance.onend = function() {
          currentChunk++;
          speakChunk();
        };

        utterance.onerror = function(e) {
          if (e.error === 'canceled' || e.error === 'interrupted') {
            return;
          }
          currentChunk++;
          speakChunk();
        };

        synth.speak(utterance);
      }

      function startSpeech() {
        if (isPlaying && !isPaused) return;

        if (isPaused) {
          synth.resume();
          isPaused = false;
          updateUI('playing');
          return;
        }

        synth.cancel();
        currentChunk = 0;

        var fullText = buildNewsText();
        chunks = splitTextIntoChunks(fullText);

        initEngine(function() {
          isPlaying = true;
          isPaused = false;
          updateUI('playing');
          speakChunk();
          startKeepAlive();
        });
      }

      function togglePause() {
        if (!isPlaying) return;
        if (isPaused) {
          synth.resume();
          isPaused = false;
          updateUI('playing');
        } else {
          synth.pause();
          isPaused = true;
          updateUI('paused');
        }
      }

      function stopSpeech() {
        synth.cancel();
        isPlaying = false;
        isPaused = false;
        currentChunk = 0;
        chunks = [];
        updateUI('stopped');
        var items = document.querySelectorAll('.news-item');
        for (var i = 0; i < items.length; i++) {
          items[i].classList.remove('active');
        }
        document.getElementById('progressFill').style.width = '0%';
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
      }

      function onSpeechEnd() {
        isPlaying = false;
        isPaused = false;
        currentChunk = 0;
        chunks = [];
        updateUI('finished');
        var items = document.querySelectorAll('.news-item');
        for (var i = 0; i < items.length; i++) {
          items[i].classList.remove('active');
        }
        document.getElementById('progressFill').style.width = '100%';
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
      }

      function updateUI(state) {
        var playBtn = document.getElementById('playBtn');
        var pauseBtn = document.getElementById('pauseBtn');
        var stopBtn = document.getElementById('stopBtn');
        var status = document.getElementById('status');

        switch (state) {
          case 'playing':
            status.textContent = '正在播报... (' + (currentChunk + 1) + '/' + chunks.length + ')';
            playBtn.style.display = 'none';
            pauseBtn.style.display = 'inline-block';
            pauseBtn.textContent = '暂停';
            stopBtn.style.display = 'inline-block';
            break;
          case 'paused':
            status.textContent = '已暂停';
            pauseBtn.textContent = '继续';
            break;
          case 'stopped':
            status.textContent = '已停止';
            playBtn.style.display = 'inline-block';
            playBtn.textContent = '开始播报';
            pauseBtn.style.display = 'none';
            stopBtn.style.display = 'none';
            break;
          case 'finished':
            status.textContent = '播报完成';
            playBtn.style.display = 'inline-block';
            playBtn.textContent = '重新播报';
            pauseBtn.style.display = 'none';
            stopBtn.style.display = 'none';
            break;
        }
      }

      var keepAliveInterval = null;
      function startKeepAlive() {
        if (keepAliveInterval) clearInterval(keepAliveInterval);
        keepAliveInterval = setInterval(function() {
          if (synth.speaking && !synth.paused) {
            synth.pause();
            synth.resume();
          }
        }, 10000);
      }

      document.getElementById('playBtn').addEventListener('click', startSpeech);
      document.getElementById('pauseBtn').addEventListener('click', togglePause);
      document.getElementById('stopBtn').addEventListener('click', stopSpeech);

      document.getElementById('rate').addEventListener('input', function() {
        document.getElementById('rateValue').textContent = parseFloat(this.value).toFixed(1) + 'x';
      });
      document.getElementById('pitch').addEventListener('input', function() {
        document.getElementById('pitchValue').textContent = parseFloat(this.value).toFixed(1);
      });

      document.addEventListener('visibilitychange', function() {
        if (document.hidden && isPlaying && !isPaused) {
          synth.pause();
          isPaused = true;
          updateUI('paused');
        }
      });

    })();
  </script>
</body>
</html>`;
}

async function main() {
  const newsItems = await fetchNews();
  const html = generateHTML(newsItems);
  
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');
  console.log('News HTML generated successfully!');
  console.log('Total news items:', newsItems.length);
}

main().catch(console.error);
