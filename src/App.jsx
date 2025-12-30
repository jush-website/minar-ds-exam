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
  getStorage, ref, uploadBytes, getDownloadURL 
} from 'firebase/storage';
import { 
  User, ShieldCheck, ClipboardList, Settings, LogOut, 
  CheckCircle2, Trash2, Plus, Edit3, Eye, ArrowRight, Code, 
  AlertTriangle, PlayCircle, BookOpen, Layers, X, Check, FileDown, ArrowLeft, Save, InfoIcon, EyeIcon,
  Sigma, Terminal, Square, CheckSquare, Superscript, Subscript, Image as ImageIcon, Loader2
} from 'lucide-react';

// --- Firebase 配置 ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyCL6ikY2ZO8JRMqDBguEMa59kX2-is6GpU",
      authDomain: "ds-final-exam.firebaseapp.com",
      projectId: "ds-final-exam",
      storageBucket: "ds-final-exam.firebasestorage.app",
      messagingSenderId: "1090141287700",
      appId: "1:1090141287700:web:07038a72f4a972e4c63e01",
      measurementId: "G-T7K56Q5Z51"
    };

// appId 必須與您的 Firebase Rules 路徑一致
const appId = typeof __app_id !== 'undefined' ? __app_id : 'ds-final-exam-pro'; 

// 安全初始化
let app, auth, db, storage;
let initErrorMsg = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (e) {
  console.error("Firebase 初始化失敗:", e);
  initErrorMsg = e.message;
}

