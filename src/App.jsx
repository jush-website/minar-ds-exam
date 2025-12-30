import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, 
  onSnapshot, query, getDocs
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
  User, ShieldCheck, ClipboardList, Settings, LogOut, 
  CheckCircle2, Trash2, Plus, Edit3, Eye, ArrowRight, Code, 
  AlertTriangle, PlayCircle, BookOpen, Layers, X, Check, FileDown, ArrowLeft, Save, InfoIcon, EyeIcon,
  Sigma, Terminal, Square, CheckSquare, Superscript, Subscript, Image as ImageIcon, Loader2,
  SortDesc, SortAsc, Clock
} from 'lucide-react';

// --- Firebase 配置 ---
const myFirebaseConfig = {
  apiKey: "AIzaSyCL6ikY2ZO8JRMqDBguEMa59kX2-is6GpU",
  authDomain: "ds-final-exam.firebaseapp.com",
  projectId: "ds-final-exam",
  storageBucket: "ds-final-exam.firebasestorage.app",
  messagingSenderId: "1090141287700",
  appId: "1:1090141287700:web:07038a72f4a972e4c63e01",
  measurementId: "G-T7K56Q5Z51"
};

// 遵循 Rule 1: 使用環境提供的 appId 或預設值
const appId = typeof __app_id !== 'undefined' ? __app_id : 'ds-final-exam-pro'; 
const app = initializeApp(myFirebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 1. 格式化渲染組件 ---
const FormattedText = memo(({ content, className = "" }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (window.MathJax && containerRef.current) {
      window.MathJax.typesetPromise([containerRef.current]).catch((err) => console.error(err));
    }
  }, [content]);

  const renderContent = (text) => {
    if (!text) return " ";
    const parts = String(text).split(/(!\[.*?\]\(.*?\))/g);
    return parts.map((part, index) => {
      const imgMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        const url = imgMatch[2];
        return (
          <div key={index} className="my-4 block max-w-full">
            <img 
              src={url} 
              alt="Embedded" 
              className="rounded-2xl border border-slate-200 shadow-md max-w-full h-auto cursor-zoom-in hover:scale-[1.01] transition-transform"
              onClick={() => window.open(url, '_blank')}
              loading="lazy"
            />
          </div>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div 
      ref={containerRef}
      className={`font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto break-words ${className}`}
    >
      {renderContent(content)}
    </div>
  );
});

// --- 2. 通用子組件 ---

const LandingView = memo(({ onStart, activeExam, onAdminLogin }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4 text-white font-sans text-center text-white">
    <div className="bg-white/5 p-10 rounded-[3rem] backdrop-blur-xl border border-white/10 flex flex-col items-center shadow-2xl max-w-sm w-full">
      <div className="bg-indigo-600 p-4 rounded-3xl mb-6 shadow-xl shadow-indigo-500/30 flex items-center justify-center text-white"><BookOpen size={48} /></div>
      <h1 className="text-3xl font-black mb-2 tracking-tighter">Minar測驗系統</h1>
      <div className="mb-8 px-4 py-1.5 bg-green-500/20 text-green-400 rounded-full text-[0.65rem] font-black uppercase tracking-widest border border-green-500/30">
        {activeExam ? `當前開放：${activeExam.title}` : "目前暫無開放測驗"}
      </div>
      <div className="grid grid-cols-1 gap-4 w-full text-slate-900">
        <button 
          disabled={!activeExam} 
          onClick={onStart} 
          className="bg-white text-slate-900 p-6 rounded-3xl shadow-xl hover:scale-[1.02] transition-all flex flex-col items-center justify-center gap-2 active:scale-95 disabled:opacity-30"
        >
          <User size={32} />
          <span className="font-black text-xl">考生測驗入口</span>
        </button>
        <button 
          onClick={onAdminLogin} 
          className="bg-white/10 text-white p-5 rounded-3xl border border-white/10 hover:bg-white/20 transition-all flex flex-col items-center justify-center gap-2 active:scale-95"
        >
          <ShieldCheck size={24} />
          <span className="font-bold text-white">助教後台管理</span>
        </button>
      </div>
    </div>
  </div>
));

const StudentLoginView = memo(({ studentInfo, setStudentInfo, onStartExam, onBack, isChecking }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans text-slate-800 text-center">
    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100 flex flex-col items-center text-center">
      <h2 className="text-2xl font-black text-slate-800 mb-2">身份核對</h2>
      <p className="text-slate-400 mb-8 text-sm italic">學號一旦提交即鎖定紀錄，不可重複考試</p>
      <div className="space-y-4 w-full text-left">
        <div>
          <label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1 text-left">Student ID / 學號</label>
          <input type="text" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-mono text-lg text-slate-700" placeholder="例如：A112001" value={studentInfo.id} onChange={(e) => setStudentInfo(prev => ({ ...prev, id: e.target.value }))} />
        </div>
        <div>
          <label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1 text-left">Name / 姓名</label>
          <input type="text" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all text-lg text-slate-700" placeholder="您的姓名" value={studentInfo.name} onChange={(e) => setStudentInfo(prev => ({ ...prev, name: e.target.value }))} />
        </div>
        <div className="pt-4 flex flex-col items-center gap-3 w-full text-white">
          <button disabled={!studentInfo.id || !studentInfo.name || isChecking} onClick={onStartExam} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-black disabled:opacity-30 transition-all shadow-xl flex items-center justify-center gap-2 group text-white">
            {isChecking ? "驗證中..." : "確認資料並進入"} <ArrowRight size={20} />
          </button>
          <button onClick={onBack} className="text-slate-400 text-xs font-bold hover:text-slate-600 transition text-center">返回首頁</button>
        </div>
      </div>
    </div>
  </div>
));

const StudentExamView = memo(({ questions, studentInfo, currentAnswers, setCurrentAnswers, isTestMode, onSubmit, onCancel }) => {
  useEffect(() => {
    if (isTestMode) return;
    const handleExit = () => onSubmit(true);
    const handleVis = () => { if (document.visibilityState === 'hidden') handleExit(); };
    const handleBlur = () => handleExit();
    document.addEventListener('visibilitychange', handleVis);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isTestMode, onSubmit]);

  const toggleMultipleChoice = (qId, val) => {
    setCurrentAnswers(prev => {
      const current = prev[qId] || "";
      let newAns = current.includes(val) ? current.replace(val, "") : current + val;
      return { ...prev, [qId]: newAns.split("").sort().join("") };
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 select-none pb-20 text-left font-sans text-slate-800">
      <header className={`border-b sticky top-0 z-30 p-4 flex justify-between items-center px-8 shadow-sm ${isTestMode ? 'bg-amber-500 text-white' : 'bg-white text-slate-800'}`}>
        <div className="font-black tracking-tight flex items-center gap-2 uppercase text-sm">
          {isTestMode ? <PlayCircle size={18} /> : <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></div>}
          {isTestMode ? "測試模式" : "正式測驗中"}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[0.6rem] bg-black/10 px-4 py-2 rounded-xl font-black border border-black/5 text-center text-slate-700">
            {isTestMode ? "PREVIEW" : `${studentInfo.id} / ${studentInfo.name}`}
          </div>
          {isTestMode && <button onClick={onCancel} className="p-2 hover:bg-black/10 rounded-lg flex items-center justify-center transition-all text-white"><ArrowLeft size={18} /></button>}
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-4 py-8 space-y-8">
        {!isTestMode && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-amber-800 text-xs font-bold shadow-sm">
            <AlertTriangle className="shrink-0" size={18} />
            <div>防作弊模式已啟動。切換分頁或離開焦點將視為強制交卷。</div>
          </div>
        )}
        {questions.length === 0 ? <div className="bg-white p-20 rounded-3xl text-center text-slate-300 font-bold">目前無題目</div> : questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden text-left">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[0.6rem] font-black text-indigo-500 uppercase tracking-[0.2em]">Question {idx + 1} • {q.points} Pts</span>
              <span className={`text-[0.6rem] font-black px-2 py-1 rounded-lg ${q.type === 'choice' ? 'bg-blue-50 text-blue-500' : q.type === 'multiple' ? 'bg-orange-50 text-orange-500' : 'bg-purple-50 text-purple-500'}`}>
                {q.type === 'choice' ? '單選題' : q.type === 'multiple' ? '複選題' : '填空題'}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl mb-8">
              <FormattedText content={q.text} className="text-slate-800 text-base md:text-lg" />
            </div>
            {(q.type === 'choice' || q.type === 'multiple') ? (
              <div className="grid grid-cols-1 gap-3">
                {q.options.map((opt, i) => {
                  const val = String.fromCharCode(65 + i);
                  const active = (currentAnswers[q.id] || "").includes(val);
                  const handleClick = q.type === 'choice' 
                    ? () => setCurrentAnswers(prev => ({...prev, [q.id]: val}))
                    : () => toggleMultipleChoice(q.id, val);

                  return (
                    <button key={i} onClick={handleClick} className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-start gap-5 ${active ? 'border-indigo-600 bg-indigo-50 shadow-md ring-4 ring-indigo-500/10' : 'border-slate-50 hover:bg-slate-50 text-slate-600'}`}>
                      <div className={`w-8 h-8 rounded-xl border-2 flex shrink-0 items-center justify-center font-black mt-0.5 ${active ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 text-slate-300'}`}>
                        {q.type === 'multiple' && active ? <Check size={16} /> : val}
                      </div>
                      <FormattedText content={opt} className={`font-bold flex-1 ${active ? 'text-indigo-900' : 'text-slate-600'}`} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <input type="text" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold text-slate-800" placeholder="在此輸入您的答案..." value={currentAnswers[q.id] || ''} onChange={(e) => setCurrentAnswers(prev => ({...prev, [q.id]: e.target.value}))} />
            )}
          </div>
        ))}
        <div className="flex justify-center pt-4">
          <button onClick={() => { if(confirm('提交後將無法修改，確定交卷？')) onSubmit(); }} className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black shadow-2xl hover:bg-indigo-700 transition active:scale-95 text-xl flex items-center justify-center text-white">提交並交卷</button>
        </div>
      </main>
    </div>
  );
});

const ResultView = memo(({ examResult, isTestMode, onBack }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans text-slate-800 text-center">
    <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-lg text-center border border-slate-100 flex flex-col items-center">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 shadow-inner ${examResult?.isTerminated ? 'bg-red-100 text-red-600 shadow-red-200' : 'bg-green-100 text-green-600 shadow-green-200'}`}>
        {examResult?.isTerminated ? <AlertTriangle size={48} /> : <CheckCircle2 size={48} />}
      </div>
      <h2 className={`text-3xl font-black mb-2 tracking-tight ${examResult?.isTerminated ? 'text-red-600' : 'text-slate-800'}`}>{isTestMode ? "測試完成" : (examResult?.isTerminated ? '測驗被強制終止' : '測驗已結束')}</h2>
      <p className="text-slate-400 font-medium mb-12 leading-relaxed">
        {isTestMode ? "模擬環境不儲存紀錄。" : "成績已存檔。選擇題已自動對分，填空題將由助教人工核閱。"}
      </p>
      <div className={`w-full bg-gradient-to-br p-10 rounded-[2.5rem] mb-10 shadow-xl text-white ${isTestMode ? 'from-amber-500 to-amber-700' : (examResult?.isTerminated ? 'from-red-500 to-red-700' : 'from-slate-800 to-slate-900')}`}>
        <span className="text-[0.7rem] font-black uppercase tracking-[0.3em] opacity-60 mb-2 block text-center text-white/80">Choice Score (選擇得分)</span>
        <div className="text-8xl font-black mb-4 tracking-tighter text-center">{examResult?.choiceScore ?? examResult?.score}</div>
        <div className="h-px bg-white/20 w-16 mx-auto mb-4 text-center"></div>
        <div className="font-bold text-white text-center">{examResult?.studentId} {examResult?.studentName}</div>
      </div>
      <button onClick={onBack} className="text-indigo-600 font-black hover:bg-indigo-50 px-10 py-3 rounded-full transition flex items-center justify-center text-indigo-600">返回首頁</button>
    </div>
  </div>
));

const AdminLoginView = memo(({ onBack, onLogin }) => {
  const [pwd, setPwd] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans text-slate-800 text-center">
      <div className="bg-white p-12 rounded-[3rem] w-full max-w-md shadow-2xl text-center border border-white/10 flex flex-col items-center">
        <h2 className="text-3xl font-black mb-10 tracking-tight text-slate-800">管理員登入</h2>
        <input 
          type="password" 
          autoFocus 
          className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all font-mono text-center text-2xl mb-6 shadow-inner text-slate-700" 
          placeholder="••••" 
          value={pwd} 
          onChange={(e) => {
            setPwd(e.target.value);
            if(e.target.value === 'minar7917') onLogin();
          }} 
        />
        <button onClick={onBack} className="text-slate-400 font-bold text-sm hover:text-slate-600 transition">取消返回</button>
      </div>
    </div>
  );
});

// --- 3. 助教編輯題目 Modal ---
const AdminEditQuestionModal = memo(({ editingQ, setEditingQ, saveQuestion, showToast }) => {
  const [localQ, setLocalQ] = useState(editingQ);
  const questionRef = useRef(null);
  const optionRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const handleUpdate = (field, val) => setLocalQ(prev => ({ ...prev, [field]: val }));
  const handleOptionUpdate = (idx, val) => setLocalQ(prev => {
    const opts = [...prev.options];
    opts[idx] = val;
    return { ...prev, options: opts };
  });

  const handleImagePaste = async (e, targetRef, field, optionIdx = -1) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let index in items) {
      const item = items[index];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target.result;
          const el = targetRef.current;
          const start = el.selectionStart;
          const end = el.selectionEnd;
          const text = el.value;
          const imgSyntax = `\n![image](${base64})\n`;
          const newText = text.substring(0, start) + imgSyntax + text.substring(end);
          if (optionIdx !== -1) handleOptionUpdate(optionIdx, newText);
          else handleUpdate(field, newText);
          showToast("圖片已嵌入 (Base64)");
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const insertFormat = (targetRef, type, field, optionIdx = -1) => {
    const el = targetRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selectedText = text.substring(start, end);

    let newText, offset = 0;
    if (type === 'latex') { newText = text.substring(0, start) + '$' + selectedText + '$' + text.substring(end); offset = 1; }
    else if (type === 'code') { newText = text.substring(0, start) + '\n```\n' + selectedText + '\n```\n' + text.substring(end); offset = 5; }
    else if (type === 'sup') { newText = text.substring(0, start) + '^{' + selectedText + '}' + text.substring(end); offset = 2; }
    else if (type === 'sub') { newText = text.substring(0, start) + '_{' + selectedText + '}' + text.substring(end); offset = 2; }

    if (optionIdx !== -1) handleOptionUpdate(optionIdx, newText);
    else handleUpdate(field, newText);

    setTimeout(() => { el.focus(); el.setSelectionRange(start + offset, end + offset); }, 0);
  };

  const EditorToolbar = ({ targetRef, field, optionIdx }) => (
    <div className="flex flex-wrap gap-2 mb-2">
      <button type="button" onClick={() => insertFormat(targetRef, 'latex', field, optionIdx)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[0.65rem] font-black border border-indigo-100 hover:bg-indigo-100 transition-colors"><Sigma size={14} /> 數學公式 ($)</button>
      <button type="button" onClick={() => insertFormat(targetRef, 'sup', field, optionIdx)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[0.65rem] font-black border border-blue-100 hover:bg-blue-100 transition-colors"><Superscript size={14} /> 上標</button>
      <button type="button" onClick={() => insertFormat(targetRef, 'sub', field, optionIdx)} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 text-cyan-600 rounded-lg text-[0.65rem] font-black border border-cyan-100 hover:bg-cyan-100 transition-colors"><Subscript size={14} /> 下標</button>
      <button type="button" onClick={() => insertFormat(targetRef, 'code', field, optionIdx)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[0.65rem] font-black border border-slate-200 hover:bg-slate-200 transition-colors"><Terminal size={14} /> 程式碼</button>
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[0.65rem] font-black border border-emerald-100 cursor-default"><ImageIcon size={14} /> 直接貼上圖片</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans text-slate-800 text-left">
      <div className="bg-white rounded-[3rem] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/20">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50 text-slate-800">
          <div className="flex items-center gap-3"><div className="bg-indigo-600 p-2 rounded-xl text-white text-white text-center"><Settings size={20}/></div><h3 className="text-xl font-black">考題編輯</h3></div>
          <button onClick={() => setEditingQ(null)} className="p-2 hover:text-red-500 transition-colors text-slate-400 flex items-center justify-center text-slate-400"><X size={32}/></button>
        </div>
        <div className="flex flex-col lg:flex-row overflow-hidden flex-1">
          <form onSubmit={(e) => { e.preventDefault(); saveQuestion(new FormData(e.target)); }} className="p-8 space-y-6 overflow-y-auto lg:w-1/2 border-r border-slate-100">
            <div>
              <label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase ml-1">題目內容</label>
              <EditorToolbar targetRef={questionRef} field="text" />
              <textarea ref={questionRef} name="text" value={localQ.text} onChange={(e) => handleUpdate('text', e.target.value)} onPaste={(e) => handleImagePaste(e, questionRef, 'text')} required className="w-full p-5 bg-slate-50 rounded-2xl h-48 outline-none font-mono text-sm focus:bg-white border-2 border-transparent focus:border-indigo-600 transition-all shadow-inner text-slate-700" placeholder="在此輸入內容或直接貼上圖片..." />
            </div>
            <div className="grid grid-cols-2 gap-4 text-slate-800">
              <div><label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase ml-1">題型</label>
              <select name="type" value={localQ.type} onChange={(e) => handleUpdate('type', e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none shadow-inner text-slate-700 appearance-none cursor-pointer"><option value="choice">單選題</option><option value="multiple">複選題</option><option value="fill">填空題</option></select></div>
              <div><label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase ml-1 text-slate-400">配分</label>
              <input name="points" type="number" value={localQ.points} onChange={(e) => handleUpdate('points', e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold shadow-inner text-slate-700" /></div>
            </div>
            <div><label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase ml-1 text-slate-400">解答參考</label>
            <textarea name="answer" value={localQ.answer} onChange={(e) => handleUpdate('answer', e.target.value)} required className="w-full p-4 bg-slate-50 rounded-2xl font-mono font-black text-indigo-600 shadow-inner min-h-[60px]"></textarea></div>
            
            {(localQ.type === 'choice' || localQ.type === 'multiple') && (
              <div className="space-y-4">
                {['A', 'B', 'C', 'D'].map((lab, i) => (
                  <div key={lab} className="flex gap-2 items-start text-slate-800 text-left">
                    <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black shrink-0 mt-1 text-slate-400 text-center">{lab}</span>
                    <div className="flex-1">
                      <EditorToolbar targetRef={optionRefs[i]} field={`opt${lab}`} optionIdx={i} />
                      <textarea ref={optionRefs[i]} name={`opt${lab}`} value={localQ.options[i]} onChange={(e) => handleOptionUpdate(i, e.target.value)} onPaste={(e) => handleImagePaste(e, optionRefs[i], `opt${lab}`, i)} className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-xs text-slate-700 min-h-[60px] leading-relaxed shadow-sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-4 pt-4 text-white">
              <button type="submit" className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-black transition text-white">儲存題目</button>
              <button type="button" onClick={() => setEditingQ(null)} className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-2xl font-black hover:bg-slate-200 text-slate-600 text-center">取消</button>
            </div>
          </form>
          <div className="p-8 lg:w-1/2 bg-slate-50/50 overflow-y-auto flex flex-col text-left text-slate-800">
            <h4 className="text-[0.6rem] font-black text-indigo-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><Eye size={14}/> 考生視角預覽</h4>
            <div className="space-y-6 flex-1">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"><FormattedText content={localQ.text || "等待輸入..."} className="text-base" /></div>
              {(localQ.type === 'choice' || localQ.type === 'multiple') && (
                <div className="space-y-3">{localQ.options.map((opt, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-start gap-4">
                    <div className="w-6 h-6 rounded-lg bg-slate-50 flex shrink-0 items-center justify-center text-[0.6rem] font-black text-slate-400 mt-1">{localQ.type === 'multiple' ? <Square size={12} /> : String.fromCharCode(65+i)}</div>
                    <FormattedText content={opt || "選項內容..."} className="text-sm text-slate-600 flex-1" />
                  </div>
                ))}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// --- 4. 助教儀表板 ---
const AdminDashboard = memo(({ records, exams, questions, onBack, onTestExam, user }) => {
  const [tab, setTab] = useState('records');
  const [editingExam, setEditingExam] = useState(null);
  const [editingQ, setEditingQ] = useState(null);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [gradingAnswers, setGradingAnswers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });
  
  // 新增排序狀態
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' 新到舊, 'asc' 舊到新

  const showToast = useCallback((msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 1000);
  }, []);

  const saveQuestion = async (formData) => {
    const data = {
      examId: selectedExamId, text: formData.get('text'),
      points: parseInt(formData.get('points')), answer: formData.get('answer'),
      type: formData.get('type'),
      options: (formData.get('type') === 'choice' || formData.get('type') === 'multiple') ? [formData.get('optA'), formData.get('optB'), formData.get('optC'), formData.get('optD')] : [],
      // 加入 timestamp 以利排序
      timestamp: editingQ.id === 'new' ? Date.now() : (editingQ.timestamp || Date.now())
    };
    try {
      if (editingQ.id === 'new') await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'questions'), data);
      else await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'questions', editingQ.id), data);
      setEditingQ(null); showToast("題目已儲存");
    } catch (e) { showToast("儲存失敗，請檢查權限"); }
  };

  const saveExam = async (e) => {
    e.preventDefault();
    const title = new FormData(e.target).get('title');
    setIsSaving(true);
    try {
      if (editingExam.id === 'new') await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'exams'), { title, isActive: false });
      else await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', editingExam.id), { title });
      setEditingExam(null); showToast("考卷已更新");
    } catch (e) { showToast("儲存考卷失敗"); }
    finally { setIsSaving(false); }
  };

  const saveManualGrades = async () => {
    let newFillScore = 0;
    const updatedAnswers = viewingRecord.answers.map(a => {
      const g = gradingAnswers.find(ga => ga.qId === a.qId);
      const earned = g ? g.val : (a.earnedPoints || 0);
      if (a.type === 'fill') newFillScore += earned;
      return { ...a, earnedPoints: earned, isManuallyGraded: true, isCorrect: earned === a.points };
    });
    try {
      const cScore = viewingRecord.choiceScore || 0;
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'records', viewingRecord.id), {
        answers: updatedAnswers, fillScore: newFillScore, totalScore: cScore + newFillScore, score: cScore + newFillScore
      });
      setViewingRecord(null); showToast("閱卷完成");
    } catch (e) { showToast("閱卷儲存失敗"); }
  };

  // 排序題目的邏輯
  const sortedQuestions = questions
    .filter(q => q.examId === selectedExamId)
    .sort((a, b) => {
      const timeA = a.timestamp || 0;
      const timeB = b.timestamp || 0;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 text-left text-slate-800">
      <nav className="bg-slate-900 text-white p-4 px-8 flex justify-between items-center sticky top-0 z-40 shadow-xl">
        <div className="font-black text-xl flex items-center gap-3 text-white"><div className="bg-indigo-500 p-2 rounded-xl text-white text-center"><ShieldCheck size={20} /></div>助教控制中心</div>
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition text-white text-center"><LogOut /></button>
      </nav>

      <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 flex flex-col text-slate-800 text-left">
        <div className="flex flex-wrap gap-2 mb-10 bg-white p-2 rounded-3xl shadow-sm border border-slate-200 w-fit">
          <button onClick={() => setTab('records')} className={`px-8 py-3 rounded-2xl font-black transition-all ${tab === 'records' ? 'bg-slate-900 text-white shadow-lg text-white' : 'text-slate-400 hover:bg-slate-50'}`}>測驗紀錄</button>
          <button onClick={() => setTab('exams')} className={`px-8 py-3 rounded-2xl font-black transition-all ${tab === 'exams' ? 'bg-slate-900 text-white shadow-lg text-white' : 'text-slate-400 hover:bg-slate-50'}`}>考卷管理</button>
          <button onClick={() => setTab('questions')} className={`px-8 py-3 rounded-2xl font-black transition-all ${tab === 'questions' ? 'bg-slate-900 text-white shadow-lg text-white' : 'text-slate-400 hover:bg-slate-50'}`}>題庫編輯</button>
        </div>

        {tab === 'records' && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden text-left">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-xl">考生測驗數據</h3>
              <select className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-700" onChange={(e)=>setSelectedExamId(e.target.value)} value={selectedExamId || ''}><option value="">-- 選擇考卷 --</option>{exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select>
            </div>
            <div className="overflow-x-auto text-left"><table className="w-full text-left border-collapse"><thead className="bg-slate-50 text-[0.6rem] font-black text-slate-400 uppercase tracking-widest text-left"><tr><th className="p-6">姓名 / 學號</th><th>選擇分</th><th>填空分</th><th className="text-center">總分</th><th className="text-center">操作</th></tr></thead>
              <tbody className="divide-y divide-slate-100 text-left">{records.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition text-left text-slate-800"><td className="p-6 font-black">{r.studentName}<div className="font-mono text-[0.6rem] text-indigo-500">{r.studentId}</div></td>
                <td className="font-bold text-slate-500">{r.choiceScore ?? r.score}</td><td className="font-bold text-indigo-600">{r.fillScore ?? 0}</td><td className="text-center"><span className={`px-4 py-1 rounded-full font-black ${ (r.totalScore ?? r.score) >= 60 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50' }`}>{r.totalScore ?? r.score}</span></td>
                <td className="p-6 text-center text-white"><button onClick={() => { setViewingRecord(r); setGradingAnswers(r.answers.map(a=>({qId:a.qId, val:a.earnedPoints}))); }} className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[0.65rem] font-black hover:bg-indigo-600 transition text-white">閱卷</button></td></tr>
              ))}</tbody></table></div>
          </div>
        )}

        {tab === 'exams' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {exams.map(e => (
              <div key={e.id} className={`bg-white p-8 rounded-[2.5rem] border-2 flex flex-col justify-between ${e.isActive ? 'border-green-500 shadow-xl' : 'border-slate-100'}`}>
                <div className="text-left text-slate-800"><div className="flex justify-between mb-4"><span className={`px-3 py-1 rounded-full text-[0.6rem] font-black ${e.isActive ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>{e.isActive ? '開放中' : '關閉中'}</span>
                <div className="flex gap-2 text-slate-300"><button onClick={() => setEditingExam(e)}><Edit3 size={18}/></button><button onClick={async () => { if(confirm('確定刪除？')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', e.id)); }}><Trash2 size={18}/></button></div></div>
                <h4 className="text-2xl font-black mb-6">{e.title}</h4></div>
                <div className="flex gap-3 pt-4 border-t text-white text-left"><button onClick={async () => { const all = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'exams')); for(let d of all.docs) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', d.id), { isActive: false }); if(!e.isActive) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', e.id), { isActive: true }); showToast(e.isActive ? "已停止" : "已啟動"); }} className={`flex-1 py-3 rounded-2xl font-black text-xs ${e.isActive ? 'bg-slate-100 text-slate-600' : 'bg-green-600 text-white'} text-white`}>{e.isActive ? '停止測驗' : '啟動正式測驗'}</button>
                <button onClick={() => onTestExam(e)} className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-xs flex items-center gap-2 text-white"><PlayCircle size={16}/> 測試</button></div>
              </div>
            ))}<button onClick={() => setEditingExam({ id: 'new', title: '' })} className="min-h-[200px] border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition"><Plus size={48}/><span className="font-black">建立新考卷</span></button>
          </div>
        )}

        {tab === 'questions' && (
          <div className="space-y-6 text-left">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 text-left">
              <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                <select className="w-full md:w-80 p-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 text-left" value={selectedExamId || ''} onChange={(e) => setSelectedExamId(e.target.value)}><option value="">-- 選取考卷管理題目 --</option>{exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select>
                
                {/* 排序切換按鈕 */}
                {selectedExamId && (
                  <button 
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="flex items-center gap-2 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all text-sm whitespace-nowrap"
                  >
                    {sortOrder === 'desc' ? <SortDesc size={18}/> : <SortAsc size={18}/>}
                    排序：{sortOrder === 'desc' ? '最新的在前' : '舊的在前'}
                  </button>
                )}
              </div>
              
              {selectedExamId && <button onClick={() => setEditingQ({ id: 'new', type: 'choice', text: '', answer: 'A', points: 4, options: ['', '', '', ''] })} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 font-black transition text-white text-center text-white">新增題目</button>}
            </div>

            <div className="grid grid-cols-1 gap-6 text-left">
              {selectedExamId && sortedQuestions.map((q, idx) => (
                <div key={q.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 items-start text-left text-slate-800">
                  <div className="flex-1 w-full text-left">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-xl text-xs font-black">第 {sortOrder === 'desc' ? sortedQuestions.length - idx : idx + 1} 題</span>
                      <span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-xl text-xs font-black">{q.points} Pts</span>
                      {q.timestamp && (
                        <span className="text-[0.6rem] text-slate-300 font-medium flex items-center gap-1">
                          <Clock size={12}/> {new Date(q.timestamp).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-slate-700 text-left"><FormattedText content={q.text} className="text-sm" /></div>
                    <div className="mt-4 font-black text-green-600 px-2 text-sm text-left">標竿答案：{q.answer}</div>
                  </div>
                  <div className="flex md:flex-col gap-2 shrink-0 text-left text-slate-800"><button onClick={() => setEditingQ(q)} className="p-4 bg-slate-50 text-indigo-500 rounded-2xl shadow-sm text-indigo-500"><Edit3 size={20}/></button>
                  <button onClick={async () => { if(confirm('確定刪除題目？')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'questions', q.id)); }} className="p-4 bg-slate-50 text-red-500 rounded-2xl shadow-sm text-red-500"><Trash2 size={20}/></button></div>
                </div>
              ))}
              {selectedExamId && questions.filter(q => q.examId === selectedExamId).length === 0 && (
                <div className="p-20 bg-white rounded-[3rem] text-center text-slate-300 font-bold border-2 border-dashed border-slate-100">此考卷目前無題目</div>
              )}
            </div>
          </div>
        )}
      </div>

      {toast.show && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-green-600 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-bounce text-white"><CheckCircle2 size={20} /> <span className="font-black text-white">{toast.message}</span></div>}
      
      {viewingRecord && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col text-slate-800">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50 text-slate-800">
              <div className="flex items-center gap-6 text-slate-800 text-left"><div className="w-16 h-16 bg-slate-900 rounded-3xl flex flex-col items-center justify-center text-white shadow-lg text-white"><span className="text-[0.5rem] font-bold opacity-50 uppercase">Score</span><span className="text-2xl font-black">{(viewingRecord.choiceScore || 0) + gradingAnswers.reduce((acc, curr) => acc + curr.val, 0)}</span></div>
              <div className="text-left text-slate-800"><h3 className="font-black text-2xl">{viewingRecord.studentName}</h3><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{viewingRecord.studentId}</p></div></div>
              <button onClick={() => setViewingRecord(null)} className="p-2 text-slate-300 hover:text-red-500 transition text-slate-300 text-white"><X size={32}/></button>
            </div>
            <div className="p-10 space-y-8 overflow-y-auto flex-1 bg-slate-50/50 text-left text-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left text-slate-800">{viewingRecord.answers.map((a, idx) => (<div key={idx} className={`p-8 rounded-[2.5rem] border-2 bg-white ${a.type === 'fill' ? 'border-indigo-500 ring-8 ring-indigo-500/5' : 'border-slate-100 opacity-60'} text-left text-slate-800`}>
                <div className="flex justify-between items-center mb-6 text-xs font-black text-slate-400 uppercase tracking-tighter text-slate-400 text-slate-400"><span>Q{idx+1} • {a.type === 'choice' ? '單選' : a.type === 'multiple' ? '複選' : '填空'}</span><span>{a.points} Pts</span></div>
                <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100 text-xs text-slate-700 text-left"><FormattedText content={a.qText} className="h-24 overflow-y-auto" /></div>
                <div className="space-y-4 text-left"><div className="p-4 bg-indigo-50 rounded-2xl text-indigo-900 text-left"><label className="text-[0.6rem] font-black text-indigo-400 uppercase block mb-1 text-left">考生回答</label><FormattedText content={a.studentAns || "(未答)"} className="font-black text-lg text-left" /></div>
                <div className="p-4 bg-green-50 rounded-2xl text-green-900 text-left"><label className="text-[0.6rem] font-black text-green-400 uppercase block mb-1 text-left">正確答案</label><FormattedText content={a.correctAns} className="font-black text-lg text-left" /></div>
                {a.type === 'fill' && (<div className="pt-4 flex items-center gap-4 text-slate-800 text-left"><label className="text-xs font-black uppercase text-slate-800 text-left">評分：</label><input type="number" max={a.points} min={0} className="w-24 p-3 bg-white border-2 border-indigo-200 rounded-xl font-black text-center text-slate-800 outline-none text-slate-800" value={gradingAnswers.find(ga => ga.qId === a.qId)?.val ?? 0} onChange={(e) => { const val = Math.min(a.points, Math.max(0, parseInt(e.target.value) || 0)); setGradingAnswers(prev => prev.map(p => p.qId === a.qId ? { ...p, val } : p)); }} /><span className="text-slate-400 text-xs text-left">/ {a.points}</span></div>)}</div></div>))}</div>
            </div>
            <div className="p-8 border-t bg-white flex gap-4 justify-center text-white text-white text-center"><button onClick={saveManualGrades} className="px-12 py-5 bg-indigo-600 rounded-[2rem] font-black shadow-xl text-white">儲存分數</button><button onClick={() => setViewingRecord(null)} className="px-12 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-slate-600">取消</button></div>
          </div>
        </div>
      )}

      {editingExam && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 text-slate-800">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl flex flex-col items-center text-slate-800 text-center">
            <h3 className="text-xl font-black mb-8 text-slate-800 text-center">考卷設定</h3>
            <form onSubmit={saveExam} className="space-y-6 w-full text-left text-slate-800">
              <div className="text-left"><label className="text-[0.65rem] font-black text-slate-400 mb-2 block uppercase ml-1 text-left">標題名稱</label><input name="title" defaultValue={editingExam.title} required autoFocus className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-slate-700 shadow-inner" /></div>
              <div className="flex gap-4 justify-center text-white text-white text-center"><button type="submit" disabled={isSaving} className="flex-1 bg-slate-900 py-4 rounded-xl font-black text-white">{isSaving ? '儲存中...' : '確認'}</button><button type="button" onClick={() => setEditingExam(null)} className="flex-1 bg-slate-100 py-4 rounded-xl font-black text-slate-600 text-center text-slate-600">取消</button></div>
            </form>
          </div>
        </div>
      )}

      {editingQ && <AdminEditQuestionModal editingQ={editingQ} setEditingQ={setEditingQ} saveQuestion={saveQuestion} showToast={showToast} />}
    </div>
  );
});

// --- 5. 主應用導航器 ---

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('landing');
  const [studentInfo, setStudentInfo] = useState({ id: '', name: '' });
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [records, setRecords] = useState([]);
  const [currentAnswers, setCurrentAnswers] = useState({});
  const [examResult, setExamResult] = useState(null);
  const [activeExam, setActiveExam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [dbError, setDbError] = useState(null);

  const stateRef = useRef({ questions, currentAnswers, studentInfo, view, isTestMode, activeExam });
  
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn'; script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
    if (!document.getElementById('mathjax-cdn')) {
      window.MathJax = {
        tex: { inlineMath: [['$', '$'], ['\\(', '\\)']], displayMath: [['$$', '$$'], ['\\[', '\\]']] },
        options: { enableMenu: false }
      };
      const script = document.createElement('script');
      script.id = 'mathjax-cdn'; script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
      script.async = true; document.head.appendChild(script);
    }
  }, []);

  useEffect(() => { stateRef.current = { questions, currentAnswers, studentInfo, view, isTestMode, activeExam }; }, [questions, currentAnswers, studentInfo, view, isTestMode, activeExam]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenErr) {
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { 
        setDbError("身份驗證執行失敗: " + err.message);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubExams = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'exams'), (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExams(loaded);
      setActiveExam(loaded.find(e => e.isActive) || null);
    }, (err) => setDbError(err.message));

    const unsubQ = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'questions'), (snapshot) => {
      setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, (err) => setDbError(err.message));

    const unsubR = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'records'), (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => setDbError(err.message));

    return () => { unsubExams(); unsubQ(); unsubR(); };
  }, [user]);

  const handleStartExam = useCallback(() => {
    if (!activeExam) return;
    setIsChecking(true);
    const existing = records.find(r => String(r.studentId).trim().toUpperCase() === String(studentInfo.id).trim().toUpperCase() && r.examId === activeExam.id);
    if (existing) { setExamResult(existing); setView('result'); }
    else { setIsTestMode(false); setCurrentAnswers({}); setView('student-exam'); }
    setIsChecking(false);
  }, [activeExam, records, studentInfo]);

  const handleSubmit = useCallback(async (isForced = false) => {
    const { questions: allQs, currentAnswers: ans, studentInfo: si, isTestMode: tm, activeExam: ae } = stateRef.current;
    if (!user || !ae) return;

    const examQs = allQs.filter(q => q.examId === ae.id);
    let choiceScore = 0;
    const graded = examQs.map(q => {
      const studentRaw = String(ans[q.id] || '').trim().replace(/,/g, '').toUpperCase().split('').sort().join('');
      const correctRaw = String(q.answer || '').trim().replace(/,/g, '').toUpperCase().split('').sort().join('');
      const isCorrect = (q.type === 'choice' || q.type === 'multiple') ? (studentRaw === correctRaw && studentRaw !== "") : false;
      if (isCorrect) choiceScore += q.points;
      return { qId: q.id, qText: q.text, type: q.type, correctAns: q.answer, studentAns: ans[q.id] || '', isCorrect, points: q.points, earnedPoints: isCorrect ? q.points : 0 };
    });

    const record = { examId: ae.id, examTitle: ae.title, studentId: si.id || "TESTER", studentName: si.name || "測試", choiceScore, fillScore: 0, totalScore: choiceScore, score: choiceScore, answers: graded, timestamp: new Date().toISOString(), isTerminated: isForced };
    if (tm) { setExamResult(record); setView('result'); return; }
    try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'records'), record); setExamResult(record); setView('result'); } 
    catch (e) { console.error(e); }
  }, [user]);

  if (dbError) return <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-red-50 text-red-600 font-sans text-center">
    <AlertTriangle size={48} className="mb-4 text-red-600" />
    <h1 className="text-xl font-black mb-2 text-red-600">連線異常</h1>
    <p className="text-sm opacity-70">系統已嘗試修復驗證錯誤。若持續出現此畫面，請重新整理頁面或檢查 Firebase 規則。</p>
    <code className="mt-4 p-4 bg-white rounded-xl text-[0.6rem] border border-red-100 max-w-md break-all text-slate-600">{dbError}</code>
  </div>;

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans text-slate-800"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-indigo-600 text-indigo-600"></div></div>;

  const renderView = () => {
    switch(view) {
      case 'student-login': return <StudentLoginView studentInfo={studentInfo} setStudentInfo={setStudentInfo} onStartExam={handleStartExam} onBack={() => setView('landing')} isChecking={isChecking} />;
      case 'student-exam': return <StudentExamView questions={questions.filter(q => q.examId === activeExam?.id)} studentInfo={studentInfo} currentAnswers={currentAnswers} setCurrentAnswers={setCurrentAnswers} isTestMode={isTestMode} onSubmit={handleSubmit} onCancel={() => { setIsTestMode(false); setView('admin-dashboard'); }} />;
      case 'result': return <ResultView examResult={examResult} isTestMode={isTestMode} onBack={() => { setIsTestMode(false); setView(isTestMode ? 'admin-dashboard' : 'landing'); }} />;
      case 'admin-login': return <AdminLoginView onBack={() => setView('landing')} onLogin={() => setView('admin-dashboard')} />;
      case 'admin-dashboard': return <AdminDashboard records={records} exams={exams} questions={questions} onBack={() => setView('landing')} onTestExam={(exam) => { setActiveExam(exam); setIsTestMode(true); setCurrentAnswers({}); setView('student-exam'); }} user={user} />;
      default: return <LandingView activeExam={activeExam} onStart={() => setView('student-login')} onAdminLogin={() => setView('admin-login')} />;
    }
  };

  return <div className="font-sans text-slate-800">{renderView()}</div>;
};

export default App;
