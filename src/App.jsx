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
  AlertTriangle, PlayCircle, BookOpen, Layers, X, Check, FileDown, ArrowLeft, Save
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

const appId = 'ds-final-exam-pro'; 
const app = initializeApp(myFirebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 靜態視圖組件 (使用 memo 並優化置中排版) ---

const LandingView = memo(({ onStart, examResult, onAdminLogin, activeExam }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4 text-white font-sans">
    <div className="bg-white/5 p-10 rounded-[3rem] backdrop-blur-xl border border-white/10 flex flex-col items-center shadow-2xl max-w-sm w-full">
      <div className="bg-indigo-600 p-4 rounded-3xl mb-6 shadow-xl shadow-indigo-500/30 flex items-center justify-center"><BookOpen size={48} /></div>
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
          <span className="font-black text-xl">考生測驗入口</span>
        </button>
        <button 
          onClick={onAdminLogin} 
          className="bg-white/10 text-white p-5 rounded-3xl border border-white/10 hover:bg-white/20 transition-all flex flex-col items-center justify-center gap-2 active:scale-95"
        >
          <ShieldCheck size={24} />
          <span className="font-bold">助教後台管理</span>
        </button>
      </div>
    </div>
  </div>
));

const StudentLoginView = memo(({ studentInfo, setStudentInfo, onStartExam, onBack, isChecking }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100">
      <h2 className="text-2xl font-black text-slate-800 mb-2 text-center">開始測驗</h2>
      <p className="text-slate-400 text-center mb-8 text-sm italic">請確實填寫，每個學號僅限作答一次</p>
      <div className="space-y-4">
        <div className="text-left">
          <label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">Student ID / 學號</label>
          <input 
            type="text" 
            className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-mono text-lg text-slate-700" 
            placeholder="例如：A112001" 
            value={studentInfo.id} 
            onChange={(e) => setStudentInfo(prev => ({ ...prev, id: e.target.value }))} 
          />
        </div>
        <div className="text-left">
          <label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">Name / 姓名</label>
          <input 
            type="text" 
            className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all text-lg text-slate-700" 
            placeholder="您的姓名" 
            value={studentInfo.name} 
            onChange={(e) => setStudentInfo(prev => ({ ...prev, name: e.target.value }))} 
          />
        </div>
        <div className="pt-4 flex flex-col items-center gap-3">
          <button 
            disabled={!studentInfo.id || !studentInfo.name || isChecking} 
            onClick={onStartExam} 
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-black disabled:opacity-30 transition-all shadow-xl flex items-center justify-center gap-2 group"
          >
            {isChecking ? "驗證中..." : "確認資料並進入"} <ArrowRight size={20} />
          </button>
          <button onClick={onBack} className="text-slate-400 text-xs font-bold hover:text-slate-600 transition">返回首頁</button>
        </div>
      </div>
    </div>
  </div>
));

// --- 主組件 ---

export default function App() {
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

  const stateRef = useRef({ questions, currentAnswers, studentInfo, view, isTestMode, activeExam });
  
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    stateRef.current = { questions, currentAnswers, studentInfo, view, isTestMode, activeExam };
  }, [questions, currentAnswers, studentInfo, view, isTestMode, activeExam]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try { await signInWithCustomToken(auth, __initial_auth_token); } 
          catch { await signInAnonymously(auth); }
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth error:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubExams = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'exams'), (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExams(loaded);
      setActiveExam(loaded.find(e => e.isActive) || null);
    });
    const unsubQ = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'questions'), (snapshot) => {
      setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    });
    const unsubR = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'records'), (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
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
    const { questions: allQs, currentAnswers: ans, studentInfo: si, isTestMode: tm, activeExam: ae } = stateRef.current;
    if (!user || !ae) return;

    const examQs = allQs.filter(q => q.examId === ae.id);
    let choiceScore = 0;
    
    const graded = examQs.map(q => {
      if (q.type === 'choice') {
        const isCorrect = String(ans[q.id] || '').trim().toUpperCase() === String(q.answer).trim().toUpperCase();
        if (isCorrect) choiceScore += q.points;
        return { 
          qId: q.id, qText: q.text, type: q.type, 
          correctAns: q.answer, studentAns: ans[q.id] || '', 
          isCorrect, points: q.points, earnedPoints: isCorrect ? q.points : 0
        };
      } else {
        return { 
          qId: q.id, qText: q.text, type: q.type, 
          correctAns: q.answer, studentAns: ans[q.id] || '', 
          isCorrect: false, points: q.points, earnedPoints: 0, isManuallyGraded: false
        };
      }
    });

    const record = { 
      examId: ae.id,
      examTitle: ae.title,
      studentId: si.id || "TESTER", 
      studentName: si.name || "測試模式", 
      choiceScore, fillScore: 0, totalScore: choiceScore,
      answers: graded, 
      timestamp: new Date().toISOString(),
      isTerminated: isForced
    };

    if (tm) { setExamResult(record); setView('result'); return; }

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'records'), record);
      setExamResult(record);
      setView('result');
    } catch (e) { alert("提交失敗：" + e.message); }
  }, [user]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-indigo-600"></div></div>;

  const renderView = () => {
    switch(view) {
      case 'student-login':
        return <StudentLoginView studentInfo={studentInfo} setStudentInfo={setStudentInfo} onStartExam={handleStartExam} onBack={() => setView('landing')} isChecking={isChecking} />;
      case 'student-exam':
        return <StudentExamView questions={questions.filter(q => q.examId === activeExam?.id)} studentInfo={studentInfo} currentAnswers={currentAnswers} setCurrentAnswers={setCurrentAnswers} isTestMode={isTestMode} onSubmit={handleSubmit} onCancel={() => { setIsTestMode(false); setView('admin-dashboard'); }} />;
      case 'result':
        return <ResultView examResult={examResult} isTestMode={isTestMode} onBack={() => { setIsTestMode(false); setView(isTestMode ? 'admin-dashboard' : 'landing'); }} />;
      case 'admin-login':
        return <AdminLoginView onBack={() => setView('landing')} onLogin={() => setView('admin-dashboard')} />;
      case 'admin-dashboard':
        return <AdminDashboard records={records} exams={exams} questions={questions} onBack={() => setView('landing')} onTestExam={(exam) => { setActiveExam(exam); setIsTestMode(true); setCurrentAnswers({}); setView('student-exam'); }} appId={appId} user={user} />;
      default:
        return <LandingView activeExam={activeExam} examResult={examResult} onStart={() => examResult ? setView('result') : setView('student-login')} onAdminLogin={() => setView('admin-login')} />;
    }
  };

  return <div className="font-sans text-slate-800">{renderView()}</div>;
}

