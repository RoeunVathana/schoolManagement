import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { unwrap } from "../../api/axios";
import { useAuth } from "../../hooks/useAuth";
import Header from "../../components/Header";
import Table from "../../components/Table";
import Loading from "../../components/Loading";
import Modal from "../../components/Modal";
import ImageCropper from "../../components/ImageCropper";
import { useLanguage } from "../../context/LanguageContext";
import { useConfirmDialog } from "../../context/ConfirmContext";
import { isImageTooLarge } from "../../utils/fileValidation";
import ScheduleFilters, {
  filterScheduleRows,
} from "../../components/ScheduleFilters";
import Pagination from "../../components/Pagination";

const API_ORIGIN = import.meta.env.VITE_API_URL || "http://localhost:3001";
const mediaUrl = (path) =>
  path?.startsWith("http") ? path : `${API_ORIGIN}${path || ""}`;
const isImage = (fileOrPath) => {
  const value = typeof fileOrPath === "string" ? fileOrPath : fileOrPath?.fileUrl || "";
  const mimeType = typeof fileOrPath === "string" ? "" : fileOrPath?.mimeType || "";
  return /^image\//i.test(mimeType) || /\.(png|jpe?g|webp|gif)(?:[?#].*)?$/i.test(value);
};
const isSupportedExamImage = (file) =>
  Boolean(file) &&
  (/^image\/(png|jpeg|webp)$/i.test(file.type || "") || /\.(png|jpe?g|webp)$/i.test(file.name || ""));
const formatDate = (value, language = document.documentElement.lang || "en") =>
  value
    ? new Date(value).toLocaleDateString(language === "km" ? "km-KH" : "en-US")
    : "-";
