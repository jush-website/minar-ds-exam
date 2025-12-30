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
  AlertTriangle, PlayCircle, BookOpen, Layers, X, Check, FileDown, ArrowLeft, Save, 
  Sigma, Terminal, Image as ImageIcon, Loader2, CheckCircle
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

// --- 1. 輔助組件：格式化渲染 ---
const FormattedText = memo(({ content, className = "" }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (window.MathJax && containerRef.current) {
      window.MathJax.typesetPromise([containerRef.current]).catch((err) => console.error(err));
    }
  }, [content]);

  return (
    <div 
      ref={containerRef}
      className={`font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto break-words ${className}`}
    >
      {String(content || " ")}
    </div>
  );
});

// --- 2. 輔助組件：操作成功提示 ---
const SuccessToast = memo(({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-green-600 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 border-2 border-white/20 backdrop-blur-md">
        <CheckCircle size={24} />
        <span className="font-black tracking-tight">{message}</span>
      </div>
    </div>
  );
});

// --- 3. 子視圖組件 ---

const LandingView = memo(({ onStart, activeExam, onAdminLogin }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4 text-white font-sans text-center">
    <div className="bg-white/5 p-10 rounded-[3rem] backdrop-blur-xl border border-white/10 flex flex-col items-center shadow-2xl max-w-sm w-full">
      <div className="bg-indigo-600 p-4 rounded-3xl mb-6 shadow-xl shadow-indigo-500/30 flex items-center justify-center text-white"><BookOpen size={48} /></div>
      <h1 className="text-3xl font-black mb-2 tracking-tighter text-white">Minar測驗系統</h1>
      <div className="mb-8 px-4 py-1.5 bg-green-500/20 text-green-400 rounded-full text-[0.65rem] font-black uppercase tracking-widest border border-green-500/30">
        {activeExam ? `當前開放：${activeExam.title}` : "目前暫無開放測驗"}
      </div>
      <div className="grid grid-cols-1 gap-4 w-full">
        <button 
          disabled={!activeExam} 
          onClick={onStart} 
          className="bg-white text-slate-900 p-6 rounded-3xl shadow-xl hover:scale-[1.02] transition-all flex flex-col items-center justify-center gap-2 active:scale-95 disabled:opacity-30"
        >
          <User size={32} className="text-indigo-600" />
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
  <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100 flex flex-col items-center text-center">
      <h2 className="text-2xl font-black text-slate-800 mb-2">身份核對</h2>
      <p className="text-slate-400 mb-8 text-sm italic">學號一旦提交即鎖定紀錄，不可重複考試</p>
      <div className="space-y-4 w-full text-left">
        <div>
          <label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1 text-left">Student ID / 學號</label>
          <input type="text" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-mono text-lg text-slate-700 shadow-inner" placeholder="例如：A112001" value={studentInfo.id} onChange={(e) => setStudentInfo(prev => ({ ...prev, id: e.target.value }))} />
        </div>
        <div>
          <label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1 text-left">Name / 姓名</label>
          <input type="text" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all text-lg text-slate-700 shadow-inner" placeholder="您的姓名" value={studentInfo.name} onChange={(e) => setStudentInfo(prev => ({ ...prev, name: e.target.value }))} />
        </div>
        <div className="pt-4 flex flex-col items-center gap-3">
          <button disabled={!studentInfo.id || !studentInfo.name || isChecking} onClick={onStartExam} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-black disabled:opacity-30 transition-all shadow-xl flex items-center justify-center gap-2 group text-white">
            {isChecking ? "驗證中..." : "確認資料並進入"} <ArrowRight size={20} />
          </button>
          <button onClick={onBack} className="text-slate-400 text-xs font-bold hover:text-slate-600 transition">返回首頁</button>
        </div>
      </div>
    </div>
  </div>
));

