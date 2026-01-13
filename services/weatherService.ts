import { WeatherData, SkiResort, SkiAdvice } from '../types';
import { GoogleGenAI } from "@google/genai";

// 默认热门滑雪场（用于离线模式或 API 失败时的降级）
export const DEFAULT_SKI_RESORTS: SkiResort[] = [
  {
    id: 'B000A9WZYZ',
    name: '北京南山滑雪场',
    address: '河南寨镇圣水头村',
    location: '116.862291,40.330682',
    rating: 4.7,
    tel: '010-84411182',
    cityname: '北京市',
    adname: '密云区',
    photoUrl: 'http://aos-cdn-image.amap.com/sns/ugccomment/3536b704-a109-4932-b1cd-034bd594dc93.jpg'
  },
  {
    id: 'B000A7PQ9P',
    name: '北京军都山滑雪场',
    address: '崔村镇真顺村588号',
    location: '116.331248,40.239676',
    rating: 4.6,
    tel: '010-60725888',
    cityname: '北京市',
    adname: '昌平区',
    photoUrl: 'http://store.is.autonavi.com/showpic/afeffb36fcc6b0b110828a07c0dfd2b2'
  },
  {
    id: 'B000A7ZMPK',
    name: '北京渔阳国际滑雪场',
    address: '东高村镇大旺务村东688号',
    location: '117.147716,40.077197',
    rating: 4.5,
    tel: '010-69908282',
    cityname: '北京市',
    adname: '平谷区',
    photoUrl: 'http://store.is.autonavi.com/showpic/ae59fd776e05f7038024d276e49ff1c4'
  },
  {
    id: 'B0HKOUL9IC',
    name: '国家高山滑雪中心',
    address: '延庆区海坨山',
    location: '115.810122,40.550457',
    rating: 4.5,
    tel: '010-69119500',
    cityname: '北京市',
    adname: '延庆区',
    photoUrl: 'http://store.is.autonavi.com/showpic/f012c9a2309e8ec2dfed8da02dad7e80'
  },
  {
    id: 'B000A7Q5WI',
    name: '北京乔波滑雪馆',
    address: '顺安路6号',
    location: '116.661514,40.200128',
    rating: 4.5,
    tel: '010-60413499',
    cityname: '北京市',
    adname: '顺义区',
    photoUrl: 'http://store.is.autonavi.com/showpic/03c5bfc20abd5e93204ffff742dd076e'
  },
  {
    id: 'B000A04209',
    name: '北京怀北国际滑雪场',
    address: '怀北镇河防口村548号',
    location: '116.656299,40.447449',
    rating: 4.5,
    tel: '010-60687328',
    cityname: '北京市',
    adname: '怀柔区',
    photoUrl: 'http://store.is.autonavi.com/showpic/2f81c227e06611f29d82a04dbae6cc1a'
  }
];

// 天气服务类
// 超时包装函数
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

export class WeatherService {
  private ai: GoogleGenAI | null = null;
  private skiResorts: SkiResort[] = DEFAULT_SKI_RESORTS;

  private getAI(): GoogleGenAI | null {
    const apiKey = process.env.API_KEY || '';
    if (!apiKey) {
      console.warn('GEMINI_API_KEY 未配置，AI 建议功能将使用规则基础方案');
      return null;
    }
    if (!this.ai) {
      this.ai = new GoogleGenAI({ apiKey });
    }
    return this.ai;
  }

  // 获取雪场列表（调用 qveris 高德 API）
  async fetchSkiResorts(city: string = '北京'): Promise<SkiResort[]> {
    try {
      const response = await fetch(`/api/ski-resorts?city=${encodeURIComponent(city)}&keywords=滑雪场`);
      if (!response.ok) {
        throw new Error('Failed to fetch ski resorts');
      }
      const result = await response.json();
      if (result.success && result.data?.length > 0) {
        this.skiResorts = result.data;
        return result.data;
      }
      return DEFAULT_SKI_RESORTS;
    } catch (error) {
      console.error('Ski resorts API error:', error);
      return DEFAULT_SKI_RESORTS;
    }
  }

  // 获取当前雪场列表
  getSkiResorts(): SkiResort[] {
    return this.skiResorts;
  }

