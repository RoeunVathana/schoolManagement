import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { unwrap } from "../../api/axios";
import { useAuth } from "../../hooks/useAuth";
import Header from "../../components/Header";
import Table from "../../components/Table";
import Loading from "../../components/Loading";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import { useLanguage } from "../../context/LanguageContext";
import { useConfirmDialog } from "../../context/ConfirmContext";
import ScheduleFilters, {
  filterScheduleRows,
} from "../../components/ScheduleFilters";

const API_ORIGIN = import.meta.env.VITE_API_URL || "http://localhost:3001";
const mediaUrl = (path) =>
  path?.startsWith("http") ? path : `${API_ORIGIN}${path || ""}`;
const isImage = (path) => /\.(png|jpe?g|webp)$/i.test(path || "");
const formatDate = (value, language = "en") =>
  value
    ? new Date(value).toLocaleDateString(language === "km" ? "km-KH" : "en-US")
    : "-";
const formatDateTime = (value, language = "en") =>
  value
    ? new Date(value).toLocaleString(language === "km" ? "km-KH" : "en-US", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "-";
const config = {
  courses: ["/courses", "courseCatalog"],
  schedule: ["/schedules", "schedule"],
  homework: ["/submissions/my", "homework"],
  grades: ["/grades/me", "grades"],
  attendance: ["/attendance/me", "attendance"],
  exams: ["/exam-results/me", "examResults"],
  announcements: ["/announcements", "announcements"],
};

export default function Simple() {
  const { section } = useParams();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { ask } = useConfirmDialog();
  const [data, setData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [paidCourseIds, setPaidCourseIds] = useState(new Set());
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [answerText, setAnswerText] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [file, setFile] = useState(null);
  const [examSubmitOpen, setExamSubmitOpen] = useState(false);
  const [examToSubmit, setExamToSubmit] = useState(null);
  const [examAnswerText, setExamAnswerText] = useState("");
  const [examFile, setExamFile] = useState(null);
  const [examSubmitBusy, setExamSubmitBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [coursePage, setCoursePage] = useState(1);
  const [scheduleFilters, setScheduleFilters] = useState({ from: "", to: "" });
  const item = config[section];

  const load = async (targetPage = page) => {
    if (!item) return;
    try {
      if (section === "homework") {
        const [submissionsResponse, assignmentsResponse] = await Promise.all([
          api.get("/submissions/my"),
          api.get("/assignments", { params: { limit: 100 } }),
        ]);
        const submissions = unwrap(submissionsResponse) || [];
        const availableAssignments = unwrap(assignmentsResponse)?.data || [];
        setAssignments(availableAssignments);
        setData({ assignments: availableAssignments, submissions });
        return;
      }
      const response = await api.get(item[0], {
        params: { page: targetPage, limit: 10 },
      });
      setData(unwrap(response));
    } catch (e) {
      setError(e.response?.data?.message || "Could not load this page.");
      setData(
        section === "homework" ? { assignments: [], submissions: [] } : [],
      );
    }
  };

  const loadCourses = async () => {
    try {
      const [catalogResponse, enrolledResponse] = await Promise.all([
        api.get("/courses", { params: { status: "ACTIVE", limit: 100 } }),
        api.get("/enrollments/me"),
      ]);
      setData(unwrap(catalogResponse));
      const enrollments = unwrap(enrolledResponse) || [];
      setEnrolledIds(
        new Set(enrollments.map((enrollment) => enrollment.courseId)),
      );
      setPaidCourseIds(
        new Set(
          enrollments
            .filter((enrollment) => enrollment.paymentStatus === "PAID")
            .map((enrollment) => enrollment.courseId),
        ),
      );
    } catch (e) {
      setError(e.response?.data?.message || "Could not load courses.");
      setData([]);
    }
  };

  useEffect(() => {
    setPage(1);
    setData(null);
    setError("");
    setSelectedCourse(null);
    setCoursePage(1);
    setScheduleFilters({ from: "", to: "" });
    if (section === "courses") loadCourses();
    else load(1);
  }, [section]);

  useEffect(() => {
    if (section !== "courses" && section !== "homework") load(page);
  }, [page]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const rows =
    section === "homework"
      ? (data?.assignments || []).map((assignment) => ({
          ...assignment,
          submission: (data?.submissions || []).find(
            (submission) => submission.assignmentId === assignment.id,
          ),
        }))
      : Array.isArray(data)
        ? data
        : data?.data || [];
  const visibleRows =
    section === "schedule" ? filterScheduleRows(rows, scheduleFilters) : rows;
  const coursePageSize = 9;
  const courseRows = rows.slice(
    (coursePage - 1) * coursePageSize,
    coursePage * coursePageSize,
  );
  const courseTotalPages = Math.ceil(rows.length / coursePageSize);
  const close = () => {
    setOpen(false);
    setEditing(null);
    setAnswerText("");
    setAssignmentId("");
    setFile(null);
  };
  const isHomeworkOverdue = (row) =>
    Boolean(row?.dueDate && new Date(row.dueDate).getTime() <= now);
  const startEdit = (row) => {
    if (isHomeworkOverdue(row)) {
      setError(t("overdue"));
      return;
    }
    const submission = row.submission || row;
    setEditing(submission?.id ? submission : null);
    setAnswerText(submission?.answerText || "");
    setAssignmentId(row.id || submission?.assignmentId || "");
    setFile(null);
    setOpen(true);
  };
  const submit = async (event) => {
    event.preventDefault();
    const assignment = assignments.find((item) => item.id === assignmentId);
    if (isHomeworkOverdue(assignment || editing?.assignment)) {
      setError(t("overdue"));
      return;
    }
    if (!answerText.trim() && !file && !editing?.fileUrl) {
      setError("Write an answer or attach a file before submitting.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (editing)
        await api.patch(`/submissions/${editing.id}`, { answerText });
      else await api.post("/submissions", { assignmentId, answerText });
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadUrl = editing
          ? `/submissions/${editing.id}/file`
          : `/submissions/${assignmentId}/upload`;
        await api.post(uploadUrl, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      close();
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not save homework.");
    } finally {
      setBusy(false);
    }
  };
  const closeExamSubmit = () => {
    setExamSubmitOpen(false);
    setExamToSubmit(null);
    setExamAnswerText("");
    setExamFile(null);
  };
  const openExamSubmit = (row) => {
    if ((row.score !== null && row.score !== undefined) || isExamOverdue(row)) return;
    setExamToSubmit(row);
    setExamAnswerText(row.answerText || "");
    setExamFile(null);
    setError("");
    setExamSubmitOpen(true);
  };
  const isExamOverdue = (row) =>
    Boolean(
      row?.exam?.submissionDeadline &&
        new Date(row.exam.submissionDeadline).getTime() <= now,
    );
  const submitExam = async (event) => {
    event.preventDefault();
    if (!examAnswerText.trim() && !examFile && !examToSubmit?.fileUrl) {
      setError("Write an answer or attach a file before submitting.");
      return;
    }
    setExamSubmitBusy(true);
    setError("");
    try {
      const editingExamSubmission = Boolean(
        examToSubmit?.submittedAt && !String(examToSubmit.id || "").startsWith("pending-"),
      );
      const saved = unwrap(
        editingExamSubmission
          ? await api.patch(`/exam-results/submit/${examToSubmit.id}`, {
              answerText: examAnswerText,
            })
          : await api.post("/exam-results/submit", {
              examId: examToSubmit.examId,
              answerText: examAnswerText,
            }),
      );
      if (examFile && saved?.id) {
        const formData = new FormData();
        formData.append("file", examFile);
        await api.post(`/exam-results/${saved.id}/file`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      closeExamSubmit();
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not submit exam.");
    } finally {
      setExamSubmitBusy(false);
    }
  };
  const remove = async (row) => {
    const submission = row.submission || row;
    if (!submission?.id) return;
    if (!user?.canDelete || !(await ask(t("deleteRecordConfirm")))) return;
    try {
      await api.delete(`/submissions/${submission.id}`);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not delete submission.");
    }
  };
  const attachmentCell = (row) =>
    row.fileUrl ? (
      <a
        href={mediaUrl(row.fileUrl)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-mint"
      >
        {isImage(row.fileUrl) ? (
          <img
            src={mediaUrl(row.fileUrl)}
            alt={t("submissionFile")}
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
    );
  const assignmentAttachmentCell = (row) =>
    row.attachmentUrl ? (
      <a
        href={mediaUrl(row.attachmentUrl)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-mint px-2 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
      >
        {isImage(row.attachmentUrl) ? (
          <img
            src={mediaUrl(row.attachmentUrl)}
            alt={`${row.title} attachment`}
            className="h-8 w-8 rounded object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded bg-red-100 text-[10px] font-bold text-red-700">
            PDF
          </span>
        )}
        <span>{t("openFile")}</span>
      </a>
    ) : (
      <span className="text-xs text-slate-400">{t("noFile")}</span>
    );
  const title =
    section === "courses"
      ? t("courseCatalog")
      : t(item?.[1]) || t("studentSpace");
  const selectedAssignment = assignments.find(
    (assignment) => assignment.id === assignmentId,
  );
  const homeworkSubmissionOverdue = isHomeworkOverdue(
    selectedAssignment || editing?.assignment,
  );
  const statusLabel = (value) => {
    const key = String(value || "").toUpperCase();
    const labels = {
      PRESENT: "present",
      ABSENT: "absent",
      LATE: "late",
      EXCUSED: "excused",
      GRADED: "graded",
      PENDING: "pending",
      SUBMITTED: "submitted",
      RETURNED: "returned",
    };
    return labels[key] ? t(labels[key]) : value || "-";
  };
  const gradeColumns = [
    {
      key: "assignment",
      label: t("assignment"),
      render: (r) => r.submission?.assignment?.title || "-",
    },
    {
      key: "course",
      label: t("course"),
      render: (r) =>
        r.submission?.assignment?.course?.courseName ||
        r.submission?.assignment?.courseId ||
        "-",
    },
    {
      key: "score",
      label: t("score"),
      render: (r) => {
        const max = r.submission?.assignment?.maxScore;
        return max ? `${r.score} / ${max}` : r.score;
      },
    },
    {
      key: "result",
      label: t("result"),
      render: (r) => {
        const max = r.submission?.assignment?.maxScore;
        const percent = max
          ? Math.round((Number(r.score) / Number(max)) * 100)
          : null;
        return (
          <span className="badge bg-mint text-emerald-800">
            {percent === null ? "-" : `${percent}%`}
          </span>
        );
      },
    },
    {
      key: "feedback",
      label: t("teacherFeedback"),
      render: (r) => (
        <span className="block max-w-xs truncate" title={r.feedback || ""}>
          {r.feedback || t("noFeedbackYet")}
        </span>
      ),
    },
    {
      key: "gradedAt",
      label: t("graded"),
      render: (r) => formatDate(r.gradedAt, language),
    },
  ];
  const attendanceColumns = [
    {
      key: "course",
      label: t("course"),
      render: (r) => r.course?.courseName || r.courseId,
    },
    {
      key: "attendanceDate",
      label: t("attendanceDate"),
      render: (r) => formatDate(r.attendanceDate, language),
    },
    {
      key: "status",
      label: t("status"),
      render: (r) => {
        const styles = {
          PRESENT: "bg-mint text-emerald-800",
          ABSENT: "bg-red-50 text-red-700",
          LATE: "bg-amber-50 text-amber-700",
          EXCUSED: "bg-indigo-50 text-indigo-700",
        };
        return (
          <span
            className={`badge ${styles[r.status] || "bg-slate-100 text-slate-700"}`}
          >
            {statusLabel(r.status)}
          </span>
        );
      },
    },
    { key: "note", label: t("note"), render: (r) => r.note || "-" },
  ];
  const examResultColumns = [
    {
      key: "exam",
      label: t("exam"),
      render: (r) => (
        <span className="block max-w-[12rem] whitespace-normal font-semibold leading-5 text-ink">
          {r.exam?.title || "-"}
        </span>
      ),
    },
    {
      key: "course",
      label: t("course"),
      render: (r) => (
        <span className="block max-w-[10rem] whitespace-normal leading-5">
          {r.exam?.course?.courseName || r.exam?.courseId || "-"}
        </span>
      ),
    },
    {
      key: "image",
      label: t("attachment"),
      render: (r) =>
        r.exam?.imageUrl ? (
          <a
            href={mediaUrl(r.exam.imageUrl)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-2 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-mint"
          >
            <img
              src={mediaUrl(r.exam.imageUrl)}
              alt={r.exam?.title || t("exam")}
              className="h-10 w-10 rounded object-cover"
            />
            <span className="hidden sm:inline">{t("openFile")}</span>
          </a>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        ),
    },
    {
      key: "examDate",
      label: t("examDate"),
      render: (r) =>
        r.exam?.examDate ? formatDate(r.exam.examDate, language) : "-",
    },
    {
      key: "submissionDeadline",
      label: t("submissionDeadline"),
      render: (r) => {
        if (!r.exam?.submissionDeadline) return "-";
        const overdue = isExamOverdue(r);
        return (
          <div className="space-y-1">
            <p className="text-xs font-semibold">
              {formatDateTime(r.exam.submissionDeadline, language)}
            </p>
            {overdue && (
              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-rose-600 to-red-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm shadow-red-900/25 ring-1 ring-red-300/40">
                {t("overdue")}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "score",
      label: t("score"),
      render: (r) =>
        r.score === null || r.score === undefined
          ? t("pending")
          : r.exam?.maxScore
            ? `${r.score} / ${r.exam.maxScore}`
            : r.score,
    },
    {
      key: "result",
      label: t("result"),
      render: (r) => {
        const max = r.exam?.maxScore;
        const percent =
          r.score === null || r.score === undefined || !max
            ? null
            : Math.round((Number(r.score) / Number(max)) * 100);
        return (
          <span
            className={`badge ${percent === null ? "bg-amber-100 text-amber-800" : "bg-mint text-emerald-800"}`}
          >
            {percent === null ? t("pending") : `${percent}%`}
          </span>
        );
      },
    },
    {
      key: "feedback",
      label: t("feedback"),
      render: (r) => (
        <span
          className={`block max-w-[14rem] truncate rounded-lg px-3 py-2 text-xs leading-5 sm:max-w-xs ${r.feedback ? "bg-mint/70 font-medium text-emerald-900" : "bg-slate-100 text-slate-500"}`}
          title={r.feedback || ""}
        >
          {r.feedback ||
            (r.score === null || r.score === undefined
              ? t("notGradedYet")
              : t("noFeedbackYet"))}
        </span>
      ),
    },
    {
      key: "submission",
      label: t("actions"),
      render: (r) => (
        <div className="flex flex-wrap items-center gap-2">
          {r.fileUrl && (
            <a
              href={mediaUrl(r.fileUrl)}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-mint"
            >
              {t("openFile")}
            </a>
          )}
          <button
            disabled={
              (r.score !== null && r.score !== undefined) ||
              isExamOverdue(r) ||
              (r.submittedAt ? !user?.canEdit : !user?.canCreate)
            }
            onClick={() => openExamSubmit(r)}
            className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isExamOverdue(r) ? t("overdue") : r.submittedAt ? t("edit") : t("submitWork")}
          </button>
        </div>
      ),
    },
    {
      key: "createdAt",
      label: t("recorded"),
      render: (r) => formatDate(r.createdAt, language),
    },
  ];
  const columns =
    section === "homework"
      ? [
          {
            key: "assignment",
            label: t("homework"),
            render: (r) => (
              <div>
                <p className="font-semibold text-ink">{r.title}</p>
                <p className="mt-1 max-w-xs truncate text-xs text-slate-400">
                  {r.description || "-"}
                </p>
              </div>
            ),
          },
          {
            key: "course",
            label: t("course"),
            render: (r) => r.course?.courseName || "-",
          },
          {
            key: "dueDate",
            label: t("dueDate"),
            render: (r) => (
              <div className="space-y-1">
                <p className="text-xs font-semibold">
                  {formatDateTime(r.dueDate, language)}
                </p>
                {isHomeworkOverdue(r) && (
                  <span className="inline-flex rounded-full bg-gradient-to-r from-red-100 to-rose-100 px-2 py-1 text-[10px] font-bold text-red-600">
                    {t("overdue")}
                  </span>
                )}
              </div>
            ),
          },
          {
            key: "assignmentAttachment",
            label: t("assignmentFile"),
            render: assignmentAttachmentCell,
          },
          {
            key: "submissionAttachment",
            label: t("submissionFile"),
            render: (r) => attachmentCell(r.submission || {}),
          },
          {
            key: "status",
            label: t("status"),
            render: (r) => (
              <span className="badge bg-slate-100 text-slate-700">
                {isHomeworkOverdue(r) && !r.submission
                  ? t("overdue")
                  : r.submission?.grade
                  ? t("graded")
                  : r.submission?.status
                    ? statusLabel(r.submission.status)
                    : t("notSubmitted")}
              </span>
            ),
          },
          {
            key: "actions",
            label: t("actions"),
            render: (r) => (
              <div className="flex gap-2">
                <button
                  disabled={
                    (r.submission ? !user?.canEdit : !user?.canCreate) ||
                    isHomeworkOverdue(r) ||
                    (!!r.submission && !!r.submission.grade)
                  }
                  onClick={() => startEdit(r)}
                  className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40"
                >
                  {isHomeworkOverdue(r) ? t("overdue") : r.submission ? t("edit") : t("submitWork")}
                </button>
                {r.submission && (
                  <button
                    disabled={!user?.canDelete || !!r.submission.grade}
                    onClick={() => remove(r)}
                    className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-40"
                  >
                    {t("delete")}
                  </button>
                )}
              </div>
            ),
          },
        ]
      : section === "grades"
        ? gradeColumns
        : section === "attendance"
          ? attendanceColumns
          : section === "exams"
            ? examResultColumns
            : section === "schedule"
              ? [
                  {
                    key: "course",
                    label: t("course"),
                    render: (r) => r.course?.courseName || r.courseId,
                  },
                  { key: "dayOfWeek", label: t("dayOfWeek") },
                  { key: "startTime", label: t("startTime") },
                  { key: "endTime", label: t("endTime") },
                  {
                    key: "room",
                    label: t("room"),
                    render: (r) => r.room || "-",
                  },
                  {
                    key: "description",
                    label: t("description"),
                    render: (r) => r.description || "-",
                  },
                ]
              : section === "announcements"
                ? [
                    { key: "title", label: t("title") },
                    {
                      key: "course",
                      label: t("course"),
                      render: (r) => r.course?.courseName || t("allSchool"),
                    },
                    {
                      key: "author",
                      label: t("author"),
                      render: (r) => r.author?.fullName || "-",
                    },
                    {
                      key: "content",
                      label: t("message"),
                      render: (r) => (
                        <span
                          className="block max-w-md truncate"
                          title={r.content || ""}
                        >
                          {r.content || "-"}
                        </span>
                      ),
                    },
                    {
                      key: "createdAt",
                      label: t("published"),
                      render: (r) => formatDate(r.createdAt, language),
                    },
                  ]
                : rows.length
                  ? Object.keys(rows[0])
                      .filter(
                        (key) =>
                          !["course", "assignment", "exam"].includes(key),
                      )
                      .slice(0, 7)
                      .map((key) => ({
                        key,
                        label: key
                          .replace(/[A-Z]/g, (m) => ` ${m}`)
                          .replace(/^./, (m) => m.toUpperCase()),
                        render: (r) =>
                          typeof r[key] === "object"
                            ? JSON.stringify(r[key])
                            : String(r[key] ?? "-"),
                      }))
                  : [
                      {
                        key: "message",
                        label: t("status"),
                        render: () => t("noRecords"),
                      },
                    ];
  const courseCatalog = (
    <>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {courseRows.map((course) => {
          const enrolled = enrolledIds.has(course.id);
          const paid = paidCourseIds.has(course.id);
          return (
            <article
              key={course.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="h-40 bg-gradient-to-br from-[#dff8ee] via-[#eef4ff] to-[#fff0ea]">
                {course.imageUrl ? (
                  <img
                    src={mediaUrl(course.imageUrl)}
                    alt={course.courseName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl font-extrabold text-navy/20">
                    {course.courseName?.charAt(0) || "C"}
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                    {course.courseCode}
                  </span>
                  <span
                    className={`badge ${paid ? "bg-mint text-emerald-800" : enrolled ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"}`}
                  >
                    {paid
                      ? t("paid")
                      : enrolled
                        ? t("enrolled")
                        : t("notPurchased")}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-ink">
                  {course.courseName}
                </h2>
                <p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">
                  {course.description || t("courseLearningHint")}
                </p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">{t("coursePrice")}</span>
                  <strong className="text-navy">
                    {Number(course.price || 0).toFixed(2)}{" "}
                    {course.currency || "USD"}
                  </strong>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  {t("teacher")}:{" "}
                  <span className="font-semibold text-slate-700">
                    {course.teacher?.user?.fullName || t("unassigned")}
                  </span>
                </p>
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => setSelectedCourse(course)}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {t("viewDetails")}
                  </button>
                  <Link
                    to={`/courses/${course.id}`}
                    className="flex-1 rounded-xl bg-navy px-3 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[#1c4e6b]"
                  >
                    {paid || enrolled ? t("viewDetails") : t("payOnWebsite")}
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <Pagination
        value={
          courseTotalPages > 1
            ? {
                page: coursePage,
                limit: coursePageSize,
                total: rows.length,
                totalPages: courseTotalPages,
              }
            : null
        }
        onChange={setCoursePage}
      />
    </>
  );
  return (
    <>
      <Header
        eyebrow="Student space"
        title={title}
        description={
          section === "courses"
            ? t("exploreCourses")
            : section === "homework"
              ? t("submitBeforeGraded")
              : t("latestLearningInfo")
        }
        action={
          section === "homework" && user?.canCreate ? (
            <button
              onClick={() => {
                setEditing(null);
                setAnswerText("");
                setAssignmentId("");
                setFile(null);
                setOpen(true);
              }}
              className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white"
            >
              + {t("submitHomework")}
            </button>
          ) : null
        }
      />
      {error && (
        <div className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
          {error}
        </div>
      )}
      {data ? (
        section === "courses" ? (
          rows.length ? (
            courseCatalog
          ) : (
            <div className="card text-center text-slate-500">
              {t("noActiveCourses")}
            </div>
          )
        ) : (
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
              empty={t("noRecords")}
            />
            <Pagination value={data?.pagination} onChange={setPage} />
          </>
        )
      ) : (
        <Loading />
      )}
      <Modal
        open={section === "courses" && !!selectedCourse}
        title={selectedCourse?.courseName || t("courseDetails")}
        onClose={() => setSelectedCourse(null)}
      >
        {selectedCourse && (
          <div className="space-y-4">
            <div className="relative h-48 overflow-hidden rounded-2xl bg-slate-950 shadow-inner ring-1 ring-slate-200/70 sm:h-56">
              {selectedCourse.imageUrl ? (
                <img
                  src={mediaUrl(selectedCourse.imageUrl)}
                  alt={selectedCourse.courseName}
                  className="h-full w-full object-cover transition duration-500 hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-6xl font-extrabold text-navy/20">
                  {selectedCourse.courseName?.charAt(0) || "C"}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-coral">
                {selectedCourse.courseCode}
              </p>
              <h3 className="mt-1 text-2xl font-bold text-ink">
                {selectedCourse.courseName}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {selectedCourse.description || t("courseInformation")}
              </p>
            </div>
            <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <p>
                <span className="text-slate-500">{t("teacher")}</span>
                <br />
                <strong>
                  {selectedCourse.teacher?.user?.fullName || t("unassigned")}
                </strong>
              </p>
              <p>
                <span className="text-slate-500">{t("coursePrice")}</span>
                <br />
                <strong>
                  {Number(selectedCourse.price || 0).toFixed(2)}{" "}
                  {selectedCourse.currency || "USD"}
                </strong>
              </p>
              <p className="sm:col-span-2">
                <span className="text-slate-500">{t("coursePeriodLabel")}</span>
                <br />
                <strong>
                  {formatDate(selectedCourse.startDate, language)} -{" "}
                  {formatDate(selectedCourse.endDate, language)}
                </strong>
              </p>
            </div>
            <Link
              to={`/courses/${selectedCourse.id}`}
              onClick={() => setSelectedCourse(null)}
              className="block w-full rounded-xl bg-navy py-3 text-center font-semibold text-white transition hover:bg-[#1c4e6b]"
            >
              {paidCourseIds.has(selectedCourse.id) || enrolledIds.has(selectedCourse.id)
                ? t("viewDetails")
                : t("payOnWebsite")}
            </Link>
          </div>
        )}
      </Modal>
      <Modal
        open={open}
        title={editing ? t("editSubmission") : t("submitHomework")}
        onClose={close}
      >
        <form onSubmit={submit} className="space-y-3">
          {!editing && (
            <>
              <select
                required
                value={assignmentId}
                className="input"
                onChange={(e) => setAssignmentId(e.target.value)}
              >
                <option value="">{t("selectHomework")}</option>
                {assignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.title} - {assignment.course?.courseName}
                  </option>
                ))}
              </select>
              {selectedAssignment?.attachmentUrl && (
                <a
                  href={mediaUrl(selectedAssignment.attachmentUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg bg-mint p-3 text-sm font-semibold text-emerald-800"
                >
                  {t("openAssignmentAttachment")}
                </a>
              )}
              {selectedAssignment?.dueDate && (
                <p
                  className={`rounded-lg p-3 text-sm font-semibold ${
                    homeworkSubmissionOverdue
                      ? "bg-red-50 text-red-600"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {t("dueDate")}: {formatDateTime(selectedAssignment.dueDate, language)}
                  {homeworkSubmissionOverdue ? ` · ${t("overdue")}` : ""}
                </p>
              )}
            </>
          )}
          {editing?.fileUrl && (
            <a
              href={mediaUrl(editing.fileUrl)}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg bg-slate-100 p-3 text-sm font-semibold text-slate-700"
            >
              {t("openCurrentSubmissionFile")}
            </a>
          )}
          <textarea
            rows="7"
            value={answerText}
            className="input"
            placeholder={t("writeAnswer")}
            onChange={(e) => setAnswerText(e.target.value)}
          />
          <label className="block text-sm font-semibold text-slate-700">
            {t("attachFile")}{" "}
            <span className="font-normal text-slate-400">
              ({t("fileSizeHint")})
            </span>
            {file && (
              <span className="mt-2 block rounded-lg bg-mint p-3 text-xs font-semibold text-emerald-800">
                {t("selected")}: {file.name}
              </span>
            )}
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip,application/pdf,image/*"
              className="input mt-2 p-2"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button
            disabled={busy || homeworkSubmissionOverdue}
            className="w-full rounded-xl bg-navy py-3 font-semibold text-white disabled:opacity-60"
          >
            {busy
              ? t("uploadingFile")
              : homeworkSubmissionOverdue
                ? t("overdue")
              : editing
                ? t("saveSubmission")
                : t("submitWork")}
          </button>
        </form>
      </Modal>
      <Modal
        open={examSubmitOpen}
        title={`${t("submitWork")}: ${examToSubmit?.exam?.title || t("exam")}`}
        onClose={closeExamSubmit}
      >
        {examToSubmit && (
          <form onSubmit={submitExam} className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-ink">
                {examToSubmit.exam?.course?.courseName || "-"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {t("maxScore")}: {examToSubmit.exam?.maxScore} · {t("examDate")}: {formatDate(examToSubmit.exam?.examDate, language)}
              </p>
              {examToSubmit.exam?.submissionDeadline && (
                <p className={`mt-2 text-sm font-semibold ${isExamOverdue(examToSubmit) ? "text-red-600" : "text-coral"}`}>
                  {t("submissionDeadline")}: {formatDateTime(examToSubmit.exam.submissionDeadline, language)}
                  {isExamOverdue(examToSubmit) && ` · ${t("overdue")}`}
                </p>
              )}
            </div>
            {examToSubmit.exam?.imageUrl && (
              <a
                href={mediaUrl(examToSubmit.exam.imageUrl)}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-2xl bg-slate-950"
              >
                <img
                  src={mediaUrl(examToSubmit.exam.imageUrl)}
                  alt={examToSubmit.exam.title}
                  className="h-40 w-full object-contain"
                />
              </a>
            )}
            {examToSubmit.fileUrl && (
              <a
                href={mediaUrl(examToSubmit.fileUrl)}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl bg-mint p-3 text-sm font-semibold text-emerald-800"
              >
                {t("openCurrentSubmissionFile")}
              </a>
            )}
            <label className="block text-sm font-semibold text-slate-700">
              {t("answer")}
              <textarea
                rows="7"
                value={examAnswerText}
                className="input mt-2"
                placeholder={t("writeAnswer")}
                onChange={(event) => setExamAnswerText(event.target.value)}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              {t("attachFile")} {" "}
              <span className="font-normal text-slate-400">({t("fileSizeHint")})</span>
              {examFile && (
                <span className="mt-2 block rounded-lg bg-mint p-3 text-xs font-semibold text-emerald-800">
                  {t("selected")}: {examFile.name}
                </span>
              )}
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip,application/pdf,image/*"
                className="input mt-2 p-2"
                onChange={(event) => setExamFile(event.target.files?.[0] || null)}
              />
            </label>
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
            <button
            disabled={examSubmitBusy || (examToSubmit?.submittedAt ? !user?.canEdit : !user?.canCreate) || isExamOverdue(examToSubmit)}
              className="w-full rounded-xl bg-navy py-3 font-semibold text-white disabled:opacity-60"
            >
              {examSubmitBusy ? t("uploadingFile") : examToSubmit?.submittedAt ? t("saveSubmission") : t("submitWork")}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
