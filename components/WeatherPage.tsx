import React, { useState, useEffect } from 'react';
import { WeatherData, SkiResort, SkiAdvice } from '../types';
import { weatherService, POPULAR_SKI_RESORTS } from '../services/weatherService';

interface WeatherPageProps {
  onBack: () => void;
}

const WeatherPage: React.FC<WeatherPageProps> = ({ onBack }) => {
  const [selectedResort, setSelectedResort] = useState<SkiResort>(POPULAR_SKI_RESORTS[0]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [advice, setAdvice] = useState<SkiAdvice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBeginnerMode, setIsBeginnerMode] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 延迟加载，避免阻塞初始渲染
    const timer = setTimeout(() => {
      loadWeatherData(selectedResort);
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedResort]);

  const loadWeatherData = async (resort: SkiResort) => {
    setIsLoading(true);
    setError(null);
    try {
      // 先加载天气数据
      const weatherData = await weatherService.getWeatherForResort(resort);
      setWeather(weatherData);
      setIsLoading(false); // 天气数据加载完成，先显示

      // 然后异步加载 AI 建议（不阻塞 UI）
      try {
        const skiAdvice = await weatherService.generateSkiAdvice(weatherData, isBeginnerMode);
        setAdvice(skiAdvice);
      } catch (adviceError) {
        console.error('AI advice error:', adviceError);
        // AI 建议失败时使用规则基础建议
        setAdvice(weatherService.generateRuleBasedAdvice(weatherData, isBeginnerMode));
      }
    } catch (error: any) {
      console.error('Weather load error:', error);
      setIsLoading(false);
      setError(error.message || '加载天气数据失败，请稍后重试');
      // 使用默认数据作为降级方案
      setWeather(null);
      setAdvice(null);
    }
  };

  const refreshAdvice = async () => {
    if (!weather) return;
    setIsLoading(true);
    try {
      const skiAdvice = await weatherService.generateSkiAdvice(weather, isBeginnerMode);
      setAdvice(skiAdvice);
    } finally {
      setIsLoading(false);
    }
  };

  const getAdviceLevelStyle = (level: SkiAdvice['level']) => {
    switch (level) {
      case 'excellent':
        return 'bg-emerald-500 text-white';
      case 'good':
        return 'bg-blue-500 text-white';
      case 'caution':
        return 'bg-amber-500 text-white';
      case 'warning':
        return 'bg-red-500 text-white';
    }
  };

  const getAdviceLevelIcon = (level: SkiAdvice['level']) => {
    switch (level) {
      case 'excellent':
        return '⛷️';
      case 'good':
        return '👍';
      case 'caution':
        return '⚠️';
      case 'warning':
        return '🚫';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-12 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="group text-slate-400 hover:text-blue-600 text-sm flex items-center gap-3 font-black transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:bg-blue-50 group-hover:shadow-blue-100 border border-slate-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
          返回主页
        </button>

        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
          <span className="text-sm font-bold text-slate-500">初学者模式</span>
          <button
            onClick={() => {
              setIsBeginnerMode(!isBeginnerMode);
              setTimeout(refreshAdvice, 100);
            }}
            className={`relative w-12 h-6 rounded-full transition-colors ${isBeginnerMode ? 'bg-blue-600' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isBeginnerMode ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </div>

      {/* Page Title */}
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">雪场天气中心</h2>
        <p className="text-slate-500 font-medium">实时天气数据 + AI智能滑雪建议</p>
      </div>

      {/* Resort Selector */}
      <div className="bg-white rounded-[32px] p-6 shadow-lg border border-slate-100">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">选择雪场</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {POPULAR_SKI_RESORTS.map((resort) => (
            <button
              key={resort.id}
              onClick={() => setSelectedResort(resort)}
              className={`p-4 rounded-2xl text-left transition-all ${
                selectedResort.id === resort.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="text-sm font-black truncate">{resort.name.replace('北京', '').replace('滑雪场', '')}</div>
              <div className={`text-xs mt-1 ${selectedResort.id === resort.id ? 'text-blue-100' : 'text-slate-400'}`}>
                {resort.adname}
              </div>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-yellow-400">★</span>
                <span className={`text-xs font-bold ${selectedResort.id === resort.id ? 'text-white' : 'text-slate-500'}`}>
                  {resort.rating}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weather Card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            {/* Resort Info */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider">
                    实时天气
                  </span>
                </div>
                <h3 className="text-3xl font-black tracking-tight">{selectedResort.name}</h3>
                <p className="text-slate-400 text-sm mt-1">{selectedResort.cityname} · {selectedResort.adname}</p>
              </div>
              {weather && (
                <div className="text-right">
                  <div className="text-6xl">{weatherService.getWeatherIcon(weather.icon)}</div>
                  <p className="text-slate-400 text-sm mt-2">{weather.conditions}</p>
                </div>
              )}
            </div>

            {error ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="text-red-400 text-lg font-bold">⚠️ {error}</div>
                <button
                  onClick={() => loadWeatherData(selectedResort)}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors"
                >
                  重试
                </button>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            ) : weather ? (
              <>
                {/* Main Temperature */}
                <div className="flex items-end gap-4 mb-8">
                  <div className="text-8xl font-black leading-none">{weather.temp}°</div>
                  <div className="pb-2">
                    <p className="text-slate-400 text-sm">体感温度</p>
                    <p className="text-2xl font-bold">{weather.feelslike}°C</p>
                  </div>
                </div>

                {/* Weather Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-2xl p-4 backdrop-blur">
                    <p className="text-slate-400 text-xs mb-1">风速</p>
                    <p className="text-xl font-bold">{weather.windspeed} km/h</p>
                    <p className="text-slate-500 text-xs">{weatherService.getWindDirection(weather.winddir)}</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 backdrop-blur">
                    <p className="text-slate-400 text-xs mb-1">湿度</p>
                    <p className="text-xl font-bold">{weather.humidity}%</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 backdrop-blur">
                    <p className="text-slate-400 text-xs mb-1">积雪深度</p>
                    <p className="text-xl font-bold">{weather.snowdepth} cm</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 backdrop-blur">
                    <p className="text-slate-400 text-xs mb-1">能见度</p>
                    <p className="text-xl font-bold">{weather.visibility} km</p>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="px-4 py-2 bg-white/5 rounded-full text-sm">
                    日出 {weather.sunrise}
                  </span>
                  <span className="px-4 py-2 bg-white/5 rounded-full text-sm">
                    日落 {weather.sunset}
                  </span>
                  <span className="px-4 py-2 bg-white/5 rounded-full text-sm">
                    UV指数 {weather.uvindex}
                  </span>
                  <span className="px-4 py-2 bg-white/5 rounded-full text-sm">
                    最高/最低 {weather.tempmax}°/{weather.tempmin}°
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* AI Advice Card */}
        <div className="bg-white rounded-[40px] p-8 shadow-lg border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">AI 滑雪建议</h3>
              <p className="text-xs text-slate-400">基于实时天气生成</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : advice ? (
            <div className="space-y-6">
              {/* Level Badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getAdviceLevelStyle(advice.level)}`}>
                <span className="text-lg">{getAdviceLevelIcon(advice.level)}</span>
                <span className="font-bold text-sm">{advice.title}</span>
              </div>

              {/* Suggestions */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">滑雪建议</h4>
                {advice.suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </span>
                    <p className="text-sm text-slate-700 font-medium">{suggestion}</p>
                  </div>
                ))}
              </div>

              {/* Beginner Tips */}
              {advice.beginnerTips && advice.beginnerTips.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-black text-amber-500 uppercase tracking-wider flex items-center gap-2">
                    <span>🎿</span> 初学者专属提示
                  </h4>
                  {advice.beginnerTips.map((tip, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <span className="text-amber-500">💡</span>
                      <p className="text-sm text-amber-800 font-medium">{tip}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Refresh Button */}
              <button
                onClick={refreshAdvice}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                重新生成建议
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Resort Contact Info */}
      <div className="bg-white rounded-[32px] p-6 shadow-lg border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {selectedResort.photoUrl && (
              <img
                src={selectedResort.photoUrl}
                alt={selectedResort.name}
                className="w-20 h-20 rounded-2xl object-cover"
              />
            )}
            <div>
              <h4 className="font-black text-slate-900">{selectedResort.name}</h4>
              <p className="text-sm text-slate-500 mt-1">{selectedResort.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedResort.tel && (
              <a
                href={`tel:${selectedResort.tel}`}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                联系雪场
              </a>
            )}
            <button className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              导航前往
            </button>
          </div>
        </div>
      </div>

      {/* Data Source Notice */}
      <div className="text-center text-xs text-slate-400">
        <p>天气数据来源: Visual Crossing Weather API (via qveris)</p>
        <p className="mt-1">雪场信息来源: 高德地图 POI 服务 (via qveris)</p>
      </div>
    </div>
  );
};

export default WeatherPage;