  // 获取雪场天气数据（调用 qveris Visual Crossing API）
  async getWeatherForResort(resort: SkiResort): Promise<WeatherData> {
    const [lng, lat] = resort.location.split(',');
    const locationQuery = `${lat},${lng}`; // Visual Crossing 使用 lat,lng 格式

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时
      
      const response = await fetch(`/api/weather?location=${encodeURIComponent(locationQuery)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Weather API request failed');
      }
      const result = await response.json();

      if (result.success && result.data) {
        return {
          location: resort.name,
          resolvedAddress: result.data.resolvedAddress || `${resort.cityname}${resort.adname}`,
          temp: result.data.temp ?? -10,
          feelslike: result.data.feelslike ?? -15,
          tempmax: result.data.tempmax ?? -5,
          tempmin: result.data.tempmin ?? -15,
          humidity: result.data.humidity ?? 30,
          windspeed: result.data.windspeed ?? 15,
          winddir: result.data.winddir ?? 0,
          snow: result.data.snow ?? 0,
          snowdepth: result.data.snowdepth ?? 25,
          visibility: result.data.visibility ?? 20,
          uvindex: result.data.uvindex ?? 3,
          conditions: result.data.conditions ?? '晴',
          icon: result.data.icon ?? 'clear-day',
          sunrise: result.data.sunrise ?? '07:30',
          sunset: result.data.sunset ?? '17:15'
        };
      }
      throw new Error('Invalid weather data');
    } catch (error) {
      console.error('Weather API error:', error);
      // 返回模拟数据作为降级方案
      return this.getMockWeatherData(resort);
    }
  }

  // 模拟天气数据（API 失败时的降级方案）
  private getMockWeatherData(resort: SkiResort): WeatherData {
    return {
      location: resort.name,
      resolvedAddress: `${resort.cityname}${resort.adname}`,
      temp: Math.round(-8 + Math.random() * 6 - 3),
      feelslike: Math.round(-15 + Math.random() * 8 - 4),
      tempmax: Math.round(-5 + Math.random() * 4),
      tempmin: Math.round(-15 + Math.random() * 4),
      humidity: Math.round(25 + Math.random() * 20),
      windspeed: Math.round(10 + Math.random() * 20),
      winddir: Math.round(Math.random() * 360),
      snow: Math.random() > 0.7 ? Math.round(Math.random() * 5) : 0,
      snowdepth: Math.round(20 + Math.random() * 30),
      visibility: Math.round(15 + Math.random() * 10),
      uvindex: Math.round(2 + Math.random() * 3),
      conditions: this.getRandomCondition(),
      icon: this.getRandomIcon(),
      sunrise: '07:30',
      sunset: '17:15'
    };
  }

  private getRandomCondition(): string {
    const conditions = ['晴朗', '多云', '阴天', '小雪', '中雪'];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  private getRandomIcon(): string {
    const icons = ['clear-day', 'partly-cloudy-day', 'cloudy', 'snow'];
    return icons[Math.floor(Math.random() * icons.length)];
  }

  // 根据天气生成滑雪建议（使用 Gemini AI）
  async generateSkiAdvice(weather: WeatherData, isBeginnerMode: boolean): Promise<SkiAdvice> {
    const prompt = `
你是专业滑雪教练，请根据以下天气数据，为${isBeginnerMode ? '初学者' : '滑雪爱好者'}生成简洁的滑雪建议。

天气数据：
- 地点：${weather.location}
- 温度：${weather.temp}°C（体感 ${weather.feelslike}°C）
- 风速：${weather.windspeed} km/h
- 湿度：${weather.humidity}%
- 降雪：${weather.snow}mm
- 积雪深度：${weather.snowdepth}cm
- 能见度：${weather.visibility}km
- 紫外线指数：${weather.uvindex}
- 天气状况：${weather.conditions}

请返回JSON格式（不要markdown代码块）：
{
  "level": "excellent/good/caution/warning",
  "title": "一句话总结今日滑雪条件",
  "suggestions": ["建议1", "建议2", "建议3"],
  "beginnerTips": ${isBeginnerMode ? '["初学者专属提示1", "初学者专属提示2"]' : 'null'}
}

判断标准：
- excellent: 温度-15~-5°C，风速<15km/h，能见度>10km
- good: 温度-20~0°C，风速<25km/h，能见度>5km
- caution: 温度<-20°C或>0°C，风速25-40km/h，需额外注意
- warning: 极端天气，不建议滑雪
`;

    const ai = this.getAI();
    if (!ai) {
      // 如果没有 API key，直接使用规则基础建议
      return this.generateRuleBasedAdvice(weather, isBeginnerMode);
    }

    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [{ parts: [{ text: prompt }] }],
          config: { temperature: 0.3 }
        }),
        15000, // 15秒超时
        "AI 建议生成超时"
      );

      const text = response.text || '';
      const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error('AI Advice Error:', error);
      // 超时或失败时使用规则基础建议
      return this.generateRuleBasedAdvice(weather, isBeginnerMode);
    }
  }

  // 规则基础的滑雪建议（AI调用失败时的降级方案）
  private generateRuleBasedAdvice(weather: WeatherData, isBeginnerMode: boolean): SkiAdvice {
    let level: SkiAdvice['level'] = 'good';
    let title = '';
    const suggestions: string[] = [];
    const beginnerTips: string[] = [];

    if (weather.temp < -20) {
      level = 'caution';
      suggestions.push('气温极低，建议穿戴专业保暖装备，注意防冻伤');
    } else if (weather.temp > 0) {
      level = 'caution';
      suggestions.push('气温偏高，雪质可能较软，注意调整滑行节奏');
    } else if (weather.temp >= -15 && weather.temp <= -5) {
      if (level !== 'caution') level = 'excellent';
      suggestions.push('温度适宜，雪质良好，尽情享受滑雪吧');
    }

    if (weather.windspeed > 40) {
      level = 'warning';
      suggestions.push('风力过大，建议暂停户外滑雪活动');
    } else if (weather.windspeed > 25) {
      if (level !== 'warning') level = 'caution';
      suggestions.push('风速较大，注意保持重心稳定，避免高速滑行');
    } else if (weather.windspeed < 15) {
      suggestions.push('风力轻柔，非常适合练习技术动作');
    }

    if (weather.visibility < 5) {
      if (level !== 'warning') level = 'caution';
      suggestions.push('能见度较低，请选择熟悉的雪道，保持安全距离');
    }

    if (weather.uvindex >= 4) {
      suggestions.push('紫外线较强，请做好面部防晒，佩戴雪镜');
    }

    if (isBeginnerMode) {
      beginnerTips.push('建议选择初级道练习，避免陡坡');
      if (weather.windspeed > 15) {
        beginnerTips.push('有风时重心要更低，双膝微屈保持稳定');
      }
      if (weather.temp < -10) {
        beginnerTips.push('天冷肌肉容易僵硬，充分热身后再上雪道');
      }
      beginnerTips.push('疲劳时及时休息，循序渐进是进步的关键');
    }

    switch (level) {
      case 'excellent':
        title = '完美滑雪日！天气条件极佳';
        break;
      case 'good':
        title = '适宜滑雪，注意基本防护';
        break;
      case 'caution':
        title = '可以滑雪，但需额外注意安全';
        break;
      case 'warning':
        title = '天气恶劣，建议改期或选择室内场馆';
        break;
    }

    return {
      level,
      title,
      suggestions,
      beginnerTips: isBeginnerMode ? beginnerTips : undefined
    };
  }

  getWindDirection(degrees: number): string {
    const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index] + '风';
  }

  getWeatherIcon(icon: string): string {
    const iconMap: Record<string, string> = {
      'clear-day': '☀️',
      'clear-night': '🌙',
      'partly-cloudy-day': '⛅',
      'partly-cloudy-night': '☁️',
      'cloudy': '☁️',
      'rain': '🌧️',
      'snow': '🌨️',
      'sleet': '🌨️',
      'wind': '💨',
      'fog': '🌫️'
    };
    return iconMap[icon] || '🌤️';
  }
}

export const weatherService = new WeatherService();

// 导出默认雪场列表供组件使用
export const POPULAR_SKI_RESORTS = DEFAULT_SKI_RESORTS;
