/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  ChevronRight, 
  Mic, 
  Users, 
  Star, 
  CheckCircle2, 
  XCircle, 
  MessageSquare,
  Trophy,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Languages,
  Loader2,
  Headphones
} from 'lucide-react';

// --- Types ---
type Step = 'home' | 'training' | 'simulation' | 'result';

interface SimulationResult {
  score: number;
  transcription: string;
  feedback: string;
}

// --- Constants ---
const HOSTS = [
  { id: 0, name: 'Lily', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lily' },
  { id: 1, name: 'Sarah', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
  { id: 2, name: 'Mia', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia' },
];

const SIMULATION_EVENTS = [
  { type: 'system', message: '用户 “Alex” 进入了房间', delay: 1000 },
  { type: 'host', hostId: 0, message: 'Hi Alex, welcome to our room! 欢迎来到我们的房间！', delay: 2000 },
  { type: 'host', hostId: 1, message: 'Welcome Alex! Nice to see you. 很高兴见到你！', delay: 2000 },
  { type: 'host', hostId: 2, message: 'Hello Alex, have a seat! 欢迎欢迎，快请坐！', delay: 2000 },
  { type: 'host', hostId: 0, message: "I'm Lily, I love singing and chatting. 我是 Lily，喜欢唱歌和聊天。", delay: 2500 },
  { type: 'host', hostId: 1, message: "I'm Sarah, I'm a professional gamer. 我是 Sarah，一名职业玩家。", delay: 2500 },
  { type: 'host', hostId: 2, message: "I'm Mia, I'm here to share stories. 我是 Mia，在这里分享故事。", delay: 2500 },
  { type: 'host', hostId: 0, message: "Alex, would you like to join us on the mic? Alex，想上来麦位和我们一起聊聊吗？", delay: 3000 },
];

const TRAINING_CONTENT = {
  title: "Global Room: English Greeting & Guidance",
  description: "针对海外用户，主播需具备基础英语引导能力。核心流程：Welcome -> Self-intro -> Feature Pitch (One Day Girlfriend).",
  videoPlaceholder: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800",
  keyPoints: [
    "Standard Welcome: 'Hi [Name], welcome to my room!'",
    "Feature Intro: 'Have you heard about our \"One Day Girlfriend\"? It's really fun!'",
    "Call to Action: 'You can tap the gift icon to start the experience with me!'"
  ]
};

// Mock AI Analysis Results based on "simulated" performance
const MOCK_RESULTS: SimulationResult[] = [
  {
    score: 88,
    transcription: "Hi there! Welcome to my room. I'm so happy to see you. Would you like to try our One Day Girlfriend experience? It's very popular here!",
    feedback: "Excellent! Your English is clear and the guidance is very natural. You covered all key points."
  },
  {
    score: 62,
    transcription: "Hello. Welcome. One day girlfriend? Please buy.",
    feedback: "The guidance is too direct and the English is a bit broken. Try to be more welcoming and use complete sentences."
  }
];

// --- Components ---

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>('home');
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);

  // Simulation State for Phase 1
  const [simEventIndex, setSimEventIndex] = useState(-1);
  const [activeHostId, setActiveHostId] = useState<number | null>(null);
  const [currentBubble, setCurrentBubble] = useState<string | null>(null);
  const [systemMsg, setSystemMsg] = useState<string | null>(null);
  const [simFinished, setSimFinished] = useState(false);

  // Helper to speak text
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    // Extract English part (usually before the first Chinese character or the whole thing)
    // For this demo, we'll just speak the whole text but try to use an English voice
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find an English voice
    let voices = window.speechSynthesis.getVoices();
    
    // Some browsers need a moment to load voices
    if (voices.length === 0) {
      voices = window.speechSynthesis.getVoices();
    }
    
    // If voices are not loaded yet, we might need to wait or just use default
    // But usually by the time the user clicks, they are loaded.
    const findVoice = () => {
      const femaleKeywords = ['female', 'woman', 'samantha', 'victoria', 'moira', 'tessa', 'aria', 'zira', 'google us english'];
      const englishVoices = voices.filter(v => v.lang.startsWith('en'));
      
      // Try to find an English female voice first
      const femaleVoice = englishVoices.find(v => 
        femaleKeywords.some(key => v.name.toLowerCase().includes(key))
      );
      
      if (femaleVoice) return femaleVoice;
      
      // Fallback to any US English voice
      return englishVoices.find(v => v.lang.includes('en-US')) || 
             englishVoices[0] || 
             voices[0];
    };

    const englishVoice = findVoice();
    if (englishVoice) utterance.voice = englishVoice;
    utterance.lang = 'en-US'; // Hint for the engine
    
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.1; // Slightly higher for "anchor" vibe
    
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (currentStep === 'training' && simEventIndex < SIMULATION_EVENTS.length) {
      const event = SIMULATION_EVENTS[simEventIndex];
      if (!event) {
        // Start first event
        const timer = setTimeout(() => setSimEventIndex(0), 1000);
        return () => clearTimeout(timer);
      }

      const timer = setTimeout(() => {
        if (event.type === 'system') {
          setSystemMsg(event.message);
          setActiveHostId(null);
          setCurrentBubble(null);
        } else if (event.type === 'host') {
          setActiveHostId(event.hostId);
          setCurrentBubble(event.message);
          setSystemMsg(null);
          speakText(event.message);
        }
        
        if (simEventIndex === SIMULATION_EVENTS.length - 1) {
          setSimFinished(true);
        } else {
          setSimEventIndex(prev => prev + 1);
        }
      }, event.delay);

      return () => clearTimeout(timer);
    }
  }, [currentStep, simEventIndex]);

  const handleStart = () => {
    setSimEventIndex(-1);
    setSimFinished(false);
    setSystemMsg(null);
    setCurrentBubble(null);
    setActiveHostId(null);
    setCurrentStep('training');
  };
  const handleToSimulation = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setCurrentStep('simulation');
  };

  const startRecording = () => {
    setIsRecording(true);
    // Simulate recording for 3 seconds then auto-stop for demo purposes
    recordingTimer.current = setTimeout(() => {
      stopRecording();
    }, 4000);
  };

  const stopRecording = () => {
    if (recordingTimer.current) clearTimeout(recordingTimer.current);
    setIsRecording(false);
    setIsAnalyzing(true);

    // Simulate AI Analysis delay
    setTimeout(() => {
      const randomResult = MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)];
      setResult(randomResult);
      setIsAnalyzing(false);
      setCurrentStep('result');
    }, 2000);
  };

  const handleRestart = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setResult(null);
    setCurrentStep('home');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center items-start sm:items-center p-0 sm:p-4 font-sans text-slate-900">
      {/* Mobile Container */}
      <div className="w-full max-w-[430px] h-screen sm:h-[844px] bg-white shadow-2xl relative overflow-hidden flex flex-col sm:rounded-[40px] border-slate-200 sm:border-8">
        
        {/* Status Bar Mock */}
        <div className="h-10 flex justify-between items-center px-8 pt-4 shrink-0">
          <span className="text-sm font-semibold">9:41</span>
          <div className="flex gap-1.5">
            <div className="w-4 h-4 rounded-full border border-slate-300" />
            <div className="w-4 h-4 rounded-full border border-slate-300" />
            <div className="w-6 h-3 rounded-sm border border-slate-300" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {currentStep === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center h-full text-center"
              >
                <div className="w-24 h-24 bg-indigo-100 rounded-3xl flex items-center justify-center mb-8">
                  <Headphones className="w-12 h-12 text-indigo-600" />
                </div>
                <h1 className="text-3xl font-black mb-3 tracking-tight text-indigo-950">PurPur HostLab</h1>
                <p className="text-slate-500 mb-12 leading-relaxed">
                  本系统将考核您的英语口语引导能力。<br />
                  请完成培训并进行语音实战模拟。
                </p>
                <button 
                  onClick={handleStart}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
                >
                  开始学习 <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {currentStep === 'training' && (
              <motion.div 
                key="training"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-indigo-600 font-medium">
                    <BookOpen className="w-5 h-5" />
                    <span>第一阶段：实况模拟演示</span>
                  </div>
                  <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Live Demo
                  </div>
                </div>
                
                {/* Voice Room Simulation UI */}
                <div className="flex-1 bg-slate-900 rounded-3xl p-6 relative overflow-hidden flex flex-col items-center">
                  {/* Background Decoration */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-500 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-500 rounded-full blur-[100px]" />
                  </div>

                  {/* Room Title */}
                  <div className="relative z-10 w-full flex justify-between items-center mb-8">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-white text-xs font-bold">Global Welcome Party</p>
                        <p className="text-white/40 text-[10px]">ID: 888888</p>
                      </div>
                    </div>
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full border border-slate-900 bg-slate-800" />
                      ))}
                    </div>
                  </div>

                  {/* Mic Seats Grid */}
                  <div className="relative z-10 grid grid-cols-4 gap-x-4 gap-y-8 w-full mt-4">
                    {/* Host Seats */}
                    {HOSTS.map((host) => (
                      <div key={host.id} className="flex flex-col items-center gap-2 relative">
                        <div className={`relative w-14 h-14 rounded-full p-0.5 transition-all duration-300 ${activeHostId === host.id ? 'ring-4 ring-indigo-500 ring-offset-2 ring-offset-slate-900 scale-110' : 'ring-2 ring-white/20'}`}>
                          <img 
                            src={host.avatar} 
                            alt={host.name} 
                            className="w-full h-full rounded-full bg-slate-800"
                            referrerPolicy="no-referrer"
                          />
                          {activeHostId === host.id && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -bottom-1 -right-1 bg-indigo-500 rounded-full p-1"
                            >
                              <Mic className="w-3 h-3 text-white" />
                            </motion.div>
                          )}
                        </div>
                        <span className="text-[10px] text-white/60 font-medium">{host.name}</span>

                        {/* Speech Bubble */}
                        <AnimatePresence>
                          {activeHostId === host.id && currentBubble && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.8 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className={`absolute bottom-full mb-4 w-48 z-20 ${
                                host.id % 4 === 0 ? 'left-0' : 
                                host.id % 4 === 3 ? 'right-0' : 
                                'left-1/2 -translate-x-1/2'
                              }`}
                            >
                              <div className="bg-white rounded-2xl p-3 shadow-xl relative">
                                <p className="text-[11px] leading-relaxed font-medium text-slate-800">
                                  {currentBubble}
                                </p>
                                {/* Triangle */}
                                <div className={`absolute top-full w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white ${
                                  host.id % 4 === 0 ? 'left-6' : 
                                  host.id % 4 === 3 ? 'right-6' : 
                                  'left-1/2 -translate-x-1/2'
                                }`} />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}

                    {/* Empty Seats */}
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <div className="w-14 h-14 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-white/5" />
                        </div>
                        <span className="text-[10px] text-white/20">空位</span>
                      </div>
                    ))}
                  </div>

                  {/* System Notifications */}
                  <div className="absolute bottom-8 left-6 right-6 space-y-2 pointer-events-none">
                    <AnimatePresence>
                      {systemMsg && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-2 rounded-xl inline-flex items-center gap-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                          <span className="text-[11px] text-white/80 font-medium">{systemMsg}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="bg-indigo-50 p-4 rounded-2xl">
                    <h3 className="text-sm font-bold text-indigo-900 mb-2">学习重点：</h3>
                    <ul className="text-xs text-indigo-800 space-y-1.5 list-disc list-inside">
                      <li>及时欢迎新进入房间的用户</li>
                      <li>自我介绍要清晰、有亲和力</li>
                      <li>主动邀请用户参与互动（上麦）</li>
                    </ul>
                  </div>

                  {simFinished ? (
                    <button 
                      onClick={handleToSimulation}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
                    >
                      我已学会，开始考核 <ArrowRight className="w-5 h-5" />
                    </button>
                  ) : (
                    <div className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-semibold flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> 演示进行中...
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {currentStep === 'simulation' && (
              <motion.div 
                key="simulation"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-rose-500 font-medium">
                    <Mic className="w-5 h-5" />
                    <span>第二阶段：口语实战考核</span>
                  </div>
                  <div className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Live Exam
                  </div>
                </div>

                {/* Voice Room UI */}
                <div className="flex-1 bg-slate-900 rounded-3xl p-6 relative overflow-hidden flex flex-col items-center">
                  {/* Background Decoration */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-rose-500 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-500 rounded-full blur-[100px]" />
                  </div>

                  {/* Room Title */}
                  <div className="relative z-10 w-full flex justify-between items-center mb-8">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-white text-xs font-bold">Global Welcome Party</p>
                        <p className="text-white/40 text-[10px]">ID: 888888</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 px-2 py-1 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-[10px] text-white font-bold">REC</span>
                    </div>
                  </div>

                  {/* Mic Seats Grid */}
                  <div className="relative z-10 grid grid-cols-4 gap-x-4 gap-y-8 w-full mt-4">
                    {/* User Seat (Main Host) */}
                    <div className="flex flex-col items-center gap-2 relative">
                      <div className={`relative w-14 h-14 rounded-full p-0.5 transition-all duration-300 ${isRecording ? 'ring-4 ring-rose-500 ring-offset-2 ring-offset-slate-900 scale-110' : 'ring-2 ring-indigo-500'}`}>
                        <img 
                          src="https://api.dicebear.com/7.x/avataaars/svg?seed=User" 
                          alt="Me" 
                          className="w-full h-full rounded-full bg-slate-800"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-indigo-500 rounded-full p-1 border border-slate-900">
                          <Star className="w-2.5 h-2.5 text-white fill-white" />
                        </div>
                        {isRecording && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -bottom-1 -left-1 bg-rose-500 rounded-full p-1"
                          >
                            <Mic className="w-3 h-3 text-white" />
                          </motion.div>
                        )}
                      </div>
                      <span className="text-[10px] text-indigo-400 font-bold">我 (Me)</span>

                      {/* User Speech Bubble */}
                      <AnimatePresence>
                        {isRecording && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute bottom-full mb-4 left-0 w-48 z-20"
                          >
                            <div className="bg-white rounded-2xl p-3 shadow-xl relative">
                              <div className="flex gap-1 mb-1">
                                {[...Array(3)].map((_, i) => (
                                  <motion.div
                                    key={i}
                                    animate={{ height: [4, 12, 6] }}
                                    transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                                    className="w-1 bg-rose-500 rounded-full"
                                  />
                                ))}
                              </div>
                              <p className="text-[11px] leading-relaxed font-medium text-slate-800 italic">
                                Speaking... 请开始你的自我介绍
                              </p>
                              <div className="absolute top-full left-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white" />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* NPC Host Seats */}
                    {HOSTS.map((host) => (
                      <div key={host.id} className="flex flex-col items-center gap-2">
                        <div className="relative w-14 h-14 rounded-full p-0.5 ring-2 ring-white/10">
                          <img 
                            src={host.avatar} 
                            alt={host.name} 
                            className="w-full h-full rounded-full bg-slate-800 opacity-60"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <span className="text-[10px] text-white/40 font-medium">{host.name}</span>
                      </div>
                    ))}

                    {/* Empty Seats */}
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <div className="w-14 h-14 rounded-full border-2 border-dashed border-white/5 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-white/5" />
                        </div>
                        <span className="text-[10px] text-white/10">空位</span>
                      </div>
                    ))}
                  </div>

                  {/* System Notifications & Task */}
                  <div className="absolute bottom-8 left-6 right-6 space-y-3">
                    <div className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-2 rounded-xl inline-flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                      <span className="text-[11px] text-white/80 font-medium">用户 “Alex” 进入了房间</span>
                    </div>
                    
                    <div className="bg-indigo-600/90 backdrop-blur-sm p-4 rounded-2xl border border-indigo-400/30 shadow-2xl">
                      <p className="text-white text-xs font-bold mb-1">当前任务：</p>
                      <p className="text-indigo-100 text-[11px] leading-relaxed">
                        1. 欢迎 Alex 进入房间<br />
                        2. 邀请 Alex 上麦互动<br />
                        3. 进行一段简短的自我介绍
                      </p>
                    </div>
                  </div>

                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-30">
                      <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
                      <p className="text-white font-medium">AI 语音分析中...</p>
                      <p className="text-slate-400 text-xs mt-2 italic">Analyzing your English speech...</p>
                    </div>
                  )}
                </div>

                {/* Voice Input Interaction */}
                <div className="mt-6 flex flex-col items-center gap-4">
                  {isRecording ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex gap-1.5 h-6 items-end">
                        {[...Array(12)].map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{ height: [4, 20, 8, 24, 4] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.05 }}
                            className="w-1.5 bg-rose-500 rounded-full"
                          />
                        ))}
                      </div>
                      <button
                        onMouseUp={stopRecording}
                        onTouchEnd={stopRecording}
                        className="w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center shadow-xl shadow-rose-200 active:scale-90 transition-transform"
                      >
                        <div className="w-6 h-6 bg-white rounded-sm" />
                      </button>
                      <p className="text-rose-500 text-xs font-bold animate-pulse">松开结束录音</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <button
                        onMouseDown={startRecording}
                        onTouchStart={startRecording}
                        className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-xl shadow-indigo-200 active:scale-95 transition-transform"
                      >
                        <Mic className="w-8 h-8 text-white" />
                      </button>
                      <p className="text-slate-500 text-xs font-medium">长按发语音 (说英语)</p>
                      <p className="text-slate-400 text-[9px]">Hold to speak English</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {currentStep === 'result' && result && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center h-full py-8"
              >
                <div className="mb-8 text-center">
                  <div className="relative inline-block mb-4">
                    {result.score >= 80 ? (
                      <CheckCircle2 className="w-20 h-20 text-emerald-500" />
                    ) : (
                      <XCircle className="w-20 h-20 text-rose-500" />
                    )}
                  </div>
                  <h2 className="text-2xl font-bold">
                    {result.score >= 80 ? '英语考核通过' : '英语考核未通过'}
                  </h2>
                </div>

                {/* Score Card */}
                <div className="w-full bg-slate-50 rounded-3xl p-6 mb-6 space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-slate-400 text-xs mb-1">口语评分 Score</p>
                      <p className="text-5xl font-black text-indigo-600">{result.score}</p>
                    </div>
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${i <= Math.round(result.score/20) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} 
                        />
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-slate-200" />

                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">Transcription (AI 识别内容)</p>
                      <p className="text-sm text-slate-700 font-mono leading-relaxed italic">
                        "{result.transcription}"
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 mb-1">AI 评价 Feedback</p>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {result.feedback}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full mt-auto space-y-3">
                  {result.score < 80 ? (
                    <button 
                      onClick={handleRestart}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
                    >
                      <RotateCcw className="w-5 h-5" /> 重新测试 Retry
                    </button>
                  ) : (
                    <button 
                      onClick={() => alert('Congratulations! You passed the English assessment.')}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
                    >
                      完成培训 Finish
                    </button>
                  )}
                  <button 
                    onClick={handleRestart}
                    className="w-full py-4 bg-white text-slate-500 rounded-2xl font-semibold border border-slate-200 active:scale-95 transition-transform"
                  >
                    返回首页 Home
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Home Indicator Mock */}
        <div className="h-8 flex justify-center items-center shrink-0">
          <div className="w-32 h-1.5 bg-slate-200 rounded-full" />
        </div>
      </div>
    </div>
  );
}
