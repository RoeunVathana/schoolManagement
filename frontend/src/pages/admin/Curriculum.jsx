import { useEffect, useMemo, useState } from 'react';
import api, { unwrap } from '../../api/axios';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import { useLanguage } from '../../context/LanguageContext';
import { courseCatalog } from '../course/CourseReader';
import './curriculum.css';

const clone = (value) => JSON.parse(JSON.stringify(value));

function makeLesson(unitNumber, index) {
  const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    label: `${unitNumber}.${index}. New lesson`,
    heading: 'New lesson',
    intro: '',
    bodyHeading: 'Lesson notes',
    body: '',
    code: '',
    preview: { title: 'Lesson preview', body: '' },
    keywords: [],
    objectives: [],
  };
}

function makeUnit(number) {
  return { number: String(number), title: `Unit ${number}`, items: [makeLesson(number, 1)] };
}

function normalizeLocalCourse(course) {
  const next = clone(course || {});
  next.slug = next.slug || 'new-course';
  next.title = next.title || 'Programming course';
  next.description = next.description || '';
  next.codeLabel = next.codeLabel || 'example.txt';
  next.tip = next.tip || '';
  next.lessons = Array.isArray(next.lessons) && next.lessons.length ? next.lessons : [makeUnit(1)];
  next.lessons = next.lessons.map((unit, index) => ({
    number: String(unit.number ?? index + 1),
    title: unit.title || `Unit ${index + 1}`,
    items: Array.isArray(unit.items) && unit.items.length ? unit.items : [makeLesson(String(unit.number ?? index + 1), 1)],
  }));
  return next;
}

const field = 'input mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950/40 dark:text-white';
const area = `${field} min-h-28 resize-y`;

