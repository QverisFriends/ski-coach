
export enum SkillLevel {
  BEGINNER = '初学者',
  INTERMEDIATE = '中级',
  ADVANCED = '高级',
  EXPERT = '专家'
}

export type Discipline = 'SKI' | 'SNOWBOARD';
export type GoalCategory = '初级阶段' | '中级阶段' | '高级阶段';

export interface SkiGoal {
  id: string;
  discipline: Discipline;
  category: GoalCategory;
  title: string;
  description: string;
  keyPoints: string[];
}

export interface Feedback {
  id: string;
  timestamp: number;
  goalId: string;
  videoUrl?: string;
  analysis: string;
  rating: number; // 1-10
  keyCorrections: string[];
}

export interface UserProfile {
  name: string;
  level: SkillLevel;
  currentGoalId: string;
}

// 天气相关类型
export interface WeatherData {
  location: string;
  resolvedAddress: string;
  temp: number;           // 当前温度
  feelslike: number;      // 体感温度
  tempmax: number;        // 最高温度
  tempmin: number;        // 最低温度
  humidity: number;       // 湿度
  windspeed: number;      // 风速
  winddir: number;        // 风向
  snow: number;           // 降雪量
  snowdepth: number;      // 积雪深度
  visibility: number;     // 能见度
  uvindex: number;        // 紫外线指数
  conditions: string;     // 天气状况
  icon: string;           // 天气图标
  sunrise: string;        // 日出时间
  sunset: string;         // 日落时间
}

export interface SkiResort {
  id: string;
  name: string;
  address: string;
  location: string;       // "lng,lat"
  rating: number;
  tel?: string;
  cityname: string;
  adname: string;
  photoUrl?: string;
}

export interface SkiAdvice {
  level: 'excellent' | 'good' | 'caution' | 'warning';
  title: string;
  suggestions: string[];
  beginnerTips?: string[];
}
