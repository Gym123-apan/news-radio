const fs = require('fs');
const path = require('path');

const RSS_SOURCES = [
  { name: '人民网-国内', url: 'http://www.people.com.cn/rss/politics.xml', category: '国内' },
  { name: '人民网-国际', url: 'http://www.people.com.cn/rss/world.xml', category: '国际' },
  { name: '人民网-财经', url: 'http://www.people.com.cn/rss/finance.xml', category: '财经' },
  { name: '人民网-社会', url: 'http://www.people.com.cn/rss/society.xml', category: '社会' },
  { name: '人民网-科技', url: 'http://www.people.com.cn/rss/scitech.xml', category: '科技' },
  { name: '新华网-国际', url: 'http://www.xinhuanet.com/world/news_world.xml', category: '国际' },
  { name: '新华网-财经', url: 'http://www.xinhuanet.com/fortune/news_fortune.xml', category: '财经' },
  { name: '新浪新闻', url: 'https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=2509&k=&num=50&r=0.5', category: '国内', jsonApi: true },
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
    if (!title || title.length < 5) continue;
    const cleanDesc = description.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
    items.push({
      category: defaultCategory,
      title: title.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim(),
      content: cleanDesc || title,
    });
  }
  return items;
}

async function fetchRSS(source) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsRadio/1.0)', 'Referer': 'https://www.baidu.com' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) { console.log(`  ${source.name}: HTTP ${response.status}`); return []; }
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
  } catch (e) { console.log(`  ${source.name}: 获取失败 (${e.message})`); return []; }
}

function parseJSONFeed(json, source) {
  const items = [];
  try {
    const list = json.result?.data || [];
    for (const entry of list) {
      const title = (entry.title || '').replace(/<[^>]+>/g, '').trim();
      const content = (entry.intro || entry.digest || entry.description || title).replace(/<[^>]+>/g, '').trim();
      if (title && title.length >= 5) items.push({ category: source.category, title, content: content || title });
    }
  } catch (e) { /* ignore */ }
  return items;
}

function deduplicate(newsItems) {
  const seen = new Set(), result = [];
  for (const item of newsItems) {
    const key = item.title.substring(0, 15);
    if (seen.has(key)) continue;
    seen.add(key); result.push(item);
  }
  return result;
}

function balanceCategories(items) {
  const cats = { '国际': [], '国内': [], '财经': [], '科技': [], '社会': [] };
  for (const item of items) {
    const cat = cats[item.category] ? item.category : '国内';
    cats[cat].push(item);
  }
  const result = [];
  for (const cat of ['国际', '国内', '财经', '科技', '社会']) {
    result.push(...cats[cat].slice(0, 6));
  }
  return result;
}

function truncateContent(content, maxLen) {
  if (content.length <= maxLen) return content;
  return content.substring(0, maxLen).replace(/[，,。！？\s]*$/, '') + '。';
}