const AdminLoginView = memo(({ onBack, onLogin }) => {
  const [pwd, setPwd] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans">
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

// --- 4. 題目編輯器 Modal (核心修正與升級) ---
const AdminEditQuestionModal = memo(({ editingQ, setEditingQ, saveQuestion }) => {
  const [localQ, setLocalQ] = useState(editingQ);
  
  const handleUpdate = (field, val) => setLocalQ(prev => ({ ...prev, [field]: val }));
  const handleOptionUpdate = (idx, val) => setLocalQ(prev => {
    const opts = [...prev.options];
    opts[idx] = val;
    return { ...prev, options: opts };
  });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 800000) return alert("圖片太大（上限 800KB）");
    const reader = new FileReader();
    reader.onload = () => handleUpdate('image', reader.result);
    reader.readAsDataURL(file);
  };

  const toggleTag = (currentValue, tag, callback) => {
    if (currentValue.includes(tag)) {
      // 移除標記
      const regex = new RegExp(tag.replace(/\$/g, '\\$'), 'g');
      callback(currentValue.replace(regex, '').trim());
    } else {
      // 增加標記
      if (tag === '$$') callback(`$$${currentValue}$$`);
      else if (tag === '```') callback("```\n" + currentValue + "\n```");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="bg-white rounded-[3rem] w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3 text-slate-800"><div className="bg-indigo-600 p-2 rounded-xl text-white flex items-center justify-center"><Settings size={20}/></div><h3 className="text-xl font-black">考題內容編輯器</h3></div>
          <button onClick={() => setEditingQ(null)} className="p-2 hover:text-red-500 transition-colors text-slate-400 flex items-center justify-center"><X size={32}/></button>
        </div>
        <div className="flex flex-col lg:flex-row overflow-hidden flex-1">
          <form onSubmit={(e) => { e.preventDefault(); saveQuestion(localQ); }} className="p-8 space-y-6 overflow-y-auto lg:w-1/2 border-r border-slate-100 text-left bg-white">
            <div className="space-y-2">
              <div className="flex justify-between items-end px-1">
                <label className="block text-[0.65rem] font-black text-slate-400 uppercase tracking-widest text-left">題目敘述</label>
                <div className="flex gap-2">
                   <label className="flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded cursor-pointer hover:bg-indigo-100 transition">
                     <input type="checkbox" checked={localQ.text.includes('$$')} onChange={() => toggleTag(localQ.text, '$$', (v) => handleUpdate('text', v))} className="w-3 h-3 text-indigo-600 rounded" />
                     <span className="text-[0.6rem] font-bold text-indigo-600">公式</span>
                   </label>
                   <label className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200 transition">
                     <input type="checkbox" checked={localQ.text.includes('```')} onChange={() => toggleTag(localQ.text, '```', (v) => handleUpdate('text', v))} className="w-3 h-3 text-slate-600 rounded" />
                     <span className="text-[0.6rem] font-bold text-slate-600">程式碼</span>
                   </label>
                </div>
              </div>
              <textarea value={localQ.text} onChange={(e) => handleUpdate('text', e.target.value)} required className="w-full p-5 bg-slate-50 rounded-2xl h-40 outline-none font-mono text-sm focus:bg-white border-2 border-transparent focus:border-indigo-600 transition-all shadow-inner text-slate-700 leading-relaxed"></textarea>
            </div>

            <div className="space-y-2 text-left">
              <label className="block text-[0.65rem] font-black text-slate-400 uppercase tracking-widest ml-1">題目圖片 (Base64)</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl cursor-pointer transition text-xs font-bold">
                  <ImageIcon size={16}/> {localQ.image ? "更換圖片" : "上傳示意圖"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                {localQ.image && <button type="button" onClick={() => handleUpdate('image', null)} className="text-red-500 text-xs font-bold hover:underline">移除圖片</button>}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase tracking-widest text-left">題型</label>
              <select value={localQ.type} onChange={(e) => handleUpdate('type', e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 appearance-none shadow-inner border-none outline-none"><option value="choice">單選題 (自動)</option><option value="fill">填空題 (人工)</option></select></div>
              <div><label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase tracking-widest text-left">配分</label>
              <input type="number" value={localQ.points} onChange={(e) => handleUpdate('points', e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold shadow-inner text-slate-700 text-center" /></div>
            </div>

            <div><label className="block text-[0.65rem] font-black text-slate-400 mb-2 uppercase tracking-widest text-left">正確解答</label>
            <textarea value={localQ.answer} onChange={(e) => handleUpdate('answer', e.target.value)} required className="w-full p-4 bg-slate-50 rounded-2xl font-mono font-black text-indigo-600 shadow-inner min-h-[60px]"></textarea></div>

            {localQ.type === 'choice' && (
              <div className="space-y-4">
                <label className="block text-[0.65rem] font-black text-slate-400 uppercase tracking-widest text-left">選項編輯</label>
                {['A', 'B', 'C', 'D'].map((lab, i) => (
                  <div key={lab} className="flex gap-3 items-start group">
                    <div className="flex flex-col items-center gap-2 mt-1">
                      <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black shrink-0 border border-indigo-100">{lab}</span>
                      <input type="checkbox" checked={localQ.options[i].includes('$$')} onChange={() => toggleTag(localQ.options[i], '$$', (v) => handleOptionUpdate(i, v))} title="切換公式標籤" className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />
                    </div>
                    <textarea value={localQ.options[i]} placeholder={`輸入選項 ${lab}...`} onChange={(e) => handleOptionUpdate(i, e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-xs text-slate-700 min-h-[80px] transition-all shadow-inner text-left" />
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-4 pt-6 justify-center mt-auto">
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition flex items-center justify-center active:scale-95 text-lg"><Save size={20} className="mr-2"/> 儲存題目內容</button>
              <button type="button" onClick={() => setEditingQ(null)} className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-2xl font-black hover:bg-slate-200 transition flex items-center justify-center active:scale-95 text-lg">取消</button>
            </div>
          </form>

          {/* 預覽區 */}
          <div className="p-8 lg:w-1/2 bg-slate-50 overflow-y-auto flex flex-col text-left">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-[0.7rem] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2"><Eye size={16}/> 考生視角即時渲染預覽</h4>
            </div>
            <div className="space-y-8 flex-1">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white flex flex-col text-left">
                <FormattedText content={localQ.text || "等待輸入內容..."} className="text-lg text-slate-800 text-left leading-relaxed mb-4" />
                {localQ.image && <img src={localQ.image} alt="題目圖片" className="max-w-full rounded-xl shadow-md border border-slate-100" />}
              </div>
              {localQ.type === 'choice' ? (
                <div className="space-y-4">{localQ.options.map((opt, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 flex items-start gap-5 shadow-md text-left transition-all">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex shrink-0 items-center justify-center text-[0.7rem] font-black text-slate-400 mt-0.5">{String.fromCharCode(65+i)}</div>
                    <FormattedText content={opt || "選項預覽..."} className="text-sm text-slate-600 flex-1 leading-relaxed" />
                  </div>
                ))}</div>
              ) : <div className="bg-indigo-50/50 p-12 rounded-[2.5rem] border-2 border-dashed border-indigo-100 text-indigo-300 font-black text-center italic text-sm">正式測驗時將顯示填空輸入框</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// --- 5. 助教儀表板 ---
const AdminDashboard = memo(({ records, exams, questions, onBack, onTestExam, appId, user, onShowSuccess }) => {
  const [tab, setTab] = useState('records');
  const [editingExam, setEditingExam] = useState(null);
  const [editingQ, setEditingQ] = useState(null);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [gradingAnswers, setGradingAnswers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const saveExam = async (e) => {
    e.preventDefault();
    if (!user) return;
    const title = new FormData(e.target).get('title');
    setIsSaving(true);
    try {
      if (editingExam.id === 'new') await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'exams'), { title, isActive: false });
      else await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', editingExam.id), { title });
      setEditingExam(null);
      onShowSuccess("考卷更新成功！");
    } catch (err) { alert("儲存失敗"); } finally { setIsSaving(false); }
  };

  const saveQuestion = async (qData) => {
    try {
      if (editingQ.id === 'new') await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'questions'), { ...qData, examId: selectedExamId });
      else await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'questions', editingQ.id), qData);
      setEditingQ(null);
      onShowSuccess("考題已成功儲存！");
    } catch (e) { alert("題目儲存失敗"); }
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
      setViewingRecord(null); 
      onShowSuccess("批改成績已同步！");
    } catch (e) { alert("儲存失敗"); }
  };

  const exportToExcel = useCallback(() => {
    if (!selectedExamId) return alert("請先選取一份考卷");
    const currentExam = exams.find(e => e.id === selectedExamId);
    const filtered = records.filter(r => r.examId === selectedExamId);
    if (filtered.length === 0) return alert("無答題紀錄。");
    let csv = "\ufeff" + "考卷,學號,姓名,選擇得分,填空得分,總分,狀態\n";
    filtered.forEach(r => { csv += `"${r.examTitle}","${r.studentId}","${r.studentName}",${r.choiceScore || 0},${r.fillScore || 0},${r.totalScore || r.score},"${r.isTerminated ? '異常' : '正常'}"\n`; });
    const link = document.createElement("a"); link.setAttribute("href", URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })));
    link.setAttribute("download", `${currentExam.title}_全體成績.csv`); link.click();
  }, [exams, records, selectedExamId]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-left pb-20 text-slate-800">
      <nav className="bg-slate-900 text-white p-4 px-8 flex justify-between items-center sticky top-0 z-40 shadow-xl">
        <div className="font-black text-xl flex items-center gap-3 text-white"><div className="bg-indigo-500 p-2 rounded-xl flex items-center justify-center text-white"><ShieldCheck size={20} /></div>助教管理介面</div>
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition text-slate-400 flex items-center justify-center"><LogOut /></button>
      </nav>

      <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 flex flex-col items-center md:items-start text-left">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-10 bg-white p-2 rounded-3xl shadow-sm border border-slate-200 w-fit self-center md:self-start text-left">
          <button onClick={() => setTab('records')} className={`px-8 py-3 rounded-2xl font-black transition-all ${tab === 'records' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'} flex items-center justify-center`}>測驗紀錄</button>
          <button onClick={() => setTab('exams')} className={`px-8 py-3 rounded-2xl font-black transition-all ${tab === 'exams' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'} flex items-center justify-center`}>考卷管理</button>
          <button onClick={() => setTab('questions')} className={`px-8 py-3 rounded-2xl font-black transition-all ${tab === 'questions' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'} flex items-center justify-center`}>題庫編輯</button>
        </div>

        {tab === 'records' && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden w-full text-left">
            <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 text-left">
              <h3 className="font-black text-slate-800 text-xl text-left">考生測驗數據中心</h3>
              <div className="flex items-center gap-2">
                <select className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none text-slate-700 cursor-pointer" onChange={(e)=>setSelectedExamId(e.target.value)} value={selectedExamId || ''}><option value="">-- 選取一份考卷 --</option>{exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select>
                <button onClick={exportToExcel} className="bg-green-600 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg hover:bg-green-700 transition flex items-center justify-center gap-2">匯出 CSV</button>
              </div>
            </div>
            <div className="overflow-x-auto text-left"><table className="w-full text-left border-collapse text-left"><thead className="bg-slate-50 border-b text-[0.6rem] font-black text-slate-400 uppercase tracking-widest text-left"><tr><th className="p-6">學號 / 姓名</th><th>選擇分</th><th>填空分</th><th className="text-center text-left">總分</th><th className="text-center text-left">操作</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{records.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition text-left text-slate-800"><td className="p-6 font-black">{r.studentName}<div className="font-mono text-[0.6rem] text-indigo-500">{r.studentId}</div></td>
                <td className="font-bold text-slate-500">{r.choiceScore ?? r.score}</td><td className="font-bold text-indigo-600">{r.fillScore ?? 0}</td><td className="text-center text-left"><span className={`px-4 py-1 rounded-full font-black ${ (r.totalScore ?? r.score) >= 60 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50' } text-left inline-block`}>{r.totalScore ?? r.score}</span></td>
                <td className="p-6 text-center text-left"><button onClick={() => { setViewingRecord(r); setGradingAnswers(r.answers.map(a=>({qId:a.qId, val:a.earnedPoints}))); }} className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[0.65rem] font-black hover:bg-indigo-600 transition mx-auto text-white flex items-center justify-center active:scale-95 shadow-sm">進入批改</button></td></tr>
              ))}</tbody></table></div>
          </div>
        )}

        {tab === 'exams' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full text-left">
            {exams.map(e => (
              <div key={e.id} className={`bg-white p-10 rounded-[3rem] border-2 flex flex-col justify-between ${e.isActive ? 'border-green-500 shadow-xl ring-8 ring-green-500/5' : 'border-slate-100'} text-slate-800 text-left transition-all`}>
                <div className="text-left text-slate-800">
                  <div className="flex justify-between mb-4 text-left">
                    <span className={`px-3 py-1.5 rounded-full text-[0.6rem] font-black uppercase ${e.isActive ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'} text-left`}>{e.isActive ? '對外開放中' : '目前暫不開放'}</span>
                    <div className="flex gap-2 text-slate-300 text-left"><button onClick={() => setEditingExam(e)} className="hover:text-indigo-500 flex items-center justify-center p-2 rounded-lg hover:bg-slate-50"><Edit3 size={18}/></button><button onClick={async () => { if(confirm('確定刪除？')) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', e.id)); onShowSuccess("已移除考卷"); } }} className="hover:text-red-500 flex items-center justify-center p-2 rounded-lg hover:bg-slate-50"><Trash2 size={18}/></button></div>
                  </div>
                  <h4 className="text-2xl font-black text-slate-800 mb-6 text-left leading-tight">{e.title}</h4>
                </div>
                <div className="flex gap-3 pt-4 border-t border-slate-50 text-left text-white">
                  <button onClick={async () => {
                    const all = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'exams'));
                    for(let d of all.docs) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', d.id), { isActive: false });
                    if(!e.isActive) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', e.id), { isActive: true });
                    onShowSuccess("權限狀態已更新！");
                  }} className={`flex-1 py-4 rounded-2xl font-black text-xs transition flex items-center justify-center ${e.isActive ? 'bg-slate-800 hover:bg-black' : 'bg-green-600 hover:bg-green-700 shadow-lg'}`}>{e.isActive ? '關閉測驗' : '啟用測驗'}</button>
                  <button onClick={() => onTestExam(e)} className="px-8 py-4 rounded-2xl bg-indigo-50 text-indigo-600 font-black text-xs flex items-center justify-center gap-2 hover:bg-indigo-100 transition active:scale-95 shadow-sm"><PlayCircle size={16}/> 測試預覽</button>
                </div>
              </div>
            ))}<button onClick={() => setEditingExam({ id: 'new', title: '' })} className="h-full min-h-[250px] border-4 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-all hover:bg-white active:scale-95 group text-slate-400"><Plus size={40} className="group-hover:rotate-90 transition-transform"/><span className="font-black text-lg">新增考卷</span></button>
          </div>
        )}

        {tab === 'questions' && (
          <div className="space-y-6 w-full text-left text-slate-800">
            <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 text-left text-slate-800">
              <div className="flex-1 text-left"><label className="block text-[0.6rem] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 text-left text-slate-400 text-left">目標編輯考卷</label>
              <select className="w-full md:w-80 p-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 shadow-inner border-none cursor-pointer text-left text-slate-700" value={selectedExamId || ''} onChange={(e) => setSelectedExamId(e.target.value)}><option value="">-- 選取特定考卷進行編輯 --</option>{exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select></div>
              {selectedExamId && <button onClick={() => setEditingQ({ id: 'new', type: 'choice', text: '', answer: 'A', points: 4, options: ['', '', '', ''], image: null })} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 font-black transition shadow-lg active:scale-95 text-center text-white"><Plus size={20} /> 新增題目</button>}
            </div>
            <div className="grid grid-cols-1 gap-6 text-left text-slate-800">{selectedExamId && questions.filter(q => q.examId === selectedExamId).map((q, idx) => (
              <div key={q.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 items-start text-left text-slate-800">
                <div className="flex-1 w-full overflow-hidden text-left"><div className="flex items-center gap-3 mb-4 text-left"><span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest text-left text-slate-400">Q {idx+1}</span><span className="text-indigo-600 font-black text-xs underline underline-offset-4 text-left">{q.points} Pts</span></div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left text-slate-700 leading-relaxed shadow-inner">
                  <FormattedText content={q.text} className="text-sm" />
                  {q.image && <img src={q.image} alt="示意圖" className="max-w-[200px] rounded-lg shadow-sm border border-slate-200 mt-2" />}
                </div>
                {q.type === 'choice' && (<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">{q.options.map((opt, i) => (<div key={i} className="flex items-start gap-2 bg-slate-50/50 p-2 rounded-lg text-xs text-left text-slate-600"><span className="font-black text-slate-400 text-left">{String.fromCharCode(65+i)}.</span><FormattedText content={opt} className="text-slate-600 flex-1 text-left" /></div>))}</div>)}
                <div className="mt-4 font-black text-green-600 px-2 text-sm text-left">標準解答：{q.answer}</div></div>
                <div className="flex md:flex-col gap-2 shrink-0 text-left"><button onClick={() => setEditingQ(q)} className="p-4 bg-slate-50 text-indigo-500 hover:bg-indigo-500 hover:text-white rounded-2xl transition flex items-center justify-center shadow-sm text-indigo-500 active:scale-95"><Edit3 size={20}/></button>
                <button onClick={async () => { if(confirm('確定刪除題目？')) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'questions', q.id)); onShowSuccess("已移除該題目！"); } }} className="p-4 bg-slate-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition flex items-center justify-center shadow-sm text-red-500 active:scale-95"><Trash2 size={20}/></button></div>
              </div>
            ))}</div>
          </div>
        )}
      </div>

      {/* --- 全局 Modal: 閱卷視窗 --- */}
      {viewingRecord && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[60] flex items-center justify-center p-4 text-slate-800 text-left">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col text-left border border-white/10">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50 text-left">
              <div className="flex items-center gap-6 text-left">
                <div className="w-16 h-16 bg-slate-900 rounded-3xl flex flex-col items-center justify-center text-white shadow-lg text-white font-black"><span className="text-[0.5rem] font-bold opacity-50 uppercase tracking-widest text-white text-white">Total</span><span className="text-2xl font-black tracking-tighter text-white">{(viewingRecord.choiceScore || 0) + gradingAnswers.reduce((acc, curr) => { const q = viewingRecord.answers.find(ans => ans.qId === curr.qId); return acc + (q?.type === 'fill' ? curr.val : 0); }, 0)}</span></div>
                <div className="text-left text-slate-800 text-left"><h3 className="font-black text-2xl text-slate-800 text-left">{viewingRecord.studentName}</h3><p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-left">{viewingRecord.studentId} • 批閱中心</p></div>
              </div>
              <button onClick={() => setViewingRecord(null)} className="p-2 text-slate-300 hover:text-red-500 transition flex items-center justify-center"><X size={32}/></button>
            </div>
            <div className="p-10 space-y-8 overflow-y-auto flex-1 bg-slate-50/50 text-left text-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">{viewingRecord.answers.map((a, idx) => (<div key={idx} className={`p-8 rounded-[2.5rem] border-2 bg-white transition-all text-left ${a.type === 'choice' ? 'border-slate-100 opacity-60' : 'border-indigo-500 shadow-xl ring-8 ring-indigo-500/5'}`}>
                <div className="flex justify-between items-center mb-6 text-left"><div className="flex items-center gap-2 text-left text-slate-400"><span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-xl text-[0.6rem] font-black uppercase tracking-tighter text-left">Q{idx+1}</span><span className={`px-3 py-1 rounded-xl text-[0.6rem] font-black uppercase text-left ${a.type === 'choice' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}>{a.type === 'choice' ? '選擇' : '填空'}</span></div><div className="font-black text-xs text-slate-400 text-left">{a.points} Pts</div></div>
                <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100 text-left"><FormattedText content={a.qText} className="text-xs text-slate-600 h-24 overflow-y-auto text-left leading-relaxed" /></div>
                <div className="space-y-4 text-left"><div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-left shadow-inner text-indigo-900"><label className="text-[0.6rem] font-black text-indigo-400 uppercase block mb-1 text-left tracking-widest text-indigo-400">考生答案</label><FormattedText content={a.studentAns || "(未答)"} className="font-black text-indigo-900 text-lg text-left" /></div>
                <div className="p-4 bg-green-50 rounded-2xl border border-green-100 text-left shadow-inner text-green-900"><label className="text-[0.6rem] font-black text-green-400 uppercase block mb-1 text-left tracking-widest text-green-400">正確答案</label><FormattedText content={a.correctAns} className="font-black text-green-800 text-lg text-left" /></div>
                {a.type === 'fill' && (<div className="pt-4 flex items-center gap-4 text-left text-slate-800"><label className="text-xs font-black uppercase text-left tracking-widest text-slate-700 text-slate-700">給予評分：</label><input type="number" max={a.points} min={0} className="w-24 p-3 bg-white border-2 border-indigo-200 rounded-xl font-black text-center outline-none shadow-sm text-slate-800 focus:border-indigo-600 transition-all" value={gradingAnswers.find(ga => ga.qId === a.qId)?.val ?? 0} onChange={(e) => { const val = Math.min(a.points, Math.max(0, parseInt(e.target.value) || 0)); setGradingAnswers(prev => prev.map(p => p.qId === a.qId ? { ...p, val } : p)); }} /><span className="text-slate-400 text-xs font-bold text-left text-slate-400">/ {a.points} 分</span></div>)}</div></div>))}</div>
            </div>
            <div className="p-8 border-t bg-white flex gap-4 justify-center shadow-inner text-left text-white"><button onClick={saveManualGrades} className="px-12 py-5 bg-indigo-600 text-white rounded-[2rem] font-black hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 active:scale-95 text-white text-lg"><Save size={20}/> 儲存並更新成績</button>
            <button onClick={() => setViewingRecord(null)} className="px-12 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black hover:bg-slate-200 transition flex items-center justify-center text-slate-600 active:scale-95 text-lg">取消返回</button></div>
          </div>
        </div>
      )}

      {editingExam && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 text-slate-800 text-left">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl flex flex-col items-center text-left border border-white/10">
            <h3 className="text-xl font-black mb-8 w-full text-center text-slate-800 text-left">考卷標題編輯</h3>
            <form onSubmit={saveExam} className="space-y-6 w-full text-left">
              <div className="text-left w-full text-left"><label className="text-[0.65rem] font-black text-slate-400 mb-2 block uppercase ml-1 text-left tracking-widest text-slate-400">考卷名稱標題</label>
              <input name="title" defaultValue={editingExam.title} required autoFocus className="w-full p-5 bg-slate-50 rounded-2xl font-bold shadow-inner border-none outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700 text-left text-xl" /></div>
              <div className="flex gap-4 justify-center text-left text-white pt-4"><button type="submit" disabled={isSaving} className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-black transition text-white text-left flex items-center justify-center active:scale-95 text-lg">{isSaving ? '處理中...' : '確認儲存'}</button>
              <button type="button" onClick={() => setEditingExam(null)} className="flex-1 bg-slate-100 py-5 rounded-2xl font-black text-slate-600 hover:bg-slate-200 transition flex items-center justify-center active:scale-95 text-lg">取消</button></div>
            </form>
          </div>
        </div>
      )}

      {editingQ && (
        <AdminEditQuestionModal 
          editingQ={editingQ} 
          setEditingQ={setEditingQ} 
          saveQuestion={saveQuestion} 
        />
      )}
    </div>
  );
});

// --- 8. 主入口 Navigator ---

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
  const [successMessage, setSuccessMessage] = useState("");

  const stateRef = useRef({ questions, currentAnswers, studentInfo, view, isTestMode, activeExam });
  
  useEffect(() => {
    stateRef.current = { questions, currentAnswers, studentInfo, view, isTestMode, activeExam };
  }, [questions, currentAnswers, studentInfo, view, isTestMode, activeExam]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try { await signInWithCustomToken(auth, __initial_auth_token); } 
          catch { await signInAnonymously(auth); }
        } else { await signInAnonymously(auth); }
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
        return { qId: q.id, qText: q.text, type: q.type, correctAns: q.answer, studentAns: ans[q.id] || '', isCorrect, points: q.points, earnedPoints: isCorrect ? q.points : 0 };
      } else {
        return { qId: q.id, qText: q.text, type: q.type, correctAns: q.answer, studentAns: ans[q.id] || '', isCorrect: false, points: q.points, earnedPoints: 0, isManuallyGraded: false };
      }
    });
    const record = { examId: ae.id, examTitle: ae.title, studentId: si.id || "TESTER", studentName: si.name || "測試模式", choiceScore, fillScore: 0, totalScore: choiceScore, answers: graded, timestamp: new Date().toISOString(), isTerminated: isForced };
    if (tm) { setExamResult(record); setView('result'); return; }
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'records'), record);
      setExamResult(record);
      setView('result');
    } catch (e) { alert("提交失敗：" + e.message); }
  }, [user]);

  const renderView = () => {
    switch(view) {
      case 'student-login': return <StudentLoginView studentInfo={studentInfo} setStudentInfo={setStudentInfo} onStartExam={handleStartExam} onBack={() => setView('landing')} isChecking={isChecking} />;
      case 'student-exam': return <StudentExamView questions={questions.filter(q => q.examId === activeExam?.id)} studentInfo={studentInfo} currentAnswers={currentAnswers} setCurrentAnswers={setCurrentAnswers} isTestMode={isTestMode} onSubmit={handleSubmit} onCancel={() => { setIsTestMode(false); setView('admin-dashboard'); }} />;
      case 'result': return <ResultView examResult={examResult} isTestMode={isTestMode} onBack={() => { setIsTestMode(false); setView(isTestMode ? 'admin-dashboard' : 'landing'); }} />;
      case 'admin-login': return <AdminLoginView onBack={() => setView('landing')} onLogin={() => setView('admin-dashboard')} />;
      case 'admin-dashboard': return <AdminDashboard records={records} exams={exams} questions={questions} onBack={() => setView('landing')} onTestExam={(exam) => { setActiveExam(exam); setIsTestMode(true); setCurrentAnswers({}); setView('student-exam'); }} appId={appId} user={user} onShowSuccess={(msg) => setSuccessMessage(msg)} />;
      default: return <LandingView activeExam={activeExam} onStart={() => setView('student-login')} onAdminLogin={() => setView('admin-login')} />;
    }
  };

  return (
    <div className="font-sans text-slate-800">
      {successMessage && <SuccessToast message={successMessage} onClose={() => setSuccessMessage("")} />}
      {renderView()}
    </div>
  );
};

export default App;