// --- 子視圖組件 ---

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

  return (
    <div className="min-h-screen bg-slate-50 select-none pb-20 text-left">
      <header className={`border-b sticky top-0 z-30 p-4 flex justify-between items-center px-8 shadow-sm ${isTestMode ? 'bg-amber-500 text-white' : 'bg-white text-slate-800'}`}>
        <div className="font-black tracking-tight flex items-center gap-2 uppercase text-sm">
          {isTestMode ? <PlayCircle size={18} /> : <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping text-center"></div>}
          {isTestMode ? "測試模式" : "測驗中"}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[0.6rem] bg-black/10 px-4 py-2 rounded-xl font-black border border-black/5 text-center">
            {isTestMode ? "PREVIEW" : `${studentInfo.id} / ${studentInfo.name}`}
          </div>
          {isTestMode && <button onClick={onCancel} className="p-2 hover:bg-black/10 rounded-lg flex items-center justify-center transition-all"><ArrowLeft size={18} /></button>}
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-4 py-8 space-y-8 text-left">
        {!isTestMode && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-amber-800 text-xs font-bold shadow-sm">
            <AlertTriangle className="shrink-0" size={18} />
            <div>防作弊系統監控中：切換分頁或失去視窗焦點將自動交卷。</div>
          </div>
        )}
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden text-left">
            <div className="flex justify-between items-center mb-4 text-left">
              <span className="text-[0.6rem] font-black text-indigo-500 uppercase tracking-[0.2em]">Q {idx + 1} • {q.points} Pts</span>
              <span className={`text-[0.6rem] font-black px-2 py-1 rounded-lg ${q.type === 'choice' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}>{q.type === 'choice' ? '選擇題' : '填空題'}</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl mb-8 font-mono overflow-x-auto text-left leading-relaxed">{q.text}</div>
            {q.type === 'choice' ? (
              <div className="grid grid-cols-1 gap-3 text-left">
                {q.options.map((opt, i) => {
                  const val = String.fromCharCode(65 + i);
                  const active = currentAnswers[q.id] === val;
                  return (<button key={i} onClick={() => setCurrentAnswers(prev => ({...prev, [q.id]: val}))} className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center gap-5 ${active ? 'border-indigo-600 bg-indigo-50 shadow-md ring-4 ring-indigo-500/10' : 'border-slate-50 hover:bg-slate-50 text-slate-600'}`}><div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center font-black ${active ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 text-slate-300'}`}>{val}</div><span className={`font-bold ${active ? 'text-indigo-900' : 'text-slate-600'}`}>{opt}</span></button>);
                })}
              </div>
            ) : (
              <input type="text" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold text-left" placeholder="在此輸入您的答案..." value={currentAnswers[q.id] || ''} onChange={(e) => setCurrentAnswers(prev => ({...prev, [q.id]: e.target.value}))} />
            )}
          </div>
        ))}
        <div className="flex justify-center pt-4">
          <button 
            onClick={() => { if(confirm('提交後將無法修改，確定交卷？')) onSubmit(); }} 
            className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black shadow-2xl hover:bg-indigo-700 transition active:scale-95 text-xl flex items-center justify-center"
          >
            提交並交卷
          </button>
        </div>
      </main>
    </div>
  );
});