const formatDateTime = (value, language = document.documentElement.lang || "en") =>
  value
    ? new Date(value).toLocaleString(language === "km" ? "km-KH" : "en-US", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "-";
const formatFileSize = (bytes) => {
  const value = Number(bytes || 0);
  if (!value) return "-";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};
const toDateTimeLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const titles = {
  courses: "myCourses",
  materials: "courseMaterials",
  schedule: "schedule",
  assignments: "assignments",
  submissions: "submissions",
  attendance: "attendance",
  exams: "exams",
  announcements: "announcements",
};
const editable = ["materials", "assignments", "exams", "announcements"];
const submissionStatuses = ["SUBMITTED", "LATE", "GRADED", "RETURNED"];
const blank = {
  courseId: "",
  assignmentId: "",
  studentId: "",
  answerText: "",
  title: "",
  description: "",
  maxScore: 100,
  dueDate: "",
  examDate: "",
  submissionDeadline: "",
  content: "",
  file: null,
  status: "SUBMITTED",
  score: "",
  feedback: "",
};

const statusClass = (status) =>
  ({
    SUBMITTED: "bg-blue-50 text-blue-700",
    LATE: "bg-amber-50 text-amber-700",
    GRADED: "bg-mint text-emerald-800",
    RETURNED: "bg-slate-100 text-slate-700",
  })[status] || "bg-slate-100 text-slate-700";

export default function Simple({ adminMode = false, sectionOverride = '' }) {
  const { section: routeSection } = useParams();
  const section = sectionOverride || routeSection;
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { ask } = useConfirmDialog();
  const [data, setData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [courseStudents, setCourseStudents] = useState({});
  const [courseRosters, setCourseRosters] = useState({});
  const [rosterCourse, setRosterCourse] = useState(null);
  const [rosterBusy, setRosterBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...blank });
  const [cropFile, setCropFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resultExam, setResultExam] = useState(null);
  const [examStudents, setExamStudents] = useState([]);
  const [examResults, setExamResults] = useState([]);
  const [resultForm, setResultForm] = useState({
    studentId: "",
    score: "",
    feedback: "",
  });
  const [resultBusy, setResultBusy] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [scheduleFilters, setScheduleFilters] = useState({ from: "", to: "" });
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(() => Date.now());
  // Keep the learning table shared with teachers, but make admin mode
  // explicit so admin routes are not subject to teacher assignment rules.
  const isAdmin = adminMode || user?.role === "ADMIN";
  const canCreate = isAdmin || user?.canCreate === true;
  const canEdit = isAdmin || user?.canEdit === true;
  const canDelete = isAdmin || user?.canDelete === true;
  const endpoint =
    {
      courses: "/courses",
      materials: "/course-materials",
      schedule: "/schedules",
      assignments: "/assignments",
      submissions: "/submissions",
      attendance: "/attendance",
      exams: "/exams",
      announcements: "/announcements",
    }[section] || "/announcements";

  const load = useCallback((targetPage = 1) =>
    api
      .get(endpoint, { params: { page: targetPage, limit: 10 } })
      .then((response) => setData(unwrap(response)))
      .catch((e) => {
        setError(e.response?.data?.message || t("noRecords"));
        setData([]);
      }), [endpoint, t]);

  useEffect(() => {
    setPage(1);
    setData(null);
    setError("");
    setScheduleFilters({ from: "", to: "" });
    load(1);
    if (
      editable.includes(section) ||
      section === "submissions" ||
      section === "courses"
    ) {
      Promise.all([
        api.get("/courses", { params: { limit: 100 } }),
        section === "submissions"
          ? api.get("/assignments", { params: { limit: 100 } })
          : Promise.resolve(null),
      ])
        .then(async ([coursesResponse, assignmentsResponse]) => {
          const coursePayload = unwrap(coursesResponse);
          const teacherCourses = Array.isArray(coursePayload) ? coursePayload : coursePayload?.data || [];
          setCourses(teacherCourses);
          if (assignmentsResponse)
            setAssignments(unwrap(assignmentsResponse).data || []);
          if (section === "submissions" || section === "courses") {
            const studentResponses = await Promise.all(
              teacherCourses.map((course) =>
                api.get(`/courses/${course.id}/students`),
              ),
            );
            const rosters = Object.fromEntries(
              teacherCourses.map((course, index) => [
                course.id,
                unwrap(studentResponses[index]) || [],
              ]),
            );
            setCourseRosters(rosters);
            setCourseStudents(
              Object.fromEntries(
                teacherCourses.map((course) => [
                  course.id,
                  (rosters[course.id] || []).map(
                    (enrollment) => enrollment.student,
                  ),
                ]),
              ),
            );
          }
        })
        .catch(() => setCourses([]));
    }
  }, [section]);

  useEffect(() => {
    load(page);
  }, [page]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = Array.isArray(data) ? data : data?.data || [];
  const visibleRows =
    section === "schedule" ? filterScheduleRows(rows, scheduleFilters) : rows;
  const isOverdue = (value) =>
    Boolean(value && new Date(value).getTime() <= now);
  const hasAssignedCourse = courses.length > 0;
  const close = () => {
    setOpen(false);
    setEditing(null);
    setForm({ ...blank });
    setCropFile(null);
    setError("");
  };

  const selectExamImage = (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    if (!isSupportedExamImage(file)) {
      setError(
        language === "km"
          ? "សូមជ្រើសរើសរូបភាព PNG, JPG ឬ WEBP ត្រឹមត្រូវ។"
          : "Please choose a valid PNG, JPG, or WEBP image.",
      );
      return;
    }
    if (isImageTooLarge(file)) {
      setError(t("imageTooLarge"));
      return;
    }
    setError("");
    setCropFile(file);
  };
  const openRoster = useCallback(async (course) => {
    setRosterCourse(course);
    const cached = courseRosters[course.id];
    if (cached) return;
    setRosterBusy(true);
    try {
      const response = await api.get(`/courses/${course.id}/students`);
      const roster = unwrap(response) || [];
      setCourseRosters((current) => ({ ...current, [course.id]: roster }));
      setCourseStudents((current) => ({
        ...current,
        [course.id]: roster.map((enrollment) => enrollment.student),
      }));
    } catch (e) {
      setError(e.response?.data?.message || t("noRecords"));
    } finally {
      setRosterBusy(false);
    }
  }, [courseRosters, t]);
  const closeResults = useCallback(() => {
    setResultExam(null);
    setExamStudents([]);
    setExamResults([]);
    setResultForm({ studentId: "", score: "", feedback: "" });
    setError("");
  }, []);

  const openDetails = useCallback(async (row) => {
    if (!['materials', 'assignments', 'exams', 'submissions'].includes(section)) return;
    setDetailRecord(row);
    setDetailBusy(true);
    setDetailError('');
    try {
      const response = await api.get(`${endpoint}/${row.id}`);
      setDetailRecord(unwrap(response));
    } catch (e) {
      setDetailError(e.response?.data?.message || t('noRecords'));
    } finally {
      setDetailBusy(false);
    }
  }, [endpoint, section, t]);

  const closeDetails = useCallback(() => {
    setDetailRecord(null);
    setDetailError('');
  }, []);

  const openResults = useCallback(async (exam) => {
    setResultBusy(true);
    setError("");
    setResultExam(exam);
    try {
      const [resultsResponse, studentsResponse] = await Promise.all([
        api.get(`/exam-results/exam/${exam.id}`),
        api.get(`/courses/${exam.courseId}/students`),
      ]);
      const results = unwrap(resultsResponse) || [];
      const students = (unwrap(studentsResponse) || []).map(
        (enrollment) => enrollment.student,
      );
      setExamResults(results);
      setExamStudents(students);
      const firstStudent = students[0];
      const firstResult = results.find(
        (result) => result.studentId === firstStudent?.id,
      );
      setResultForm({
        studentId: firstStudent?.id || "",
        score: firstResult?.score ?? "",
        feedback: firstResult?.feedback || "",
      });
    } catch (e) {
      setError(e.response?.data?.message || t("couldNotLoadResults"));
    } finally {
      setResultBusy(false);
    }
  }, [t]);

  const selectResultStudent = (studentId) => {
    const result = examResults.find((item) => item.studentId === studentId);
    setResultForm({
      studentId,
      score: result?.score ?? "",
      feedback: result?.feedback || "",
    });
  };

  const saveExamResult = async (event) => {
    event.preventDefault();
    if (!resultForm.studentId || resultForm.score === "") return;
    setResultBusy(true);
    setError("");
    try {
      const existing = examResults.find(
        (result) => result.studentId === resultForm.studentId,
      );
      const payload = {
        examId: resultExam.id,
        studentId: resultForm.studentId,
        score: Number(resultForm.score),
        feedback: resultForm.feedback,
      };
      const saved = unwrap(
        await (existing
          ? api.patch(`/exam-results/${existing.id}`, payload)
          : api.post("/exam-results", payload)),
      );
      setExamResults((current) =>
        existing
          ? current.map((result) =>
              result.id === existing.id ? { ...result, ...saved } : result,
            )
          : [...current, saved],
      );
    } catch (e) {
      setError(e.response?.data?.message || t("couldNotSaveResult"));
    } finally {
      setResultBusy(false);
    }
  };

  const edit = useCallback((row) => {
    setEditing(row);
    if (section === "submissions") {
      setForm({
        ...blank,
        assignmentId: row.assignmentId || "",
        studentId: row.studentId || "",
        answerText: row.answerText || "",
        status: row.status || "SUBMITTED",
        score: row.grade?.score ?? "",
        feedback: row.grade?.feedback || "",
      });
    } else {
      setForm({
        courseId: row.courseId || "",
        title: row.title || "",
        description: row.description || "",
        maxScore: row.maxScore || 100,
        dueDate: toDateTimeLocal(row.dueDate),
        examDate: row.examDate ? row.examDate.slice(0, 10) : "",
        submissionDeadline: toDateTimeLocal(row.submissionDeadline),
        content: row.content || "",
        file: null,
      });
    }
    setError("");
    setOpen(true);
  }, [section]);

  const save = async (event) => {
    event.preventDefault();
    const assignmentDueDate =
      section === "assignments" ? new Date(form.dueDate) : null;
    if (
      section === "assignments" &&
      (!form.dueDate || Number.isNaN(assignmentDueDate.getTime()))
    ) {
      setError(t("dueDateRequired"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (section === "submissions") {
        if (editing) {
          await api.patch(`/submissions/${editing.id}/status`, {
            status: form.status,
          });
          if (form.score !== "") {
            const payload = {
              submissionId: editing.id,
              score: Number(form.score),
              feedback: form.feedback,
            };
            if (editing.grade?.id)
              await api.patch(`/grades/${editing.grade.id}`, payload);
            else await api.post("/grades", payload);
          }
        } else {
          const saved = unwrap(
            await api.post("/submissions", {
              assignmentId: form.assignmentId,
              studentId: form.studentId,
              answerText: form.answerText,
            }),
          );
          if (form.file && saved?.id) {
            const upload = new FormData();
            upload.append("file", form.file);
            upload.append("studentId", form.studentId);
            await api.post(`/submissions/${form.assignmentId}/upload`, upload, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          }
        }
      } else if (section === "materials") {
        if (editing) {
          await api.patch(`/course-materials/${editing.id}`, {
            title: form.title,
            description: form.description,
          });
          if (form.file) {
            const upload = new FormData();
            upload.append("file", form.file);
            await api.post(`/course-materials/${editing.id}/file`, upload, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          }
        } else {
          if (!form.file) throw new Error(t("materialFileRequired"));
          const upload = new FormData();
          upload.append("courseId", form.courseId);
          upload.append("title", form.title);
          upload.append("description", form.description);
          upload.append("file", form.file);
          await api.post("/course-materials/upload", upload, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      } else {
        const payload =
          section === "announcements"
            ? {
                courseId: form.courseId || null,
                title: form.title,
                content: form.content,
              }
            : section === "assignments"
              ? {
                  courseId: form.courseId,
                  title: form.title,
                  description: form.description,
                  maxScore: Number(form.maxScore),
                  dueDate: assignmentDueDate.toISOString(),
                }
              : {
                  courseId: form.courseId,
                  title: form.title,
                  description: form.description,
                  maxScore: Number(form.maxScore),
                  examDate: new Date(form.examDate).toISOString(),
                  submissionDeadline: form.submissionDeadline
                    ? new Date(form.submissionDeadline).toISOString()
                    : null,
                };
        const saved = unwrap(
          await (editing
            ? api.patch(`${endpoint}/${editing.id}`, payload)
            : api.post(endpoint, payload)),
        );
        if (
          (section === "assignments" || section === "exams") &&
          form.file &&
          saved?.id
        ) {
          const upload = new FormData();
          if (section === "assignments") {
            upload.append("file", form.file);
            await api.post(`/assignments/${saved.id}/attachment`, upload, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          } else {
            upload.append("image", form.file);
            await api.post(`/exams/${saved.id}/image`, upload, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          }
        }
      }
      close();
      await load(page);
    } catch (e) {
      setError(e.response?.data?.message || t("couldNotSaveRecord"));
    } finally {
      setBusy(false);
    }
  };

  const remove = useCallback(async (row) => {
    if (!canDelete || !(await ask(t("deleteRecordConfirm")))) return;
    try {
      await api.delete(`${endpoint}/${row.id}`);
      await load(page);
    } catch (e) {
      setError(e.response?.data?.message || t("couldNotSaveRecord"));
    }
  }, [ask, canDelete, endpoint, load, t]);

  const attachmentCell = useCallback((row) =>
    row.attachmentUrl ? (
      <a
        href={mediaUrl(row.attachmentUrl)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-mint"
      >
        {isImage(row.attachmentUrl) ? (
          <img
            src={mediaUrl(row.attachmentUrl)}
            alt={t("assignmentAttachment")}
            className="h-8 w-8 rounded object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded bg-red-100 text-[10px] font-bold text-red-700">
            FILE
          </span>
        )}
        <span>{t("openFile")}</span>
      </a>
    ) : (
      <span className="text-xs text-slate-400">{t("noFile")}</span>
    ), [t]);

  const submissionFileCell = useCallback((row) => {
    const attachments = Array.isArray(row?.attachments) && row.attachments.length
      ? row.attachments
      : row?.fileUrl
        ? [{ fileUrl: row.fileUrl }]
        : [];
    return attachments.length ? (
      <div className="flex max-w-[18rem] flex-wrap gap-2">
        {attachments.map((attachment, index) => (
          <a
            key={attachment.id || attachment.fileUrl || index}
            href={mediaUrl(attachment.fileUrl)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-mint"
            title={attachment.originalName || t("openFile")}
          >
            {isImage(attachment) ? (
              <img
                src={mediaUrl(attachment.fileUrl)}
                alt={attachment.originalName || t("submissionFile")}
                className="h-8 w-8 rounded object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded bg-red-100 text-[10px] font-bold text-red-700">
                FILE
              </span>
            )}
            <span>{attachments.length > 1 ? `${t("openFile")} ${index + 1}` : t("openFile")}</span>
          </a>
        ))}
      </div>
    ) : (
      <span className="text-xs text-slate-400">{t("noFile")}</span>
    );
  }, [t]);

  const actionColumn = useMemo(() =>
    editable.includes(section) || section === "submissions"
      ? [
          {
            key: "actions",
            label: t("actions"),
            render: (row) =>
              section === "submissions" ? (
                <div className="flex gap-2">
                  {section !== "announcements" && (
                    <button
                      onClick={() => openDetails(row)}
                      className="rounded-lg bg-mint px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      {t("viewDetails")}
                    </button>
                  )}
                  <button
                    disabled={!canEdit}
                    onClick={() => edit(row)}
                    className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40"
                  >
                    {t("review")}
                  </button>
                  <button
                    disabled={!canDelete}
                    onClick={() => remove(row)}
                    className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-40"
                  >
                    {t("delete")}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {section !== "announcements" && (
                    <button
                      onClick={() => openDetails(row)}
                      className="rounded-lg bg-mint px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      {t("viewDetails")}
                    </button>
                  )}
                  <button
                    disabled={!canEdit}
                    onClick={() => edit(row)}
                    className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40"
                  >
                    {t("edit")}
                  </button>
                  <button
                    disabled={!canDelete}
                    onClick={() => remove(row)}
                    className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-40"
                  >
                    {t("delete")}
                  </button>
                </div>
              ),
          },
        ]
      : [], [canCreate, canDelete, canEdit, edit, openDetails, remove, section, t]);

  const columns = useMemo(() =>
    section === "courses"
      ? [
          { key: "courseCode", label: t("code") },
          { key: "courseName", label: t("course") },
          {
            key: "description",
            label: t("description"),
            render: (row) => (
              <span className="block max-w-xs truncate">
                {row.description || "-"}
              </span>
            ),
          },
          {
            key: "students",
            label: t("students"),
            render: (row) => (
              <button
                onClick={() => openRoster(row)}
                className="badge bg-mint text-emerald-800 transition hover:scale-105"
              >
                {row._count?.enrollments || 0} {t("students")}
              </button>
            ),
          },
          {
            key: "startDate",
            label: t("starts"),
            render: (row) => formatDate(row.startDate),
          },
          {
            key: "endDate",
            label: t("ends"),
            render: (row) => formatDate(row.endDate),
          },
          { key: "status", label: t("status") },
        ]
      : section === "materials"
        ? [
            { key: "title", label: t("materialTitle") },
            {
              key: "course",
              label: t("course"),
              render: (row) => row.course?.courseName || "-",
            },
            {
              key: "file",
              label: t("fileType"),
              render: (row) => (
                <a
                  href={mediaUrl(row.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-48 items-center gap-2 rounded-lg bg-mint px-2.5 py-2 text-xs font-semibold text-emerald-800"
                  title={row.originalName}
                >
                  <span className="truncate">{row.originalName}</span>
                </a>
              ),
            },
            {
              key: "fileSize",
              label: t("fileSize"),
              render: (row) => formatFileSize(row.fileSize),
            },
            { key: "createdAt", label: t("published"), render: (row) => formatDate(row.createdAt, language) },
            ...actionColumn,
          ]
        : section === "schedule"
        ? [
            {
              key: "course",
              label: t("course"),
              render: (row) => row.course?.courseName || "-",
            },
            { key: "dayOfWeek", label: t("dayOfWeek") },
            { key: "startTime", label: t("startTime") },
            { key: "endTime", label: t("endTime") },
            { key: "room", label: t("room"), render: (row) => row.room || "-" },
            {
              key: "description",
              label: t("description"),
              render: (row) => row.description || "-",
            },
          ]
        : section === "assignments"
          ? [
              { key: "title", label: t("title") },
              {
                key: "course",
                label: t("course"),
                render: (row) => row.course?.courseName,
              },
              {
                key: "teacher",
                label: t("teacher"),
                render: (row) => row.teacher?.user?.fullName || "-",
              },
              {
                key: "dueDate",
                label: t("dueDate"),
                render: (row) => (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold">
                      {formatDateTime(row.dueDate, language)}
                    </p>
                    {isOverdue(row.dueDate) && (
                      <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold text-red-600">
                        {t("overdue")}
                      </span>
                    )}
                  </div>
                ),
              },
              { key: "maxScore", label: t("maxScore") },
              {
                key: "attachment",
                label: t("attachment"),
                render: attachmentCell,
              },
              ...actionColumn,
            ]
          : section === "exams"
            ? [
                { key: "title", label: t("title") },
                {
                  key: "course",
                  label: t("course"),
                  render: (row) => row.course?.courseName,
                },
                {
                  key: "examDate",
                  label: t("date"),
                  render: (row) => formatDate(row.examDate),
                },
                {
                  key: "submissionDeadline",
                  label: t("submissionDeadline"),
                  render: (row) =>
                    row.submissionDeadline ? formatDateTime(row.submissionDeadline) : "-",
                },
                { key: "maxScore", label: t("maxScore") },
                {
                  key: "image",
                  label: t("attachment"),
                  render: (row) =>
                    row.imageUrl ? (
                      <a
                        href={mediaUrl(row.imageUrl)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={mediaUrl(row.imageUrl)}
                          alt={row.title}
                          className="h-10 w-10 rounded object-cover"
                        />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    ),
                },
                {
                  key: "results",
                  label: t("examResults"),
                  render: (row) => (
                    <button
                      disabled={!canCreate && !canEdit}
                      onClick={() => openResults(row)}
                      className="rounded-lg bg-mint px-3 py-2 text-xs font-semibold text-emerald-800 disabled:opacity-40"
                    >
                      {t("examResults")}
                    </button>
                  ),
                },
                ...actionColumn,
              ]
            : section === "announcements"
              ? [
                  { key: "title", label: t("title") },
                  {
                    key: "course",
                    label: t("course"),
                    render: (row) => row.course?.courseName || "-",
                  },
                  {
                    key: "content",
                    label: t("message"),
                    render: (row) => (
                      <span className="block max-w-md truncate">
                        {row.content}
                      </span>
                    ),
                  },
                  {
                    key: "createdAt",
                    label: t("published"),
                    render: (row) => formatDate(row.createdAt),
                  },
                  ...actionColumn,
                ]
              : section === "submissions"
                ? [
                    {
                      key: "student",
                      label: t("student"),
                      render: (row) => row.student?.user?.fullName || "-",
                    },
                    {
                      key: "assignment",
                      label: t("assignment"),
                      render: (row) => row.assignment?.title || "-",
                    },
                    {
                      key: "course",
                      label: t("course"),
                      render: (row) =>
                        row.assignment?.course?.courseName || "-",
                    },
                    {
                      key: "score",
                      label: t("score"),
                      render: (row) =>
                        row.grade
                          ? `${row.grade.score} / ${row.assignment?.maxScore || "-"}`
                          : t("notGradedYet"),
                    },
                    {
                      key: "answer",
                      label: t("answer"),
                      render: (row) => (
                        <span className="block max-w-xs truncate">
                          {row.answerText || "-"}
                        </span>
                      ),
                    },
                    {
                      key: "file",
                      label: t("attachment"),
                      render: submissionFileCell,
                    },
                    {
                      key: "submittedAt",
                      label: t("submitted"),
                      render: (row) => formatDate(row.submittedAt),
                    },
                    {
                      key: "status",
                      label: t("status"),
                      render: (row) => (
                        <span className={`badge ${statusClass(row.status)}`}>
                          {row.status}
                        </span>
                      ),
                    },
                    ...actionColumn,
                  ]
                : section === "attendance"
                  ? [
                      {
                        key: "course",
                        label: t("course"),
                        render: (row) => row.course?.courseName || "-",
                      },
                      {
                        key: "student",
                        label: t("student"),
                        render: (row) => row.student?.user?.fullName || "-",
                      },
                      {
                        key: "attendanceDate",
                        label: t("date"),
                        render: (row) => formatDate(row.attendanceDate),
                      },
                      { key: "status", label: t("status") },
                    ]
                  : [
                      {
                        key: "message",
                        label: t("status"),
                        render: () => t("noRecords"),
                      },
                     ], [actionColumn, attachmentCell, canCreate, canEdit, language, now, openResults, openRoster, section, submissionFileCell, t]);

  const openCreate = () => {
    if (isAdmin && !courses.length) {
      setError(t("noCourseAssigned"));
      return;
    }
    if (section === "submissions") {
      const firstAssignment = assignments[0];
      const firstStudent = firstAssignment
        ? courseStudents[firstAssignment.courseId]?.[0]
        : null;
      setForm({
        ...blank,
        assignmentId: firstAssignment?.id || "",
        studentId: firstStudent?.id || "",
      });
    } else {
      setForm({ ...blank });
    }
    setEditing(null);
    setError("");
    setOpen(true);
  };
  const selectedAssignment = assignments.find(
    (assignment) => assignment.id === form.assignmentId,
  );
  const submissionStudents = selectedAssignment
    ? courseStudents[selectedAssignment.courseId] || []
    : [];
  const descriptionKey =
    editable.includes(section) && !hasAssignedCourse
      ? "noCourseAssigned"
      : "learningRecords";
  const sectionName =
    section === "announcements"
      ? t("announcement")
      : section === "assignments"
        ? t("assignment")
        : section === "exams"
          ? t("exam")
          : section === "submissions"
            ? t("submission")
            : section;
  const gradedStudentCount = examStudents.filter((student) =>
    examResults.some(
      (result) =>
        result.studentId === student.id &&
        result.score !== null &&
        result.score !== undefined,
    ),
  ).length;
  const selectedExamResult = examResults.find(
    (result) => result.studentId === resultForm.studentId,
  );

  return (
    <>
      <ImageCropper
        file={cropFile}
        labels={{
          title: t("cropImage"),
          description: t("cropImageDescription"),
          zoom: t("zoom"),
          cancel: t("cancel"),
          useImage: t("useCroppedImage"),
          processing: t("preparingImage"),
        }}
        onCancel={() => setCropFile(null)}
        onComplete={(croppedFile) => {
          if (isImageTooLarge(croppedFile)) {
            setError(t("imageTooLarge"));
            return;
          }
          setForm((current) => ({ ...current, file: croppedFile }));
          setCropFile(null);
        }}
        onError={() => {
          setError(
            language === "km"
              ? "មិនអាចអានរូបភាពនេះបានទេ។ សូមជ្រើសរើសឯកសារ PNG, JPG ឬ WEBP ផ្សេងទៀត។"
              : "This image could not be read. Please choose another PNG, JPG, or WEBP file.",
          );
          setCropFile(null);
        }}
      />
      <Header
        eyebrow={isAdmin ? "adminTools" : "teacherWorkspace"}
        title={titles[section] || "announcements"}
        description={isAdmin ? "adminWorkspaceDesc" : descriptionKey}
        action={isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/courses"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-lg"
            >
              {t("courses")}
            </Link>
            {(editable.includes(section) || section === "submissions") && canCreate && (isAdmin || hasAssignedCourse) && (
              <button
                onClick={openCreate}
                className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                + {t("add")} {sectionName}
              </button>
            )}
          </div>
        ) : (
          (editable.includes(section) || section === "submissions") && canCreate && hasAssignedCourse ? (
            <button
              onClick={openCreate}
              className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white"
            >
              + {t("add")} {sectionName}
            </button>
          ) : null
        )}
      />
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {data ? (
        <>
          {section === "schedule" && (
            <ScheduleFilters
              value={scheduleFilters}
              onChange={setScheduleFilters}
            />
          )}
          <Table
            columns={columns}
            rows={visibleRows}
            showDetails={!isAdmin}
            empty={
              editable.includes(section) && !hasAssignedCourse
                ? t("noCourseAssignedShort")
                : t("noRecords")
            }
          />
          <Pagination value={data?.pagination} onChange={setPage} />
        </>
      ) : (
        <Loading />
      )}
      <Modal
        open={!!rosterCourse}
        title={`${rosterCourse?.courseName || t("course")} · ${t("students")}`}
        onClose={() => setRosterCourse(null)}
      >
        {rosterBusy ? (
          <Loading inline />
        ) : (
          <div className="space-y-3">
            {(courseRosters[rosterCourse?.id] || []).length ? (
              (courseRosters[rosterCourse?.id] || []).map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div>
                    <p className="font-semibold text-ink">
                      {enrollment.student?.user?.fullName || "-"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {enrollment.student?.user?.email || "-"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`badge ${enrollment.paymentStatus === "PAID" ? "bg-mint text-emerald-800" : "bg-slate-200 text-slate-700"}`}
                    >
                      {enrollment.paymentStatus === "PAID"
                        ? t("paid")
                        : t("enrolled")}
                    </span>
                    {enrollment.paidAt && (
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(enrollment.paidAt, language)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-slate-500">
                {t("noRecords")}
              </p>
            )}
          </div>
        )}
      </Modal>
      <Modal
        open={!!detailRecord}
        title={`${t('viewDetails')}: ${detailRecord?.title || detailRecord?.assignment?.title || t(sectionName)}`}
        onClose={closeDetails}
      >
        {detailBusy && <Loading inline />}
        {detailRecord && <LearningRecordDetails record={detailRecord} section={section} language={language} t={t} />}
        {detailError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{detailError}</p>}
      </Modal>
      <Modal
        open={open}
        title={
          section === "submissions"
            ? editing
              ? t("reviewSubmission")
              : `${t("create")} ${sectionName}`
            : `${editing ? t("edit") : t("create")} ${sectionName}`
        }
        onClose={close}
      >
        {section === "submissions" ? (
          <form onSubmit={save} className="space-y-4">
            {editing ? (
              <>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-xs font-bold uppercase tracking-[.18em] text-coral">
                    {t("submissionDetails")}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-400">{t("student")}</p>
                      <p className="mt-1 font-semibold text-ink">
                        {editing.student?.user?.fullName || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">
                        {t("assignment")}
                      </p>
                      <p className="mt-1 font-semibold text-ink">
                        {editing.assignment?.title || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">{t("course")}</p>
                      <p className="mt-1 font-semibold text-ink">
                        {editing.assignment?.course?.courseName || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">{t("submitted")}</p>
                      <p className="mt-1 font-semibold text-ink">
                        {formatDate(editing.submittedAt, language)}
                      </p>
                    </div>
                  </div>
                </div>
                {editing.answerText && (
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("answer")}
                    <textarea
                      readOnly
                      rows="6"
                      value={editing.answerText}
                      className="input mt-2 cursor-default bg-slate-50 dark:bg-slate-800"
                    />
                  </label>
                )}
                {editing.fileUrl && (
                  <a
                    href={mediaUrl(editing.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl bg-mint p-4 text-sm font-semibold text-emerald-800"
                  >
                    <span>{t("attachment")}</span>
                    <span>{t("openFile")} ↗</span>
                  </a>
                )}
                {editing.attachments?.length > 0 && (
                  <div className="rounded-xl bg-mint p-4">
                    <p className="mb-2 text-sm font-semibold text-emerald-800">{t("attachment")}</p>
                    {submissionFileCell(editing)}
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("score")}
                    <input
                      required
                      type="number"
                      min="0"
                      max={editing.assignment?.maxScore || 100}
                      step="0.01"
                      value={form.score}
                      className="input mt-2"
                      placeholder={`0 - ${editing.assignment?.maxScore || 100}`}
                      onChange={(event) =>
                        setForm({ ...form, score: event.target.value })
                      }
                    />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("status")}
                    <select
                      value={form.status}
                      className="input mt-2"
                      onChange={(event) =>
                        setForm({ ...form, status: event.target.value })
                      }
                    >
                      {submissionStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("feedback")}
                  <textarea
                    rows="4"
                    value={form.feedback}
                    className="input mt-2"
                    placeholder={t("feedback")}
                    onChange={(event) =>
                      setForm({ ...form, feedback: event.target.value })
                    }
                  />
                </label>
              </>
            ) : (
              <>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("assignment")}
                  <select
                    required
                    value={form.assignmentId}
                    className="input mt-2"
                    onChange={(event) => {
                      const assignmentId = event.target.value;
                      const assignment = assignments.find(
                        (item) => item.id === assignmentId,
                      );
                      setForm({
                        ...form,
                        assignmentId,
                        studentId:
                          courseStudents[assignment?.courseId]?.[0]?.id || "",
                      });
                    }}
                  >
                    <option value="">{t("selectHomework")}</option>
                    {assignments.map((assignment) => (
                      <option key={assignment.id} value={assignment.id}>
                        {assignment.title} · {assignment.course?.courseName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("student")}
                  <select
                    required
                    value={form.studentId}
                    className="input mt-2"
                    onChange={(event) =>
                      setForm({ ...form, studentId: event.target.value })
                    }
                  >
                    <option value="">{t("selectStudent")}</option>
                    {submissionStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.studentCode} · {student.user?.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("answer")}
                  <textarea
                    rows="5"
                    value={form.answerText}
                    className="input mt-2"
                    placeholder={t("writeAnswer")}
                    onChange={(event) =>
                      setForm({ ...form, answerText: event.target.value })
                    }
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("attachment")}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip,application/pdf,image/*"
                    className="input mt-2 p-2"
                    onChange={(event) =>
                      setForm({
                        ...form,
                        file: event.target.files?.[0] || null,
                      })
                    }
                  />
                </label>
              </>
            )}
            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}
            <button
              disabled={busy || (editing ? !canEdit : !canCreate)}
              className="w-full rounded-xl bg-navy py-3.5 font-semibold text-white disabled:opacity-60"
            >
              {busy
                ? t("saving")
                : editing
                  ? t("saveChanges")
                  : t("createRecord")}
            </button>
          </form>
        ) : (
          <form onSubmit={save} className="space-y-3">
            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}
            {section !== "announcements" && (
              <select
                required
                value={form.courseId}
                className="input"
                onChange={(event) =>
                  setForm({ ...form, courseId: event.target.value })
                }
              >
                <option value="">{t("selectCourse")}</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.courseName}
                  </option>
                ))}
              </select>
            )}
            {section === "announcements" && (
              <select
                required
                value={form.courseId}
                className="input"
                onChange={(event) =>
                  setForm({ ...form, courseId: event.target.value })
                }
              >
                <option value="">{t("selectCourse")}</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.courseName}
                  </option>
                ))}
              </select>
            )}
            {(section === "materials" || section === "assignments" || section === "exams") &&
              form.file && (
                <p className="rounded-lg bg-mint p-3 text-xs font-semibold text-emerald-800">
                  {t("selected")}: {form.file.name}
                </p>
              )}
            <input
              required
              value={form.title}
              className="input"
              placeholder={t("title")}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
            />
            {section === "materials" ? (
              <>
                <textarea
                  value={form.description}
                  className="input"
                  placeholder={t("description")}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
                {editing?.fileUrl && (
                  <a
                    href={mediaUrl(editing.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl bg-mint p-3 text-sm font-semibold text-emerald-800"
                  >
                    {t("viewCurrent")} · {editing.originalName}
                  </a>
                )}
                <label className="block text-xs font-semibold text-slate-500">
                  {t("materialFile")} <span className="font-normal text-slate-400">({t("fileSizeHint")})</span>
                  <input
                    type="file"
                    accept=".pdf,.epub,.mobi,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip,application/pdf,image/*"
                    className="input mt-1 p-2"
                    onChange={(event) =>
                      setForm({ ...form, file: event.target.files?.[0] || null })
                    }
                  />
                </label>
              </>
            ) : section === "announcements" ? (
              <textarea
                required
                rows="5"
                value={form.content}
                className="input"
                placeholder={t("announcementContent")}
                onChange={(event) =>
                  setForm({ ...form, content: event.target.value })
                }
              />
            ) : (
              <>
                <textarea
                  value={form.description}
                  className="input"
                  placeholder={t("description")}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
                <input
                  required
                  type="number"
                  min="0"
                  value={form.maxScore}
                  className="input"
                  placeholder={t("maxScore")}
                  onChange={(event) =>
                    setForm({ ...form, maxScore: event.target.value })
                  }
                />
                <label className="block text-xs font-semibold text-slate-500">
                  {section === "assignments"
                    ? `${t("dueDate")} & ${t("time")}`
                    : t("examDate")}
                  <input
                    required
                    type={section === "assignments" ? "datetime-local" : "date"}
                    value={
                      section === "assignments" ? form.dueDate : form.examDate
                    }
                    className="input mt-1"
                    onChange={(event) =>
                      setForm({
                        ...form,
                        [section === "assignments" ? "dueDate" : "examDate"]:
                          event.target.value,
                      })
                    }
                  />
                  {section === "assignments" && isOverdue(form.dueDate) && (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                      {t("overdue")} · {t("deadlinePassed")}
                    </p>
                  )}
                </label>
                {section === "exams" && (
                  <label className="block text-xs font-semibold text-slate-500">
                    {t("submissionDeadline")}
                    <input
                      required
                      type="datetime-local"
                      value={form.submissionDeadline}
                      className="input mt-1"
                      onChange={(event) =>
                        setForm({
                          ...form,
                          submissionDeadline: event.target.value,
                        })
                      }
                    />
                  </label>
                )}
                {(section === "assignments" || section === "exams") && (
                  <label className="block text-xs font-semibold text-slate-500">
                    {section === "assignments"
                      ? t("assignmentFile")
                      : t("attachment")}{" "}
                    <span className="font-normal text-slate-400">
                      ({t("fileSizeHint")})
                    </span>
                    {(editing?.attachmentUrl || editing?.imageUrl) && (
                      <a
                        href={mediaUrl(
                          editing.attachmentUrl || editing.imageUrl,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-navy underline"
                      >
                        {t("viewCurrent")}
                      </a>
                    )}
                    <input
                      type="file"
                      accept={
                        section === "assignments"
                          ? ".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                          : "image/*,.png,.jpg,.jpeg,.webp"
                      }
                      className="input mt-1 p-2"
                      onChange={section === "exams" ? selectExamImage : (event) =>
                        setForm({
                          ...form,
                          file: event.target.files?.[0] || null,
                        })}
                    />
                  </label>
                )}
              </>
            )}
            <button
              disabled={busy}
              className="w-full rounded-xl bg-navy py-3 font-semibold text-white disabled:opacity-60"
            >
              {busy
                ? t("saving")
                : editing
                  ? t("saveChanges")
                  : t("createRecord")}
            </button>
          </form>
        )}
      </Modal>
      <Modal
        open={!!resultExam}
        title={`${t("examResults")}: ${resultExam?.title || ""}`}
        onClose={closeResults}
      >
        {resultExam && (
          <form onSubmit={saveExamResult} className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="font-semibold text-ink dark:text-white">
                {resultExam.course?.courseName || "-"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {t("maxScore")}: {resultExam.maxScore}
              </p>
              <p className="mt-2 text-xs font-semibold text-coral">
                {t("score")}: {gradedStudentCount} / {examStudents.length}{" "}
                {t("students")}
              </p>
            </div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("student")}
              <select
                required
                value={resultForm.studentId}
                className="input mt-2"
                onChange={(event) => selectResultStudent(event.target.value)}
              >
                <option value="">{t("selectStudent")}</option>
                {examStudents.map((student) => {
                  const result = examResults.find(
                    (item) => item.studentId === student.id,
                  );
                  return (
                    <option key={student.id} value={student.id}>
                      {student.studentCode} · {student.user?.fullName}
                      {result?.score !== null && result?.score !== undefined
                        ? ` — ${result.score} / ${resultExam.maxScore}`
                        : result?.submittedAt
                          ? ` — ${t("submitted")}`
                          : ""}
                    </option>
                  );
                })}
              </select>
            </label>
            {selectedExamResult && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[.18em] text-coral">
                    {t("answer")}
                  </p>
                  <span className="badge bg-slate-200 text-slate-700">
                    {selectedExamResult.submittedAt ? t("submitted") : t("notSubmitted")}
                  </span>
                </div>
                {selectedExamResult.answerText ? (
                  <p className="whitespace-pre-wrap rounded-xl bg-white p-3 text-sm leading-6 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    {selectedExamResult.answerText}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">{t("noRecords")}</p>
                )}
                {selectedExamResult.fileUrl && (
                  <a
                    href={mediaUrl(selectedExamResult.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-xl bg-mint px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    {t("openFile")} ↗
                  </a>
                )}
              </div>
            )}
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("score")}
              <input
                required
                type="number"
                min="0"
                max={resultExam.maxScore}
                step="0.01"
                value={resultForm.score}
                className="input mt-2"
                placeholder={`0 - ${resultExam.maxScore}`}
                onChange={(event) =>
                  setResultForm({ ...resultForm, score: event.target.value })
                }
              />
              <span className="mt-1 block text-xs font-normal text-slate-400">
                Save the score and the student will see it on the exam results
                page.
              </span>
            </label>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("feedback")}
                </label>
                <span className="rounded-full bg-mint px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                  {t("teacherFeedback")}
                </span>
              </div>
              <textarea
                rows="4"
                value={resultForm.feedback}
                className="input mt-2 bg-white dark:bg-slate-900"
                placeholder={t("feedback")}
                onChange={(event) =>
                  setResultForm({ ...resultForm, feedback: event.target.value })
                }
              />
              <p className="mt-2 text-xs font-normal text-slate-500">
                {t("teacherFeedback")} — {t("saveChanges")}
              </p>
            </div>
            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}
            <button
              disabled={resultBusy || (!canCreate && !canEdit)}
              className="w-full rounded-xl bg-navy py-3.5 font-semibold text-white disabled:opacity-60"
            >
              {resultBusy ? t("saving") : t("saveChanges")}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}

function DetailItem({ label, value, children }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
      <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400">{label}</p>
      <div className="mt-1.5 break-words text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">{children || value || '-'}</div>
    </div>
  );
}

function DetailFile({ url, name, mimeType, t }) {
  if (!url) return null;
  const image = isImage({ fileUrl: url, mimeType });
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
      {image && <img src={mediaUrl(url)} alt={name || t('openFile')} className="h-14 w-14 rounded-xl object-cover" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-emerald-900 dark:text-emerald-200">{name || t('attachment')}</p>
        <a href={mediaUrl(url)} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-xs font-extrabold text-emerald-700 underline dark:text-emerald-300">{t('openFile')} ↗</a>
      </div>
    </div>
  );
}

function LearningRecordDetails({ record, section, language, t }) {
  if (!record) return null;
  const course = record.course || record.assignment?.course;
  const date = (value) => formatDate(value, language);
  const dateTime = (value) => formatDateTime(value, language);
  const submissionFiles = Array.isArray(record.attachments) && record.attachments.length
    ? record.attachments
    : record.fileUrl
      ? [{ fileUrl: record.fileUrl, originalName: t('submissionFile') }]
      : [];

  if (section === 'materials') {
    return <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <DetailItem label={t('course')} value={course?.courseName} />
        <DetailItem label={t('fileType')} value={record.mimeType} />
        <DetailItem label={t('fileSize')} value={formatFileSize(record.fileSize)} />
        <DetailItem label={t('published')} value={date(record.createdAt)} />
      </div>
      <DetailItem label={t('description')} value={record.description} />
      <DetailFile url={record.fileUrl} name={record.originalName} mimeType={record.mimeType} t={t} />
    </div>;
  }

  if (section === 'assignments') {
    return <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <DetailItem label={t('course')} value={course?.courseName} />
        <DetailItem label={t('teacher')} value={record.teacher?.user?.fullName} />
        <DetailItem label={t('dueDate')} value={dateTime(record.dueDate)} />
        <DetailItem label={t('maxScore')} value={record.maxScore} />
      </div>
      <DetailItem label={t('description')} value={record.description} />
      <DetailFile url={record.attachmentUrl} name={t('assignmentAttachment')} mimeType="" t={t} />
      {record.submissions?.length > 0 && <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><p className="mb-3 text-sm font-extrabold text-ink dark:text-white">{t('submissions')}</p><div className="space-y-2">{record.submissions.map((submission) => <div key={submission.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900/60"><span className="font-semibold">{submission.student?.user?.fullName || '-'}</span><span className="badge bg-slate-200 text-slate-700">{submission.status}</span></div>)}</div></div>}
    </div>;
  }

  if (section === 'exams') {
    return <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <DetailItem label={t('course')} value={course?.courseName} />
        <DetailItem label={t('examDate')} value={date(record.examDate)} />
        <DetailItem label={t('submissionDeadline')} value={dateTime(record.submissionDeadline)} />
        <DetailItem label={t('maxScore')} value={record.maxScore} />
      </div>
      <DetailItem label={t('description')} value={record.description} />
      <DetailFile url={record.imageUrl} name={t('attachment')} mimeType="image/*" t={t} />
      {record.results?.length > 0 && <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><p className="mb-3 text-sm font-extrabold text-ink dark:text-white">{t('examResults')}</p><div className="space-y-3">{record.results.map((result) => <div key={result.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{result.student?.user?.fullName || '-'}</span><span className="badge bg-mint text-emerald-800">{result.score ?? t('notGradedYet')} / {record.maxScore}</span></div>{result.answerText && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{result.answerText}</p>}{result.fileUrl && <div className="mt-2"><DetailFile url={result.fileUrl} name={t('submissionFile')} mimeType="" t={t} /></div>}</div>)}</div></div>}
    </div>;
  }

  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <DetailItem label={t('student')} value={record.student?.user?.fullName} />
      <DetailItem label={t('email')} value={record.student?.user?.email} />
      <DetailItem label={t('assignment')} value={record.assignment?.title} />
      <DetailItem label={t('course')} value={course?.courseName} />
      <DetailItem label={t('submitted')} value={dateTime(record.submittedAt)} />
      <DetailItem label={t('status')} value={record.status} />
    </div>
    <DetailItem label={t('answer')} value={record.answerText} />
    {record.grade && <div className="grid gap-3 sm:grid-cols-2"><DetailItem label={t('score')} value={`${record.grade.score} / ${record.assignment?.maxScore || '-'}`} /><DetailItem label={t('feedback')} value={record.grade.feedback} /></div>}
    {submissionFiles.length > 0 && <div className="space-y-2"><p className="text-sm font-extrabold text-ink dark:text-white">{t('attachment')}</p>{submissionFiles.map((file, index) => <DetailFile key={file.id || file.fileUrl || index} url={file.fileUrl} name={file.originalName || `${t('submissionFile')} ${index + 1}`} mimeType={file.mimeType} t={t} />)}</div>}
  </div>;
}
