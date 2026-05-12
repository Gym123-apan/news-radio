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
    { category: '国际', title: '特朗普即将访华，中美关系迎来重要节点', content: '外交部确认美国总统特朗普将于近期对中国进行国事访问，这是其就任后首次访华。分析人士指出，经贸合作、科技竞争和地区安全将成为此次访问的核心议题，双方有望在多个领域达成新的共识。' },
    { category: '国际', title: '印巴达成停火协议，南亚局势
