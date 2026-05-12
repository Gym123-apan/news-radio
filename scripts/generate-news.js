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