export default function Curriculum() {
  const { t, language } = useLanguage();
  const courseOptions = useMemo(() => Object.values(courseCatalog).filter((course) => course?.slug).sort((a, b) => a.title.localeCompare(b.title)), []);
  const defaultCourseFor = (slug) => courseOptions.find((course) => String(course.slug).toLowerCase() === String(slug).toLowerCase()) || courseCatalog[slug];
  const [selectedSlug, setSelectedSlug] = useState(courseOptions[0]?.slug || 'html');
  const [working, setWorking] = useState(null);
  const [savedSlugs, setSavedSlugs] = useState(() => new Set());
  const [selectedUnit, setSelectedUnit] = useState(0);
  const [selectedLesson, setSelectedLesson] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadSaved = async () => {
    const data = unwrap(await api.get('/admin/programming-content'));
    setSavedSlugs(new Set((Array.isArray(data) ? data : []).map((row) => String(row.slug).toLowerCase())));
  };

  const loadCourse = async (slug) => {
    setLoading(true);
    setError('');
    setNotice('');
    setSelectedUnit(0);
    setSelectedLesson(0);
    try {
      const data = unwrap(await api.get(`/admin/programming-content/${encodeURIComponent(slug)}`));
      setWorking(normalizeLocalCourse(data));
    } catch (requestError) {
      if (requestError.response?.status === 404) {
        setWorking(normalizeLocalCourse(defaultCourseFor(slug)));
      } else {
        setError(requestError.response?.data?.message || 'Could not load curriculum.');
        setWorking(normalizeLocalCourse(defaultCourseFor(slug)));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSaved().catch((requestError) => setError(requestError.response?.data?.message || 'Could not load saved curriculum.'));
  }, []);

  useEffect(() => {
    if (selectedSlug) loadCourse(selectedSlug);
  }, [selectedSlug]);

  const updateCourse = (key, value) => setWorking((current) => ({ ...current, [key]: value }));
  const updateUnit = (key, value) => setWorking((current) => ({ ...current, lessons: current.lessons.map((unit, index) => index === selectedUnit ? { ...unit, [key]: value } : unit) }));
  const updateLesson = (key, value) => setWorking((current) => ({ ...current, lessons: current.lessons.map((unit, unitIndex) => unitIndex !== selectedUnit ? unit : { ...unit, items: unit.items.map((lesson, lessonIndex) => lessonIndex === selectedLesson ? { ...lesson, [key]: value } : lesson) }) }));
  const selectedUnitData = working?.lessons?.[selectedUnit];
  const selectedLessonData = selectedUnitData?.items?.[selectedLesson];

  const addUnit = () => {
    const nextNumber = (working?.lessons?.length || 0) + 1;
    setWorking((current) => ({ ...current, lessons: [...current.lessons, makeUnit(nextNumber)] }));
    setSelectedUnit(nextNumber - 1);
    setSelectedLesson(0);
  };

  const removeUnit = (index) => {
    if (!working || working.lessons.length <= 1) return;
    if (!window.confirm(language === 'km' ? 'លុបឯកតានេះ?' : 'Delete this unit and all lessons inside it?')) return;
    const next = working.lessons.filter((_, unitIndex) => unitIndex !== index);
    setWorking({ ...working, lessons: next });
    const nextUnit = Math.min(selectedUnit, next.length - 1);
    setSelectedUnit(nextUnit);
    setSelectedLesson(0);
  };

  const addLesson = () => {
    if (!working || !selectedUnitData) return;
    const next = [...selectedUnitData.items, makeLesson(selectedUnitData.number, selectedUnitData.items.length + 1)];
    setWorking({ ...working, lessons: working.lessons.map((unit, index) => index === selectedUnit ? { ...unit, items: next } : unit) });
    setSelectedLesson(next.length - 1);
  };

  const removeLesson = (index) => {
    if (!working || !selectedUnitData || selectedUnitData.items.length <= 1) return;
    if (!window.confirm(language === 'km' ? 'លុបមេរៀននេះ?' : 'Delete this lesson?')) return;
    const nextItems = selectedUnitData.items.filter((_, lessonIndex) => lessonIndex !== index);
    setWorking({ ...working, lessons: working.lessons.map((unit, unitIndex) => unitIndex === selectedUnit ? { ...unit, items: nextItems } : unit) });
    setSelectedLesson(Math.min(selectedLesson, nextItems.length - 1));
  };

  const save = async () => {
    if (!working) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = savedSlugs.has(selectedSlug.toLowerCase())
        ? await api.patch(`/admin/programming-content/${encodeURIComponent(selectedSlug)}`, working)
        : await api.post('/admin/programming-content', working);
      setWorking(normalizeLocalCourse(unwrap(response)));
      setSavedSlugs((current) => new Set(current).add(selectedSlug.toLowerCase()));
      setNotice(language === 'km' ? 'បានរក្សាទុកកម្មវិធីសិក្សា។' : 'Curriculum saved to the server.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save curriculum.');
    } finally {
      setBusy(false);
    }
  };

  const resetToDefaults = async () => {
    if (!savedSlugs.has(selectedSlug.toLowerCase())) {
      setWorking(normalizeLocalCourse(defaultCourseFor(selectedSlug)));
      return;
    }
    if (!window.confirm(language === 'km' ? 'លុបមាតិកាដែលបានរក្សាទុក ហើយត្រឡប់ទៅលំនាំដើម?' : 'Delete the saved override and restore the built-in curriculum?')) return;
    setBusy(true);
    try {
      await api.delete(`/admin/programming-content/${encodeURIComponent(selectedSlug)}`);
      setSavedSlugs((current) => { const next = new Set(current); next.delete(selectedSlug.toLowerCase()); return next; });
      setWorking(normalizeLocalCourse(defaultCourseFor(selectedSlug)));
      setNotice(language === 'km' ? 'បានត្រឡប់ទៅមាតិកាលំនាំដើម។' : 'Built-in curriculum restored.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not restore defaults.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="curriculum-page">
    <Header eyebrow="adminTools" title="curriculum" description="curriculumPage" action={<button type="button" onClick={save} disabled={busy || loading || !working} className="curriculum-save-button rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50">{busy ? t('saving') : t('saveChanges')}</button>} />
    {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
    {notice && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">{notice}</div>}
    <div className="curriculum-selector-card mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 sm:p-6">
      <div className="flex flex-wrap items-end gap-4">
        <label className="min-w-[14rem] flex-1 text-sm font-bold text-slate-700 dark:text-slate-200">{language === 'km' ? 'ភាសាសរសេរកូដ' : 'Programming language'}
          <select value={selectedSlug} onChange={(event) => setSelectedSlug(event.target.value)} className={field}>
            {courseOptions.map((course) => <option key={course.slug} value={course.slug}>{course.title} · {course.slug}{savedSlugs.has(String(course.slug).toLowerCase()) ? ' ✓' : ''}</option>)}
          </select>
        </label>
        <button type="button" onClick={resetToDefaults} disabled={busy || loading} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{language === 'km' ? 'ត្រឡប់លំនាំដើម' : 'Restore defaults'}</button>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{language === 'km' ? 'ការកែប្រែត្រូវបានបង្ហាញជាសាធារណៈនៅទំព័រវគ្គសិក្សា បន្ទាប់ពីរក្សាទុក។' : 'Saved changes are used by the public course reader for this language.'}</p>
    </div>
    {loading || !working ? <Loading /> : <div className="curriculum-content-grid grid gap-5 xl:grid-cols-[minmax(18rem,.85fr)_minmax(0,1.55fr)]">
      <section className="curriculum-unit-panel rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-coral">{working.title}</p><h2 className="mt-1 text-lg font-extrabold text-ink dark:text-white">{language === 'km' ? 'ឯកតា និងមេរៀន' : 'Units and lessons'}</h2></div><button type="button" onClick={addUnit} className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-extrabold text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-200">+ {language === 'km' ? 'ឯកតា' : 'Unit'}</button></div>
        <div className="curriculum-unit-list mt-5 space-y-3">{working.lessons.map((unit, unitIndex) => <div key={`${unit.number}-${unitIndex}`} className={`curriculum-unit-card rounded-2xl border p-3 transition ${selectedUnit === unitIndex ? 'is-active border-sky-400 bg-sky-50/70 dark:border-sky-500 dark:bg-sky-950/20' : 'border-slate-200 dark:border-slate-700'}`}>
          <button type="button" onClick={() => { setSelectedUnit(unitIndex); setSelectedLesson(0); }} className="w-full text-left"><span className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Unit {unit.number}</span><strong className="mt-1 block truncate text-sm text-ink dark:text-white">{unit.title}</strong><span className="mt-1 block text-xs text-slate-500 dark:text-slate-300">{unit.items.length} {language === 'km' ? 'មេរៀន' : 'lessons'}</span></button>
          {selectedUnit === unitIndex && <div className="curriculum-lesson-list mt-3 space-y-1 border-t border-slate-200 pt-3 dark:border-slate-700">{unit.items.map((lesson, lessonIndex) => <div key={lesson.id || lessonIndex} className={`curriculum-lesson-row flex items-center gap-2 rounded-xl px-2 py-1.5 ${selectedLesson === lessonIndex ? 'is-active bg-white shadow-sm dark:bg-slate-800' : ''}`}><button type="button" onClick={() => setSelectedLesson(lessonIndex)} className="min-h-9 min-w-0 flex-1 truncate text-left text-xs font-semibold text-slate-600 dark:text-slate-200">{lesson.label || lesson.heading || `Lesson ${lessonIndex + 1}`}</button><button type="button" onClick={() => removeLesson(lessonIndex)} disabled={unit.items.length <= 1} className="rounded-md px-1.5 text-xs font-bold text-red-500 disabled:opacity-30" aria-label="Delete lesson">×</button></div>)}<button type="button" onClick={addLesson} className="mt-2 min-h-10 w-full rounded-lg border border-dashed border-sky-300 px-2 py-2 text-xs font-bold text-sky-700 hover:bg-sky-50 dark:border-sky-700 dark:text-sky-200">+ {language === 'km' ? 'មេរៀន' : 'Lesson'}</button></div>}
          <button type="button" onClick={() => removeUnit(unitIndex)} disabled={working.lessons.length <= 1} className="mt-3 text-[11px] font-bold text-red-500 disabled:opacity-30">{language === 'km' ? 'លុបឯកតា' : 'Delete unit'}</button>
        </div>)}</div>
      </section>
      <section className="curriculum-editor-column space-y-5">
        <div className="curriculum-form-card rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 sm:p-6"><h2 className="text-lg font-extrabold text-ink dark:text-white">{language === 'km' ? 'ព័ត៌មានភាសា' : 'Language details'}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700 dark:text-slate-200">Title<input value={working.title} onChange={(event) => updateCourse('title', event.target.value)} className={field} maxLength={240} /></label><label className="text-sm font-bold text-slate-700 dark:text-slate-200">Code label<input value={working.codeLabel || ''} onChange={(event) => updateCourse('codeLabel', event.target.value)} className={field} maxLength={120} /></label><label className="text-sm font-bold text-slate-700 dark:text-slate-200 sm:col-span-2">Description<textarea value={working.description || ''} onChange={(event) => updateCourse('description', event.target.value)} className={area} maxLength={4000} /></label><label className="text-sm font-bold text-slate-700 dark:text-slate-200 sm:col-span-2">Learning tip<textarea value={working.tip || ''} onChange={(event) => updateCourse('tip', event.target.value)} className={area} maxLength={4000} /></label></div></div>
        {selectedUnitData && <div className="curriculum-form-card rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 sm:p-6"><h2 className="text-lg font-extrabold text-ink dark:text-white">{language === 'km' ? 'កែឯកតា' : 'Edit unit'}</h2><div className="mt-4 grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]"><label className="text-sm font-bold text-slate-700 dark:text-slate-200">Number<input value={selectedUnitData.number} onChange={(event) => updateUnit('number', event.target.value)} className={field} maxLength={40} /></label><label className="text-sm font-bold text-slate-700 dark:text-slate-200">Unit title<input value={selectedUnitData.title} onChange={(event) => updateUnit('title', event.target.value)} className={field} maxLength={240} /></label></div></div>}
        {selectedLessonData && <div className="curriculum-form-card rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-coral">{language === 'km' ? 'កែសម្រួលមេរៀន' : 'Edit lesson'}</p><h2 className="mt-1 text-lg font-extrabold text-ink dark:text-white">{selectedLessonData.label || 'Lesson'}</h2></div><span className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{selectedLessonData.id}</span></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700 dark:text-slate-200">Label<input value={selectedLessonData.label || ''} onChange={(event) => updateLesson('label', event.target.value)} className={field} maxLength={240} /></label><label className="text-sm font-bold text-slate-700 dark:text-slate-200">Heading<input value={selectedLessonData.heading || ''} onChange={(event) => updateLesson('heading', event.target.value)} className={field} maxLength={240} /></label><label className="text-sm font-bold text-slate-700 dark:text-slate-200 sm:col-span-2">Introduction<textarea value={selectedLessonData.intro || ''} onChange={(event) => updateLesson('intro', event.target.value)} className={area} maxLength={20000} /></label><label className="text-sm font-bold text-slate-700 dark:text-slate-200">Body heading<input value={selectedLessonData.bodyHeading || ''} onChange={(event) => updateLesson('bodyHeading', event.target.value)} className={field} maxLength={240} /></label><label className="text-sm font-bold text-slate-700 dark:text-slate-200">Preview title<input value={selectedLessonData.preview?.title || ''} onChange={(event) => updateLesson('preview', { ...(selectedLessonData.preview || {}), title: event.target.value })} className={field} maxLength={240} /></label><label className="text-sm font-bold text-slate-700 dark:text-slate-200 sm:col-span-2">Lesson body<textarea value={selectedLessonData.body || ''} onChange={(event) => updateLesson('body', event.target.value)} className={`${area} min-h-40`} maxLength={30000} /></label><label className="text-sm font-bold text-slate-700 dark:text-slate-200 sm:col-span-2">Example code<textarea value={selectedLessonData.code || ''} onChange={(event) => updateLesson('code', event.target.value)} className={`${area} min-h-44 font-mono text-xs`} maxLength={30000} /></label><label className="text-sm font-bold text-slate-700 dark:text-slate-200">Preview body<textarea value={selectedLessonData.preview?.body || ''} onChange={(event) => updateLesson('preview', { ...(selectedLessonData.preview || {}), body: event.target.value })} className={area} maxLength={4000} /></label><label className="text-sm font-bold text-slate-700 dark:text-slate-200">Keywords<input value={(selectedLessonData.keywords || []).join(', ')} onChange={(event) => updateLesson('keywords', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} className={field} placeholder="html, tags, browser" /></label><label className="text-sm font-bold text-slate-700 dark:text-slate-200 sm:col-span-2">Learning objectives<textarea value={(selectedLessonData.objectives || []).join('\n')} onChange={(event) => updateLesson('objectives', event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))} className={area} placeholder="One objective per line" /></label></div></div>}
      </section>
    </div>}
  </div>;
}
