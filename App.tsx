
import React, { useState, useRef, useMemo, useEffect } from 'react';
import Layout from './components/Layout';
import WeatherPage from './components/WeatherPage';
import { SkiGoal, SkillLevel, Feedback, GoalCategory, Discipline } from './types';
import { SKI_GOALS } from './constants';
import { skiProService } from './services/geminiService';

type AppStep = 'GOAL' | 'UPLOAD' | 'ANALYZING' | 'RESULT' | 'CHAT' | 'WEATHER';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('GOAL');
  const [discipline, setDiscipline] = useState<Discipline>('SKI');
  const [selectedGoal, setSelectedGoal] = useState<SkiGoal>(SKI_GOALS[0]);
  const [userContext, setUserContext] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyframes, setKeyframes] = useState<string[]>([]);
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'coach', text: string}[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredGroupedGoals = useMemo(() => {
    const disciplineGoals = SKI_GOALS.filter(g => g.discipline === discipline);
    return disciplineGoals.reduce((acc, goal) => {
      if (!acc[goal.category]) acc[goal.category] = [];
      acc[goal.category].push(goal);
      return acc;
    }, {} as Record<GoalCategory, SkiGoal[]>);
  }, [discipline]);

  useEffect(() => {
    const firstInDiscipline = SKI_GOALS.find(g => g.discipline === discipline);
    if (firstInDiscipline) setSelectedGoal(firstInDiscipline);
  }, [discipline]);

  // 自动滚动聊天到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 30 * 1024 * 1024) {
        setError("视频需小于 30MB。");
        return;
      }
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
      setStep('UPLOAD');
      extractKeyframes(url);
    }
  };

  const extractKeyframes = (url: string) => {
    const video = document.createElement('video');
    video.src = url;
    video.crossOrigin = 'anonymous';
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const frames: string[] = [];
      const times = [video.duration * 0.2, video.duration * 0.5, video.duration * 0.8];
      
      let count = 0;
      const capture = () => {
        if (count >= times.length) {
          setKeyframes(frames);
          return;
        }
        video.currentTime = times[count];
        video.onseeked = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx?.drawImage(video, 0, 0);
          frames.push(canvas.toDataURL('image/jpeg', 0.7));
          count++;
          capture();
        };
      };
      capture();
    };
  };

  const startAnalysis = async () => {
    if (!fileInputRef.current?.files?.[0]) return;
    setStep('ANALYZING');
    setIsAnalyzing(true);

    try {
      const file = fileInputRef.current.files[0];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const disciplineName = discipline === 'SKI' ? '双板' : '单板';
        const analysis = await skiProService.analyzeVideo(
          base64, 
          file.type, 
          `${disciplineName} - ${selectedGoal.title}`, 
          userContext
        );

        setFeedback({
          id: Date.now().toString(),
          timestamp: Date.now(),
          goalId: selectedGoal.id,
          analysis,
          rating: 8.5,
          keyCorrections: []
        });

        try {
          const audio = await skiProService.generateSpeech(analysis.substring(0, 300));
          setAudioBase64(audio);
        } catch (e) { console.error("TTS Failed", e); }

        setStep('RESULT');
      };
    } catch (err: any) {
      setError(err.message);
      setStep('UPLOAD');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const playAudio = () => {
    if (!audioBase64) return;
    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    audio.play();
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    
    try {
      const coachMsg = await skiProService.askFollowUp(chatHistory, userMsg);
      setChatHistory(prev => [...prev, { role: 'coach', text: coachMsg }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'coach', text: '抱歉，教练刚才走神了，请再说一遍。' }]);
    }
  };

  return (
    <Layout>
      {/* 进度条指示器 - 仅在非对话模式和非天气页面显示 */}
      {step !== 'CHAT' && step !== 'WEATHER' && (
        <div className="mb-12 flex justify-between items-center max-w-3xl mx-auto px-4">
          {['选择项目', '上传素材', '深度分析', '教练报告'].map((s, i) => {
            const stepOrder = ['GOAL', 'UPLOAD', 'ANALYZING', 'RESULT'];
            const activeIndex = stepOrder.indexOf(step);
            return (
              <div key={s} className="flex flex-col items-center gap-3 relative flex-1">
                {i > 0 && (
                  <div className={`absolute left-[-50%] top-5 w-full h-[2px] -z-10 ${i <= activeIndex ? 'bg-blue-600' : 'bg-slate-200'}`} />
                )}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all duration-500 ${
                  i <= activeIndex ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 ring-4 ring-white' : 'bg-white text-slate-400 border-2 border-slate-100'
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs font-black tracking-tight ${i <= activeIndex ? 'text-blue-600' : 'text-slate-400'}`}>{s}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="transition-all duration-500">
        {/* Step 1: GOAL */}
        {step === 'GOAL' && (
          <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-700">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-8">
              <div className="max-w-xl">
                <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">开启您的进阶之旅</h2>
                <p className="text-slate-500 text-lg font-medium">请选择当前的滑行形式与训练目标</p>
              </div>

              <div className="flex items-center gap-4">
                {/* Weather Button */}
                <button
                  onClick={() => setStep('WEATHER')}
                  className="px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-sm shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  雪场天气
                </button>

                <div className="flex bg-slate-100 p-2 rounded-2xl shadow-inner">
                  <button
                    onClick={() => setDiscipline('SKI')}
                    className={`px-12 py-4 rounded-xl text-base font-black transition-all ${discipline === 'SKI' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    双板 (Ski)
                  </button>
                  <button
                    onClick={() => setDiscipline('SNOWBOARD')}
                    className={`px-12 py-4 rounded-xl text-base font-black transition-all ${discipline === 'SNOWBOARD' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    单板 (Snowboard)
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
              {(Object.keys(filteredGroupedGoals) as GoalCategory[]).map(cat => (
                <div key={cat} className="space-y-8">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">{cat}</h3>
                  </div>
                  <div className="space-y-4">
                    {filteredGroupedGoals[cat].map(goal => (
                      <button
                        key={goal.id}
                        onClick={() => { setSelectedGoal(goal); setStep('UPLOAD'); }}
                        className="w-full text-left p-8 rounded-3xl border-2 border-slate-50 bg-slate-50/30 hover:bg-white hover:border-blue-500 hover:shadow-2xl hover:-translate-y-1 transition-all group"
                      >
                        <p className="font-black text-slate-900 group-hover:text-blue-600 text-xl leading-tight">{goal.title}</p>
                        <p className="text-sm text-slate-500 mt-3 leading-relaxed font-medium line-clamp-2">{goal.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: UPLOAD */}
        {step === 'UPLOAD' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-12 duration-500">
            <button onClick={() => setStep('GOAL')} className="group text-slate-400 hover:text-blue-600 text-sm flex items-center gap-3 font-black transition-all">
              <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:bg-blue-50 group-hover:shadow-blue-100 border border-slate-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              </div>
              返回重新选择
            </button>
            <div className="bg-white p-10 md:p-16 rounded-[48px] shadow-2xl border border-slate-100">
              <div className="mb-10 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                  {discipline === 'SKI' ? '双板' : '单板'} · {selectedGoal.category}
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">{selectedGoal.title}</h2>
              </div>
              
              {!videoPreview ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video border-4 border-dashed border-slate-100 rounded-[48px] flex flex-col items-center justify-center p-16 hover:bg-slate-50 hover:border-blue-300 cursor-pointer transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-24 h-24 bg-blue-50 rounded-[32px] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-blue-100 group-hover:rotate-6 transition-all shadow-xl shadow-blue-500/5">
                    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  </div>
                  <p className="text-slate-900 font-black text-2xl tracking-tight">点击或拖拽上传视频</p>
                  <p className="text-slate-400 text-base mt-3 font-medium">支持 MP4, MOV, AVI (最大 30MB)</p>
                </div>
              ) : (
                <div className="space-y-10">
                  <div className="aspect-video rounded-[48px] overflow-hidden bg-black shadow-2xl relative border-[12px] border-slate-50 ring-1 ring-slate-100">
                    <video src={videoPreview} className="w-full h-full object-contain" controls />
                  </div>
                  <div className="space-y-4">
                    <label className="text-base font-black text-slate-800 ml-2">告诉教练您的困惑：</label>
                    <textarea 
                      placeholder="例：我在换刃时总觉得重心不稳，或者是入弯太迟了..."
                      className="w-full p-8 rounded-[32px] bg-slate-50 border-2 border-slate-50 focus:border-blue-500 focus:bg-white focus:ring-8 focus:ring-blue-50 outline-none transition-all text-lg font-medium min-h-[160px] resize-none shadow-inner"
                      value={userContext}
                      onChange={(e) => setUserContext(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={startAnalysis}
                    className="w-full py-8 bg-slate-900 hover:bg-blue-600 text-white rounded-[32px] font-black text-2xl shadow-2xl shadow-blue-100 transition-all flex items-center justify-center gap-5 active:scale-[0.97]"
                  >
                    开始 AI 专家诊断
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </button>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleVideoUpload} accept="video/*" className="hidden" />
            </div>
          </div>
        )}

        {/* Step 3: ANALYZING */}
        {step === 'ANALYZING' && (
          <div className="max-w-2xl mx-auto py-32 text-center space-y-16">
            <div className="relative inline-block">
               <div className="w-56 h-56 border-[10px] border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 bg-blue-600 rounded-[28px] flex items-center justify-center shadow-2xl animate-pulse rotate-3">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </div>
               </div>
            </div>
            <div className="space-y-6">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">正在进行多模态动作诊断</h2>
              <p className="text-slate-400 font-bold text-xl">基于全球顶尖滑雪知识库对比中...</p>
              <div className="flex justify-center gap-4 flex-wrap">
                {['关节角度提取', '压力曲线重构', '板刃咬合诊断'].map(t => (
                  <span key={t} className="px-5 py-2 bg-white text-blue-600 text-xs font-black rounded-2xl shadow-sm border border-slate-100 uppercase animate-bounce">{t}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: RESULT */}
        {step === 'RESULT' && feedback && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 pb-32 max-w-7xl mx-auto">
            <div className="bg-slate-900 text-white rounded-[64px] overflow-hidden shadow-2xl border border-white/5 relative">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                 <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              
              <div className="p-10 md:p-20 relative z-10">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-12 mb-20 pb-16 border-b border-white/10">
                  <div className="flex items-center gap-8">
                    <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-blue-700 rounded-[36px] flex items-center justify-center rotate-6 shadow-3xl shadow-blue-500/20">
                      <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-5xl font-black tracking-tighter italic uppercase">SkiPro Analysis</h3>
                      <p className="text-blue-400 font-black text-xl tracking-[0.3em] uppercase mt-3">{discipline === 'SKI' ? '双板' : '单板'} · {selectedGoal.title}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-12 bg-white/5 p-6 rounded-[32px] border border-white/10 shadow-2xl">
                    {audioBase64 && (
                      <button 
                        onClick={playAudio}
                        className="flex items-center gap-5 px-10 py-6 bg-white text-slate-900 hover:bg-blue-50 rounded-[24px] transition-all shadow-2xl active:scale-95 group"
                      >
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-200">
                          <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/></svg>
                        </div>
                        <span className="text-lg font-black tracking-tight">听取语音反馈</span>
                      </button>
                    )}
                    <div className="text-center px-6">
                      <span className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 leading-none">{feedback.rating.toFixed(1)}</span>
                      <p className="text-[14px] text-slate-500 uppercase font-black tracking-[0.5em] mt-3">Overall Score</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-24">
                  <div className="lg:col-span-7 prose prose-invert max-w-none 
                    prose-h3:text-blue-400 prose-h3:font-black prose-h3:text-2xl prose-h3:mb-8 prose-h3:mt-12 prose-h3:border-l-8 prose-h3:border-blue-600 prose-h3:pl-6 prose-h3:tracking-tight
                    prose-p:text-slate-300 prose-p:font-medium prose-p:text-xl prose-p:leading-relaxed
                    prose-li:text-slate-300 prose-li:font-medium prose-li:text-lg">
                     <div className="whitespace-pre-wrap">
                        {feedback.analysis.split('\n').map((line, i) => {
                          if (line.startsWith('### ')) {
                            return <h3 key={i}>{line.replace('### ', '')}</h3>;
                          }
                          return <p key={i}>{line}</p>;
                        })}
                     </div>
                  </div>
                  
                  <div className="lg:col-span-5 space-y-12">
                    <div className="flex items-center justify-between border-b border-white/10 pb-6">
                       <h4 className="text-base font-black text-blue-400 uppercase tracking-[0.3em]">肢体标注诊断报告</h4>
                       <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded font-black">AI 关注点</span>
                    </div>
                    <div className="grid grid-cols-1 gap-12">
                      {keyframes.map((frame, idx) => (
                        <div key={idx} className="relative group rounded-[48px] overflow-hidden border-2 border-slate-800 bg-slate-800 shadow-3xl">
                          <img src={frame} className="w-full grayscale-[0.1] group-hover:grayscale-0 transition-all duration-1000 scale-[1.01]" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent opacity-80"></div>
                          
                          {idx === 0 && <div className="absolute top-[35%] left-[45%] w-16 h-16 border-[6px] border-red-500 rounded-full animate-pulse shadow-[0_0_40px_rgba(239,68,68,0.8)]"></div>}
                          {idx === 1 && <div className="absolute bottom-[35%] left-[30%] w-24 h-12 border-[6px] border-red-500 rounded-full -rotate-12 animate-pulse shadow-[0_0_40px_rgba(239,68,68,0.8)]"></div>}
                          {idx === 2 && <div className="absolute top-[20%] right-[30%] w-14 h-14 border-[6px] border-red-500 rounded-full animate-pulse shadow-[0_0_40px_rgba(239,68,68,0.8)]"></div>}

                          <div className="absolute bottom-10 left-10 flex items-center gap-4">
                            <span className="px-5 py-3 bg-red-600 text-white text-sm font-black rounded-2xl shadow-2xl uppercase tracking-tighter ring-4 ring-red-600/20">
                              关键帧 {idx + 1}: {idx === 0 ? '重心检测' : idx === 1 ? '压刃诊断' : '视线捕捉'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat CTA - 进入全屏对话 */}
              <div 
                onClick={() => setStep('CHAT')}
                className="group bg-gradient-to-r from-blue-600 to-indigo-700 p-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 cursor-pointer hover:from-blue-500 hover:to-indigo-600 transition-all"
              >
                <div className="flex items-center gap-8">
                  <div className="w-20 h-20 bg-white/10 rounded-[28px] flex items-center justify-center border border-white/20 backdrop-blur-md group-hover:scale-110 transition-transform">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-4xl font-black text-white tracking-tight">教练深度咨询</h3>
                    <p className="text-lg text-blue-100 font-bold uppercase tracking-[0.2em] mt-2">点击进入全屏对话，详解诊断细节</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 px-10 py-5 bg-white text-blue-600 rounded-3xl font-black text-xl shadow-2xl group-hover:translate-x-2 transition-transform">
                  立即咨询
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-12">
              <button 
                onClick={() => { setStep('GOAL'); setFeedback(null); setVideoPreview(null); setChatHistory([]); }}
                className="px-20 py-8 border-4 border-slate-200 text-slate-500 rounded-[36px] font-black text-xl hover:border-blue-600 hover:text-blue-600 transition-all flex items-center gap-5 bg-white shadow-xl hover:shadow-blue-50 shadow-slate-200/50"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                开启下一项专项训练
              </button>
            </div>
          </div>
        )}

        {/* Step 5: CHAT (Full Screen Chat Page) */}
        {step === 'CHAT' && (
          <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col animate-in fade-in slide-in-from-right-20 duration-500">
            {/* Chat Header */}
            <div className="bg-slate-800 border-b border-white/10 p-6 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setStep('RESULT')}
                  className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">AI 专家深度对话</h2>
                    <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mt-1">
                      针对项目：{selectedGoal.title}
                    </p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => { setStep('GOAL'); setChatHistory([]); setFeedback(null); }}
                className="px-6 py-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl font-bold text-sm transition-all"
              >
                结束训练
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 to-slate-950">
              {chatHistory.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-6">
                  <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center animate-bounce">
                    <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                  </div>
                  <p className="text-2xl font-black text-slate-400 max-w-md">“有什么不懂的？或者想看看某个动作的具体 Drill ？”</p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-6 duration-500`}>
                  <div className={`max-w-[70%] px-10 py-7 rounded-[40px] text-xl font-bold leading-relaxed shadow-2xl relative ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-slate-800 text-slate-100 rounded-tl-none border border-white/10'
                  }`}>
                    {msg.text}
                    <div className={`absolute bottom-[-1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-600 ${msg.role === 'user' ? 'right-4' : 'left-4'}`}>
                      {msg.role === 'user' ? 'You' : 'SkiPro Coach'}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-8 md:p-12 bg-slate-900 border-t border-white/10">
              <div className="max-w-6xl mx-auto relative group">
                <input 
                  type="text" 
                  placeholder="在这里输入您的追问..."
                  className="w-full pl-12 pr-48 py-8 rounded-[40px] bg-slate-800 border-4 border-slate-700 focus:border-blue-600 focus:bg-slate-800 outline-none text-2xl font-bold transition-all text-white placeholder:text-slate-600 shadow-2xl"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim()}
                  className="absolute right-4 top-4 bottom-4 px-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-[32px] font-black text-xl transition-all shadow-xl flex items-center gap-4"
                >
                  发送
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </button>
                <div className="absolute left-6 top-1/2 -translate-y-1/2">
                   <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: WEATHER */}
        {step === 'WEATHER' && (
          <WeatherPage onBack={() => setStep('GOAL')} />
        )}
      </div>
    </Layout>
  );
};

export default App;
