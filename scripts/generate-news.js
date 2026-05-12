const fs = require('fs');
const path = require('path');

const RSS_SOURCES = [
  {
    name: '人民网-国内',
    url: 'http://www.people.com.cn/rss/politics.xml',
    category: '国内',
  },
  {
    name: '人民网-国际',
    url: 'http://www.people.com.cn/rss/world.xml',
    category: '国际',
  },
  {
    name: '人民网-财经',
    url: 'http://www.people.com.cn/rss/finance.xml',
    category: '财经',
  },
  {
    name: '人民网-社会',
    url: 'http://www.people.com.cn/rss/society.xml',
    category: '社会',
  },
  {
    name: '人民网-科技',
    url: 'http://www.people.com.cn/rss/scitech.xml',
    category: '科技',
  },
  {
    name: '新华网-国内',
    url: 'http://www.xinhuanet.com/politics/xhll.xml',
    category: '国内',
  },
  {
    name: '新华网-国际',
    url: 'http://www.xinhuanet.com/world/news_world.xml',
    category: '国际',
  },
  {
    name: '新华网-财经',
    url: 'http://www.xinhuanet.com/fortune/news_fortune.xml',
    category: '财经',
  },
  {
    name: '新浪新闻',
    url: 'https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=2509&k=&num=20&r=0.5',
    category: '国内',
    jsonApi: true,
  },
];

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*><!\$$CDATA\\[([\\s\\S]*?)\$$\\]></${tag}>`, 'i');
  const m1 = xml.match(re);
  if (m1) return m1[1].trim();

  const re2 = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m2 = xml.match(re2);
  if (m2) return m2[1].replace(/<[^>]+>/g, '').trim();

  return '';
}

function parseRSS(xml, defaultCategory) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTag(itemXml, 'title');
    const description = extractTag(itemXml, 'description');
    const pubDate = extractTag(itemXml, 'pubDate');

    if (!title || title.length < 5) continue;

    const cleanDesc = description
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    items.push({
      category: defaultCategory,
      title: title.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim(),
      content: cleanDesc || title,
      pubDate: pubDate ? new Date(pubDate) : new Date(),
    });
  }
  return items;
}

async function fetchRSS(source) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsRadio/1.0)', 'Referer': 'https://www.baidu.com' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      console.log(`  ${source.name}: HTTP ${response.status}`);
      return [];
    }

    if (source.jsonApi) {
      const json = await response.json();
      const items = parseJSONFeed(json, source);
      console.log(`  ${source.name}: ${items.length} 条`);
      return items;
    }

    const xml = await response.text();
    const items = parseRSS(xml, source.category);
    console.log(`  ${source.name}: ${items.length} 条`);
    return items;
  } catch (e) {
    console.log(`  ${source.name}: 获取失败 (${e.message})`);
    return [];
  }
}

function parseJSONFeed(json, source) {
  const items = [];
  try {
    let list = [];
    if (source.name === '新浪新闻') {
      list = json.result?.data || [];
    } else if (source.name === '澎湃新闻') {
      list = json.data?.contList || [];
    } else {
      list = Array.isArray(json) ? json : (json.data || json.result || []);
    }
    for (const entry of list) {
      const title = (entry.title || entry.ctime || '').replace(/<[^>]+>/g, '').trim();
      const content = (entry.intro || entry.digest || entry.summary || entry.description || title).replace(/<[^>]+>/g, '').trim();
      if (title && title.length >= 5) {
        items.push({
          category: source.category,
          title,
          content: content || title,
          pubDate: new Date(),
        });
      }
    }
  } catch (e) {
    console.log(`  ${source.name}: JSON解析失败`);
  }
  return items;
}

function deduplicate(newsItems) {
  const seen = new Set();
  const result = [];
  for (const item of newsItems) {
    const key = item.title.substring(0, 20);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function balanceCategories(items, maxPerCategory) {
  const cats = { '国际': [], '国内': [], '财经': [], '科技': [], '社会': [] };
  for (const item of items) {
    const cat = cats[item.category] ? item.category : '国内';
    cats[cat].push(item);
  }
  const result = [];
  for (const cat of ['国际', '国内', '财经', '科技', '社会']) {
    const selected = cats[cat].slice(0, maxPerCategory || 6);
    result.push(...selected);
  }
  return result;
}

function truncateContent(content, maxLen) {
  if (content.length <= maxLen) return content;
  return content.substring(0, maxLen).replace(/[，,。！？\s]*$/, '') + '。';
}

async function fetchAllNews() {
  console.log('开始抓取新闻...');
  const allItems = [];

  for (const source of RSS_SOURCES) {
    const items = await fetchRSS(source);
    allItems.push(...items);
  }

  console.log(`总共抓取: ${allItems.length} 条 (去重前)`);

  const deduped = deduplicate(allItems);
  console.log(`去重后: ${deduped.length} 条`);

  if (deduped.length < 10) {
    console.log('新闻数量不足，使用备用新闻');
    return getFallbackNews();
  }

  const balanced = balanceCategories(deduped, 6);
  console.log(`分类平衡后: ${balanced.length} 条`);

  return balanced.map(item => ({
    ...item,
    content: truncateContent(item.content, 120),
  }));
}

function getFallbackNews() {
  return [
    { category: '国际', title: '特朗普即将访华，中美关系迎来重要节点', content: '外交部确认美国总统特朗普将于近期对中国进行国事访问，这是其就任后首次访华。分析人士指出，经贸合作、科技竞争和地区安全将成为此次访问的核心议题，双方有望在多个领域达成新的共识。' },
    { category: '国际', title: '印巴达成停火协议，南亚局势趋缓', content: '印度和巴基斯坦同时宣布达成停火协议，同意立即停止在克什米尔地区的军事行动。这是两国近五年来首次达成正式停火，国际社会对此表示欢迎，认为这为南亚地区的和平稳定带来了积极信号。' },
    { category: '国际', title: '中东局势持续紧张，油价波动加剧', content: '美国拒绝伊朗停战提议，霍尔木兹海峡通行受限，国际原油价格持续走高。布伦特原油期货一度突破每桶一百零五美元，全球能源市场面临新的不确定性，多国开始加速推进能源多元化战略。' },
    { category: '国际', title: '法国颁布文物归还法律', content: '法国总统马克龙正式签署法律，将简化归还殖民时期非法获取的外国文物的程序。该法律涵盖一八一五年至一九七二年间被掠夺的文物，被视为欧洲文物归还运动的重要里程碑。' },
    { category: '国际', title: '英国地方选举执政党失利', content: '英国地方选举结果揭晓，执政党工党丢失大量地方议会议席，极右翼政党英国改革党表现强劲。分析认为，选民对经济状况和移民政策的不满是工党失利的主要原因。' },
    { category: '国际', title: '墨西哥起诉谷歌地图标注争议', content: '墨西哥政府正式对美国谷歌公司提起诉讼，指控其在数字地图服务中将墨西哥湾标注为美国湾，认为此举侵犯了墨西哥的领土主权和文化尊严。' },
    { category: '国际', title: '全球气候谈判取得新进展', content: '联合国气候变化框架公约最新一轮谈判在波恩结束，各方就减排目标和气候资金问题达成初步共识。发展中国家获得的气候适应资金承诺有所增加，但与实际需求仍有较大差距。' },
    { category: '国内', title: '天舟十号货运飞船成功发射并完成对接', content: '天舟十号货运飞船在文昌航天发射场成功发射，随后与空间站组合体完成交会对接。飞船为航天员运送了大量补给物资和实验设备，这是长征系列运载火箭第六百四十一次飞行。' },
    { category: '国内', title: '中美将举行新一轮经贸磋商', content: '国务院副总理何立峰将率团与美方举行经贸磋商，就双方关心的经贸问题展开讨论。此次磋商以两国元首会晤达成的共识为引领，市场普遍期待取得积极成果。' },
    { category: '国内', title: '国乒包揽世乒赛团体双冠', content: '在伦敦世乒赛团体决赛中，中国女队以三比二战胜日本队实现七连冠，男队以三比零横扫日本队收获十二连冠。中国乒乓球队再次展现了不可撼动的统治力。' },
    { category: '国内', title: '两高发布耕地保护司法解释', content: '最高人民法院与最高人民检察院联合发布关于办理非法占用耕地案件的司法解释，实行最严格的耕地保护制度，加大对非法占用耕地行为的惩处力度，自五月十八日起施行。' },
    { category: '国内', title: '三星堆发现青铜时代最早陨铁文物', content: '我国研究团队确认三星堆遗址七号祭祀坑出土的铁质残片为纯陨铁制品，这是目前中国西南地区发现的最早使用铁制品的证据，填补了该地区早期用铁历史的学术空白。' },
    { category: '国内', title: '全国夏粮收购工作即将启动', content: '国家粮食和物资储备局宣布全国夏粮收购工作即将启动，预计今年夏粮收购量将保持稳定。各地已做好仓容、资金和人员准备，确保农民售粮顺畅。' },
    { category: '国内', title: '五一假期国内旅游市场火爆', content: '今年五一假期全国国内旅游出游合计超过两亿人次，同比增长超过百分之十五。旅游消费总额突破一千五百亿元，文旅融合新业态成为消费增长新亮点。' },
    { category: '国内', title: '全国医保跨省异地就医直接结算范围扩大', content: '国家医保局宣布进一步扩大跨省异地就医直接结算范围，新增覆盖更多门诊慢特病病种，参保群众异地就医报销更加便捷。' },
    { category: '财经', title: '央行实施稳健货币政策，市场流动性合理充裕', content: '中国人民银行继续实施稳健的货币政策，通过多种工具保持市场流动性合理充裕。分析人士认为，当前货币政策空间充足，后续仍有降准降息的可能。' },
    { category: '财经', title: '四月CPI同比上涨，物价温和回升', content: '国家统计局数据显示，四月全国居民消费价格指数同比上涨百分之零点三，环比上涨百分之零点一。食品价格基本稳定，服务价格有所回升，物价总体保持温和上涨态势。' },
    { category: '财经', title: '人民币汇率保持基本稳定', content: '近期人民币对美元汇率在合理均衡水平上保持基本稳定。外汇市场运行平稳，跨境资金流动趋于均衡，市场预期总体稳定。' },
    { category: '财经', title: 'A股市场延续升势，科创板块表现亮眼', content: '五一假期后A股迎来开门红，创业板指上涨超过百分之三，科创五十指数涨幅超过百分之四。券商研报判断五月A股有望延续震荡向上格局，科技创新板块值得持续关注。' },
    { category: '财经', title: '房地产市场持续调整，政策效果逐步显现', content: '多地房地产调控政策持续优化，限购限贷政策有所放松。一线城市二手房成交量环比回升，但整体市场仍处于调整期，行业复苏需要更多时间。' },
    { category: '财经', title: '黄金价格再创历史新高', content: '国际金价突破每盎司两千四百美元，再创历史新高。地缘政治风险和全球央行持续购金是推动金价上涨的主要因素，市场对贵金属的避险需求依然旺盛。' },
    { category: '科技', title: '我国人工智能调用量全球第一', content: '国家信息中心数据显示，我国人工智能大模型日均调用量已突破十亿次，位居全球首位。AI技术在医疗、教育、金融等领域加速落地，推动各行业数字化转型。' },
    { category: '科技', title: 'AI立法进程加快，监管框架逐步完善', content: '全国人大常委会已将人工智能立法列入立法规划，相关草案正在研究起草中。立法将重点关注数据安全、算法透明和权益保护等核心问题。' },
    { category: '科技', title: '新能源汽车渗透率突破百分之四十', content: '中国汽车工业协会数据显示，新能源汽车国内零售渗透率首次突破百分之四十，标志着新能源汽车正在从政策驱动向市场驱动全面转型。' },
    { category: '科技', title: '量子计算研究取得重大突破', content: '中国科学技术大学团队在量子计算领域取得重要进展，成功实现了超过五百个量子比特的操控，为通用量子计算的发展奠定了重要基础。' },
    { category: '科技', title: '国产大飞机C919商业运营满两年', content: '国产大飞机C919投入商业运营已满两年，累计安全运送旅客超过一百万人次。目前C919订单已超过一千架，标志着中国航空工业迈入新阶段。' },
    { category: '社会', title: '国际护士节致敬白衣天使', content: '五月十二日是国际护士节，全国各地举办形式多样的庆祝活动，向奋战在医疗一线的护理工作者致以崇高敬意。目前全国注册护士总数已超过五百六十万人。' },
    { category: '社会', title: '汶川地震十八周年纪念', content: '五月十二日是汶川特大地震十八周年纪念日，各地举行悼念活动缅怀遇难同胞。十八年来，灾区重建取得巨大成就，当地经济社会发展实现历史性跨越。' },
    { category: '社会', title: '全国多地推出便民服务新举措', content: '多个城市推出政务服务一网通办、社区食堂、长者照护等便民新举措，持续提升群众获得感和幸福感。数字化转型让群众办事更加方便快捷。' },
    { category: '社会', title: '教育部推进义务教育优质均衡发展', content: '教育部发布通知，要求各地加快推进义务教育优质均衡发展，缩小城乡和区域教育差距。重点加强农村学校师资配备和教学设施建设。' }
  ];
}

function generateHTML(newsItems) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  const categoryColors = { '国际': '#e74c3c', '国内': '#3498db', '财经': '#f39c12', '科技': '#9b59b6', '社会': '#1abc9c' };
  const categoryIcons = { '国际': '🌍', '国内': '🇨🇳', '财经': '💰', '科技': '🔬', '社会': '🏥' };

  const newsHTML = newsItems.map((item, index) => `
      <div class="news-item" id="news-${index}">
        <span class="news-tag" style="background-color: ${categoryColors[item.category] || '#666'}">${categoryIcons[item.category] || ''} ${item.category}</span>
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
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<meta http-equiv="Cache-Control" content="no-cache,no-store,must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<title>每日新闻播报 - ${dateStr}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);min-height:100vh;color:#fff;padding:20px;-webkit-tap-highlight-color:transparent}
.container{max-width:800px;margin:0 auto}
.header{text-align:center;padding:30px 0;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:30px}
.header h1{font-size:28px;margin-bottom:10px;background:linear-gradient(90deg,#00d2ff,#3a7bd5);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.header .date{color:#888;font-size:16px}
.section-title{font-size:20px;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #3a7bd5}
.news-item{background:rgba(255,255,255,0.05);border-radius:12px;padding:15px;margin-bottom:15px;transition:all 0.3s;border-left:3px solid transparent}
.news-item.active{background:rgba(58,123,213,0.15);border-left-color:#3a7bd5}
.news-tag{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;margin-bottom:8px}
.news-title{font-size:16px;font-weight:600;margin-bottom:8px;line-height:1.4}
.news-content{font-size:14px;color:#aaa;line-height:1.6}
.controls{position:fixed;bottom:0;left:0;right:0;background:rgba(26,26,46,0.98);padding:15px 20px;padding-bottom:max(15px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-top:1px solid rgba(255,255,255,0.1);z-index:100}
.btn-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.btn{padding:14px 28px;border:none;border-radius:25px;font-size:16px;cursor:pointer;font-weight:600;-webkit-user-select:none;user-select:none;touch-action:manipulation}
.btn-primary{background:linear-gradient(90deg,#00d2ff,#3a7bd5);color:white;min-width:140px}
.btn-primary:active{transform:scale(0.95);opacity:0.9}
.btn-secondary{background:rgba(255,255,255,0.1);color:white}
.btn-secondary:active{background:rgba(255,255,255,0.2)}
.settings{display:flex;gap:15px;justify-content:center;align-items:center;flex-wrap:wrap}
.setting-item{display:flex;align-items:center;gap:6px}
.setting-item label{font-size:13px;color:#888}
.setting-item input[type="range"]{width:80px;accent-color:#3a7bd5}
.setting-item span{font-size:13px;color:#aaa;min-width:30px}
.status{text-align:center;font-size:14px;color:#888;min-height:20px}
.progress-bar{width:100%;height:3px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden}
.progress-fill{height:100%;background:linear-gradient(90deg,#00d2ff,#3a7bd5);width:0%;transition:width 0.3s}
.content{padding-bottom:220px}
.update-time{text-align:center;color:#666;font-size:12px;margin-top:20px}
.tts-mode{display:flex;gap:8px;justify-content:center;align-items:center}
.tts-mode label{font-size:13px;color:#888}
.tts-mode select{background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:4px 8px;font-size:13px}
</style>
</head>
<body>
<div class="container">
<div class="header"><h1>每日新闻播报</h1><div class="date">${dateStr}</div></div>
<div class="content"><div class="section-title">今日要闻</div>${newsHTML}</div>
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
<div class="setting-item"><label>语速</label><input type="range" id="rate" min="3" max="9" step="1" value="5"><span id="rateValue">5</span></div>
<div class="tts-mode"><label>引擎</label><select id="ttsMode"><option value="baidu">百度语音(推荐)</option><option value="browser">浏览器语音</option></select></div>
</div>
</div>
<script>
(function(){
var newsData=${newsDataJSON};
var isPlaying=false,isPaused=false,currentChunk=0,chunks=[],currentAudio=null,ttsMode='baidu';
function buildNewsText(){var t='每日新闻播报。';for(var i=0;i<newsData.length;i++){t+=newsData[i].category+'新闻。'+newsData[i].title+'。'+newsData[i].content+'。';}t+='以上是今日新闻摘要，祝您有美好的一天。';return t;}
function splitTextIntoChunks(text,maxLen){maxLen=maxLen||200;var result=[];var sentences=text.split(/(?<=[。！？；])/);var cur='';for(var i=0;i<sentences.length;i++){if((cur+sentences[i]).length>maxLen&&cur.length>0){result.push(cur);cur=sentences[i];}else{cur+=sentences[i];}}if(cur.length>0)result.push(cur);return result;}
function getBaiduTTSUrl(text,speed){return 'https://tts.baidu.com/text2audio?lan=zh&ie=UTF-8&spd='+(speed||5)+'&pit=5&vol=9&per=0&tex='+encodeURIComponent(text);}
function highlightNews(chunkIndex){var items=document.querySelectorAll('.news-item');for(var i=0;i<items.length;i++)items[i].classList.remove('active');var fullText='';for(var i=0;i<=chunkIndex&&i<chunks.length;i++)fullText+=chunks[i];var prefix='每日新闻播报。';var remaining=fullText;if(remaining.indexOf(prefix)===0)remaining=remaining.substring(prefix.length);var newsIdx=0;for(var i=0;i<newsData.length;i++){var nt=newsData[i].category+'新闻。'+newsData[i].title+'。'+newsData[i].content+'。';if(remaining.length>=nt.length){remaining=remaining.substring(nt.length);newsIdx=i+1;}else{newsIdx=i;break;}}if(newsIdx>0)newsIdx--;if(items[newsIdx]){items[newsIdx].classList.add('active');items[newsIdx].scrollIntoView({behavior:'smooth',block:'center'});}var progress=((chunkIndex+1)/chunks.length)*100;document.getElementById('progressFill').style.width=progress+'%';}
function playBaiduChunk(){if(currentChunk>=chunks.length){onSpeechEnd();return;}highlightNews(currentChunk);updateUI('playing');var text=chunks[currentChunk];var speed=parseInt(document.getElementById('rate').value);var url=getBaiduTTSUrl(text,speed);if(currentAudio){currentAudio.pause();currentAudio=null;}currentAudio=new Audio(url);currentAudio.preload='auto';currentAudio.onended=function(){currentChunk++;playBaiduChunk();};currentAudio.onerror=function(){currentChunk++;playBaiduChunk();};currentAudio.oncanplaythrough=function(){if(isPaused)return;currentAudio.play().catch(function(){currentChunk++;playBaiduChunk();});};currentAudio.load();}
function startBaiduTTS(){var fullText=buildNewsText();chunks=splitTextIntoChunks(fullText);currentChunk=0;isPlaying=true;isPaused=false;playBaiduChunk();}
function togglePauseBaidu(){if(!isPlaying)return;if(isPaused){if(currentAudio)currentAudio.play().catch(function(){});isPaused=false;updateUI('playing');}else{if(currentAudio)currentAudio.pause();isPaused=true;updateUI('paused');}}
function stopBaidu(){if(currentAudio){currentAudio.pause();currentAudio.currentTime=0;currentAudio=null;}isPlaying=false;isPaused=false;currentChunk=0;chunks=[];updateUI('stopped');var items=document.querySelectorAll('.news-item');for(var i=0;i<items.length;i++)items[i].classList.remove('active');document.getElementById('progressFill').style.width='0%';}
var synth=window.speechSynthesis||window.webkitSpeechSynthesis;var browserVoices=[],browserVoicesLoaded=false,browserUtterance=null;
if(synth){function loadVoices(){browserVoices=synth.getVoices();if(browserVoices.length>0)browserVoicesLoaded=true;}loadVoices();if(synth.onvoiceschanged!==undefined)synth.onvoiceschanged=function(){loadVoices();};}
function getChineseVoice(){if(!browserVoicesLoaded)browserVoices=synth.getVoices();for(var i=0;i<browserVoices.length;i++){if(browserVoices[i].lang==='zh-CN')return browserVoices[i];}for(var i=0;i<browserVoices.length;i++){if(browserVoices[i].lang.indexOf('zh')===0)return browserVoices[i];}return null;}
function speakBrowserChunk(){if(currentChunk>=chunks.length){onSpeechEnd();return;}highlightNews(currentChunk);updateUI('playing');browserUtterance=new SpeechSynthesisUtterance(chunks[currentChunk]);browserUtterance.lang='zh-CN';browserUtterance.rate=parseInt(document.getElementById('rate').value)/5;browserUtterance.pitch=1;browserUtterance.volume=1;var voice=getChineseVoice();if(voice)browserUtterance.voice=voice;browserUtterance.onend=function(){currentChunk++;speakBrowserChunk();};browserUtterance.onerror=function(e){if(e.error==='canceled'||e.error==='interrupted')return;currentChunk++;speakBrowserChunk();};synth.speak(browserUtterance);}
function startBrowserTTS(){synth.cancel();var fullText=buildNewsText();chunks=splitTextIntoChunks(fullText);currentChunk=0;isPlaying=true;isPaused=false;speakBrowserChunk();}
function togglePauseBrowser(){if(!isPlaying)return;if(isPaused){synth.resume();isPaused=false;updateUI('playing');}else{synth.pause();isPaused=true;updateUI('paused');}}
function stopBrowser(){synth.cancel();isPlaying=false;isPaused=false;currentChunk=0;chunks=[];updateUI('stopped');var items=document.querySelectorAll('.news-item');for(var i=0;i<items.length;i++)items[i].classList.remove('active');document.getElementById('progressFill').style.width='0%';}
function startSpeech(){ttsMode=document.getElementById('ttsMode').value;if(ttsMode==='baidu'){startBaiduTTS();}else if(synth){startBrowserTTS();}}
function togglePause(){if(ttsMode==='baidu'){togglePauseBaidu();}else{togglePauseBrowser();}}
function stopSpeech(){if(ttsMode==='baidu'){stopBaidu();}else{stopBrowser();}}
function onSpeechEnd(){isPlaying=false;isPaused=false;currentChunk=0;chunks=[];updateUI('finished');var items=document.querySelectorAll('.news-item');for(var i=0;i<items.length;i++)items[i].classList.remove('active');document.getElementById('progressFill').style.width='100%';}
function updateUI(state){var playBtn=document.getElementById('playBtn'),pauseBtn=document.getElementById('pauseBtn'),stopBtn=document.getElementById('stopBtn'),status=document.getElementById('status');switch(state){case'playing':status.textContent='正在播报... ('+(currentChunk+1)+'/'+chunks.length+')';playBtn.style.display='none';pauseBtn.style.display='inline-block';pauseBtn.textContent='暂停';stopBtn.style.display='inline-block';break;case'paused':status.textContent='已暂停';pauseBtn.textContent='继续';break;case'stopped':status.textContent='已停止';playBtn.style.display='inline-block';playBtn.textContent='开始播报';pauseBtn.style.display='none';stopBtn.style.display='none';break;case'finished':status.textContent='播报完成';playBtn.style.display='inline-block';playBtn.textContent='重新播报';pauseBtn.style.display='none';stopBtn.style.display='none';break;}}
document.getElementById('playBtn').addEventListener('click',startSpeech);
document.getElementById('pauseBtn').addEventListener('click',togglePause);
document.getElementById('stopBtn').addEventListener('click',stopSpeech);
document.getElementById('rate').addEventListener('input',function(){document.getElementById('rateValue').textContent=this.value;});
document.addEventListener('visibilitychange',function(){if(document.hidden&&isPlaying&&!isPaused)togglePause();});
})();
</script>
</body>
</html>`;
}

async function main() {
  const newsItems = await fetchAllNews();
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