// --- 1. 格式化渲染組件 (支援 LaTeX, 圖片) ---
const FormattedText = memo(({ content, className = "" }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (window.MathJax && containerRef.current) {
      window.MathJax.typesetPromise([containerRef.current]).catch((err) => console.error(err));
    }
  }, [content]);

  const renderContent = (text) => {
    if (!text) return " ";
    const parts = text.split(/(!\[.*?\]\(.*?\))/g);
    return parts.map((part, index) => {
      const imgMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        const url = imgMatch[2];
        return (
          <div key={index} className="my-4 group relative inline-block max-w-full">
            <img 
              src={url} 
              alt="Embedded" 
              className="rounded-2xl border border-slate-200 shadow-sm max-w-full h-auto cursor-zoom-in hover:shadow-md transition-shadow"
              onClick={() => window.open(url, '_blank')}
              onError={(e) => { e.target.src = "https://placehold.co/400x200?text=Image+Load+Error"; }}
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
      {renderContent(String(content))}
    </div>
  );
});

// --- 2. 視圖組件 ---

const LandingView = memo(({ onStart, activeExam, onAdminLogin }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4 text-white font-sans">
    <div className="bg-white/5 p-10 rounded-[3rem] backdrop-blur-xl border border-white/10 flex flex-col items-center shadow-2xl max-w-sm w-full">
      <div className="bg-indigo-600 p-4 rounded-3xl mb-6 shadow-xl shadow-indigo-500/30 flex items-center justify-center text-white"><BookOpen size={48} /></div>
      <h1 className="text-3xl font-black mb-2 text-center tracking-tighter text-white">Minar測驗系統</h1>
      <div className="mb-8 px-4 py-1.5 bg-green-500/20 text-green-400 rounded-full text-[0.65rem] font-black uppercase tracking-widest border border-green-500/30 text-center">
        {activeExam ? `當前開放：${activeExam.title}` : "目前暫無開放測驗"}
      </div>
      <div className="grid grid-cols-1 gap-4 w-full">
        <button 
          disabled={!activeExam} 
          onClick={onStart} 
          className="bg-white text-slate-900 p-6 rounded-3xl shadow-xl hover:scale-[1.02] transition-all flex flex-col items-center justify-center gap-2 active:scale-95 disabled:opacity-30"
        >
          <User size={32} />
          <span className="font-black text-xl text-slate-900">考生測驗入口</span>
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
  <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans text-slate-800">
    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100 flex flex-col items-center text-center">
      <h2 className="text-2xl font-black text-slate-800 mb-2">身份核對</h2>
      <p className="text-slate-400 mb-8 text-sm italic">學號一旦提交即鎖定紀錄，不可重複考試</p>
      <div className="space-y-4 w-full">
        <div className="text-left w-full">
          <label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1 text-left text-slate-400">Student ID / 學號</label>
          <input type="text" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-mono text-lg text-slate-700" placeholder="例如：A112001" value={studentInfo.id} onChange={(e) => setStudentInfo(prev => ({ ...prev, id: e.target.value }))} />
        </div>
        <div className="text-left w-full">
          <label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1 text-left text-slate-400">Name / 姓名</label>
          <input type="text" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all text-lg text-slate-700" placeholder="您的姓名" value={studentInfo.name} onChange={(e) => setStudentInfo(prev => ({ ...prev, name: e.target.value }))} />
        </div>
        <div className="pt-4 flex flex-col items-center gap-3 w-full">
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
      let newAns;
      if (current.includes(val)) {
        newAns = current.replace(val, "");
      } else {
        newAns = current + val;
      }
      const sortedAns = newAns.split("").sort().join("");
      return { ...prev, [qId]: sortedAns };
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 select-none pb-20 text-left font-sans">
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
      <main className="max-w-3xl mx-auto p-4 py-8 space-y-8 text-left">
        {!isTestMode && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-amber-800 text-xs font-bold shadow-sm">
            <AlertTriangle className="shrink-0 text-amber-800" size={18} />
            <div>防作弊模式已啟動。切換分頁或離開焦點將視為強制交卷。</div>
          </div>
        )}
        {questions.length === 0 ? <div className="bg-white p-20 rounded-3xl text-center text-slate-300 font-bold">目前無題目</div> : questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden text-left">
            <div className="flex justify-between items-center mb-4 text-left">
              <span className="text-[0.6rem] font-black text-indigo-500 uppercase tracking-[0.2em] text-indigo-600">Question {idx + 1} • {q.points} Pts</span>
              <span className={`text-[0.6rem] font-black px-2 py-1 rounded-lg ${q.type === 'choice' ? 'bg-blue-50 text-blue-500' : q.type === 'multiple' ? 'bg-orange-50 text-orange-500' : 'bg-purple-50 text-purple-500'}`}>
                {q.type === 'choice' ? '單選題' : q.type === 'multiple' ? '複選題' : '填空題'}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl mb-8">
              <FormattedText content={q.text} className="text-slate-800 text-base md:text-lg text-left" />
            </div>
            {(q.type === 'choice' || q.type === 'multiple') ? (
              <div className="grid grid-cols-1 gap-3 text-left">
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
              <input type="text" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold text-left text-slate-800" placeholder="在此輸入您的答案..." value={currentAnswers[q.id] || ''} onChange={(e) => setCurrentAnswers(prev => ({...prev, [q.id]: e.target.value}))} />
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
    <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-lg border border-slate-100 flex flex-col items-center">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 shadow-inner ${examResult?.isTerminated ? 'bg-red-100 text-red-600 shadow-red-200' : 'bg-green-100 text-green-600 shadow-green-200'}`}>
        {examResult?.isTerminated ? <AlertTriangle size={48} className="text-red-600" /> : <CheckCircle2 size={48} className="text-green-600" />}
      </div>
      <h2 className={`text-3xl font-black mb-2 tracking-tight ${examResult?.isTerminated ? 'text-red-600' : 'text-slate-800'}`}>{isTestMode ? "測試完成" : (examResult?.isTerminated ? '測驗被強制終止' : '測驗已結束')}</h2>
      <p className="text-slate-400 font-medium mb-12 leading-relaxed">
        {isTestMode ? "模擬環境不儲存紀錄。" : "成績已存檔。選擇題已自動對分，填空題將由助教人工核閱。"}
      </p>
      <div className={`w-full bg-gradient-to-br p-10 rounded-[2.5rem] mb-10 shadow-xl text-white ${isTestMode ? 'from-amber-500 to-amber-700' : (examResult?.isTerminated ? 'from-red-500 to-red-700' : 'from-slate-800 to-slate-900')}`}>
        <span className="text-[0.7rem] font-black uppercase tracking-[0.3em] opacity-60 mb-2 block text-white/80">Choice Score (選擇得分)</span>
        <div className="text-8xl font-black mb-4 tracking-tighter text-white">{examResult?.choiceScore ?? examResult?.score}</div>
        <div className="h-px bg-white/20 w-16 mx-auto mb-4"></div>
        <div className="text-white font-bold">{examResult?.studentId} {examResult?.studentName}</div>
      </div>
      <button onClick={onBack} className="text-indigo-600 font-black hover:bg-indigo-50 px-10 py-3 rounded-full transition flex items-center justify-center">返回首頁</button>
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
const AdminEditQuestionModal = memo(({ editingQ, setEditingQ, saveQuestion, user }) => {
  const [localQ, setLocalQ] = useState(editingQ);
  const [isUploading, setIsUploading] = useState(false);
  const questionRef = useRef(null);
  const optionRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const handleUpdate = (field, val) => setLocalQ(prev => ({ ...prev, [field]: val }));
  
  const handleOptionUpdate = (idx, val) => setLocalQ(prev => {
    const opts = [...prev.options];
    opts[idx] = val;
    return { ...prev, options: opts };
  });

  const uploadImageAndInsert = async (file, targetRef, field, optionIdx = -1) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (!user) { alert("尚未登入，無法上傳圖片。"); return; }
    
    setIsUploading(true);
    try {
      const fileName = `artifacts/${appId}/public/assets/${Date.now()}-${file.name}`;
      const imageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(imageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      const el = targetRef.current;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const text = el.value;
      const imgSyntax = `\n![image](${url})\n`;
      const newText = text.substring(0, start) + imgSyntax + text.substring(end);

      if (optionIdx !== -1) {
        handleOptionUpdate(optionIdx, newText);
      } else {
        handleUpdate(field, newText);
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("圖片上傳失敗。請確保 Storage Rules 已開啟。");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaste = async (e, targetRef, field, optionIdx = -1) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let index in items) {
      const item = items[index];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        await uploadImageAndInsert(file, targetRef, field, optionIdx);
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

    let newText;
    let offset = 0;

    if (type === 'latex') {
      newText = text.substring(0, start) + '$' + selectedText + '$' + text.substring(end);
      offset = 1;
    } else if (type === 'code') {
      newText = text.substring(0, start) + '\n```\n' + selectedText + '\n```\n' + text.substring(end);
      offset = 5;
    }

    if (optionIdx !== -1) {
      handleOptionUpdate(optionIdx, newText);
    } else {
      handleUpdate(field, newText);
    }

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + offset, end + offset);
    }, 0);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="bg-white rounded-[3rem] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/20">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3 text-slate-800"><div className="bg-indigo-600 p-2 rounded-xl text-white flex items-center justify-center"><Settings size={20}/></div><h3 className="text-xl font-black">考題編輯</h3></div>
          <button onClick={() => setEditingQ(null)} className="p-2 hover:text-red-500 transition-colors text-slate-400 flex items-center justify-center"><X size={32}/></button>
        </div>
        <div className="flex flex-col lg:flex-row overflow-hidden flex-1 text-left">
          <form onSubmit={(e) => { e.preventDefault(); saveQuestion(new FormData(e.target)); }} className="p-8 space-y-6 overflow-y-auto lg:w-1/2 border-r border-slate-100">
            <div>
              <label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase ml-1">題目內容</label>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => insertFormat(questionRef, 'latex', 'text')} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black border border-indigo-100">插入公式</button>
                <button type="button" onClick={() => insertFormat(questionRef, 'code', 'text')} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-black border border-slate-200">插入程式碼</button>
              </div>
              <textarea 
                ref={questionRef}
                name="text" 
                value={localQ.text} 
                onChange={(e) => handleUpdate('text', e.target.value)} 
                onPaste={(e) => handlePaste(e, questionRef, 'text')}
                required 
                className="w-full p-5 bg-slate-50 rounded-2xl h-48 outline-none font-mono text-sm focus:bg-white border-2 border-transparent focus:border-indigo-600 shadow-inner text-slate-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase ml-1">題型</label>
              <select name="type" value={localQ.type} onChange={(e) => handleUpdate('type', e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none cursor-pointer text-slate-700 shadow-inner">
                <option value="choice">單選題</option>
                <option value="multiple">複選題</option>
                <option value="fill">填空題</option>
              </select></div>
              <div><label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase ml-1">配分</label>
              <input name="points" type="number" value={localQ.points} onChange={(e) => handleUpdate('points', e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold shadow-inner text-slate-700 border-none outline-none" /></div>
            </div>
            <div><label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase ml-1">正確解答</label>
            <textarea name="answer" value={localQ.answer} onChange={(e) => handleUpdate('answer', e.target.value)} required className="w-full p-4 bg-slate-50 rounded-2xl font-mono font-black text-indigo-600 shadow-inner min-h-[60px] border-none outline-none"></textarea></div>
            
            {(localQ.type === 'choice' || localQ.type === 'multiple') && (
              <div className="space-y-4">
                {['A', 'B', 'C', 'D'].map((lab, i) => (
                  <div key={lab} className="flex gap-2 items-start">
                    <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black shrink-0 mt-1 text-slate-400">{lab}</span>
                    <textarea 
                      ref={optionRefs[i]}
                      name={`opt${lab}`} 
                      value={localQ.options[i]} 
                      onChange={(e) => handleOptionUpdate(i, e.target.value)} 
                      onPaste={(e) => handlePaste(e, optionRefs[i], `opt${lab}`, i)}
                      placeholder={`選項 ${lab}`}
                      className="flex-1 w-full p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-xs min-h-[60px] shadow-sm text-slate-700" 
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-4 pt-4"><button type="submit" className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-black transition text-white">儲存題目</button>
            <button type="button" onClick={() => setEditingQ(null)} className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-2xl font-black hover:bg-slate-200 transition">取消</button></div>
          </form>
          <div className="p-8 lg:w-1/2 bg-slate-50/50 overflow-y-auto">
            <h4 className="text-[0.6rem] font-black text-indigo-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2 text-indigo-600"><Eye size={14}/> 考生預覽</h4>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"><FormattedText content={localQ.text || "等待輸入..."} className="text-base text-slate-800" /></div>
          </div>
        </div>
      </div>
    </div>
  );
});

// --- 4. 助教儀表板 ---
const AdminDashboard = memo(({ records, exams, questions, onBack, onTestExam, appId, user }) => {
  const [tab, setTab] = useState('records');
  const [editingExam, setEditingExam] = useState(null);
  const [editingQ, setEditingQ] = useState(null);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });

  const showToast = useCallback((msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 1000);
  }, []);

  const saveQuestion = async (formData) => {
    if (!user) return alert("未驗證身分");
    const data = {
      examId: selectedExamId, text: formData.get('text'),
      points: parseInt(formData.get('points')), answer: formData.get('answer'),
      type: formData.get('type'),
      options: (formData.get('type') === 'choice' || formData.get('type') === 'multiple') ? [formData.get('optA'), formData.get('optB'), formData.get('optC'), formData.get('optD')] : []
    };
    try {
      if (editingQ.id === 'new') {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'questions'), data);
        showToast("題目已成功新增！");
      } else {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'questions', editingQ.id), data);
        showToast("題目修改已儲存！");
      }
      setEditingQ(null);
    } catch (e) { alert("題目儲存失敗"); }
  };

  const saveExam = async (e) => {
    e.preventDefault();
    const title = new FormData(e.target).get('title');
    try {
      if (editingExam.id === 'new') {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'exams'), { title, isActive: false });
      } else {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', editingExam.id), { title });
      }
      setEditingExam(null);
    } catch (e) { alert("儲存考卷失敗"); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20 text-left">
      <nav className="bg-slate-900 text-white p-4 px-8 flex justify-between items-center sticky top-0 z-40 shadow-xl">
        <div className="font-black text-xl flex items-center gap-3"><div className="bg-indigo-500 p-2 rounded-xl text-white flex items-center justify-center"><ShieldCheck size={20} /></div>助教控制中心</div>
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition text-slate-400 flex items-center justify-center"><LogOut /></button>
      </nav>

      <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 flex flex-col">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-10 bg-white p-2 rounded-3xl shadow-sm border border-slate-200 w-fit self-center md:self-start">
          <button onClick={() => setTab('records')} className={`px-8 py-3 rounded-2xl font-black transition-all ${tab === 'records' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>測驗紀錄</button>
          <button onClick={() => setTab('exams')} className={`px-8 py-3 rounded-2xl font-black transition-all ${tab === 'exams' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>考卷管理</button>
          <button onClick={() => setTab('questions')} className={`px-8 py-3 rounded-2xl font-black transition-all ${tab === 'questions' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>題庫編輯</button>
        </div>

        {tab === 'records' && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden text-slate-800">
            <div className="overflow-x-auto text-left"><table className="w-full text-left border-collapse"><thead className="bg-slate-50 border-b text-[0.6rem] font-black text-slate-400 uppercase tracking-widest text-left"><tr><th className="p-6 text-left">姓名 / 學號</th><th className="text-left">選擇分</th><th className="text-left">總分</th></tr></thead>
              <tbody className="divide-y divide-slate-100 text-left">
                {records.length === 0 ? <tr><td colSpan="3" className="p-10 text-center text-slate-300">暫無紀錄</td></tr> : records.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition text-left"><td className="p-6 font-black text-left">{r.studentName}<div className="font-mono text-[0.6rem] text-indigo-500">{r.studentId}</div></td>
                  <td className="font-bold text-slate-500 text-left">{r.choiceScore ?? r.score}</td><td className="font-black text-left">{r.totalScore ?? r.score}</td></tr>
                ))}
              </tbody></table></div>
          </div>
        )}

        {tab === 'exams' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {exams.length === 0 && <div className="col-span-full py-10 text-center text-slate-300">尚未建立考卷</div>}
            {exams.map(e => (
              <div key={e.id} className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 flex flex-col justify-between shadow-sm">
                <div>
                    <div className="flex justify-between items-center mb-4 text-left">
                        <span className={`px-3 py-1 rounded-full text-[0.6rem] font-black uppercase ${e.isActive ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'} text-left`}>{e.isActive ? '開放中' : '關閉中'}</span>
                        <div className="flex gap-2 text-slate-300 text-left">
                            <button onClick={() => setEditingExam(e)} className="p-2 hover:text-indigo-600 transition flex items-center justify-center"><Edit3 size={18}/></button>
                            <button onClick={async () => { if(confirm('確定刪除考卷與所有題目？')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', e.id)); }} className="p-2 hover:text-red-600 transition flex items-center justify-center text-red-500"><Trash2 size={18}/></button>
                        </div>
                    </div>
                    <h4 className="text-2xl font-black text-slate-800 mb-6 text-left">{e.title}</h4>
                </div>
                <div className="flex gap-3 pt-4 border-t border-slate-50 text-left">
                    <button onClick={async () => { 
                      const all = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'exams')); 
                      for(let d of all.docs) {
                        if (d.id !== e.id) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', d.id), { isActive: false });
                      }
                      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', e.id), { isActive: !e.isActive }); 
                    }} className={`flex-1 py-3 rounded-2xl font-black text-xs transition flex items-center justify-center text-white ${e.isActive ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-green-600 text-white shadow-lg shadow-green-200 hover:bg-green-700'}`}>{e.isActive ? '關閉測驗' : '啟動正式測驗'}</button>
                    <button onClick={() => onTestExam(e)} className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-xs flex items-center justify-center gap-2 hover:bg-black transition text-white active:scale-95"><PlayCircle size={16}/> 測試</button>
                </div>
              </div>
            ))}
            <button onClick={() => setEditingExam({ id: 'new', title: '' })} className="h-full min-h-[150px] border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition hover:bg-white active:scale-95 text-center"><Plus size={32}/><span className="font-black text-sm">建立新考卷</span></button>
          </div>
        )}

        {tab === 'questions' && (
          <div className="space-y-6 text-left">
            <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 text-left">
              <div className="flex-1 text-left">
                <label className="block text-[0.6rem] font-black text-slate-400 uppercase mb-2 ml-1 text-slate-400">管理考卷題目</label>
                <select className="w-full md:w-80 p-4 bg-slate-50 rounded-2xl font-black text-slate-700 outline-none border-none cursor-pointer shadow-inner" value={selectedExamId || ''} onChange={(e) => setSelectedExamId(e.target.value)}>
                    <option value="">-- 選取考卷 --</option>
                    {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              </div>
              {selectedExamId && <button onClick={() => setEditingQ({ id: 'new', type: 'choice', text: '', answer: 'A', points: 4, options: ['', '', '', ''] })} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-2 font-black shadow-lg hover:bg-indigo-700 transition active:scale-95 text-white"><Plus size={20} /> 新增題目</button>}
            </div>
            <div className="grid grid-cols-1 gap-6 text-left">
                {selectedExamId && questions.filter(q => q.examId === selectedExamId).length === 0 && <div className="py-10 text-center text-slate-300">此考卷尚無題目</div>}
                {selectedExamId && questions.filter(q => q.examId === selectedExamId).map((q, idx) => (
                    <div key={q.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 items-start text-left">
                        <div className="flex-1 text-left">
                            <div className="flex items-center gap-3 mb-4 text-left">
                                <span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-xl text-xs font-black uppercase text-slate-400">Q {idx+1}</span>
                                <span className="text-indigo-600 font-black text-xs underline underline-offset-4">{q.points} Pts</span>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left"><FormattedText content={q.text} className="text-sm text-slate-700 text-left" /></div>
                        </div>
                        <div className="flex md:flex-col gap-2 shrink-0 text-left">
                            <button onClick={() => setEditingQ(q)} className="p-4 bg-slate-50 text-indigo-500 hover:bg-indigo-500 hover:text-white rounded-2xl transition shadow-sm flex items-center justify-center"><Edit3 size={20}/></button>
                            <button onClick={async () => { if(confirm('確定刪除此題目？')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'questions', q.id)); }} className="p-4 bg-slate-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition shadow-sm flex items-center justify-center text-red-500"><Trash2 size={20}/></button>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {editingExam && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl flex flex-col items-center">
            <h3 className="text-xl font-black mb-8 text-center text-slate-800">考卷設定</h3>
            <form onSubmit={saveExam} className="space-y-6 w-full text-left">
              <div><label className="text-[0.65rem] font-black text-slate-400 mb-2 block uppercase ml-1 text-slate-400">標題名稱</label>
              <input name="title" defaultValue={editingExam.title} required className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-slate-700 text-left shadow-inner border-none" /></div>
              <div className="flex gap-4"><button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black text-white flex items-center justify-center hover:bg-black transition">確認儲存</button>
              <button type="button" onClick={() => setEditingExam(null)} className="flex-1 bg-slate-100 py-4 rounded-xl font-black text-slate-600 flex items-center justify-center hover:bg-slate-200 transition">取消</button></div>
            </form>
          </div>
        </div>
      )}

      {editingQ && <AdminEditQuestionModal editingQ={editingQ} setEditingQ={setEditingQ} saveQuestion={saveQuestion} user={user} />}
      {toast.show && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-bounce text-white">
          <div className="bg-green-600 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 border border-white/20 backdrop-blur-md">
            <CheckCircle2 size={20} className="text-white" />
            <span className="font-black tracking-tight">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
});

// --- 5. 主應用 ---

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
  const [error, setError] = useState(initErrorMsg);

  // 安全超時：避免白屏
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) setIsLoading(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // 初始化外部函式庫
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn'; script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
    if (!document.getElementById('mathjax-cdn')) {
      window.MathJax = { tex: { inlineMath: [['$', '$']] }, options: { enableMenu: false } };
      const script = document.createElement('script');
      script.id = 'mathjax-cdn'; script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
      script.async = true; document.head.appendChild(script);
    }
  }, []);

  // 身分驗證規則 (Rule 3: Auth Before Queries)
  useEffect(() => {
    if (!auth) return;
    const performSignIn = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.warn("Auth token mismatch or error, falling back to anonymous sign-in.", err);
        try {
          await signInAnonymously(auth);
        } catch (anonErr) {
          setError("驗證系統初始化失敗，請檢查網路連接。");
        }
      }
    };

    performSignIn();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setTimeout(() => setIsLoading(false), 500);
      }
    });
    return () => unsubscribe();
  }, []);

  // 資料監聽規則 (Rule 1: Path Verification)
  useEffect(() => {
    if (!user || !db) return;
    
    const unsubExams = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'exams'), (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExams(loaded);
      setActiveExam(loaded.find(e => e.isActive) || null);
    }, (err) => {
      console.error("Firestore error (exams):", err);
      if (err.code === 'permission-denied') {
          setError("資料庫存取遭拒。請確認您的 Security Rules 與 App ID 路徑。");
      }
    });

    const unsubQ = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'questions'), (snapshot) => {
      setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Firestore error (questions):", err));

    const unsubR = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'records'), (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Firestore error (records):", err));

    return () => { unsubExams(); unsubQ(); unsubR(); };
  }, [user]);

  const handleStartExam = useCallback(() => {
    if (!activeExam) return alert("目前沒有開放中的考卷。");
    setIsChecking(true);
    const existing = records.find(r => 
      String(r.studentId).trim().toUpperCase() === String(studentInfo.id).trim().toUpperCase() &&
      r.examId === activeExam.id
    );
    if (existing) {
      setExamResult(existing);
      setView('result');
    } else {
      setIsTestMode(false);
      setCurrentAnswers({});
      setView('student-exam');
    }
    setIsChecking(false);
  }, [activeExam, records, studentInfo]);

  const handleSubmit = useCallback(async (isForced = false) => {
    if (!user || !activeExam) return;
    const examQs = questions.filter(q => q.examId === activeExam.id);
    let choiceScore = 0;
    const graded = examQs.map(q => {
      const studentAns = String(currentAnswers[q.id] || '').trim().toUpperCase();
      const correctAns = String(q.answer || '').trim().toUpperCase();
      const isCorrect = studentAns === correctAns && studentAns !== "";
      if (isCorrect) choiceScore += q.points;
      return { qId: q.id, qText: q.text, type: q.type, correctAns: q.answer, studentAns, isCorrect, points: q.points, earnedPoints: isCorrect ? q.points : 0 };
    });

    const record = { 
      examId: activeExam.id, examTitle: activeExam.title, studentId: studentInfo.id || "TESTER", studentName: studentInfo.name || "測試", 
      choiceScore, fillScore: 0, totalScore: choiceScore, score: choiceScore, answers: graded, 
      timestamp: new Date().toISOString(), isTerminated: isForced 
    };

    if (isTestMode) { setExamResult(record); setView('result'); return; }
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'records'), record);
      setExamResult(record);
      setView('result');
    } catch (e) { alert("提交失敗：" + e.message); }
  }, [user, questions, currentAnswers, studentInfo, isTestMode, activeExam]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 font-sans p-6 text-center">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
        <p className="text-white/60 font-bold tracking-tight uppercase text-xs">正在連線至雲端伺服器...</p>
      </div>
    );
  }

  if (error) {
    const displayError = typeof error === 'object' ? error.message : String(error);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans p-6 text-center">
        <AlertTriangle className="text-red-500 mb-4" size={64} />
        <h2 className="text-2xl font-black mb-2 tracking-tight text-slate-800">系統連線異常</h2>
        <p className="text-slate-500 max-w-sm text-sm mb-6 leading-relaxed text-slate-500">{displayError}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold active:scale-95 transition-transform text-white">重新連線</button>
      </div>
    );
  }

  const renderView = () => {
    switch(view) {
      case 'student-login': return <StudentLoginView studentInfo={studentInfo} setStudentInfo={setStudentInfo} onStartExam={handleStartExam} onBack={() => setView('landing')} isChecking={isChecking} />;
      case 'student-exam': return <StudentExamView questions={questions.filter(q => q.examId === activeExam?.id)} studentInfo={studentInfo} currentAnswers={currentAnswers} setCurrentAnswers={setCurrentAnswers} isTestMode={isTestMode} onSubmit={handleSubmit} onCancel={() => { setIsTestMode(false); setView('admin-dashboard'); }} />;
      case 'result': return <ResultView examResult={examResult} isTestMode={isTestMode} onBack={() => { setIsTestMode(false); setView(isTestMode ? 'admin-dashboard' : 'landing'); }} />;
      case 'admin-login': return <AdminLoginView onBack={() => setView('landing')} onLogin={() => setView('admin-dashboard')} />;
      case 'admin-dashboard': return <AdminDashboard records={records} exams={exams} questions={questions} onBack={() => setView('landing')} onTestExam={(exam) => { setActiveExam(exam); setIsTestMode(true); setCurrentAnswers({}); setView('student-exam'); }} appId={appId} user={user} />;
      default: return <LandingView activeExam={activeExam} onStart={() => setView('student-login')} onAdminLogin={() => setView('admin-login')} />;
    }
  };

  return <div className="font-sans text-slate-800">{renderView()}</div>;
};

export default App;