const ResultView = memo(({ examResult, isTestMode, onBack }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
    <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-lg text-center border border-slate-100 flex flex-col items-center">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 shadow-inner ${examResult?.isTerminated ? 'bg-red-100 text-red-600 shadow-red-200' : 'bg-green-100 text-green-600 shadow-green-200'}`}>
        {examResult?.isTerminated ? <AlertTriangle size={48} /> : <CheckCircle2 size={48} />}
      </div>
      <h2 className="text-3xl font-black mb-2 tracking-tight">{isTestMode ? "測試完成" : (examResult?.isTerminated ? '測驗被強制終止' : '測驗已結束')}</h2>
      <p className="text-slate-400 font-medium mb-12 leading-relaxed">
        {isTestMode ? "此為測試模式模擬結果。" : "成績已成功存檔，填空題待閱卷後更新分數。"}
      </p>
      <div className={`w-full bg-gradient-to-br p-10 rounded-[2.5rem] mb-10 shadow-xl text-white ${isTestMode ? 'from-amber-500 to-amber-700' : (examResult?.isTerminated ? 'from-red-500 to-red-700' : 'from-slate-800 to-slate-900')}`}>
        <span className="text-[0.7rem] font-black uppercase tracking-[0.3em] opacity-60 mb-2 block text-center">Score (選擇題得分)</span>
        <div className="text-8xl font-black mb-4 tracking-tighter text-center">{examResult?.choiceScore ?? examResult?.score}</div>
        <div className="h-px bg-white/20 w-16 mx-auto mb-4"></div>
        <div className="text-white font-bold text-center">{examResult?.studentId} {examResult?.studentName}</div>
      </div>
      <button onClick={onBack} className="text-indigo-600 font-black hover:bg-indigo-50 px-10 py-3 rounded-full transition flex items-center justify-center">返回首頁</button>
    </div>
  </div>
));

