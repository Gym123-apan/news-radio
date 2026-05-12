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
  const today = new Date();
  const dateStr = today.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
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
      <div class="news-item">
        <span class="news-tag" style="background-color: ${categoryColors[item.category] || '#666'}">${item.category}</span>
        <div class="news-title">${index + 1}. ${item.title}</div>
        <div class="news-content">${item.content}</div>
      </div>`).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
      transition: transform 0.2s;
    }
    .news-item:hover { transform: translateX(5px); }
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
      background: rgba(26, 26, 46, 0.95);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 15px;
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .btn-row { display: flex; gap: 10px; justify-content: center; }
    .btn {
      padding: 15px 30px;
      border: none;
      border-radius: 25px;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s;
      font-weight: 600;
    }
    .btn-primary {
      background: linear-gradient(90deg, #00d2ff, #3a7bd5);
      color: white;
    }
    .btn-primary:hover { transform: scale(1.05); }
    .btn-secondary {
      background: rgba(255,255,255,0.1);
      color: white;
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.2); }
    .settings { display: flex; gap: 20px; justify-content: center; align-items: center; }
    .setting-item { display: flex; align-items: center; gap: 8px; }
    .setting-item label { font-size: 14px; color: #888; }
    .setting-item input[type="range"] {
      width: 100px;
      accent-color: #3a7bd5;
    }
    .status {
      text-align: center;
      font-size: 14px;
      color: #888;
      min-height: 20px;
    }
    .content { padding-bottom: 200px; }
    .update-time {
      text-align: center;
      color: #666;
      font-size: 12px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>每日新闻播报</h1>
      <div class="date">${dateStr}</div>
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
    <div class="status" id="status">点击"开始播报"收听今日新闻</div>
    <div class="btn-row">
      <button class="btn btn-primary" id="playBtn" onclick="startSpeech()">开始播报</button>
      <button class="btn btn-secondary" id="pauseBtn" onclick="togglePause()" style="display:none">暂停</button>
      <button class="btn btn-secondary" id="stopBtn" onclick="stopSpeech()" style="display:none">停止</button>
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
    var synth = window.speechSynthesis;
    var utterance = null;
    var isPaused = false;
    var newsText = '';
    var currentIndex = 0;
    var newsItems = document.querySelectorAll('.news-item');
    
    function buildNewsText() {
      var text = '每日新闻播报。';
      newsItems.forEach(function(item) {
        var tag = item.querySelector('.news-tag').textContent;
        var title = item.querySelector('.news-title').textContent;
        var content = item.querySelector('.news-content').textContent;
        text += tag + '新闻。' + title + '。' + content + '。';
      });
      text += '以上是今日新闻摘要，祝您有美好的一天。';
      return text;
    }
    
    function startSpeech() {
      if (synth.speaking && !isPaused) {
        return;
      }
      if (isPaused) {
        synth.resume();
        isPaused = false;
        document.getElementById('pauseBtn').textContent = '暂停';
        document.getElementById('status').textContent = '正在播报...';
        return;
      }
      newsText = buildNewsText();
      utterance = new SpeechSynthesisUtterance(newsText);
      utterance.lang = 'zh-CN';
      utterance.rate = parseFloat(document.getElementById('rate').value);
      utterance.pitch = parseFloat(document.getElementById('pitch').value);
      
      var voices = synth.getVoices();
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].lang.indexOf('zh') !== -1) {
          utterance.voice = voices[i];
          break;
        }
      }
      
      utterance.onstart = function() {
        document.getElementById('status').textContent = '正在播报...';
        document.getElementById('playBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'inline-block';
        document.getElementById('stopBtn').style.display = 'inline-block';
      };
      
      utterance.onend = function() {
        document.getElementById('status').textContent = '播报完成';
        document.getElementById('playBtn').style.display = 'inline-block';
        document.getElementById('playBtn').textContent = '重新播报';
        document.getElementById('pauseBtn').style.display = 'none';
        document.getElementById('stopBtn').style.display = 'none';
      };
      
      utterance.onerror = function(e) {
        document.getElementById('status').textContent = '播报出错: ' + e.error;
      };
      
      synth.speak(utterance);
    }
    
    function togglePause() {
      if (isPaused) {
        synth.resume();
        isPaused = false;
        document.getElementById('pauseBtn').textContent = '暂停';
        document.getElementById('status').textContent = '正在播报...';
      } else {
        synth.pause();
        isPaused = true;
        document.getElementById('pauseBtn').textContent = '继续';
        document.getElementById('status').textContent = '已暂停';
      }
    }
    
    function stopSpeech() {
      synth.cancel();
      isPaused = false;
      document.getElementById('status').textContent = '已停止';
      document.getElementById('playBtn').style.display = 'inline-block';
      document.getElementById('playBtn').textContent = '开始播报';
      document.getElementById('pauseBtn').style.display = 'none';
      document.getElementById('stopBtn').style.display = 'none';
    }
    
    document.getElementById('rate').addEventListener('input', function() {
      document.getElementById('rateValue').textContent = this.value + 'x';
    });
    
    document.getElementById('pitch').addEventListener('input', function() {
      document.getElementById('pitchValue').textContent = this.value;
    });
    
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = function() {};
    }
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