const FALLBACK_NEWS = [
  { category: '国际', title: '特朗普即将访华，中美关系迎来重要节点', content: '外交部确认美国总统特朗普将于近期对中国进行国事访问，这是其就任后首次访华。经贸合作、科技竞争和地区安全将成为核心议题。' },
  { category: '国际', title: '印巴达成停火协议，南亚局势趋缓', content: '印度和巴基斯坦同时宣布达成停火协议，同意立即停止在克什米尔地区的军事行动。这是两国近五年来首次达成正式停火。' },
  { category: '国际', title: '中东局势持续紧张，油价波动加剧', content: '美国拒绝伊朗停战提议，霍尔木兹海峡通行受限，国际原油价格持续走高，布伦特原油一度突破每桶一百零五美元。' },
  { category: '国际', title: '法国颁布文物归还法律', content: '法国总统马克龙正式签署法律，简化归还殖民时期非法获取外国文物的程序，涵盖1815年至1972年间被掠夺的文物。' },
  { category: '国际', title: '英国地方选举执政党失利', content: '英国地方选举结果揭晓，执政党工党丢失大量地方议会议席，极右翼政党英国改革党表现强劲。' },
  { category: '国际', title: '全球气候谈判取得新进展', content: '联合国气候变化框架公约最新一轮谈判在波恩结束，各方就减排目标和气候资金问题达成初步共识。' },
  { category: '国内', title: '天舟十号货运飞船成功发射并完成对接', content: '天舟十号货运飞船在文昌航天发射场成功发射，随后与空间站组合体完成交会对接，为航天员运送补给物资和实验设备。' },
  { category: '国内', title: '中美将举行新一轮经贸磋商', content: '国务院副总理何立峰将率团与美方举行经贸磋商，以两国元首会晤共识为引领，就双方关心的经贸问题展开讨论。' },
  { category: '国内', title: '国乒包揽世乒赛团体双冠', content: '在伦敦世乒赛团体决赛中，中国女队三比二战胜日本实现七连冠，男队三比零横扫日本收获十二连冠。' },
  { category: '国内', title: '两高发布耕地保护司法解释', content: '最高人民法院与最高人民检察院联合发布司法解释，实行最严格耕地保护制度，加大对非法占用耕地行为的惩处力度。' },
  { category: '国内', title: '三星堆发现青铜时代最早陨铁文物', content: '研究团队确认三星堆遗址出土的铁质残片为纯陨铁制品，填补了中国西南地区早期用铁历史的学术空白。' },
  { category: '国内', title: '全国夏粮收购工作即将启动', content: '国家粮食和物资储备局宣布全国夏粮收购工作即将启动，预计今年夏粮收购量将保持稳定，各地已做好仓容和资金准备。' },
  { category: '国内', title: '五一假期国内旅游市场火爆', content: '今年五一假期全国国内旅游出游合计超过两亿人次，同比增长超过百分之十五，旅游消费总额突破一千五百亿元。' },
  { category: '国内', title: '全国医保跨省异地就医直接结算范围扩大', content: '国家医保局宣布进一步扩大跨省异地就医直接结算范围，新增覆盖更多门诊慢特病病种，参保群众异地就医报销更加便捷。' },
  { category: '财经', title: '央行实施稳健货币政策，市场流动性合理充裕', content: '中国人民银行继续实施稳健的货币政策，通过多种工具保持市场流动性合理充裕，分析人士认为后续仍有降准降息可能。' },
  { category: '财经', title: '四月CPI同比上涨，物价温和回升', content: '国家统计局数据显示，四月全国居民消费价格指数同比上涨百分之零点三，食品价格基本稳定，服务价格有所回升。' },
  { category: '财经', title: '人民币汇率保持基本稳定', content: '近期人民币对美元汇率在合理均衡水平上保持基本稳定，外汇市场运行平稳，跨境资金流动趋于均衡。' },
  { category: '财经', title: 'A股市场延续升势，科创板块表现亮眼', content: '五一假期后A股迎来开门红，创业板指上涨超过百分之三，科创五十指数涨幅超过百分之四。' },
  { category: '财经', title: '房地产市场持续调整，政策效果逐步显现', content: '多地房地产调控政策持续优化，限购限贷政策有所放松，一线城市二手房成交量环比回升。' },
  { category: '财经', title: '黄金价格再创历史新高', content: '国际金价突破每盎司两千四百美元再创历史新高，地缘政治风险和全球央行持续购金是推动金价上涨的主要因素。' },
  { category: '科技', title: '我国人工智能调用量全球第一', content: '国家信息中心数据显示，我国人工智能大模型日均调用量突破十亿次，位居全球首位，AI技术在多个领域加速落地。' },
  { category: '科技', title: 'AI立法进程加快，监管框架逐步完善', content: '全国人大常委会已将人工智能立法列入立法规划，立法将重点关注数据安全、算法透明和权益保护等核心问题。' },
  { category: '科技', title: '新能源汽车渗透率突破百分之四十', content: '中国汽车工业协会数据显示，新能源汽车国内零售渗透率首次突破百分之四十，标志着向市场驱动全面转型。' },
  { category: '科技', title: '量子计算研究取得重大突破', content: '中国科学技术大学团队成功实现超过五百个量子比特的操控，为通用量子计算的发展奠定了重要基础。' },
  { category: '科技', title: '国产大飞机C919商业运营满两年', content: 'C919投入商业运营已满两年，累计安全运送旅客超过一百万人次，目前订单已超过一千架。' },
  { category: '社会', title: '国际护士节致敬白衣天使', content: '全国各地举办形式多样的庆祝活动，向奋战在医疗一线的护理工作者致以崇高敬意，目前全国注册护士总数已超过五百六十万人。' },
  { category: '社会', title: '汶川地震十八周年纪念', content: '各地举行悼念活动缅怀遇难同胞，十八年来灾区重建取得巨大成就，当地经济社会发展实现历史性跨越。' },
  { category: '社会', title: '全国多地推出便民服务新举措', content: '多个城市推出政务服务一网通办、社区食堂、长者照护等便民新举措，持续提升群众获得感和幸福感。' },
  { category: '社会', title: '教育部推进义务教育优质均衡发展', content: '教育部要求各地加快推进义务教育优质均衡发展，缩小城乡和区域教育差距，重点加强农村学校师资配备和教学设施建设。' },
  { category: '社会', title: '全国多地迎来高温天气', content: '中央气象台发布高温预警，华北黄淮等地将出现三十五度以上高温天气，提醒公众注意防暑降温。' },
];

