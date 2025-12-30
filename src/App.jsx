import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, 
  onSnapshot, query 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
  User, ShieldCheck, ClipboardList, Settings, LogOut, 
  CheckCircle2, Trash2, Plus, Edit3, Eye, ArrowRight, Code, AlertTriangle
} from 'lucide-react';

// --- Firebase 配置 (使用您提供的 API Key) ---
const myFirebaseConfig = {
  apiKey: "AIzaSyCL6ikY2ZO8JRMqDBguEMa59kX2-is6GpU",
  authDomain: "ds-final-exam.firebaseapp.com",
  projectId: "ds-final-exam",
  storageBucket: "ds-final-exam.firebasestorage.app",
  messagingSenderId: "1090141287700",
  appId: "1:1090141287700:web:07038a72f4a972e4c63e01",
  measurementId: "G-T7K56Q5Z51"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : myFirebaseConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'ds-final-exam';

const INITIAL_QUESTIONS = [
  { id: 'q1', type: 'choice', text: '在時間複雜度分析中, Big-Oh 記號 O(g(n)) 主要用來表示演算法執行時間的哪個量度?', options: ['A. 最好狀況(Best Case)', 'B. 最壞狀況(Worst Case)', 'C. 平均狀況(Average Case)', 'D. 實際執行時間'], answer: 'B', points: 4 },
  { id: 'q2', type: 'choice', text: '若有費氏數列定義如下：\nint F(int n) {\n    if (n <= 1) return n;\n    return F(n-1) + F(n-2);\n}\n請問 F(5) 之回傳值為何？', options: ['A. 5', 'B. 8', 'C. 13', 'D. 3'], answer: 'A', points: 4 },
  { id: 'q3', type: 'choice', text: '下列哪種資料結構常用於函數呼叫 (Function Call) 的系統實作？', options: ['A. 堆疊(Stack)', 'B. 佇列(Queue)', 'C. 鏈結串列(Linked List)', 'D. 陣列(Array)'], answer: 'A', points: 4 },
  { id: 'q4', type: 'choice', text: '考慮下列程式片段：\nfor(i=0; i<n; i++) {\n    for(j=0; j<n; j++) {\n        printf("%d", i*j);\n    }\n}\n其時間複雜度以 Big-Oh 表示為何？', options: ['A. O(1)', 'B. O(n)', 'C. O(n^2)', 'D. O(n log n)'], answer: 'C', points: 4 },
];

// --- 子組件定義 ---

const LandingView = ({ onStart, examResult, onAdminLogin }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-white">
    <div className="bg-white/5 p-8 rounded-[3rem] backdrop-blur-xl border border-white/10 flex flex-col items-center shadow-2xl">
      <div className="bg-indigo-500 p-4 rounded-2xl mb-6 shadow-lg shadow-indigo-500/50">
        <Code size={40} />
      </div>
      <h1 className="text-4xl font-black mb-2 text-center tracking-tight">資料結構期末考</h1>
      <p className="mb-10 opacity-60 text-center max-w-xs text-sm">防作弊監考模式：切換視窗將立即終止考試</p>
      
      <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
        <button 
          onClick={onStart}
          className="bg-indigo-600 text-white p-6 rounded-3xl shadow-xl hover:bg-indigo-500 transition-all flex flex-col items-center gap-2 group active:scale-95"
        >
          <User size={32} />
          <span className="font-bold text-lg">{examResult ? '查看成績記錄' : '開始考生作答'}</span>
        </button>
        <button 
          onClick={onAdminLogin}
          className="bg-white/10 text-white p-5 rounded-3xl border border-white/10 hover:bg-white/20 transition-all flex flex-col items-center gap-2 active:scale-95"
        >
          <ShieldCheck size={28} />
          <span className="font-bold">助教管理後台</span>
        </button>
      </div>
    </div>
  </div>
);

const StudentLoginView = ({ studentInfo, setStudentInfo, onStartExam, onBack }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans text-left">
    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100">
      <h2 className="text-2xl font-black text-slate-800 mb-2 text-center">考生登入</h2>
      <p className="text-slate-400 text-center mb-8 text-sm italic">進入考試後不可離開本頁面</p>
      <div className="space-y-4">
        <div className="group">
          <label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">Student ID / 學號</label>
          <input 
            type="text" 
            className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-mono text-lg"
            placeholder="A112..."
            value={studentInfo.id}
            onChange={(e) => setStudentInfo({ ...studentInfo, id: e.target.value })}
          />
        </div>
        <div className="group">
          <label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">Name / 姓名</label>
          <input 
            type="text" 
            className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all text-lg"
            placeholder="您的姓名"
            value={studentInfo.name}
            onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
          />
        </div>
        <div className="pt-4 text-center">
          <div className="mb-4 bg-red-50 text-red-600 p-4 rounded-2xl text-[0.7rem] font-bold leading-tight text-left">
            ⚠ 警告：進入考試後，若切換分頁、縮小視窗或切換應用程式，系統將自動判定結束並提交現有答案。
          </div>
          <button 
            disabled={!studentInfo.id || !studentInfo.name}
            onClick={onStartExam}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-black disabled:opacity-30 transition-all shadow-xl flex items-center justify-center gap-2 group"
          >
            我已閱讀並開始考試 <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button onClick={onBack} className="w-full text-slate-400 text-xs font-bold mt-6 hover:text-slate-600 transition">返回首頁</button>
        </div>
      </div>
    </div>
  </div>
);

// --- 主組件 ---

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('landing');
  const [studentInfo, setStudentInfo] = useState({ id: '', name: '' });
  const [questions, setQuestions] = useState([]);
  const [records, setRecords] = useState([]);
  const [currentAnswers, setCurrentAnswers] = useState({});
  const [examResult, setExamResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const stateRef = useRef({ questions, currentAnswers, studentInfo, view });
  
  // 樣式注入：自動載入 Tailwind CSS 以防外部檔案缺失
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    stateRef.current = { questions, currentAnswers, studentInfo, view };
  }, [questions, currentAnswers, studentInfo, view]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
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
    const qRef = collection(db, 'artifacts', appId, 'public', 'data', 'questions');
    const unsubQ = onSnapshot(qRef, (snapshot) => {
      if (snapshot.empty) {
        INITIAL_QUESTIONS.forEach(q => addDoc(qRef, q));
      } else {
        setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
      setIsLoading(false);
    });
    const rRef = collection(db, 'artifacts', appId, 'public', 'data', 'records');
    const unsubR = onSnapshot(rRef, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubQ(); unsubR(); };
  }, [user]);

  useEffect(() => {
    const saved = localStorage.getItem(`exam_result_${appId}`);
    if (saved) setExamResult(JSON.parse(saved));
  }, []);

  // 防作弊監聽
  useEffect(() => {
    const handleCheatingDetected = () => {
      if (stateRef.current.view === 'student-exam') {
        handleSubmit(true);
      }
    };
    const handleVisibilityChange = () => { if (document.visibilityState === 'hidden') handleCheatingDetected(); };
    const handleBlur = () => handleCheatingDetected();

    if (view === 'student-exam') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleBlur);
    }
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [view]);

  const handleSubmit = async (isForced = false) => {
    const { questions: qs, currentAnswers: ans, studentInfo: si } = stateRef.current;
    if (!user) return;

    let score = 0;
    const graded = qs.map(q => {
      const isCorrect = String(ans[q.id] || '').trim().toUpperCase() === String(q.answer).trim().toUpperCase();
      if (isCorrect) score += q.points;
      return { qId: q.id, ans: ans[q.id] || '', isCorrect };
    });

    const record = { 
      studentId: si.id, 
      studentName: si.name, 
      score, 
      answers: graded, 
      timestamp: new Date().toISOString(),
      isTerminated: isForced
    };

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'records'), record);
      localStorage.setItem(`exam_result_${appId}`, JSON.stringify(record));
      setExamResult(record);
      setView('result');
    } catch (e) { console.error("Submit failed", e); }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-indigo-600"></div></div>;

  if (view === 'landing') return <LandingView examResult={examResult} onStart={() => examResult ? setView('result') : setView('student-login')} onAdminLogin={() => setView('admin-login')} />;
  if (view === 'student-login') return <StudentLoginView studentInfo={studentInfo} setStudentInfo={setStudentInfo} onStartExam={() => setView('student-exam')} onBack={() => setView('landing')} />;

  if (view === 'student-exam') {
    return (
      <div className="min-h-screen bg-slate-50 font-sans select-none">
        <header className="bg-white border-b sticky top-0 z-30 p-4 flex justify-between items-center px-8 shadow-sm">
          <div className="font-black text-slate-800 tracking-tight flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></div>
            監考進行中
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-[0.6rem] font-bold text-red-400 uppercase tracking-widest animate-pulse">
              切換頁面將終止考試
            </div>
            <div className="text-xs bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-black border border-slate-200">
              {studentInfo.id} / {studentInfo.name}
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto p-4 py-8 space-y-8">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-amber-800 text-xs font-bold shadow-sm text-left">
            <AlertTriangle className="shrink-0" size={18} />
            <div>
              重要：切勿點擊其他頁籤或視窗通知。一旦離開焦點，系統將立即自動交卷。
            </div>
          </div>
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden text-left">
              <span className="text-[0.65rem] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 block">Question {idx + 1} • {q.points} Pts</span>
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl mb-8">
                <p className="text-slate-800 text-base md:text-lg leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
                  {q.text}
                </p>
              </div>
              {q.type === 'choice' ? (
                <div className="grid grid-cols-1 gap-3">
                  {q.options.map((opt, i) => {
                    const val = String.fromCharCode(65 + i);
                    const active = currentAnswers[q.id] === val;
                    return (
                      <button 
                        key={i} 
                        onClick={() => setCurrentAnswers({...currentAnswers, [q.id]: val})} 
                        className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center gap-5 ${active ? 'border-indigo-600 bg-indigo-50 shadow-md ring-4 ring-indigo-500/10' : 'border-slate-50 hover:bg-slate-50 text-slate-600'}`}
                      >
                        <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center font-black ${active ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 text-slate-300'}`}>{val}</div>
                        <span className={`font-bold ${active ? 'text-indigo-900' : 'text-slate-600'}`}>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input 
                  type="text" 
                  className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold text-slate-800" 
                  placeholder="輸入回答..."
                  value={currentAnswers[q.id] || ''}
                  onChange={(e) => setCurrentAnswers({...currentAnswers, [q.id]: e.target.value})}
                />
              )}
            </div>
          ))}
          <div className="pt-4">
            <button 
              onClick={() => { if(confirm('提交後將無法修改，確定交卷？')) handleSubmit(); }} 
              className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black shadow-2xl shadow-indigo-500/40 hover:bg-indigo-700 transition transform active:scale-95"
            >
              提交試卷
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (view === 'result') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 text-center">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-lg text-center border border-slate-100">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner ${examResult?.isTerminated ? 'bg-red-100 text-red-600 shadow-red-200' : 'bg-green-100 text-green-600 shadow-green-200'}`}>
            {examResult?.isTerminated ? <AlertTriangle size={48} /> : <CheckCircle2 size={48} />}
          </div>
          <h2 className={`text-3xl font-black mb-2 tracking-tight ${examResult?.isTerminated ? 'text-red-600' : 'text-slate-800'}`}>
            {examResult?.isTerminated ? '考試已被強制終止' : '考試已完成'}
          </h2>
          <p className="text-slate-400 font-medium mb-12 leading-relaxed">
            {examResult?.isTerminated 
              ? '偵測到頁面離開，系統已自動交卷。' 
              : '成績已同步至助教端，感謝您的參與。'}
          </p>
          <div className={`bg-gradient-to-br p-10 rounded-[2.5rem] mb-10 shadow-xl text-white ${examResult?.isTerminated ? 'from-red-500 to-red-700 shadow-red-500/20' : 'from-indigo-500 to-indigo-700 shadow-indigo-500/20'}`}>
            <span className="text-[0.7rem] font-black uppercase tracking-[0.3em] opacity-60 mb-2 block">FINAL GRADE</span>
            <div className="text-8xl font-black mb-4">{examResult?.score}</div>
            <div className="text-white font-bold text-lg">{examResult?.studentId} {examResult?.studentName}</div>
          </div>
          <button onClick={() => setView('landing')} className="text-indigo-600 font-black hover:bg-indigo-50 px-8 py-3 rounded-full transition">回到首頁</button>
        </div>
      </div>
    );
  }

  if (view === 'admin-login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 text-center">
        <div className="bg-white p-12 rounded-[3rem] w-full max-w-md shadow-2xl border border-white/5 text-left">
          <h2 className="text-3xl font-black mb-10 text-slate-800 tracking-tight text-center">管理員登入</h2>
          <div className="space-y-6">
            <div className="text-left">
              <label className="block text-xs font-black text-slate-400 mb-2 tracking-widest uppercase ml-1">Password</label>
              <input 
                type="password" 
                autoFocus
                className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all font-mono text-center text-2xl" 
                placeholder="••••"
                onChange={(e) => { if(e.target.value === 'minar7917') setView('admin-dashboard'); }}
              />
            </div>
            <button onClick={() => setView('landing')} className="w-full text-slate-400 font-bold text-sm py-2">取消</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'admin-dashboard') {
    return (
      <AdminDashboard 
        records={records} 
        questions={questions} 
        onBack={() => setView('landing')} 
        appId={appId}
      />
    );
  }

  return null;
}

// --- 助教後台 ---

const AdminDashboard = ({ records, questions, onBack, appId }) => {
  const [tab, setTab] = useState('records');
  const [editingQ, setEditingQ] = useState(null);

  const deleteQuestion = async (id) => {
    if(!confirm('確定刪除？')) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'questions', id));
  };

  const saveQuestion = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      text: formData.get('text'),
      points: parseInt(formData.get('points')),
      answer: formData.get('answer'),
      type: formData.get('type'),
      options: formData.get('type') === 'choice' ? [
        formData.get('optA'), formData.get('optB'), formData.get('optC'), formData.get('optD')
      ] : []
    };

    if (editingQ.id === 'new') {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'questions'), data);
    } else {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'questions', editingQ.id), data);
    }
    setEditingQ(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-left">
      <nav className="bg-slate-900 text-white p-4 px-8 flex justify-between items-center sticky top-0 z-40">
        <div className="font-black text-xl flex items-center gap-2"><ShieldCheck className="text-indigo-400" /> Exam Management</div>
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition"><LogOut /></button>
      </nav>

      <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10">
        <div className="flex gap-4 mb-10 overflow-x-auto pb-2">
          <button onClick={() => setTab('records')} className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black transition-all ${tab === 'records' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-500 hover:bg-white/80 border border-slate-200'}`}><ClipboardList size={20} /> 答題紀錄</button>
          <button onClick={() => setTab('questions')} className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black transition-all ${tab === 'questions' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-500 hover:bg-white/80 border border-slate-200'}`}><Settings size={20} /> 題庫管理</button>
        </div>

        {tab === 'records' ? (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden text-left">
            <div className="overflow-x-auto text-left">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest text-left">
                    <th className="p-6">Student</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Submitted At</th>
                    <th className="p-6 text-center">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-left">
                  {records.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition text-left">
                      <td className="p-6">
                        <div className="font-black text-slate-800">{r.studentName}</div>
                        <div className="font-mono text-xs text-indigo-500">{r.studentId}</div>
                      </td>
                      <td>
                        {r.isTerminated ? (
                          <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[0.6rem] font-black uppercase">強制終止</span>
                        ) : (
                          <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[0.6rem] font-black uppercase">正常交卷</span>
                        )}
                      </td>
                      <td>
                        <span className={`px-4 py-1 rounded-full font-black text-lg ${r.score >= 60 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>{r.score}</span>
                      </td>
                      <td className="text-slate-400 text-sm font-medium">{new Date(r.timestamp).toLocaleString()}</td>
                      <td className="p-6 text-center">
                        <button onClick={() => alert(JSON.stringify(r.answers, null, 2))} className="text-indigo-600 font-bold hover:underline"><Eye size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {records.length === 0 && <div className="p-20 text-center text-slate-400 font-bold">目前暫無答題紀錄</div>}
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-left">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-slate-800">試題庫 ({questions.length})</h3>
              <button onClick={() => setEditingQ({ id: 'new', type: 'choice', text: '', answer: 'A', points: 4, options: ['', '', '', ''] })} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl flex items-center gap-2 hover:bg-indigo-700 font-black transition"><Plus size={20} /> 新增題目</button>
            </div>
            <div className="grid grid-cols-1 gap-6 text-left">
              {questions.map((q, idx) => (
                <div key={q.id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 items-start text-left">
                  <div className="flex-1 w-full overflow-hidden text-left">
                    <div className="flex items-center gap-3 mb-4 text-left">
                      <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-xl text-xs font-black">NO. {idx+1}</span>
                      <span className={`px-3 py-1 rounded-xl text-[0.6rem] font-black uppercase ${q.type === 'choice' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>{q.type === 'choice' ? '選擇' : '填空'}</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 overflow-x-auto text-left">
                      <p className="font-mono text-sm text-slate-700 whitespace-pre-wrap text-left">{q.text}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 text-left">
                    <button onClick={() => setEditingQ(q)} className="p-4 text-blue-500 hover:bg-blue-50 rounded-2xl"><Edit3 size={24} /></button>
                    <button onClick={() => deleteQuestion(q.id)} className="p-4 text-red-500 hover:bg-red-50 rounded-2xl"><Trash2 size={24} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {editingQ && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-8 border-b flex justify-between items-center font-black">
              <h3 className="text-2xl text-slate-800">{editingQ.id === 'new' ? '新增考題' : '編輯考題'}</h3>
              <button onClick={() => setEditingQ(null)} className="text-slate-400 hover:text-slate-600"><LogOut size={24} className="rotate-90"/></button>
            </div>
            <form onSubmit={saveQuestion} className="p-8 space-y-6 overflow-y-auto flex-1 text-left">
              <div>
                <label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase ml-1">題目敘述 (支援縮排)</label>
                <textarea name="text" defaultValue={editingQ.text} required className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-3xl h-64 outline-none transition-all font-mono text-sm leading-relaxed" placeholder="請在此輸入題目內容..."></textarea>
              </div>
              <div className="grid grid-cols-2 gap-6 text-left">
                <div>
                  <label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase ml-1">題型</label>
                  <select name="type" defaultValue={editingQ.type} className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 border-none">
                    <option value="choice">選擇題</option>
                    <option value="fill">填空題</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase ml-1">配分</label>
                  <input name="points" type="number" defaultValue={editingQ.points} className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" />
                </div>
              </div>
              <div className="text-left">
                <label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase ml-1">正確答案</label>
                <input name="answer" defaultValue={editingQ.answer} required className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-mono font-black text-indigo-600" placeholder="A-D 或 填空文字" />
              </div>
              {editingQ.type === 'choice' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-[2rem] text-left">
                  {['A', 'B', 'C', 'D'].map((lab, i) => (
                    <div key={lab} className="text-left">
                      <label className="text-[0.6rem] font-black text-slate-400 mb-1 block uppercase ml-1">選項 {lab}</label>
                      <input name={`opt${lab}`} defaultValue={editingQ.options[i]} placeholder={`輸入選項 ${lab}`} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-600" />
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-4 flex gap-4 text-left">
                <button type="submit" className="flex-1 bg-slate-900 text-white py-5 rounded-3xl font-black hover:bg-black transition">儲存題目</button>
                <button type="button" onClick={() => setEditingQ(null)} className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-3xl font-black">取消</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
