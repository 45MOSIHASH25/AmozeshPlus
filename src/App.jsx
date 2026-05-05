import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BookOpen, Calendar as CalendarIcon, Clock, BarChart3, Plus, Trash2, 
  Save, LayoutDashboard, UserCircle, FileSpreadsheet, Edit, Users, 
  ChevronRight, ChevronLeft, AlignVerticalJustifyStart, Grid, X,
  Moon, Sun, ListPlus, Activity, CalendarDays, Edit3, Palette, Check,
  Award, Trophy, Target, MessageSquare, CheckCircle, Send, Unlock, Lock, Flame
} from 'lucide-react';

// --- Jalaali Calendar Utilities ---
function g2j(gy, gm, gd) {
  let g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + parseInt((gy2 + 3) / 4) - parseInt((gy2 + 99) / 100) + parseInt((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * parseInt(days / 12053);
  days %= 12053;
  jy += 4 * parseInt(days / 1461);
  days %= 1461;
  jy += parseInt((days - 1) / 365);
  if (days > 365) days = (days - 1) % 365;
  let jm = (days < 186) ? 1 + parseInt(days / 31) : 7 + parseInt((days - 186) / 30);
  let jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return { jy, jm, jd };
}

function j2g(jy, jm, jd) {
  let gy = (jy <= 979) ? 621 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = (365 * jy) + ((parseInt(jy / 33)) * 8) + parseInt(((jy % 33) + 3) / 4) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * parseInt(days / 146097);
  days %= 146097;
  if (days > 36524) { gy += 100 * parseInt(--days / 36524); days %= 36524; if (days >= 365) days++; }
  gy += 4 * parseInt(days / 1461); days %= 1461; gy += parseInt((days - 1) / 365);
  if (days > 365) days = (days - 1) % 365;
  let gd = days + 1; let gm = 0;
  let g_d_m = [0, 31, ((gy % 4 == 0 && gy % 100 != 0) || (gy % 400 == 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (let i = 0; i <= 12; i++) { if (gd <= g_d_m[i]) { gm = i; break; } gd -= g_d_m[i]; }
  return { gy, gm, gd };
}

const SHAMSI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];

function getTodayJalaali() { const d = new Date(); return g2j(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
function getWeekdayFromJalaali(jy, jm, jd) { const g = j2g(jy, jm, jd); return WEEKDAYS[new Date(g.gy, g.gm - 1, g.gd).getDay()]; }

// تضمین اینکه هفته از شنبه شروع و به جمعه ختم شود
function getJalaaliWeekDays(jy, jm, jd) {
  const g = j2g(jy, jm, jd); 
  const gDate = new Date(g.gy, g.gm - 1, g.gd);
  const dayOfWeek = gDate.getDay(); 
  const diff = dayOfWeek === 6 ? 0 : dayOfWeek + 1; 
  const satDate = new Date(gDate.getFullYear(), gDate.getMonth(), gDate.getDate() - diff);
  
  return Array.from({length: 7}, (_, i) => { 
      const d = new Date(satDate.getFullYear(), satDate.getMonth(), satDate.getDate() + i); 
      return g2j(d.getFullYear(), d.getMonth() + 1, d.getDate()); 
  });
}

function getWeekSaturday(jy, jm, jd) {
  const weekDays = getJalaaliWeekDays(jy, jm, jd);
  return weekDays[0];
}

function addDaysToJalaali(jy, jm, jd, days) {
    const g = j2g(jy, jm, jd);
    const d = new Date(g.gy, g.gm - 1, g.gd + days);
    return g2j(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

// بررسی اینکه آیا یک تاریخ متعلق به هفته‌های آینده است؟
function isFutureWeek(jy, jm, jd) {
  const today = getTodayJalaali();
  const todaySat = getWeekSaturday(today.jy, today.jm, today.jd);
  const targetSat = getWeekSaturday(jy, jm, jd);

  const dateTodaySat = new Date(j2g(todaySat.jy, todaySat.jm, todaySat.jd).gy, j2g(todaySat.jy, todaySat.jm, todaySat.jd).gm - 1, j2g(todaySat.jy, todaySat.jm, todaySat.jd).gd);
  const dateTargetSat = new Date(j2g(targetSat.jy, targetSat.jm, targetSat.jd).gy, j2g(targetSat.jy, targetSat.jm, targetSat.jd).gm - 1, j2g(targetSat.jy, targetSat.jm, targetSat.jd).gd);

  return dateTargetSat > dateTodaySat;
}

// --- Logic & Helpers ---
const t2d = (t) => { if(!t) return 0; const [h,m] = t.split(':'); return Number(h) + Number(m)/60; };
const formatTime = (decimalHours) => {
  const h = Math.floor(decimalHours); const m = Math.round((decimalHours - h) * 60);
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
};

const hasOverlap = (newRec, recordsArray) => {
    const startA = t2d(newRec.startTime);
    const endA = startA + newRec.duration;
    for(let rec of recordsArray) {
        if(newRec.id && rec.id === newRec.id) continue; 
        if(rec.studentId !== newRec.studentId) continue;
        if(Boolean(rec.isTarget) !== Boolean(newRec.isTarget)) continue; 
        
        if(rec.dateString === newRec.dateString) {
            const startB = t2d(rec.startTime);
            const endB = startB + rec.duration;
            if(startA < endB && endA > startB) return true;
        }
    }
    return false;
}

// محاسبه مجموع ساعات مطالعه واقعی
function calculateStudyHours(records, studentId, periodRecordsFilterFn) {
    return records
        .filter(r => r.studentId === studentId && !r.isTarget && r.subject !== 'خواب' && periodRecordsFilterFn(r))
        .reduce((sum, r) => sum + r.duration, 0);
}

// محاسبه درصد پایبندی (همپوشانی زمان واقعی با پیشنهادی)
function calculateAdherenceScore(records, basePlans, studentId, targetWeekKey) {
    const basePlan = basePlans.find(bp => bp.studentId === studentId && bp.weekKey === targetWeekKey);
    if (!basePlan) return 0;

    const actualRecs = records.filter(r => r.studentId === studentId && !r.isTarget && r.subject !== 'خواب' && getWeekKey({jy: r.jy, jm: r.jm, jd: r.jd}) === targetWeekKey);
    let totalTargetDuration = 0;
    let totalMatchedDuration = 0;

    basePlan.records.filter(r => r.subject !== 'خواب').forEach(tBox => {
        totalTargetDuration += tBox.duration;
        let startT = t2d(tBox.startTime);
        let endT = startT + tBox.duration;

        let matchingActuals = actualRecs.filter(a => a.dateString === tBox.dateString && a.subject === tBox.subject);
        let matchForThisBox = 0;

        matchingActuals.forEach(aBox => {
            let startA = t2d(aBox.startTime);
            let endA = startA + aBox.duration;
            let overlapStart = Math.max(startT, startA);
            let overlapEnd = Math.min(endT, endA);
            if (overlapEnd > overlapStart) matchForThisBox += (overlapEnd - overlapStart);
        });
        totalMatchedDuration += Math.min(matchForThisBox, tBox.duration);
    });

    if (totalTargetDuration === 0) return 0;
    return Math.round((totalMatchedDuration / totalTargetDuration) * 100);
}

const getDayKey = (d) => `D-${d.jy}-${d.jm}-${d.jd}`;
const getWeekKey = (d) => { const w = getJalaaliWeekDays(d.jy, d.jm, d.jd); return `W-${w[0].jy}-${w[0].jm}-${w[0].jd}`; };
const getMonthKey = (d) => `M-${d.jy}-${d.jm}`;

// --- Configuration & Themes ---
const MOCK_STUDENTS = [{ id: 's1', name: 'علی احمدی' }, { id: 's2', name: 'سارا رضایی' }, { id: 's3', name: 'محمد کریمی' }];
const DEFAULT_SUBJECTS = ['خواب', 'فیزیک', 'ریاضی', 'شیمی', 'هندسه', 'گسسته', 'زیست', 'ادبیات'];

const SUBJECT_COLORS = {
  'خواب': 'bg-green-500 border-green-600 shadow-green-200 text-white',
  'فیزیک': 'bg-blue-500 border-blue-600 shadow-blue-200 text-white',
  'ریاضی': 'bg-purple-500 border-purple-600 shadow-purple-200 text-white',
  'شیمی': 'bg-rose-500 border-rose-600 shadow-rose-200 text-white',
  'هندسه': 'bg-orange-500 border-orange-600 shadow-orange-200 text-white',
  'گسسته': 'bg-teal-500 border-teal-600 shadow-teal-200 text-white',
  'زیست': 'bg-lime-500 border-lime-600 shadow-lime-200 text-white',
  'ادبیات': 'bg-sky-500 border-sky-600 shadow-sky-200 text-white',
};
const CUSTOM_PALETTES = [
  'bg-blue-500 border-blue-600 text-white', 'bg-purple-500 border-purple-600 text-white',
  'bg-rose-500 border-rose-600 text-white', 'bg-orange-500 border-orange-600 text-white',
  'bg-teal-500 border-teal-600 text-white', 'bg-lime-500 border-lime-600 text-white',
  'bg-indigo-500 border-indigo-600 text-white', 'bg-amber-500 border-amber-600 text-white'
];
function getSubjectStyle(record) {
  if (record.customColor) return record.customColor;
  if (SUBJECT_COLORS[record.subject]) return SUBJECT_COLORS[record.subject];
  let hash = 0; for (let i = 0; i < record.subject.length; i++) hash += record.subject.charCodeAt(i);
  return CUSTOM_PALETTES[hash % CUSTOM_PALETTES.length];
}

// --- Components ---
const EditableTitle = ({ titleKey, titles, setTitles, defaultTitle, isTeacher, className }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(titles[titleKey] || defaultTitle);
  const handleSave = () => { setTitles({...titles, [titleKey]: value}); setIsEditing(false); };
  
  if (!isTeacher) return <span className={className}>{titles[titleKey] || defaultTitle}</span>;
  if (isEditing) return <input autoFocus value={value} onChange={e => setValue(e.target.value)} onBlur={handleSave} onKeyDown={e => e.key === 'Enter' && handleSave()} className={`border-b-2 border-indigo-500 bg-transparent outline-none w-auto max-w-[120px] inline-block ${className}`} />;
  
  return (
    <span className={`inline-flex items-center gap-1 group cursor-pointer ${className}`} onClick={() => setIsEditing(true)} title="کلیک برای ویرایش">
      {titles[titleKey] || defaultTitle} <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </span>
  );
};

export default function App() {
  const [theme, setTheme] = useState('light');
  const [activeRole, setActiveRole] = useState('student');
  const [students, setStudents] = useState(MOCK_STUDENTS);
  const [currentStudentId, setCurrentStudentId] = useState('s1');
  const [teacherEditMode, setTeacherEditMode] = useState(false); 
  
  const [records, setRecords] = useState([]); 
  const [basePlans, setBasePlans] = useState([]); 
  const [submittedWeeks, setSubmittedWeeks] = useState([]); 

  const [customSubjects, setCustomSubjects] = useState([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [titles, setTitles] = useState({});
  const [tasks, setTasks] = useState([]); 
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  const activeStudent = students.find(s => s.id === currentStudentId) || students[0];
  const allSubjects = useMemo(() => [...DEFAULT_SUBJECTS, ...customSubjects], [customSubjects]);

  const handleAddStudent = (e) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    const newStudent = { id: crypto.randomUUID(), name: newStudentName };
    setStudents([...students, newStudent]);
    setCurrentStudentId(newStudent.id);
    setNewStudentName('');
  };

  // محاسبه رنکینگ زنده ساعت مطالعه برای هفته جاری (برای بنر بالا)
  const currentWeekKey = getWeekKey(getTodayJalaali());
  const liveWeeklyRankings = useMemo(() => {
      const scores = students.map(s => {
          const hours = calculateStudyHours(records, s.id, (r) => getWeekKey({jy: r.jy, jm: r.jm, jd: r.jd}) === currentWeekKey);
          return { name: s.name, hours };
      });
      return scores.sort((a,b) => b.hours - a.hours).slice(0, 3);
  }, [records, students, currentWeekKey]);

  return (
    <div dir="rtl" className={`min-h-screen font-sans transition-colors duration-300 ${theme === 'dark' ? 'dark bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.0.0/Vazirmatn-font-face.css');
        body { font-family: 'Vazirmatn', sans-serif; }
        .hide-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .hide-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .hide-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .dark .hide-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
        
        /* استایل‌های جدید و پررنگ برای مدال آوران */
        .rank-1 { background-color: #fef08a !important; border-left-color: #facc15 !important; border-left-width: 4px !important; }
        .dark .rank-1 { background-color: #a16207 !important; border-left-color: #facc15 !important; color: #fff; }
        
        .rank-2 { background-color: #f1f5f9 !important; border-left-color: #94a3b8 !important; border-left-width: 4px !important; }
        .dark .rank-2 { background-color: #475569 !important; border-left-color: #cbd5e1 !important; color: #fff; }
        
        .rank-3 { background-color: #ffedd5 !important; border-left-color: #f97316 !important; border-left-width: 4px !important; }
        .dark .rank-3 { background-color: #9a3412 !important; border-left-color: #fb923c !important; color: #fff; }
        
        .rank-other { background-color: #eff6ff !important; border-left-color: #bfdbfe !important; border-left-width: 4px !important; }
        .dark .rank-other { background-color: rgba(30, 58, 138, 0.3) !important; border-left-color: #3b82f6 !important; }

        @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
        .live-dot { width: 8px; height: 8px; background-color: #ef4444; border-radius: 50%; display: inline-block; margin-left: 6px; animation: pulse-red 2s infinite; }
      `}} />

      <nav className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 transition-colors h-16">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between items-center h-full">
            <div className="flex items-center">
              <div className="bg-indigo-600 p-2 rounded-xl ml-3 shadow-md shadow-indigo-200 dark:shadow-none">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <span className="font-black text-xl text-slate-800 dark:text-white hidden sm:block">سامانه پایش یکپارچه</span>
            </div>
            <div className="flex space-x-2 space-x-reverse items-center">
              <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ml-2">
                {theme === 'light' ? <Moon className="w-5 h-5"/> : <Sun className="w-5 h-5 text-amber-400"/>}
              </button>
              <button onClick={() => {setActiveRole('student'); setTeacherEditMode(false);}} className={`flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeRole === 'student' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                <UserCircle className="w-5 h-5 ml-2" /> پنل دانش‌آموز
              </button>
              <button onClick={() => setActiveRole('teacher')} className={`flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeRole === 'teacher' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                <LayoutDashboard className="w-5 h-5 ml-2" /> پنل مشاور
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Live Banner for Both Roles - Sticky right under the navbar */}
      {liveWeeklyRankings.length > 0 && (
          <div className="sticky top-16 z-40 bg-yellow-50 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 py-2 px-4 shadow-md flex justify-center items-center text-xs sm:text-sm font-bold overflow-hidden border-b border-yellow-200 dark:border-yellow-700/50 backdrop-blur-md">
              <span className="live-dot mr-2"></span>
              <span className="text-yellow-600 dark:text-yellow-400 ml-3 whitespace-nowrap"><Flame className="w-4 h-4 inline mb-1"/> نتایج زنده:</span>
              <div className="flex gap-4 overflow-x-auto hide-scrollbar">
                  {liveWeeklyRankings[0] && <span>🥇 {liveWeeklyRankings[0].name} ({liveWeeklyRankings[0].hours} ساعت)</span>}
                  {liveWeeklyRankings[1] && <span>🥈 {liveWeeklyRankings[1].name} ({liveWeeklyRankings[1].hours} ساعت)</span>}
                  {liveWeeklyRankings[2] && <span>🥉 {liveWeeklyRankings[2].name} ({liveWeeklyRankings[2].hours} ساعت)</span>}
              </div>
          </div>
      )}

      <main className="w-full overflow-x-hidden px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {activeRole === 'teacher' && (
          <div className="mb-8 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row justify-between items-center gap-4 transition-colors">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">انتخاب دانش‌آموز:</label>
                <select value={currentStudentId} onChange={(e) => setCurrentStudentId(e.target.value)} className="w-full md:w-64 border-slate-300 dark:border-slate-600 rounded-xl text-sm py-2 px-3 border outline-none bg-slate-50 dark:bg-slate-700 dark:text-white font-medium">
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-center">
              <button onClick={() => setTeacherEditMode(!teacherEditMode)} className={`flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-bold transition-colors w-full sm:w-auto ${teacherEditMode ? 'bg-red-100 text-red-700 border-red-300 border dark:bg-red-900/50 dark:text-red-300 dark:border-red-800' : 'bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'}`}>
                 {teacherEditMode ? <Unlock className="w-4 h-4 ml-2"/> : <Lock className="w-4 h-4 ml-2"/>}
                 {teacherEditMode ? 'ویرایش تقویم: فعال' : 'فعال‌سازی ویرایش تقویم'}
              </button>
              <form onSubmit={handleAddStudent} className="flex w-full sm:w-auto gap-2">
                <input type="text" placeholder="دانش‌آموز جدید..." value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className="flex-1 w-32 border-slate-300 dark:border-slate-600 rounded-xl text-sm py-2 px-3 border outline-none font-medium dark:bg-slate-700 dark:text-white"/>
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap"><Plus className="w-4 h-4"/></button>
              </form>
            </div>
          </div>
        )}

        <DashboardContent 
          role={activeRole} student={activeStudent} students={students} 
          allRecords={records} setRecords={setRecords} 
          basePlans={basePlans} setBasePlans={setBasePlans}
          submittedWeeks={submittedWeeks} setSubmittedWeeks={setSubmittedWeeks}
          allSubjects={allSubjects} setCustomSubjects={setCustomSubjects} 
          titles={titles} setTitles={setTitles}
          tasks={tasks} setTasks={setTasks} feedbacks={feedbacks} setFeedbacks={setFeedbacks}
          teacherEditMode={teacherEditMode}
        />
      </main>
    </div>
  );
}

function DashboardContent({ role, student, students, allRecords, setRecords, basePlans, setBasePlans, submittedWeeks, setSubmittedWeeks, allSubjects, setCustomSubjects, titles, setTitles, tasks, setTasks, feedbacks, setFeedbacks, teacherEditMode }) {
  const [activeTab, setActiveTab] = useState('calendar');
  const [teacherViewMode, setTeacherViewMode] = useState('actual'); // 'base' | 'actual'

  // محاسبه رکوردهای تقویم بر اساس نقش و تب انتخاب شده
  const calendarRecords = useMemo(() => {
      if (role === 'teacher') {
          if (teacherViewMode === 'base') {
               return basePlans.filter(bp => bp.studentId === student.id).flatMap(bp => bp.records);
          } else {
               return allRecords.filter(r => r.studentId === student.id && !r.isTarget);
          }
      } else {
          // برای دانش آموز ترکیبی از واقعی‌ها و برنامه‌های ارسالی/پیشنهادی است
          const actuals = allRecords.filter(r => r.studentId === student.id && !r.isTarget);
          const draftTargets = allRecords.filter(r => r.studentId === student.id && r.isTarget);
          const submittedBasePlans = basePlans.filter(bp => bp.studentId === student.id);
          const studentSubmittedWeekKeys = submittedBasePlans.map(bp => bp.weekKey);

          // حذف پیش‌نویس‌هایی که مربوط به هفته‌های ارسال‌شده هستند (زیرا نسخه اصلی اکنون در basePlans است)
          const validDraftTargets = draftTargets.filter(r => !studentSubmittedWeekKeys.includes(getWeekKey({jy: r.jy, jm: r.jm, jd: r.jd})));
          const basePlanRecords = submittedBasePlans.flatMap(bp => bp.records);

          // دانش‌آموز در تقویم اصلی فقط باید باکس‌های آینده را به عنوان هدف ببیند، و برای حال/گذشته فقط واقعی
          const futureBaseRecords = basePlanRecords.filter(r => isFutureWeek(r.jy, r.jm, r.jd));
          const futureDrafts = validDraftTargets.filter(r => isFutureWeek(r.jy, r.jm, r.jd));

          return [...actuals, ...futureBaseRecords, ...futureDrafts];
      }
  }, [role, teacherViewMode, basePlans, allRecords, student.id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
        <div>
          <EditableTitle isTeacher={role === 'teacher'} titleKey="mainDashTitle" titles={titles} setTitles={setTitles} defaultTitle={role === 'student' ? 'داشبورد من' : `پرونده: ${student.name}`} className="text-3xl font-black text-slate-800 dark:text-white block" />
          <EditableTitle isTeacher={role === 'teacher'} titleKey="mainDashSub" titles={titles} setTitles={setTitles} defaultTitle="مدیریت تقویم یکپارچه و ثبت عملکرد" className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium block" />
        </div>
        
        <div className="flex flex-col gap-3 w-full xl:w-auto">
            <div className="flex bg-slate-100 dark:bg-slate-700 p-1.5 rounded-xl overflow-x-auto hide-scrollbar border border-slate-200 dark:border-slate-600">
              <button onClick={() => setActiveTab('calendar')} className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'calendar' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-600' : 'text-slate-600 dark:text-slate-300'}`}>🗓 برنامه‌ریزی تقویمی</button>
              <button onClick={() => setActiveTab('stats')} className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'stats' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-600' : 'text-slate-600 dark:text-slate-300'}`}>📊 آمار و بررسی</button>
              <button onClick={() => setActiveTab('list')} className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'list' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-600' : 'text-slate-600 dark:text-slate-300'}`}>📋 لیست اطلاعات</button>
              {role === 'teacher' && (
                 <button onClick={() => setActiveTab('competitions')} className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'competitions' ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200 dark:border-slate-600' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}>🏆 رقابت‌ها</button>
              )}
            </div>
            {role === 'teacher' && activeTab === 'calendar' && (
               <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                   <button onClick={() => setTeacherViewMode('base')} className={`flex-1 px-4 py-2 text-sm font-bold rounded-lg transition-all ${teacherViewMode === 'base' ? 'bg-white dark:bg-slate-800 text-purple-600 shadow-sm border border-slate-200 dark:border-slate-600' : 'text-slate-500 dark:text-slate-400'}`}>برنامه اولیه (پیشنهادی)</button>
                   <button onClick={() => setTeacherViewMode('actual')} className={`flex-1 px-4 py-2 text-sm font-bold rounded-lg transition-all ${teacherViewMode === 'actual' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm border border-slate-200 dark:border-slate-600' : 'text-slate-500 dark:text-slate-400'}`}>تغییرات (عملکرد واقعی)</button>
               </div>
            )}
        </div>
      </div>

      <div className="transition-all">
        {activeTab === 'stats' && <StatsDashboard records={allRecords} basePlans={basePlans} titles={titles} setTitles={setTitles} role={role} studentId={student.id} />}
        {activeTab === 'calendar' && <CalendarVisualizations displayRecords={calendarRecords} allRecords={allRecords} setRecords={setRecords} basePlans={basePlans} setBasePlans={setBasePlans} submittedWeeks={submittedWeeks} setSubmittedWeeks={setSubmittedWeeks} studentId={student.id} allSubjects={allSubjects} tasks={tasks} setTasks={setTasks} feedbacks={feedbacks} setFeedbacks={setFeedbacks} role={role} teacherEditMode={teacherEditMode} teacherViewMode={teacherViewMode}/>}
        {activeTab === 'list' && <RecordsList displayRecords={calendarRecords} allRecords={allRecords} setRecords={setRecords} basePlans={basePlans} setBasePlans={setBasePlans} role={role} titles={titles} setTitles={setTitles} teacherEditMode={teacherEditMode} teacherViewMode={teacherViewMode} studentId={student.id} />}
        {activeTab === 'competitions' && role === 'teacher' && <Leaderboard students={students} allRecords={allRecords} />}
      </div>
    </div>
  );
}

// --- Leaderboard Component (Competitions for Teacher) ---
function Leaderboard({ students, allRecords }) {
  const [period, setPeriod] = useState('month');
  const today = getTodayJalaali();

  const rankings = useMemo(() => {
      return students.map(student => {
          let score = 0;
          if (period === 'today') {
              score = calculateStudyHours(allRecords, student.id, r => r.dateString === `${today.jy}/${today.jm.toString().padStart(2,'0')}/${today.jd.toString().padStart(2,'0')}`);
          } else if (period === 'week') {
              const weekKey = getWeekKey(today);
              score = calculateStudyHours(allRecords, student.id, r => getWeekKey({jy: r.jy, jm: r.jm, jd: r.jd}) === weekKey);
          } else if (period === 'month') {
              score = calculateStudyHours(allRecords, student.id, r => r.jy === today.jy && r.jm === today.jm);
          }
          return { ...student, score };
      }).sort((a, b) => b.score - a.score);
  }, [students, allRecords, period, today]);

  return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex flex-col md:flex-row justify-between items-center gap-4">
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center">
                  <Trophy className="w-6 h-6 ml-2 text-amber-500" /> رتبه‌بندی رقابتی (ساعت مطالعه)
              </h3>
              <div className="flex bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 p-1">
                  <button onClick={() => setPeriod('today')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${period === 'today' ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>امروز</button>
                  <button onClick={() => setPeriod('week')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${period === 'week' ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>هفته</button>
                  <button onClick={() => setPeriod('month')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${period === 'month' ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>ماه</button>
              </div>
          </div>
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-right">
                  <thead className="bg-white dark:bg-slate-800">
                      <tr>
                          <th className="px-6 py-4 text-xs font-black text-slate-400 dark:text-slate-500 w-16 text-center">رتبه</th>
                          <th className="px-6 py-4 text-xs font-black text-slate-400 dark:text-slate-500">نام دانش‌آموز</th>
                          <th className="px-6 py-4 text-xs font-black text-indigo-500 dark:text-indigo-400">ساعت مطالعه انجام شده</th>
                      </tr>
                  </thead>
                  <tbody className="bg-slate-50 dark:bg-slate-900/50 divide-y divide-white dark:divide-slate-800">
                      {rankings.length === 0 ? (
                        <tr><td colSpan="3" className="px-6 py-10 text-center font-bold text-slate-400">دانش‌آموزی یافت نشد.</td></tr>
                      ) : rankings.map((student, index) => {
                          const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-other';
                          const maxScore = rankings[0].score || 1;
                          const percent = Math.round((student.score / maxScore) * 100);
                          return (
                          <tr key={student.id} className={`transition-colors ${rankClass} hover:opacity-90`}>
                              <td className="px-6 py-4 whitespace-nowrap text-2xl font-black text-center text-slate-700 dark:text-slate-300">
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : <span className="text-sm">{index + 1}</span>}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800 dark:text-slate-200">{student.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                      <span className="text-base font-black text-indigo-600 dark:text-indigo-400 w-16">{student.score} ساعت</span>
                                      <div className="w-32 bg-white dark:bg-slate-700 rounded-full h-2 border border-slate-200 dark:border-slate-600"><div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${percent}%` }} /></div>
                                  </div>
                              </td>
                          </tr>
                      )})}
                  </tbody>
              </table>
          </div>
      </div>
  );
}

// --- Feedback Component ---
function FeedbackBox({ studentId, dateKey, role, feedbacks, setFeedbacks }) {
   const existing = feedbacks.find(f => f.studentId === studentId && f.dateKey === dateKey);
   const [isEditing, setIsEditing] = useState(false);
   const [text, setText] = useState('');

   useEffect(() => { setText(existing?.text || ''); setIsEditing(false); }, [existing, dateKey]);

   const handleSave = () => {
      if (!text.trim()) {
         setFeedbacks(prev => prev.filter(f => !(f.studentId === studentId && f.dateKey === dateKey)));
      } else {
         if (existing) setFeedbacks(prev => prev.map(f => f.id === existing.id ? {...f, text} : f));
         else setFeedbacks(prev => [...prev, { id: crypto.randomUUID(), studentId, dateKey, text }]);
      }
      setIsEditing(false);
   };

   if (role === 'student' && !existing) return null; 
   if (role === 'student') return (
      <div className="mb-4 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 flex items-start shadow-sm">
         <MessageSquare className="w-5 h-5 ml-3 flex-shrink-0 mt-0.5" />
         <div><span className="font-bold text-xs block mb-1">پیام مشاور شما در این دوره:</span><p className="text-sm font-medium leading-relaxed">{existing.text}</p></div>
      </div>
   );

   if (isEditing) return (
      <div className="mb-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 shadow-inner">
         <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">ثبت بازخورد / پیام برای دانش‌آموز در این تاریخ:</label>
         <textarea rows={2} value={text} onChange={e=>setText(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl p-3 text-sm outline-none resize-none focus:border-indigo-500 mb-3" placeholder="توضیحات و بازخورد خود را بنویسید..." />
         <div className="flex gap-2">
             <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">ذخیره پیام</button>
             <button onClick={() => { setIsEditing(false); setText(existing?.text || ''); }} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors">لغو</button>
         </div>
      </div>
   );

   return (
      <div className={`mb-4 p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors shadow-sm ${existing ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-800 border-dashed border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'}`} onClick={() => setIsEditing(true)}>
         <div className="flex items-center gap-3">
             <div className={`p-2 rounded-xl ${existing ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                <MessageSquare className="w-5 h-5" />
             </div>
             {existing ? (<div><span className="font-bold text-xs text-indigo-600 dark:text-indigo-400 block">شما پیامی ثبت کرده‌اید:</span><p className="text-sm font-bold text-indigo-900 dark:text-indigo-200 truncate max-w-md">{existing.text}</p></div>) : (<span className="text-sm font-bold text-slate-500 dark:text-slate-400">افزودن پیام / بازخورد برای این تاریخ</span>)}
         </div>
         <Edit3 className={`w-4 h-4 ${existing ? 'text-indigo-400' : 'text-slate-400'}`} />
      </div>
   );
}

// --- Task Manager Component ---
function TaskSidebar({ studentId, tasks, setTasks, role }) {
    const [newTask, setNewTask] = useState('');
    const studentTasks = tasks.filter(t => t.studentId === studentId);

    const addTask = (e) => {
       e.preventDefault();
       if(!newTask.trim()) return;
       setTasks([...tasks, { id: crypto.randomUUID(), studentId, text: newTask.trim(), isDone: false }]);
       setNewTask('');
    };

    const toggleTask = (id) => {
       if(role === 'teacher') return; 
       setTasks(tasks.map(t => t.id === id ? {...t, isDone: !t.isDone} : t));
    };

    const removeTask = (id) => {
       if(window.confirm('حذف شود؟')) setTasks(tasks.filter(t => t.id !== id));
    };

    return (
       <div className="w-full lg:w-72 bg-slate-50 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 p-5 flex flex-col h-[70vh]">
           <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center"><CheckCircle className="w-5 h-5 ml-2 text-indigo-500" /> تسک‌های تعیین شده توسط مشاور</h3>
           
           {role === 'teacher' && (
               <form onSubmit={addTask} className="mb-4">
                   <input type="text" placeholder="تسک جدید + اینتر" value={newTask} onChange={e=>setNewTask(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:text-white" />
               </form>
           )}

           <div className="flex-1 overflow-y-auto space-y-2 pr-1 hide-scrollbar">
               {studentTasks.length === 0 ? (
                   <p className="text-xs text-center text-slate-400 py-4">تسکی تعریف نشده است.</p>
               ) : studentTasks.map(t => (
                   <div key={t.id} className={`flex items-start gap-2 p-3 rounded-xl border transition-all ${t.isDone ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 opacity-60' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 shadow-sm'}`}>
                       <button onClick={() => toggleTask(t.id)} disabled={role === 'teacher'} className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center mt-0.5 ${t.isDone ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-600'}`}>
                           {t.isDone && <Check className="w-3 h-3" />}
                       </button>
                       <p className={`flex-1 text-sm font-bold leading-snug ${t.isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>{t.text}</p>
                       {role === 'teacher' && <button onClick={() => removeTask(t.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>}
                   </div>
               ))}
           </div>
       </div>
    );
}

// --- Stats Component ---
function StatsDashboard({ records, basePlans, titles, setTitles, role, studentId }) {
  const today = getTodayJalaali();
  const todayStr = `${today.jy}/${today.jm.toString().padStart(2,'0')}/${today.jd.toString().padStart(2,'0')}`;
  
  const stats = useMemo(() => {
    let studyD = 0, studyW = 0, studyM = 0;
    let sleepD = 0, sleepW = 0, sleepM = 0;

    const subjectHours = {};

    records.forEach(r => {
      if(r.isTarget || r.studentId !== studentId) return; 

      const isSleep = r.subject === 'خواب';
      const dur = r.duration;
      if (!isSleep) subjectHours[r.subject] = (subjectHours[r.subject] || 0) + dur;

      if (r.dateString === todayStr) { isSleep ? sleepD += dur : studyD += dur; }
      if (r.jy === today.jy && r.jm === today.jm) { isSleep ? sleepM += dur : studyM += dur; }
      const rDate = new Date(j2g(r.jy, r.jm, r.jd).gy, j2g(r.jy, r.jm, r.jd).gm - 1, j2g(r.jy, r.jm, r.jd).gd);
      const tDate = new Date();
      if (Math.ceil((tDate - rDate) / (1000 * 60 * 60 * 24)) <= 7 && rDate <= tDate) { isSleep ? sleepW += dur : studyW += dur; }
    });

    const miscD = Math.max(0, 24 - (studyD + sleepD));
    const miscW = Math.max(0, (7 * 24) - (studyW + sleepW));
    const daysInMonth = today.jm <= 6 ? 31 : (today.jm <= 11 ? 30 : 29);
    const miscM = Math.max(0, (daysInMonth * 24) - (studyM + sleepM));

    const adDaily = calculateAdherenceScore(records, basePlans, studentId, getWeekKey(today));
    const adWeekly = calculateAdherenceScore(records, basePlans, studentId, getWeekKey(today));
    
    const adMonthly = Math.round(
      basePlans.filter(bp => bp.studentId === studentId && bp.weekKey.includes(`W-${today.jy}-${today.jm}`))
               .reduce((acc, bp) => acc + calculateAdherenceScore(records, basePlans, studentId, bp.weekKey), 0) / 
      (basePlans.filter(bp => bp.studentId === studentId && bp.weekKey.includes(`W-${today.jy}-${today.jm}`)).length || 1)
    );

    return { studyD, studyW, studyM, sleepD, sleepW, sleepM, miscD, miscW, miscM, subjectHours, adDaily, adWeekly, adMonthly };
  }, [records, basePlans, todayStr, today, studentId]);

  return (
    <div className="space-y-8">
      {/* 3 Adherence Levels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl p-6 shadow-lg text-white flex flex-col justify-between relative overflow-hidden transition-transform hover:scale-[1.02]">
             <Target className="w-16 h-16 absolute -left-4 -bottom-4 opacity-10" />
             <div className="flex justify-between items-center mb-4"><span className="font-bold opacity-90">پایبندی امروز</span><Activity className="w-5 h-5 opacity-70"/></div>
             <div className="text-4xl font-black text-left" dir="ltr">{stats.adDaily}%</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-3xl p-6 shadow-lg text-white flex flex-col justify-between relative overflow-hidden transition-transform hover:scale-[1.02]">
             <CalendarDays className="w-16 h-16 absolute -left-4 -bottom-4 opacity-10" />
             <div className="flex justify-between items-center mb-4"><span className="font-bold opacity-90">پایبندی هفته جاری</span><Activity className="w-5 h-5 opacity-70"/></div>
             <div className="text-4xl font-black text-left" dir="ltr">{stats.adWeekly}%</div>
          </div>
          <div className="bg-gradient-to-br from-rose-500 to-rose-700 rounded-3xl p-6 shadow-lg text-white flex flex-col justify-between relative overflow-hidden transition-transform hover:scale-[1.02]">
             <Trophy className="w-16 h-16 absolute -left-4 -bottom-4 opacity-10" />
             <div className="flex justify-between items-center mb-4"><span className="font-bold opacity-90">میانگین پایبندی ماه</span><Activity className="w-5 h-5 opacity-70"/></div>
             <div className="text-4xl font-black text-left" dir="ltr">{stats.adMonthly}%</div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard idKey="tdy" titleKey="statToday" defaultTitle="ساعات امروز" studyH={stats.studyD} sleepH={stats.sleepD} miscH={stats.miscD} icon={Sun} colorClass="bg-amber-500" role={role} titles={titles} setTitles={setTitles} />
        <StatCard idKey="wk" titleKey="statWeek" defaultTitle="ساعات هفته جاری" studyH={stats.studyW} sleepH={stats.sleepW} miscH={stats.miscW} icon={BarChart3} colorClass="bg-blue-500" role={role} titles={titles} setTitles={setTitles} />
        <StatCard idKey="mo" titleKey="statMonth" defaultTitle="ساعات ماه جاری" studyH={stats.studyM} sleepH={stats.sleepM} miscH={stats.miscM} icon={CalendarDays} colorClass="bg-emerald-500" role={role} titles={titles} setTitles={setTitles} />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 transition-colors">
        <div className="flex items-center mb-8">
          <Activity className="w-6 h-6 ml-2 text-indigo-500" />
          <EditableTitle isTeacher={role === 'teacher'} titleKey="statSubjects" titles={titles} setTitles={setTitles} defaultTitle="تفکیک ساعات دروس (عملکرد واقعی کل)" className="text-xl font-black text-slate-800 dark:text-white" />
        </div>
        {Object.keys(stats.subjectHours).length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-center py-4">هنوز درسی مطالعه نشده است.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(stats.subjectHours).sort((a,b) => b[1] - a[1]).map(([subject, hours]) => {
              const style = getSubjectStyle({subject});
              return (
                <div key={subject} className={`p-5 rounded-2xl border-2 transition-transform hover:-translate-y-1 bg-white dark:bg-slate-800 ${style.split(' ')[1]}`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-base font-black text-slate-700 dark:text-slate-200">{subject}</span>
                    <span className={`text-sm font-bold px-3 py-1 rounded-lg ${style}`}>{hours} ساعت</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div className={`h-full rounded-full ${style.split(' ')[0]}`} style={{ width: `${Math.min((hours/stats.studyM)*100, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const StatCard = ({ idKey, titleKey, defaultTitle, studyH, sleepH, miscH, icon: Icon, colorClass, role, titles, setTitles }) => (
    <div className={`bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 relative overflow-hidden transition-colors`}>
      <div className={`absolute top-0 left-0 w-2 h-full ${colorClass}`}></div>
      <div className="flex justify-between items-start mb-4">
        <EditableTitle isTeacher={role === 'teacher'} titleKey={titleKey} titles={titles} setTitles={setTitles} defaultTitle={defaultTitle} className="font-black text-slate-700 dark:text-slate-200 text-lg" />
        <div className={`p-3 rounded-2xl ${colorClass.replace('bg-', 'bg-opacity-20 text-').replace('-500', '-600')} dark:bg-opacity-30`}><Icon className="w-6 h-6" /></div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-2xl text-center flex flex-col justify-center items-center">
          <EditableTitle isTeacher={role === 'teacher'} titleKey={`lblStudy_${idKey}`} titles={titles} setTitles={setTitles} defaultTitle="مطالعه" className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1 truncate" />
          <p className="text-xl font-black text-indigo-900 dark:text-indigo-200">{studyH} <span className="text-xs font-medium">h</span></p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-2xl text-center flex flex-col justify-center items-center">
          <EditableTitle isTeacher={role === 'teacher'} titleKey={`lblSleep_${idKey}`} titles={titles} setTitles={setTitles} defaultTitle="خواب" className="text-[10px] font-bold text-green-600 dark:text-green-400 mb-1 truncate" />
          <p className="text-xl font-black text-green-900 dark:text-green-200">{sleepH} <span className="text-xs font-medium">h</span></p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-2xl text-center flex flex-col justify-center items-center">
          <EditableTitle isTeacher={role === 'teacher'} titleKey={`lblMisc_${idKey}`} titles={titles} setTitles={setTitles} defaultTitle="متفرقه" className="text-[10px] font-bold text-red-600 dark:text-red-400 mb-1 truncate" />
          <p className="text-xl font-black text-red-900 dark:text-red-200">{miscH} <span className="text-xs font-medium">h</span></p>
        </div>
      </div>
    </div>
  );

function CalendarVisualizations({ displayRecords, allRecords, setRecords, basePlans, setBasePlans, submittedWeeks, setSubmittedWeeks, studentId, allSubjects, tasks, setTasks, feedbacks, setFeedbacks, role, teacherEditMode, teacherViewMode }) {
  const [viewMode, setViewMode] = useState('weekly');
  const today = getTodayJalaali();
  const [selectedDate, setSelectedDate] = useState({ jy: today.jy, jm: today.jm, jd: today.jd });
  const [editBox, setEditBox] = useState(null);
  
  const [interactionState, setInteractionState] = useState(null);
  const [pendingBox, setPendingBox] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const timelineRefs = useRef({});

  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const shiftDays = (days) => {
    const gDate = j2g(selectedDate.jy, selectedDate.jm, selectedDate.jd);
    const dateObj = new Date(gDate.gy, gDate.gm - 1, gDate.gd + days);
    setSelectedDate(g2j(dateObj.getFullYear(), dateObj.getMonth() + 1, dateObj.getDate()));
  };
  const shiftMonth = (months) => {
    let m = selectedDate.jm + months; let y = selectedDate.jy;
    if (m > 12) { m = 1; y++; } if (m < 1) { m = 12; y--; }
    setSelectedDate({ jy: y, jm: m, jd: 1 });
  };

  const currentDateKey = viewMode === 'daily' ? getDayKey(selectedDate) : viewMode === 'weekly' ? getWeekKey(selectedDate) : getMonthKey(selectedDate);
  const viewingFutureWeek = isFutureWeek(selectedDate.jy, selectedDate.jm, selectedDate.jd);
  const viewingWeekKey = getWeekKey(selectedDate);
  const isSubmitted = submittedWeeks.includes(viewingWeekKey);
  
  const canEdit = useMemo(() => {
     if (role === 'teacher') return teacherEditMode;
     if (viewingFutureWeek) return !isSubmitted;
     return true;
  }, [role, teacherEditMode, viewingFutureWeek, isSubmitted]);

  const handleConfirmSubmit = () => {
     const weekKey = getWeekKey(selectedDate);
     const currentWeekDates = getJalaaliWeekDays(selectedDate.jy, selectedDate.jm, selectedDate.jd).map(d => `${d.jy}/${d.jm.toString().padStart(2,'0')}/${d.jd.toString().padStart(2,'0')}`);
     
     const draftsToSnapshot = allRecords.filter(r => r.studentId === studentId && r.isTarget && currentWeekDates.includes(r.dateString));
     
     const newBasePlan = {
         id: crypto.randomUUID(),
         studentId,
         weekKey,
         submittedAt: new Date().toISOString(),
         records: JSON.parse(JSON.stringify(draftsToSnapshot)) // Deep copy
     };
     
     setBasePlans([...basePlans, newBasePlan]);
     setSubmittedWeeks([...submittedWeeks, weekKey]);
     setShowSubmitModal(false);
     alert('برنامه پیشنهادی با موفقیت ثبت و برای مشاور ارسال شد.');
  };

  const handleRevertSubmission = () => {
     if(window.confirm('آیا می‌خواهید برنامه را مجدداً ویرایش کنید؟ (این کار نسخه ارسالی را موقتاً تا ثبت مجدد لغو می‌کند)')) {
        const weekKey = getWeekKey(selectedDate);
        setBasePlans(prev => prev.filter(p => !(p.studentId === studentId && p.weekKey === weekKey)));
        setSubmittedWeeks(prev => prev.filter(w => w !== weekKey));
     }
  };

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    const handleGlobalScroll = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('scroll', handleGlobalScroll, true); 
    return () => { window.removeEventListener('click', handleGlobalClick); window.removeEventListener('scroll', handleGlobalScroll, true); };
  }, []);

  useEffect(() => {
     const onMouseMove = (e) => {
        if (!interactionState || !canEdit) return;
        const container = timelineRefs.current[interactionState.dateStrKey];
        if (!container) return;
        const rect = container.getBoundingClientRect();
        let currentY = e.clientY - rect.top;
        if (currentY < 0) currentY = 0;
        const HOUR_HEIGHT = interactionState.isCompact ? 40 : 50;
        if (currentY > 24 * HOUR_HEIGHT) currentY = 24 * HOUR_HEIGHT;
        setInteractionState(prev => ({...prev, currentY, currentX: e.clientX}));
     };

     const onMouseUp = () => {
        if (!interactionState || !canEdit) return;
        const { type, startY, currentY, startX, currentX, isCompact, dateObj, record, edge, originalStartHour } = interactionState;
        const HOUR_HEIGHT = isCompact ? 40 : 50;

        if (type === 'draw') {
            let rawStart = Math.min(startY, currentY) / HOUR_HEIGHT;
            let rawEnd = Math.max(startY, currentY) / HOUR_HEIGHT;
            let startHour = Math.round(rawStart * 4) / 4;
            let endHour = Math.max(startHour + 0.25, Math.round(rawEnd * 4) / 4);
            let duration = endHour - startHour;

            setPendingBox({
                jy: dateObj.jy, jm: dateObj.jm, jd: dateObj.jd,
                dateString: `${dateObj.jy}/${dateObj.jm.toString().padStart(2,'0')}/${dateObj.jd.toString().padStart(2,'0')}`,
                startTime: formatTime(startHour), duration: duration, subject: allSubjects[0], description: '', error: null,
                top: startHour * HOUR_HEIGHT, height: duration * HOUR_HEIGHT
            });
        } else if (type === 'resize') {
            let startHour = t2d(record.startTime);
            let duration = record.duration;
            let endHour = startHour + duration;
            
            const deltaHour = (currentY - startY) / HOUR_HEIGHT;
            const snappedDelta = Math.round(deltaHour * 4) / 4;

            if (edge === 'top') {
                startHour = Math.min(endHour - 0.25, Math.max(0, startHour + snappedDelta));
                duration = endHour - startHour;
            } else {
                endHour = Math.max(startHour + 0.25, Math.min(24, endHour + snappedDelta));
                duration = endHour - startHour;
            }

            const updatedRec = { ...record, startTime: formatTime(startHour), duration };
            if(updatedRec.startTime !== record.startTime || updatedRec.duration !== record.duration) {
                if (hasOverlap(updatedRec, displayRecords)) {
                    alert('خطا: تغییرات با باکس‌های قبلی تداخل دارد!');
                } else {
                    if (role === 'teacher' && teacherViewMode === 'base') {
                         setBasePlans(basePlans.map(bp => {
                             if (bp.records.some(r => r.id === updatedRec.id)) {
                                 return { ...bp, records: bp.records.map(r => r.id === updatedRec.id ? updatedRec : r) };
                             }
                             return bp;
                         }));
                    } else {
                         setRecords(allRecords.map(r => r.id === record.id ? updatedRec : r));
                    }
                }
            }
        } else if (type === 'move') {
            const deltaY = currentY - startY;
            const deltaHour = deltaY / HOUR_HEIGHT;
            const snappedDeltaY = Math.round(deltaHour * 4) / 4;
            const deltaX = currentX - startX;
            const columnWidth = isCompact ? 200 : 300;
            const dayShift = Math.round(-deltaX / columnWidth); // در زبان راست‌چین، جابجایی به چپ (ایکس منفی) مساوی است با روزهای آینده (+)

            if (snappedDeltaY !== 0 || dayShift !== 0) {
                let newStartHour = Math.max(0, Math.min(24 - record.duration, originalStartHour + snappedDeltaY));
                let updatedRec = { ...record, startTime: formatTime(newStartHour) };
                
                if (dayShift !== 0) {
                    const newJDate = addDaysToJalaali(record.jy, record.jm, record.jd, dayShift);
                    updatedRec = {
                        ...updatedRec,
                        jy: newJDate.jy,
                        jm: newJDate.jm,
                        jd: newJDate.jd,
                        dateString: `${newJDate.jy}/${newJDate.jm.toString().padStart(2,'0')}/${newJDate.jd.toString().padStart(2,'0')}`
                    };
                }
                
                if (hasOverlap(updatedRec, displayRecords)) {
                    alert('خطا: زمان انتخاب شده با باکس دیگری تداخل دارد!');
                } else {
                    if (role === 'teacher' && teacherViewMode === 'base') {
                         setBasePlans(basePlans.map(bp => {
                             if (bp.records.some(r => r.id === updatedRec.id)) {
                                 return { ...bp, records: bp.records.map(r => r.id === updatedRec.id ? updatedRec : r) };
                             }
                             return bp;
                         }));
                    } else {
                         setRecords(allRecords.map(r => r.id === record.id ? updatedRec : r));
                    }
                }
            } else {
                // اگر جابجایی صورت نگرفت یعنی کلیک بوده است
                if (canEdit) setEditBox(record);
            }
        }
        setInteractionState(null);
     };
     
     if (interactionState) {
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
     }
     return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); }
  }, [interactionState, allSubjects, allRecords, setRecords, basePlans, setBasePlans, canEdit, displayRecords, role, teacherViewMode, studentId]);

  const handleMouseDown = (e, dateObj, isCompact) => {
    if (!canEdit) {
        if (role === 'student' && viewingFutureWeek && isSubmitted) {
            alert('برنامه ارسال شده است. برای ویرایش مجدد، دکمه ویرایش را بزنید.');
        }
        return;
    }
    if (e.button !== 0 || e.target.closest('.record-box')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const dateStrKey = `${dateObj.jy}-${dateObj.jm}-${dateObj.jd}`;
    setInteractionState({ type: 'draw', dateObj, dateStrKey, startY: y, currentY: y, isCompact });
  };

  const handleSavePendingBox = () => {
     if(!pendingBox) return;
     let newIsTarget = false;
     if (role === 'teacher') {
         newIsTarget = teacherViewMode === 'base';
     } else {
         newIsTarget = isFutureWeek(pendingBox.jy, pendingBox.jm, pendingBox.jd);
     }
     
     const newRec = {
        id: crypto.randomUUID(), studentId, jy: pendingBox.jy, jm: pendingBox.jm, jd: pendingBox.jd,
        dateString: pendingBox.dateString, subject: pendingBox.subject, startTime: pendingBox.startTime, 
        duration: Number(pendingBox.duration), description: pendingBox.description, 
        submittedAt: new Date().toISOString(),
        isTarget: newIsTarget
     };

     if(hasOverlap(newRec, displayRecords)) {
         setPendingBox({...pendingBox, error: 'خطا: زمان ثبت شده با برنامه دیگری تداخل دارد!'});
         return;
     }

     if (role === 'teacher' && teacherViewMode === 'base') {
         const wKey = getWeekKey({jy: newRec.jy, jm: newRec.jm, jd: newRec.jd});
         const bp = basePlans.find(p => p.studentId === studentId && p.weekKey === wKey);
         if (bp) {
             setBasePlans(basePlans.map(p => p.id === bp.id ? { ...p, records: [...p.records, newRec] } : p));
         } else {
             setBasePlans([...basePlans, { id: crypto.randomUUID(), studentId, weekKey: wKey, submittedAt: new Date().toISOString(), records: [newRec] }]);
             setSubmittedWeeks([...submittedWeeks, wKey]);
         }
     } else {
         setRecords([...allRecords, newRec]);
     }
     setPendingBox(null);
  };

  const saveEditBox = () => {
      if(hasOverlap(editBox, displayRecords)) {
          setEditBox({...editBox, error: 'خطا: تغییرات با باکس‌های دیگر تداخل دارد!'});
          return;
      }
      if (role === 'teacher' && teacherViewMode === 'base') {
           const wKey = getWeekKey({jy: editBox.jy, jm: editBox.jm, jd: editBox.jd});
           setBasePlans(basePlans.map(bp => bp.weekKey === wKey && bp.studentId === studentId ? { ...bp, records: bp.records.map(r => r.id === editBox.id ? editBox : r) } : bp));
      } else {
           setRecords(allRecords.map(r => r.id === editBox.id ? editBox : r));
      }
      setEditBox(null);
  };

  const handleContextMenu = (e, rec) => { 
      if (!canEdit) return;
      e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, record: rec }); 
  };
  
  const updateColor = (recId, colorClass) => { 
      setRecords(prev => prev.map(r => r.id === recId ? {...r, customColor: colorClass} : r)); 
      setBasePlans(prev => prev.map(bp => ({...bp, records: bp.records.map(r => r.id === recId ? {...r, customColor: colorClass} : r)})));
      setContextMenu(null); 
  };
  
  const deleteRecord = (e, rec) => { 
      e.preventDefault(); e.stopPropagation();
      if(window.confirm('آیا از حذف این باکس اطمینان دارید؟')) { 
          if (role === 'teacher' && teacherViewMode === 'base') {
              const wKey = getWeekKey({jy: rec.jy, jm: rec.jm, jd: rec.jd});
              setBasePlans(basePlans.map(bp => bp.weekKey === wKey && bp.studentId === studentId ? { ...bp, records: bp.records.filter(r => r.id !== rec.id) } : bp));
          } else {
              setRecords(prev => prev.filter(r => r.id !== rec.id)); 
          }
      } 
      setContextMenu(null); 
  };

  const TimelineColumn = ({ dateObj, dayRecords, showHeader = true, isCompact = false }) => {
    const START_HOUR = 0; const END_HOUR = 24; const HOUR_HEIGHT = isCompact ? 40 : 50; const TOTAL_HEIGHT = END_HOUR * HOUR_HEIGHT;
    const dateStrKey = `${dateObj.jy}-${dateObj.jm}-${dateObj.jd}`;
    const dateString = `${dateObj.jy}/${dateObj.jm.toString().padStart(2,'0')}/${dateObj.jd.toString().padStart(2,'0')}`;

    let drawOverlay = null;
    if (interactionState?.type === 'draw' && interactionState.dateStrKey === dateStrKey) {
      let rawStart = Math.min(interactionState.startY, interactionState.currentY) / HOUR_HEIGHT;
      let rawEnd = Math.max(interactionState.startY, interactionState.currentY) / HOUR_HEIGHT;
      let startHour = Math.round(rawStart * 4) / 4;
      let endHour = Math.max(startHour + 0.25, Math.round(rawEnd * 4) / 4);
      let y1 = startHour * HOUR_HEIGHT; let height = (endHour - startHour) * HOUR_HEIGHT;

      drawOverlay = <div className="absolute left-2 right-12 bg-indigo-500/50 border-2 border-indigo-500 border-dashed rounded-lg z-30 pointer-events-none flex flex-col justify-center items-center text-white font-bold text-xs" style={{ top: `${y1}px`, height: `${height}px` }}>
          <span className="bg-white/80 text-indigo-700 px-1 rounded">{formatTime(startHour)}</span>
          <span className="opacity-80 mt-0.5">{endHour - startHour}h</span>
      </div>
    }
    
    let pendingOverlay = null;
    if (pendingBox && pendingBox.dateString === dateString) {
        pendingOverlay = (
           <div className="absolute left-2 right-12 bg-indigo-600 border-2 border-indigo-400 border-dashed rounded-xl z-30 flex flex-col items-center justify-center text-white font-bold text-sm shadow-xl animate-pulse" 
                style={{ top: `${pendingBox.top}px`, height: `${pendingBox.height}px` }}>
              <span className="bg-white text-indigo-700 px-2 py-0.5 rounded-md text-xs">{pendingBox.startTime}</span>
              <span className="text-[10px] opacity-80 mt-1">{pendingBox.duration}h</span>
           </div>
        );
    }

    return (
      <div className="relative border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 flex-none group select-none" style={{ minWidth: isCompact ? '200px' : '300px' }}>
        {showHeader && (
          <div className="sticky top-0 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm p-3 border-b border-slate-200 dark:border-slate-700 z-40 text-center shadow-sm">
             <div className="font-black text-slate-800 dark:text-slate-100 text-sm">{getWeekdayFromJalaali(dateObj.jy, dateObj.jm, dateObj.jd)}</div>
             <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">{dateObj.jd} {SHAMSI_MONTHS[dateObj.jm - 1]}</div>
          </div>
        )}
        <div ref={el => timelineRefs.current[dateStrKey] = el} className={`relative ${canEdit ? 'cursor-crosshair' : 'cursor-not-allowed opacity-90'}`} style={{ height: `${TOTAL_HEIGHT}px` }} onMouseDown={e => handleMouseDown(e, dateObj, isCompact)}>
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-10 transition-opacity">
            {canEdit && <Plus className="w-16 h-16 text-indigo-500" />}
          </div>
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="absolute w-full border-t border-slate-100 dark:border-slate-700/50" style={{ top: `${i * HOUR_HEIGHT}px` }}>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 absolute right-1 -top-2 bg-white dark:bg-slate-800 px-1 rounded">{i.toString().padStart(2, '0')}:00</span>
            </div>
          ))}

          {dayRecords.map(rec => {
            let previewTop, previewHeight, previewStartTime, previewDuration, previewTranslateX = 0;
            let isMoving = false;

            if (interactionState?.type === 'move' && interactionState.record.id === rec.id) {
                 isMoving = true;
                 const deltaY = interactionState.currentY - interactionState.startY;
                 const deltaHour = deltaY / HOUR_HEIGHT;
                 const snappedDeltaY = Math.round(deltaHour * 4) / 4;
                 let newStartHour = Math.max(0, Math.min(24 - rec.duration, interactionState.originalStartHour + snappedDeltaY));
                 
                 previewStartTime = formatTime(newStartHour); 
                 previewDuration = rec.duration;
                 previewTop = newStartHour * HOUR_HEIGHT; 
                 previewHeight = previewDuration * HOUR_HEIGHT;
                 previewTranslateX = interactionState.currentX - interactionState.startX;
            } else if (interactionState?.type === 'resize' && interactionState.record.id === rec.id) {
                 let startHour = t2d(rec.startTime); let durationHour = rec.duration; let endHour = startHour + durationHour;
                 const deltaHour = (interactionState.currentY - interactionState.startY) / HOUR_HEIGHT;
                 const snappedDelta = Math.round(deltaHour * 4) / 4;
                 if (interactionState.edge === 'top') startHour = Math.min(endHour - 0.25, Math.max(0, startHour + snappedDelta));
                 else endHour = Math.max(startHour + 0.25, Math.min(24, endHour + snappedDelta));
                 
                 previewStartTime = formatTime(startHour); previewDuration = endHour - startHour;
                 previewTop = startHour * HOUR_HEIGHT; previewHeight = previewDuration * HOUR_HEIGHT;
            } else {
                 const [hStr, mStr] = rec.startTime.split(':');
                 previewTop = (Number(hStr) + Number(mStr) / 60) * HOUR_HEIGHT; 
                 previewHeight = rec.duration * HOUR_HEIGHT;
                 previewStartTime = rec.startTime; previewDuration = rec.duration;
            }
            if (previewTop + previewHeight > TOTAL_HEIGHT) previewHeight = TOTAL_HEIGHT - previewTop;

            const style = getSubjectStyle(rec);
            const isBaseStyle = rec.isTarget || (role === 'teacher' && teacherViewMode === 'base') ? 'border-dashed opacity-80 border-[3px]' : 'opacity-100 hover:opacity-90';

            return (
              <div key={rec.id} 
                onMouseDown={(e) => {
                    if (!canEdit) return;
                    e.stopPropagation();
                    const rect = timelineRefs.current[dateStrKey].getBoundingClientRect();
                    setInteractionState({ 
                        type: 'move', 
                        record: rec, 
                        dateObj, 
                        dateStrKey, 
                        startY: e.clientY - rect.top, 
                        currentY: e.clientY - rect.top,
                        startX: e.clientX,
                        currentX: e.clientX,
                        isCompact,
                        originalStartHour: t2d(rec.startTime)
                    });
                }}
                onContextMenu={(e) => handleContextMenu(e, rec)}
                className={`record-box group absolute left-2 right-12 rounded-xl transition-all border-2 ${isBaseStyle} shadow-sm overflow-hidden flex flex-col justify-center items-center text-center ${style} ${canEdit ? 'cursor-move' : ''}`}
                style={{ 
                    top: `${previewTop}px`, 
                    height: `${previewHeight}px`, 
                    minHeight: '24px',
                    transform: isMoving ? `translateX(${previewTranslateX}px)` : 'none',
                    zIndex: isMoving ? 100 : 20,
                    transition: isMoving ? 'none' : 'all 0.2s ease-in-out'
                }}
              >
                {canEdit && (
                  <div className="absolute top-0 inset-x-0 h-3 cursor-ns-resize z-30 flex items-start justify-center opacity-0 group-hover:opacity-100"
                       onMouseDown={e => { e.stopPropagation(); const rect = timelineRefs.current[dateStrKey].getBoundingClientRect(); setInteractionState({ type: 'resize', record: rec, edge: 'top', dateObj, dateStrKey, startY: e.clientY - rect.top, currentY: e.clientY - rect.top, isCompact }); }}>
                     <div className="w-8 h-1.5 bg-white/70 rounded-full mt-0.5" />
                  </div>
                )}

                <div className="font-black text-xs truncate w-full pointer-events-none">{rec.subject}</div>
                {previewHeight > 30 && <div className="text-[10px] font-bold opacity-90 pointer-events-none">{previewStartTime} ({previewDuration}h)</div>}

                {canEdit && (
                  <div className="absolute bottom-0 inset-x-0 h-3 cursor-ns-resize z-30 flex items-end justify-center opacity-0 group-hover:opacity-100"
                       onMouseDown={e => { e.stopPropagation(); const rect = timelineRefs.current[dateStrKey].getBoundingClientRect(); setInteractionState({ type: 'resize', record: rec, edge: 'bottom', dateObj, dateStrKey, startY: e.clientY - rect.top, currentY: e.clientY - rect.top, isCompact }); }}>
                     <div className="w-8 h-1.5 bg-white/70 rounded-full mb-0.5" />
                  </div>
                )}
              </div>
            );
          })}
          {drawOverlay}
          {pendingOverlay}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl w-full shadow-sm p-1.5 gap-2 transition-colors justify-between items-center">
        <div className="flex gap-1 overflow-x-auto w-full md:w-auto">
           <button onClick={() => setViewMode('weekly')} className={`px-4 py-2.5 text-sm font-black rounded-xl flex items-center transition-colors ${viewMode === 'weekly' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><CalendarDays className="w-4 h-4 ml-1 md:ml-2"/> هفتگی</button>
           <button onClick={() => setViewMode('daily')} className={`px-4 py-2.5 text-sm font-black rounded-xl flex items-center transition-colors ${viewMode === 'daily' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><AlignVerticalJustifyStart className="w-4 h-4 ml-1 md:ml-2"/> روزانه</button>
           <button onClick={() => setViewMode('monthly')} className={`px-4 py-2.5 text-sm font-black rounded-xl flex items-center transition-colors ${viewMode === 'monthly' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><Grid className="w-4 h-4 ml-1 md:ml-2"/> ماهانه</button>
        </div>
      </div>

      <FeedbackBox studentId={studentId} dateKey={currentDateKey} role={role} feedbacks={feedbacks} setFeedbacks={setFeedbacks} />

      <div className="flex flex-col lg:flex-row gap-6">
         <div className="flex-1 min-w-0">
            {viewMode === 'daily' && (
               <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                <div className="bg-indigo-50 dark:bg-slate-700 p-4 border-b border-indigo-100 dark:border-slate-600 flex justify-between items-center">
                  <button onClick={() => shiftDays(-1)} className="p-2 bg-white dark:bg-slate-600 rounded-xl shadow-sm hover:bg-slate-50 dark:text-white"><ChevronRight className="w-5 h-5"/></button>
                  <div className="text-center">
                    <h3 className="text-xl font-black text-indigo-900 dark:text-indigo-300">{getWeekdayFromJalaali(selectedDate.jy, selectedDate.jm, selectedDate.jd)}</h3>
                    <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">{selectedDate.jd} {SHAMSI_MONTHS[selectedDate.jm - 1]} {selectedDate.jy}</p>
                  </div>
                  <button onClick={() => shiftDays(1)} className="p-2 bg-white dark:bg-slate-600 rounded-xl shadow-sm hover:bg-slate-50 dark:text-white"><ChevronLeft className="w-5 h-5"/></button>
                </div>
                <div className="overflow-y-auto hide-scrollbar" style={{ height: '65vh' }} onScroll={() => setContextMenu(null)}>
                  <TimelineColumn dateObj={selectedDate} dayRecords={displayRecords.filter(r => r.dateString === `${selectedDate.jy}/${selectedDate.jm.toString().padStart(2,'0')}/${selectedDate.jd.toString().padStart(2,'0')}`)} showHeader={false} />
                </div>
              </div>
            )}
            {viewMode === 'weekly' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors flex flex-col relative">
                 <div className="bg-indigo-50 dark:bg-slate-700 p-4 border-b border-indigo-100 dark:border-slate-600 flex flex-col xl:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => shiftDays(-7)} className="p-2 bg-white dark:bg-slate-600 rounded-xl shadow-sm hover:bg-slate-50 dark:text-white flex items-center text-sm font-bold"><ChevronRight className="w-4 h-4 ml-1"/> هفته قبل</button>
                    <button onClick={() => shiftDays(7)} className="p-2 bg-white dark:bg-slate-600 rounded-xl shadow-sm hover:bg-slate-50 dark:text-white flex items-center text-sm font-bold">هفته بعد <ChevronLeft className="w-4 h-4 mr-1"/></button>
                  </div>
                  
                  <div className="text-center font-black text-indigo-900 dark:text-indigo-300 text-base md:text-lg order-first xl:order-none">
                     هفته: {getJalaaliWeekDays(selectedDate.jy, selectedDate.jm, selectedDate.jd)[0].jd} {SHAMSI_MONTHS[getJalaaliWeekDays(selectedDate.jy, selectedDate.jm, selectedDate.jd)[0].jm - 1]} تا {getJalaaliWeekDays(selectedDate.jy, selectedDate.jm, selectedDate.jd)[6].jd} {SHAMSI_MONTHS[getJalaaliWeekDays(selectedDate.jy, selectedDate.jm, selectedDate.jd)[6].jm - 1]}
                     {!canEdit && role === 'student' && <div className="text-xs text-red-500 mt-1 flex items-center justify-center"><Lock className="w-3 h-3 ml-1"/> (غیرقابل تغییر)</div>}
                  </div>

                  {role === 'student' && viewingFutureWeek && !isSubmitted && (
                    <button 
                        onClick={() => setShowSubmitModal(true)}
                        className={`flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md bg-indigo-600 text-white hover:bg-indigo-700 animate-pulse`}
                    >
                        <Send className="w-4 h-4 ml-2"/>
                        ثبت نهایی و ارسال
                    </button>
                  )}
                  {role === 'student' && viewingFutureWeek && isSubmitted && (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center px-4 py-2 rounded-xl text-sm font-bold shadow-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle className="w-4 h-4 ml-2"/>
                            ارسال شده
                        </div>
                        <button onClick={handleRevertSubmission} className="flex items-center px-4 py-2 rounded-xl text-sm font-bold shadow-md bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 transition-colors">
                            <Edit3 className="w-4 h-4 ml-1" />
                            ویرایش برنامه
                        </button>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto overflow-y-auto hide-scrollbar flex" style={{ height: '70vh', direction: 'rtl' }} onScroll={() => setContextMenu(null)}>
                  {getJalaaliWeekDays(selectedDate.jy, selectedDate.jm, selectedDate.jd).map((dateObj, i) => (
                     <TimelineColumn key={i} dateObj={dateObj} dayRecords={displayRecords.filter(r => r.dateString === `${dateObj.jy}/${dateObj.jm.toString().padStart(2,'0')}/${dateObj.jd.toString().padStart(2,'0')}`)} isCompact={true} />
                  ))}
                </div>
              </div>
            )}
            {viewMode === 'monthly' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden p-6 transition-colors">
                <div className="flex justify-between items-center mb-6 bg-slate-50 dark:bg-slate-700 p-4 rounded-2xl border dark:border-slate-600">
                  <button onClick={() => shiftMonth(-1)} className="p-2 bg-white dark:bg-slate-600 rounded-xl shadow-sm dark:text-white"><ChevronRight className="w-5 h-5"/></button>
                  <div className="text-center text-xl font-black text-slate-800 dark:text-white">{SHAMSI_MONTHS[selectedDate.jm - 1]} {selectedDate.jy}</div>
                  <button onClick={() => shiftMonth(1)} className="p-2 bg-white dark:bg-slate-600 rounded-xl shadow-sm dark:text-white"><ChevronLeft className="w-5 h-5"/></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                  {Array.from({ length: selectedDate.jm <= 6 ? 31 : (selectedDate.jm <= 11 ? 30 : 29) }, (_, i) => i + 1).map(day => {
                     const dateStr = `${selectedDate.jy}/${selectedDate.jm.toString().padStart(2,'0')}/${day.toString().padStart(2,'0')}`;
                     const dayRecords = displayRecords.filter(r => r.dateString === dateStr);
                     const studyH = dayRecords.filter(r => r.subject !== 'خواب').reduce((s, r) => s + r.duration, 0);
                     const sleepH = dayRecords.filter(r => r.subject === 'خواب').reduce((s, r) => s + r.duration, 0);
                     return (
                       <div key={day} onClick={() => { setSelectedDate({...selectedDate, jd: day}); setViewMode('daily'); }}
                         className={`bg-white dark:bg-slate-700 rounded-2xl border-2 border-slate-100 dark:border-slate-600 p-4 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg transition-all relative group h-32`}
                       >
                         <span className="text-2xl font-black text-slate-800 dark:text-white mb-2">{day}</span>
                         {studyH > 0 && <span className={`text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-opacity-20 px-2 py-1 rounded w-full text-center mb-1 truncate`}>{studyH} h مطالعه</span>}
                         {sleepH > 0 && <span className="text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/50 dark:text-green-300 px-2 py-1 rounded w-full text-center truncate">{sleepH} h خواب</span>}
                       </div>
                     )
                  })}
                </div>
              </div>
            )}
         </div>

         {/* Sidebar Tasks */}
         <div className="w-full lg:w-80 flex-shrink-0 animate-in slide-in-from-left-4">
             <TaskSidebar studentId={studentId} tasks={tasks} setTasks={setTasks} role={role} />
         </div>
      </div>

      {/* Submission Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-[600] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
           <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl relative border border-slate-200 dark:border-slate-700 text-center">
              <div className="bg-indigo-100 dark:bg-indigo-900/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Send className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-4">ارسال برنامه برای مشاور</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-8 font-medium">
                این برنامه برای مشاور ارسال می شود. آیا از ثبت و تایید آن اطمینان دارید؟
              </p>
              <div className="flex gap-4">
                 <button onClick={handleConfirmSubmit} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-black text-lg transition-all shadow-lg shadow-indigo-200 dark:shadow-none">
                     تایید و ارسال
                 </button>
                 <button onClick={() => setShowSubmitModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                     لغو
                 </button>
              </div>
           </div>
        </div>
      )}

      {pendingBox && (
         <div className="fixed inset-0 bg-slate-900/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative border border-slate-200 dark:border-slate-700">
               <h3 className="text-xl font-black text-slate-800 dark:text-white border-b dark:border-slate-700 pb-3 mb-4 flex items-center">
                  <Check className="w-5 h-5 ml-2 text-indigo-500" /> ثبت زمان جدید
               </h3>
               <div className="space-y-4 mb-6">
                  {pendingBox.error && <div className="bg-red-100 text-red-700 p-2 rounded-lg text-xs font-bold border border-red-200">{pendingBox.error}</div>}
                  <div>
                     <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">نام درس / فعالیت:</label>
                     <select value={pendingBox.subject} onChange={e => setPendingBox({...pendingBox, subject: e.target.value, error: null})} className="w-full border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 dark:text-white rounded-xl text-sm py-2 px-3 outline-none font-bold">
                        {allSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                     </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ساعت شروع</label>
                        <input type="time" value={pendingBox.startTime} onChange={e => setPendingBox({...pendingBox, startTime: e.target.value, error: null})} className="w-full border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 dark:text-white rounded-xl text-sm py-2 px-3 outline-none font-bold text-left" dir="ltr" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">مدت زمان (h)</label>
                        <input type="number" step="0.25" min="0" value={pendingBox.duration} onChange={e => setPendingBox({...pendingBox, duration: Number(e.target.value), error: null})} className="w-full border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 dark:text-white rounded-xl text-sm py-2 px-3 outline-none font-bold" />
                     </div>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">توضیحات (اختیاری):</label>
                     <textarea rows={2} value={pendingBox.description} onChange={e => setPendingBox({...pendingBox, description: e.target.value})} className="w-full border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 dark:text-white rounded-xl text-sm py-2 px-3 outline-none resize-none font-medium" />
                  </div>
               </div>
               <div className="flex gap-2">
                  <button onClick={handleSavePendingBox} className={`flex-1 text-white py-2.5 rounded-xl font-bold transition-colors shadow-lg bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none`}>تایید و ثبت</button>
                  <button onClick={() => setPendingBox(null)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">لغو</button>
               </div>
            </div>
         </div>
      )}

      {contextMenu && (
        <div 
           className="fixed z-[500] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 w-48 transition-colors" 
           style={{ top: contextMenu.y, left: contextMenu.x }}
           onMouseDown={(e) => e.stopPropagation()}
           onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center"><Palette className="w-3 h-3 ml-1" /> انتخاب رنگ</div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {CUSTOM_PALETTES.map((colorClass, idx) => (
              <div key={idx} onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); updateColor(contextMenu.record.id, colorClass); }} className={`w-8 h-8 rounded-full cursor-pointer border-2 transition-transform hover:scale-110 ${colorClass.split(' ')[0]} ${colorClass.split(' ')[1]}`} />
            ))}
          </div>
          <div className="border-t dark:border-slate-700 pt-2">
            <button onPointerDown={(e) => deleteRecord(e, contextMenu.record)} className="w-full text-right text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-colors flex items-center">
              <Trash2 className="w-3 h-3 ml-1" /> حذف این باکس
            </button>
          </div>
        </div>
      )}

      {editBox && (
        <div className="fixed inset-0 z-[400] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative border-t-8 border-indigo-500" style={{borderColor: getSubjectStyle(editBox).includes('green') ? '#22c55e' : '#6366f1'}}>
              <button onClick={() => setEditBox(null)} className="absolute top-4 left-4 p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-slate-800 dark:hover:text-white"><X className="w-4 h-4"/></button>
              <h3 className="text-xl font-black text-slate-800 dark:text-white border-b dark:border-slate-700 pb-3 mb-4 flex items-center">
                 <Edit className="w-5 h-5 ml-2 text-indigo-500" /> ویرایش باکس زمان
              </h3>
              <div className="space-y-4 mb-6">
                 {editBox.error && <div className="bg-red-100 text-red-700 p-2 rounded-lg text-xs font-bold border border-red-200">{editBox.error}</div>}
                 <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">نام درس / فعالیت:</label>
                    <select value={editBox.subject} onChange={e => setEditBox({...editBox, subject: e.target.value, error: null})} className="w-full border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 dark:text-white rounded-xl text-sm py-2 px-3 outline-none font-bold">
                       {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ساعت شروع</label>
                       <input type="time" value={editBox.startTime} onChange={e => setEditBox({...editBox, startTime: e.target.value, error: null})} className="w-full border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 dark:text-white rounded-xl text-sm py-2 px-3 outline-none font-bold text-left" dir="ltr" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">مدت زمان (h)</label>
                       <input type="number" step="0.25" min="0" value={editBox.duration} onChange={e => setEditBox({...editBox, duration: Number(e.target.value), error: null})} className="w-full border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 dark:text-white rounded-xl text-sm py-2 px-3 outline-none font-bold" />
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">توضیحات (اختیاری):</label>
                    <textarea value={editBox.description || ''} onChange={e => setEditBox({...editBox, description: e.target.value, error: null})} className="w-full border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 dark:text-white rounded-xl text-sm py-2 px-3 outline-none resize-none font-medium" />
                 </div>
              </div>
              <div className="flex gap-2">
                 <button onClick={saveEditBox} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg">ذخیره تغییرات</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function RecordsList({ displayRecords, allRecords, setRecords, basePlans, setBasePlans, role, titles, setTitles, teacherEditMode, teacherViewMode, studentId }) {
  
  const canDelete = role === 'student' || (role === 'teacher' && teacherEditMode);
  
  const handleDelete = (rec) => { 
     if(window.confirm('آیا از حذف این رکورد اطمینان دارید؟')) {
        if (role === 'teacher' && teacherViewMode === 'base') {
            const wKey = getWeekKey({jy: rec.jy, jm: rec.jm, jd: rec.jd});
            setBasePlans(basePlans.map(bp => bp.weekKey === wKey && bp.studentId === studentId ? { ...bp, records: bp.records.filter(r => r.id !== rec.id) } : bp));
        } else {
            setRecords(allRecords.filter(r => r.id !== rec.id)); 
        }
     }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
      <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center">
        <EditableTitle isTeacher={role === 'teacher'} titleKey="listTitle" titles={titles} setTitles={setTitles} defaultTitle="لیست رکوردها" className="text-lg font-black text-slate-800 dark:text-white" />
        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          {displayRecords.length} رکورد
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-right">
          <thead className="bg-white dark:bg-slate-800">
            <tr>
              <th className="px-6 py-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider"><EditableTitle isTeacher={role === 'teacher'} titleKey="colDate" titles={titles} setTitles={setTitles} defaultTitle="تاریخ" className="" /></th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider"><EditableTitle isTeacher={role === 'teacher'} titleKey="colSubj" titles={titles} setTitles={setTitles} defaultTitle="فعالیت" className="" /></th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider"><EditableTitle isTeacher={role === 'teacher'} titleKey="colTime" titles={titles} setTitles={setTitles} defaultTitle="ساعت" className="" /></th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider"><EditableTitle isTeacher={role === 'teacher'} titleKey="colDur" titles={titles} setTitles={setTitles} defaultTitle="مدت" className="" /></th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider"><EditableTitle isTeacher={role === 'teacher'} titleKey="colMode" titles={titles} setTitles={setTitles} defaultTitle="توضیحات" className="" /></th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center"><EditableTitle isTeacher={role === 'teacher'} titleKey="colAction" titles={titles} setTitles={setTitles} defaultTitle="عملیات" className="" /></th>
            </tr>
          </thead>
          <tbody className="bg-slate-50 dark:bg-slate-900/50 divide-y divide-white dark:divide-slate-800">
            {displayRecords.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-12 text-center font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800">رکوردی یافت نشد.</td></tr>
            ) : (
              [...displayRecords].sort((a,b) => b.dateString.localeCompare(a.dateString)).map((rec) => {
                const style = getSubjectStyle(rec);
                return (
                <tr key={rec.id} className="hover:bg-white dark:hover:bg-slate-800 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-slate-700 dark:text-slate-300">{rec.dateString}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`px-3 py-1 rounded-lg text-xs font-bold border ${style}`}>{rec.subject}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-500 dark:text-slate-400">{rec.startTime}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-indigo-700 dark:text-indigo-400">{rec.duration} <span className="text-xs font-bold text-slate-400">h</span></td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400 truncate max-w-[150px]" title={rec.description}>{rec.description || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button onClick={() => handleDelete(rec)} disabled={!canDelete} className="text-red-600 dark:text-red-400 hover:text-white hover:bg-red-500 bg-red-50 dark:bg-red-900/30 p-2.5 rounded-xl transition-colors border border-red-100 dark:border-red-800 disabled:opacity-50" title="حذف"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}