async function fetchAllNews() {
  console.log('开始抓取新闻...');
  const allItems = [];
  for (const source of RSS_SOURCES) {
    const items = await fetchRSS(source);
    allItems.push(...items);
  }
  console.log(`总共抓取: ${allItems.length} 条`);
  const deduped = deduplicate(allItems);
  console.log(`去重后: ${deduped.length} 条`);
  let balanced = balanceCategories(deduped);
  console.log(`分类平衡后: ${balanced.length} 条`);

  if (balanced.length < 30) {
    console.log(`不足30条，用备用新闻补齐`);
    const usedTitles = new Set(balanced.map(i => i.title.substring(0, 10)));
    for (const fb of FALLBACK_NEWS) {
      if (balanced.length >= 30) break;
      if (usedTitles.has(fb.title.substring(0, 10))) continue;
      balanced.push(fb);
      usedTitles.add(fb.title.substring(0, 10));
    }
    balanced = balanceCategories(balanced);
  }

  balanced = balanced.slice(0, 30);
  console.log(`最终: ${balanced.length} 条`);

  return balanced.map(item => ({
    ...item,
    content: truncateContent(item.content, 100),
  }));
}

function generateHTML(newsItems) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const categoryColors = { '国际': '#e74c3c', '国内': '#3498db', '财经': '#f39c12', '科技': '#9b59b6', '社会': '#1abc9c' };
  const categoryIcons = { '国际': '🌍', '国内': '🇨🇳', '财经': '💰', '科技': '🔬', '社会': '🏥' };

  const newsHTML = newsItems.map((item, index) => `
      <div class="ni" id="news-${index}">
        <span class="tag" style="background:${categoryColors[item.category]||'#666'}">${categoryIcons[item.category]||''} ${item.category}</span>
        <div class="nt">${index+1}. ${item.title}</div>
        <div class="nc">${item.content}</div>
      </div>`).join('');

  const newsDataJSON = JSON.stringify(newsItems.map(i => ({ category: i.category, title: i.title, content: i.content })));

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"><meta http-equiv="Cache-Control" content="no-cache,no-store,must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><title>每日新闻播报 - ${dateStr}</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:linear-gradient(135deg,#1a1a2e,#16213e);min-height:100vh;color:#fff;padding:20px;-webkit-tap-highlight-color:transparent}
.c{max-width:800px;margin:0 auto}
.h{text-align:center;padding:30px 0;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:30px}
.h h1{font-size:28px;margin-bottom:10px;background:linear-gradient(90deg,#00d2ff,#3a7bd5);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.h .d{color:#888;font-size:16px}
.st{font-size:20px;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #3a7bd5}
.ni{background:rgba(255,255,255,0.05);border-radius:12px;padding:15px;margin-bottom:15px;transition:all 0.3s;border-left:3px solid transparent}
.ni.ac{background:rgba(58,123,213,0.15);border-left-color:#3a7bd5}
.tag{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;margin-bottom:8px}
.nt{font-size:16px;font-weight:600;margin-bottom:8px;line-height:1.4}
.nc{font-size:14px;color:#aaa;line-height:1.6}
.ctrl{position:fixed;bottom:0;left:0;right:0;background:rgba(26,26,46,0.98);padding:15px 20px;padding-bottom:max(15px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-top:1px solid rgba(255,255,255,0.1);z-index:100}
.br{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.btn{padding:14px 28px;border:none;border-radius:25px;font-size:16px;cursor:pointer;font-weight:600;-webkit-user-select:none;user-select:none;touch-action:manipulation}
.btn-p{background:linear-gradient(90deg,#00d2ff,#3a7bd5);color:white;min-width:140px}
.btn-p:active{transform:scale(0.95);opacity:0.9}
.btn-s{background:rgba(255,255,255,0.1);color:white}
.btn-s:active{background:rgba(255,255,255,0.2)}
.sets{display:flex;gap:15px;justify-content:center;align-items:center;flex-wrap:wrap}
.si{display:flex;align-items:center;gap:6px}
.si label{font-size:13px;color:#888}
.si input[type="range"]{width:80px;accent-color:#3a7bd5}
.si span{font-size:13px;color:#aaa;min-width:30px}
.sts{text-align:center;font-size:14px;color:#888;min-height:20px}
.pb{width:100%;height:3px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden}
.pf{height:100%;background:linear-gradient(90deg,#00d2ff,#3a7bd5);width:0%;transition:width 0.3s}
.content{padding-bottom:220px}
.ut{text-align:center;color:#666;font-size:12px;margin-top:20px}
.chrome-hint{display:none;background:rgba(52,152,219,0.15);border:1px solid #3498db;border-radius:12px;padding:15px;text-align:center;margin-top:15px}
.chrome-hint p{color:#3498db;font-size:14px;line-height:1.6}
.chrome-hint a{color:#00d2ff;text-decoration:underline}
</style></head><body>
<div class="c"><div class="h"><h1>每日新闻播报</h1><div class="d">${dateStr}</div></div>
<div class="content"><div class="st">今日要闻</div>${newsHTML}</div>
<div class="ut">更新时间: ${today.toLocaleString('zh-CN')}</div></div>
<div class="ctrl">
<div class="pb"><div class="pf" id="pf"></div></div>
<div class="sts" id="sts">点击"开始播报"收听今日新闻</div>
<div class="br">
<button class="btn btn-p" id="pBtn">开始播报</button>
<button class="btn btn-s" id="psBtn" style="display:none">暂停</button>
<button class="btn btn-s" id="sBtn" style="display:none">停止</button>
</div>
<div class="sets">
<div class="si"><label>语速</label><input type="range" id="rate" min="0.5" max="2" step="0.1" value="1"><span id="rv">1.0x</span></div>
</div>
<div class="chrome-hint" id="chromeHint"><p>如果无法播报，请使用 <b>Chrome浏览器</b> 打开本页面<br>小米手机可在应用商店搜索下载 Chrome</p></div>
</div>
<script>
(function(){
var ND=${newsDataJSON};
var ip=false,ip2=false,cc=0,cks=[],utt=null,sv=null,voices=[],vl=false,inited=false;
var lastBoundary=0,boundaryTimer=null,chunkTimer=null;

function bnt(){var t='每日新闻播报。';for(var i=0;i<ND.length;i++){t+=ND[i].category+'新闻。'+ND[i].title+'。'+ND[i].content+'。';}t+='以上是今日新闻摘要，祝您有美好的一天。';return t;}

function stc(text,ml){ml=ml||80;var r=[];var ss=text.split(/(?<=[。！？；])/);var c='';for(var i=0;i<ss.length;i++){if((c+ss[i]).length>ml&&c.length>0){r.push(c);c=ss[i];}else{c+=ss[i];}}if(c.length>0)r.push(c);return r;}

function hl(idx){var its=document.querySelectorAll('.ni');for(var i=0;i<its.length;i++)its[i].classList.remove('ac');var ft='';for(var i=0;i<=idx&&i<cks.length;i++)ft+=cks[i];var px='每日新闻播报。';var rm=ft;if(rm.indexOf(px)===0)rm=rm.substring(px.length);var nid=0;for(var i=0;i<ND.length;i++){var nt=ND[i].category+'新闻。'+ND[i].title+'。'+ND[i].content+'。';if(rm.length>=nt.length){rm=rm.substring(nt.length);nid=i+1;}else{nid=i;break;}}if(nid>0)nid--;if(its[nid]){its[nid].classList.add('ac');its[nid].scrollIntoView({behavior:'smooth',block:'center'});}var p=((idx+1)/cks.length)*100;document.getElementById('pf').style.width=p+'%';}

function sc(){if(cc>=cks.length){oe();return;}hl(cc);ui('playing');clearTimers();lastBoundary=Date.now();utt=new SpeechSynthesisUtterance(cks[cc]);utt.lang='zh-CN';utt.rate=parseFloat(document.getElementById('rate').value);utt.pitch=1;utt.volume=1;var v=getCV();if(v)utt.voice=v;
utt.onboundary=function(e){if(e.charIndex>0)lastBoundary=Date.now();};
utt.onend=function(){clearTimers();cc++;sc();};
utt.onerror=function(e){if(e.error==='canceled'||e.error==='interrupted'){clearTimers();return;}clearTimers();cc++;sc();};
sv.speak(utt);
boundaryTimer=setInterval(function(){if(Date.now()-lastBoundary>5000){sv.cancel();clearTimers();cc++;sc();}},1000);
chunkTimer=setTimeout(function(){sv.cancel();clearTimers();cc++;sc();},15000);}

function clearTimers(){if(boundaryTimer){clearInterval(boundaryTimer);boundaryTimer=null;}if(chunkTimer){clearTimeout(chunkTimer);chunkTimer=null;}}

function initEng(cb){if(inited){cb();return;}var w=new SpeechSynthesisUtterance('');w.volume=0;w.lang='zh-CN';w.onend=function(){inited=true;lv();cb();};w.onerror=function(){inited=true;cb();};sv.speak(w);setTimeout(function(){if(!inited){inited=true;sv.cancel();cb();}},2000);}

function lv(){voices=sv.getVoices();if(voices.length>0)vl=true;}

function getCV(){if(!vl)voices=sv.getVoices();for(var i=0;i<voices.length;i++){if(voices[i].lang==='zh-CN')return voices[i];}for(var i=0;i<voices.length;i++){if(voices[i].lang.indexOf('zh')===0)return voices[i];}for(var i=0;i<voices.length;i++){if(voices[i].lang.indexOf('cmn')!==-1)return voices[i];}return null;}

function startSpeech(){if(!sv){document.getElementById('chromeHint').style.display='block';document.getElementById('sts').textContent='此浏览器不支持语音播报，请使用Chrome打开';return;}if(ip&&!ip2)return;if(ip2){sv.resume();ip2=false;ui('playing');return;}sv.cancel();cc=0;var ft=bnt();cks=stc(ft);initEng(function(){ip=true;ip2=false;ui('playing');sc();});}

function togglePause(){if(!ip)return;if(ip2){sv.resume();ip2=false;ui('playing');}else{sv.pause();ip2=true;ui('paused');}}

function stopSpeech(){sv.cancel();clearTimers();ip=false;ip2=false;cc=0;cks=[];ui('stopped');var its=document.querySelectorAll('.ni');for(var i=0;i<its.length;i++)its[i].classList.remove('ac');document.getElementById('pf').style.width='0%';}

function oe(){clearTimers();ip=false;ip2=false;cc=0;cks=[];ui('finished');var its=document.querySelectorAll('.ni');for(var i=0;i<its.length;i++)its[i].classList.remove('ac');document.getElementById('pf').style.width='100%';}

function ui(s){var pb=document.getElementById('pBtn'),psb=document.getElementById('psBtn'),sb=document.getElementById('sBtn'),sts=document.getElementById('sts');switch(s){case'playing':sts.textContent='正在播报... ('+(cc+1)+'/'+cks.length+')';pb.style.display='none';psb.style.display='inline-block';psb.textContent='暂停';sb.style.display='inline-block';break;case'paused':sts.textContent='已暂停';psb.textContent='继续';break;case'stopped':sts.textContent='已停止';pb.style.display='inline-block';pb.textContent='开始播报';psb.style.display='none';sb.style.display='none';break;case'finished':sts.textContent='播报完成';pb.style.display='inline-block';pb.textContent='重新播报';psb.style.display='none';sb.style.display='none';break;}}

sv=window.speechSynthesis||window.webkitSpeechSynthesis;
if(sv){lv();if(sv.onvoiceschanged!==undefined)sv.onvoiceschanged=function(){lv();};}

document.getElementById('pBtn').addEventListener('click',startSpeech);
document.getElementById('psBtn').addEventListener('click',togglePause);
document.getElementById('sBtn').addEventListener('click',stopSpeech);
document.getElementById('rate').addEventListener('input',function(){document.getElementById('rv').textContent=parseFloat(this.value).toFixed(1)+'x';});
document.addEventListener('visibilitychange',function(){if(document.hidden&&ip&&!ip2)togglePause();});
})();
</script></body></html>`;
}

async function main() {
  const newsItems = await fetchAllNews();
  const html = generateHTML(newsItems);
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) { fs.mkdirSync(distDir, { recursive: true }); }
  fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');
  console.log('生成完成！新闻:', newsItems.length, '条');
}

main().catch(console.error);