const AdminLoginView = memo(({ onBack, onLogin }) => {
  const [pwd, setPwd] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans">
      <div className="bg-white p-12 rounded-[3rem] w-full max-w-md shadow-2xl border border-white/10 text-center flex flex-col items-center">
        <h2 className="text-3xl font-black mb-10 text-slate-800 tracking-tight">管理員登入</h2>
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

const AdminDashboard = memo(({ records, exams, questions, onBack, onTestExam, appId, user }) => {
  const [tab, setTab] = useState('records');
  const [editingExam, setEditingExam] = useState(null);
  const [editingQ, setEditingQ] = useState(null);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [gradingAnswers, setGradingAnswers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const exportToExcel = useCallback(() => {
    if (!selectedExamId) return alert("請先選取一份考卷");
    const currentExam = exams.find(e => e.id === selectedExamId);
    const filtered = records.filter(r => r.examId === selectedExamId);
    if (filtered.length === 0) return alert("該考卷目前無答題紀錄。");
    let csv = "\ufeff" + "考卷標題,學號,姓名,選擇得分,填空得分,總分,時間,狀態\n";
    filtered.forEach(r => { csv += `"${r.examTitle}","${r.studentId}","${r.studentName}",${r.choiceScore || 0},${r.fillScore || 0},${r.totalScore || r.score},"${new Date(r.timestamp).toLocaleString()}","${r.isTerminated ? '終止' : '正常'}"\n`; });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })));
    link.setAttribute("download", `${currentExam.title}_全體成績報表.csv`);
    link.click();
  }, [exams, records, selectedExamId]);

  const saveExam = async (e) => {
    e.preventDefault();
    if (!user) return alert("驗證中...");
    const title = new FormData(e.target).get('title');
    setIsSaving(true);
    try {
      if (editingExam.id === 'new') await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'exams'), { title, isActive: false });
      else await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', editingExam.id), { title });
      setEditingExam(null);
    } catch (err) { alert("儲存失敗"); } finally { setIsSaving(false); }
  };

  const saveQuestion = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      examId: selectedExamId, text: formData.get('text'),
      points: parseInt(formData.get('points')), answer: formData.get('answer'),
      type: formData.get('type'),
      options: formData.get('type') === 'choice' ? [formData.get('optA'), formData.get('optB'), formData.get('optC'), formData.get('optD')] : []
    };
    try {
      if (editingQ.id === 'new') await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'questions'), data);
      else await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'questions', editingQ.id), data);
      setEditingQ(null);
    } catch (e) { alert("考題儲存失敗"); }
  };

  const saveManualGrades = async () => {
    if (!viewingRecord) return;
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
      setViewingRecord(null); alert("成績已更新！");
    } catch (e) { alert("閱卷失敗"); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-left pb-20">
      <nav className="bg-slate-900 text-white p-4 px-8 flex justify-between items-center sticky top-0 z-40 shadow-xl">
        <div className="font-black text-xl flex items-center gap-3"><div className="bg-indigo-500 p-2 rounded-xl flex items-center justify-center text-white"><ShieldCheck size={20} /></div>助教控制中心</div>
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition text-slate-400 flex items-center justify-center"><LogOut /></button>
      </nav>

      <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 flex flex-col">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-10 bg-white p-2 rounded-3xl shadow-sm border border-slate-200 w-fit self-center md:self-start">
          <button onClick={() => setTab('records')} className={`px-8 py-3 rounded-2xl font-black transition-all ${tab === 'records' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'} flex items-center justify-center`}>測驗紀錄</button>
          <button onClick={() => setTab('exams')} className={`px-8 py-3 rounded-2xl font-black transition-all ${tab === 'exams' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'} flex items-center justify-center`}>考卷管理</button>
          <button onClick={() => setTab('questions')} className={`px-8 py-3 rounded-2xl font-black transition-all ${tab === 'questions' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'} flex items-center justify-center`}>題庫編輯</button>
        </div>

        {tab === 'records' && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-xl">考生紀錄</h3>
              <div className="flex items-center gap-2">
                <select className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none text-slate-700 cursor-pointer" onChange={(e)=>setSelectedExamId(e.target.value)} value={selectedExamId || ''}>
                  <option value="">-- 選取考卷匯出 --</option>
                  {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
                <button onClick={exportToExcel} className="bg-green-600 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg hover:bg-green-700 transition flex items-center justify-center gap-2">
                  <FileDown size={14}/> 匯出 CSV
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b text-[0.6rem] font-black text-slate-400 uppercase tracking-widest">
                  <tr><th className="p-6 text-left">學號 / 姓名</th><th className="text-left">選擇分</th><th className="text-left">填空分</th><th className="text-left text-center">總分</th><th className="text-center">操作</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="p-6"><div className="font-black text-slate-800">{r.studentName}</div><div className="font-mono text-[0.6rem] text-indigo-500 font-black">{r.studentId}</div></td>
                      <td className="font-bold text-slate-500">{r.choiceScore ?? r.score}</td>
                      <td className="font-bold text-indigo-600">{r.fillScore ?? 0}</td>
                      <td className="text-center"><span className={`px-4 py-1 rounded-full font-black ${ (r.totalScore ?? r.score) >= 60 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50' } inline-block min-w-[3rem]`}>{r.totalScore ?? r.score}</span></td>
                      <td className="p-6 text-center"><button onClick={() => { setViewingRecord(r); setGradingAnswers(r.answers.map(a=>({qId:a.qId, val:a.earnedPoints}))); }} className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[0.65rem] font-black hover:bg-indigo-600 transition flex items-center justify-center mx-auto">閱卷</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {records.length === 0 && <div className="p-20 text-center text-slate-300 font-black">目前尚無測驗數據</div>}
            </div>
          </div>
        )}

        {tab === 'exams' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.map(e => (
              <div key={e.id} className={`bg-white p-8 rounded-[2.5rem] border-2 flex flex-col justify-between ${e.isActive ? 'border-green-500 shadow-xl ring-8 ring-green-500/5' : 'border-slate-100'}`}>
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-[0.6rem] font-black uppercase ${e.isActive ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>{e.isActive ? '對外開放中' : '目前關閉'}</span>
                    <div className="flex gap-2 text-slate-300">
                      <button onClick={() => setEditingExam(e)} className="hover:text-indigo-500 transition-colors"><Edit3 size={18}/></button>
                      <button onClick={async () => { if(confirm('確定刪除此考卷及其所有題目？')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', e.id)); }} className="hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                    </div>
                  </div>
                  <h4 className="text-2xl font-black text-slate-800 mb-6 text-left">{e.title}</h4>
                </div>
                <div className="flex gap-3 pt-4 border-t border-slate-50">
                  <button 
                    onClick={async () => {
                      const all = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'exams'));
                      for(let d of all.docs) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', d.id), { isActive: false });
                      if(!e.isActive) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', e.id), { isActive: true });
                    }} 
                    className={`flex-1 py-3 rounded-2xl font-black text-xs transition flex items-center justify-center ${e.isActive ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/20'}`}
                  >
                    {e.isActive ? '停止對外開放' : '啟動正式測驗'}
                  </button>
                  <button 
                    onClick={() => onTestExam(e)} 
                    className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-xs flex items-center justify-center gap-2 hover:bg-black transition active:scale-95"
                  >
                    <PlayCircle size={16}/> 測試
                  </button>
                </div>
              </div>
            ))}
            <button 
              onClick={() => setEditingExam({ id: 'new', title: '' })} 
              className="h-full min-h-[220px] border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-all hover:bg-white active:scale-95 group"
            >
              <Plus size={48} className="group-hover:rotate-90 transition-transform"/>
              <span className="font-black text-lg">建立新考卷</span>
            </button>
          </div>
        )}

        {tab === 'questions' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
              <div className="flex-1">
                <label className="block text-[0.6rem] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">選擇編輯目標考卷</label>
                <select className="w-full md:w-80 p-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 shadow-inner border-none cursor-pointer" value={selectedExamId || ''} onChange={(e) => setSelectedExamId(e.target.value)}>
                  <option value="">-- 請選取考卷 --</option>
                  {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              </div>
              {selectedExamId && (
                <button 
                  onClick={() => setEditingQ({ id: 'new', type: 'choice', text: '', answer: 'A', points: 4, options: ['', '', '', ''] })} 
                  className="bg-indigo-600 text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 font-black transition shadow-lg active:scale-95"
                >
                  <Plus size={20} /> 新增題目
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-6">
              {selectedExamId && questions.filter(q => q.examId === selectedExamId).map((q, idx) => (
                <div key={q.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 items-start text-left">
                  <div className="flex-1 w-full overflow-hidden text-left">
                    <div className="flex items-center gap-3 mb-4 text-left">
                      <span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest">Q {idx+1}</span>
                      <span className="text-indigo-600 font-black text-xs underline underline-offset-4">{q.points} Pts</span>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 font-mono text-sm text-slate-700 whitespace-pre-wrap leading-relaxed text-left">{q.text}</div>
                    <div className="mt-4 font-black text-green-600 px-2 text-sm text-left">參考解答：{q.answer}</div>
                  </div>
                  <div className="flex md:flex-col gap-2 shrink-0">
                    <button onClick={() => setEditingQ(q)} className="p-4 bg-slate-50 text-indigo-500 hover:bg-indigo-500 hover:text-white rounded-2xl transition flex items-center justify-center shadow-sm"><Edit3 size={20}/></button>
                    <button onClick={async () => { if(confirm('確定刪除題目？')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'questions', q.id)); }} className="p-4 bg-slate-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition flex items-center justify-center shadow-sm"><Trash2 size={20}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- 全局 Modals (確保按鈕 row 置中) --- */}
      
      {editingExam && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl flex flex-col items-center">
            <h3 className="text-xl font-black mb-8 text-slate-800 w-full text-center">考卷設定</h3>
            <form onSubmit={saveExam} className="space-y-6 w-full">
              <div className="text-left">
                <label className="text-[0.65rem] font-black text-slate-400 mb-2 block uppercase ml-1">考卷標題名稱</label>
                <input name="title" defaultValue={editingExam.title} required autoFocus className="w-full p-5 bg-slate-50 rounded-2xl font-bold shadow-inner border-none outline-none text-slate-700 focus:ring-2 focus:ring-indigo-600 transition-all" />
              </div>
              <div className="flex gap-4 justify-center">
                <button type="submit" disabled={isSaving} className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black shadow-lg hover:bg-black transition flex items-center justify-center disabled:opacity-50">{isSaving ? '儲存中...' : '確認儲存'}</button>
                <button type="button" onClick={() => setEditingExam(null)} className="flex-1 bg-slate-100 py-4 rounded-xl font-black text-slate-600 hover:bg-slate-200 transition flex items-center justify-center">取消返回</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingRecord && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[60] flex items-center justify-center p-4 font-sans text-left">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50 text-left">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-900 rounded-3xl flex flex-col items-center justify-center text-white shadow-lg">
                  <span className="text-[0.5rem] font-bold opacity-50 uppercase tracking-widest">Total</span>
                  <span className="text-2xl font-black tracking-tighter">
                    {(viewingRecord.choiceScore || 0) + gradingAnswers.reduce((acc, curr) => {
                      const q = viewingRecord.answers.find(ans => ans.qId === curr.qId);
                      return acc + (q?.type === 'fill' ? curr.val : 0);
                    }, 0)}
                  </span>
                </div>
                <div className="text-left">
                  <h3 className="font-black text-slate-800 text-2xl">{viewingRecord.studentName}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{viewingRecord.studentId} • 線上閱卷中心</p>
                </div>
              </div>
              <button onClick={() => setViewingRecord(null)} className="p-2 text-slate-300 hover:text-red-500 transition flex items-center justify-center"><X size={32}/></button>
            </div>
            
            <div className="p-10 space-y-8 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {viewingRecord.answers.map((a, idx) => (
                  <div key={idx} className={`p-8 rounded-[2.5rem] border-2 bg-white transition-all text-left ${a.type === 'choice' ? 'border-slate-100 opacity-60' : 'border-indigo-500 shadow-xl ring-8 ring-indigo-500/5'}`}>
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-2"><span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-xl text-[0.6rem] font-black uppercase tracking-tighter">Q{idx+1}</span><span className={`px-3 py-1 rounded-xl text-[0.6rem] font-black uppercase ${a.type === 'choice' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}>{a.type === 'choice' ? '選擇 (自動)' : '填空 (評分)'}</span></div>
                      <div className="font-black text-xs text-slate-400">{a.points} Pts</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl mb-6 font-mono text-xs text-slate-600 whitespace-pre-wrap h-24 overflow-y-auto border border-slate-100 leading-relaxed">{a.qText}</div>
                    <div className="space-y-4">
                      <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100"><label className="text-[0.6rem] font-black text-indigo-400 uppercase block mb-1">考生回答</label><div className="font-black text-indigo-900 text-lg">{a.studentAns || "(未答)"}</div></div>
                      <div className="p-4 bg-green-50 rounded-2xl border border-green-100"><label className="text-[0.6rem] font-black text-green-400 uppercase block mb-1">參考解答</label><div className="font-black text-green-800 text-lg">{a.correctAns}</div></div>
                      {a.type === 'fill' && (
                        <div className="pt-4 flex items-center gap-4"><label className="text-xs font-black text-slate-700 uppercase">給予給分：</label>
                          <input type="number" max={a.points} min={0} className="w-24 p-3 bg-white border-2 border-indigo-200 rounded-xl font-black text-center focus:border-indigo-600 outline-none shadow-sm text-slate-800" value={gradingAnswers.find(ga => ga.qId === a.qId)?.val ?? 0} onChange={(e) => {
                            const val = Math.min(a.points, Math.max(0, parseInt(e.target.value) || 0));
                            setGradingAnswers(prev => prev.map(p => p.qId === a.qId ? { ...p, val } : p));
                          }} />
                        <span className="text-slate-400 text-xs font-bold">/ {a.points}</span></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-8 border-t bg-white flex gap-4 justify-center shadow-inner">
              <button onClick={saveManualGrades} className="px-12 py-5 bg-indigo-600 text-white rounded-[2rem] font-black hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 active:scale-95"><Save size={20}/> 儲存變更成績</button>
              <button onClick={() => setViewingRecord(null)} className="px-12 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black hover:bg-slate-200 transition flex items-center justify-center">取消返回</button>
            </div>
          </div>
        </div>
      )}

      {editingQ && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans text-left">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-8 border-b font-black text-slate-800 text-xl text-center">編輯考題細節</div>
            <form onSubmit={saveQuestion} className="p-10 space-y-6 overflow-y-auto flex-1 text-left">
              <div><label className="text-[0.65rem] font-black text-slate-400 mb-2 block uppercase ml-1">題目全文內容 (支援等寬排版)</label><textarea name="text" defaultValue={editingQ.text} required className="w-full p-6 bg-slate-50 rounded-3xl h-64 outline-none font-mono text-sm focus:bg-white border-2 border-transparent focus:border-indigo-600 transition-all shadow-inner text-slate-700"></textarea></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="text-[0.65rem] font-black text-slate-400 mb-2 block uppercase ml-1 text-left">考題類型</label><select name="type" defaultValue={editingQ.type} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none shadow-inner appearance-none text-slate-700"><option value="choice">選擇題</option><option value="fill">填空題</option></select></div><div><label className="text-[0.65rem] font-black text-slate-400 mb-2 block uppercase ml-1 text-left">本題配分</label><input name="points" type="number" defaultValue={editingQ.points} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-left shadow-inner text-slate-700" /></div></div>
              <div><label className="text-[0.65rem] font-black text-slate-400 mb-2 block uppercase ml-1 tracking-widest">參考正確解答</label><input name="answer" defaultValue={editingQ.answer} required className="w-full p-4 bg-slate-50 rounded-2xl font-mono font-black text-indigo-600 shadow-inner text-left" /></div>
              {editingQ.type === 'choice' && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-100 p-8 rounded-[2.5rem]">{['A', 'B', 'C', 'D'].map((lab, i) => (<div key={lab}><label className="text-[0.6rem] font-black text-slate-400 mb-1 block uppercase">選項 {lab}</label><input name={`opt${lab}`} defaultValue={editingQ.options[i]} placeholder={`輸入內容...`} className="w-full p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-600 font-medium bg-white text-slate-700" /></div>))}</div>}
              <div className="flex gap-4 pt-4 justify-center"><button type="submit" className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-black transition flex items-center justify-center">確認儲存題目</button><button type="button" onClick={() => setEditingQ(null)} className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-2xl font-black transition flex items-center justify-center hover:bg-slate-200">取消</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});
