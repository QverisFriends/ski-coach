import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 加载 .env.local 配置
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

const app = express();
const PORT = 3001;

// Qveris API 配置 - 从环境变量读取
const QVERIS_API_KEY = process.env.QVERIS_API_KEY;
const QVERIS_BASE_URL = 'https://qveris.ai/api/v1';

if (!QVERIS_API_KEY) {
  console.warn('Warning: QVERIS_API_KEY not found in .env.local');
}

app.use(cors());
app.use(express.json());

// 通用 qveris 工具执行函数
async function executeQverisTool(toolId, parameters, searchId = 'skipro-weather') {
  const response = await fetch(`${QVERIS_BASE_URL}/tools/execute?tool_id=${toolId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${QVERIS_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      search_id: searchId,
      session_id: `skipro-${Date.now()}`,
      parameters,
      max_response_size: 20480
    }),
    signal: AbortSignal.timeout(10000) // 10秒超时
  });

  if (!response.ok) {
    throw new Error(`Qveris API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error_message || 'Qveris API execution failed');
  }

  return data.result;
}

// 天气数据 API
// 使用 visualcrossing.timeline.retrieve.v1
app.get('/api/weather', async (req, res) => {
  try {
    const { location } = req.query;
    if (!location) {
      return res.status(400).json({ error: 'Missing location parameter' });
    }

    const result = await executeQverisTool(
      'visualcrossing.timeline.retrieve.v1',
      {
        location: location,
        unitGroup: 'metric'
      }
    );

    // 解析并返回简化的天气数据
    const data = result.data || result;
    const today = data.days?.[0] || {};
    const currentHour = new Date().getHours();
    const hourData = today.hours?.find(h => parseInt(h.datetime) === currentHour) || today;

    res.json({
      success: true,
      data: {
        location: data.address || location,
        resolvedAddress: data.resolvedAddress || location,
        temp: hourData.temp ?? today.temp,
        feelslike: hourData.feelslike ?? today.feelslike,
        tempmax: today.tempmax,
        tempmin: today.tempmin,
        humidity: hourData.humidity ?? today.humidity,
        windspeed: hourData.windspeed ?? today.windspeed,
        winddir: hourData.winddir ?? today.winddir,
        snow: hourData.snow ?? today.snow ?? 0,
        snowdepth: hourData.snowdepth ?? today.snowdepth ?? 0,
        visibility: hourData.visibility ?? today.visibility,
        uvindex: hourData.uvindex ?? today.uvindex,
        conditions: hourData.conditions ?? today.conditions,
        icon: hourData.icon ?? today.icon,
        sunrise: today.sunrise,
        sunset: today.sunset
      }
    });
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 雪场搜索 API
// 使用 amap_webservice.place.text.list.v3
app.get('/api/ski-resorts', async (req, res) => {
  try {
    const { city = '北京', keywords = '滑雪场' } = req.query;

    const result = await executeQverisTool(
      'amap_webservice.place.text.list.v3',
      {
        keywords,
        city,
        extensions: 'all',
        offset: 20
      }
    );

    const data = result.data || result;
    const pois = data.pois || [];

    // 过滤并格式化雪场数据
    const resorts = pois
      .filter(poi => poi.type?.includes('滑雪') || poi.name?.includes('滑雪'))
      .map(poi => ({
        id: poi.id,
        name: poi.name,
        address: poi.address || '',
        location: poi.location || '',
        rating: parseFloat(poi.biz_ext?.rating) || 4.0,
        tel: Array.isArray(poi.tel) ? poi.tel[0] : poi.tel,
        cityname: poi.cityname || city,
        adname: poi.adname || '',
        photoUrl: poi.photos?.[0]?.url || null
      }));

    res.json({
      success: true,
      count: resorts.length,
      data: resorts
    });
  } catch (error) {
    console.error('Ski resorts API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`SkiPro API Server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET /api/weather?location=Beijing');
  console.log('  GET /api/ski-resorts?city=北京');
  console.log('  GET /api/health');
});
