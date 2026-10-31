import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { unwrap } from "../../api/axios";
import CoursePayment from "../../components/CoursePayment";
import AnimatedNumber from "../../components/AnimatedNumber";
import BrandLogo from "../../components/BrandLogo";
import Modal from "../../components/Modal";
import SupportDock from "../../components/SupportDock";
import ThemeSwitch from "../../components/ThemeSwitch";
import Seo, { SITE_URL } from "../../components/Seo";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../context/LanguageContext";
import { roleHome } from "../../utils/roles";

const API_ORIGIN = import.meta.env.VITE_API_URL || "http://localhost:3001";
const mediaUrl = (path) =>
  path?.startsWith("http") ? path : `${API_ORIGIN}${path || ""}`;

const formatDate = (value, language) =>
  value
    ? new Date(value).toLocaleDateString(language === "km" ? "km-KH" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";

const formatPrice = (value, currency = "USD") =>
  `${Number(value || 0).toFixed(2)} ${currency}`;

const formatFileSize = (bytes) => {
  const value = Number(bytes || 0);
  if (!value) return "-";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const fileTypeLabel = (material) => {
  const extension = material?.originalName?.split(".").pop()?.toUpperCase();
  return extension || material?.mimeType?.split("/").pop()?.toUpperCase() || "FILE";
};

const isBakongUnavailable = (message) => /bakong|daily request limit|request limit|not configured|temporarily unavailable|verification/i.test(String(message || ""));

const getCoursePricing = (course) => {
  const originalPrice = Number(course?.originalPrice ?? course?.price ?? 0);
  const percent = Number(course?.discountPercent || 0);
  const fallbackActive = percent > 0 && (!course?.discountStart || new Date(course.discountStart).getTime() <= Date.now()) && (!course?.discountEnd || new Date(course.discountEnd).getTime() > Date.now());
  const active = typeof course?.discountActive === "boolean" ? course.discountActive : fallbackActive;
  const salePrice = Number(course?.salePrice ?? (active ? (originalPrice * (1 - percent / 100)).toFixed(2) : originalPrice));
  return { originalPrice, salePrice, discountPercent: active ? percent : 0, active, savings: Math.max(originalPrice - salePrice, 0) };
};

const copyByLanguage = {
  en: {
    heroEyebrow: "CAMPUSFLOW ACADEMY",
    heroTitle: "Learn skills that move your future forward.",
    heroBody:
      "Practical courses, local teachers and a simple way to learn from anywhere in Cambodia.",
    browse: "Browse courses",
    steps: "A clear path from curious to capable",
    stepsBody: "Choose a course, pay securely with KHQR, then start learning with your teacher.",
    search: "Search courses by name or code...",
    popular: "Explore learning that fits your life",
    popularBody: "Short, useful and guided by people who understand your goals.",
    activeCourses: "Active courses",
    localPayment: "Local KHQR payment",
    teacherSupport: "Teacher support",
    signIn: "Sign in",
    register: "Create account",
    startLearning: "Start learning",
    viewCourse: "View course",
    noCourses: "No courses match your search yet.",
    courseRoadmap: "Course roadmap",
    learningPlan: "Learning plan",
    courseSchedule: "Class schedule",
    purchaseSteps: "How purchase works",
    purchaseStepOne: "Choose your course",
    purchaseStepTwo: "Scan the KHQR",
    purchaseStepThree: "Start learning",
    purchaseHint: "Your payment is confirmed before the course is unlocked.",
    notConfigured: "Course payment is not configured yet.",
    paymentError: "Could not start course payment.",
    signInToBuy: "Sign in as a student to continue with payment.",
    studentOnly: "Course purchase is available for student accounts.",
    backToCourses: "Back to courses",
    from: "From",
    learners: "learners",
    projects: "projects",
    exams: "exams",
    sessions: "sessions",
    about: "Why CampusFlow",
    faq: "FAQ",
    whyTitle: "Everything is easier to understand before you buy.",
    whyBody: "See the teacher, schedule, learning plan and payment steps clearly before you commit.",
    benefitLessons: "A clear learning plan",
    benefitLessonsBody: "Follow practical tasks and course checkpoints in one place.",
    benefitFeedback: "Teacher feedback",
    benefitFeedbackBody: "Submit your work and keep feedback connected to your progress.",
    benefitPayment: "Simple local payment",
    benefitPaymentBody: "Pay with KHQR through Bakong, ABA or another supported bank app.",
    benefitCommunity: "Local support",
    benefitCommunityBody: "Get help through Telegram in Khmer or English when you need it.",
    whatYouGet: "What you get",
    includes: ["Guided course plan", "Class schedule and deadlines", "Assignments and exam results", "Teacher communication"],
    faqTitle: "Questions before you start?",
    faqs: [
      { question: "How do I purchase a course?", answer: "Open a course, sign in as a student, scan the KHQR, then check your payment status." },
      { question: "Can I use a Cambodian bank app?", answer: "Yes. The checkout uses KHQR and supports Bakong, ABA and other participating bank apps." },
      { question: "When does the course unlock?", answer: "After the payment is confirmed, the course appears in your student workspace." },
    ],
    processBodies: ["Compare the course overview, teacher and learning plan before you decide.", "Use Bakong, ABA or another KHQR-supported bank app to pay safely.", "Your student workspace opens with schedules, assignments, exams and results."],
    heroPanelEyebrow: "Learn by doing",
    heroPanelTitle: "Clear lessons. Real progress.",
    heroPanelItems: ["Lessons", "Practice", "Results"],
    liveSupport: "Live support",
    marketplace: "Learning marketplace",
    community: "Community",
    signInToCommunity: "Sign in to join the community.",
    supportLabel: "Support",
    teacherFallback: "CampusFlow teacher",
    assignmentFallback: "Practice with a guided task and receive teacher feedback.",
    schedulePending: "Schedule will be shared after enrollment.",
    paymentMethods: "KHQR · Bakong · ABA supported",
    loading: "Loading courses...",
    loadError: "We could not load the course information.",
    genericError: "Something went wrong. Please try again.",
    support: "Need help? Chat with support",
    secure: "Secure student account · Khmer and English support",
  },
  km: {
    heroEyebrow: "CAMPUSFLOW ACADEMY",
    heroTitle: "រៀនជំនាញថ្មី ដើម្បីបង្កើតឱកាសថ្មីសម្រាប់អនាគត។",
    heroBody: "វគ្គសិក្សាអនុវត្ត គ្រូក្នុងស្រុក និងការរៀនដែលងាយស្រួលសម្រាប់អ្នកនៅកម្ពុជា។",
    browse: "មើលវគ្គសិក្សា",
    steps: "ដំណើររៀនដែលងាយស្រួលយល់",
    stepsBody: "ជ្រើសរើសវគ្គ បង់ប្រាក់តាម KHQR ហើយចាប់ផ្តើមរៀនជាមួយគ្រូរបស់អ្នក។",
    search: "ស្វែងរកតាមឈ្មោះ ឬលេខកូដវគ្គ...",
    popular: "ស្វែងរកការរៀនដែលសមនឹងជីវិតអ្នក",
    popularBody: "មេរៀនអនុវត្ត ខ្លី និងមានគ្រូណែនាំតាមគោលដៅរបស់អ្នក។",
    activeCourses: "វគ្គសិក្សាសកម្ម",
    localPayment: "បង់ប្រាក់តាម KHQR",
    teacherSupport: "ការគាំទ្រពីគ្រូ",
    signIn: "ចូលប្រើ",
    register: "បង្កើតគណនី",
    startLearning: "ចាប់ផ្តើមរៀន",
    viewCourse: "មើលវគ្គ",
    noCourses: "មិនទាន់មានវគ្គដែលត្រូវនឹងការស្វែងរករបស់អ្នកទេ។",
    courseRoadmap: "ផែនការសិក្សា",
    learningPlan: "មេរៀន និងកិច្ចការ",
    courseSchedule: "កាលវិភាគរៀន",
    purchaseSteps: "របៀបទិញវគ្គ",
    purchaseStepOne: "ជ្រើសរើសវគ្គ",
    purchaseStepTwo: "ស្កេន KHQR",
    purchaseStepThree: "ចាប់ផ្តើមរៀន",
    purchaseHint: "បន្ទាប់ពីបញ្ជាក់ការបង់ប្រាក់ វគ្គសិក្សានឹងបើកសម្រាប់អ្នក។",
    notConfigured: "ការបង់ប្រាក់វគ្គមិនទាន់បានកំណត់រចនាសម្ព័ន្ធទេ។",
    paymentError: "មិនអាចចាប់ផ្តើមការបង់ប្រាក់បានទេ។",
    signInToBuy: "សូមចូលជាសិស្ស ដើម្បីបន្តការបង់ប្រាក់។",
    studentOnly: "ការទិញវគ្គអាចប្រើបានសម្រាប់គណនីសិស្ស។",
    backToCourses: "ត្រឡប់ទៅវគ្គសិក្សា",
    from: "ចាប់ពី",
    learners: "អ្នករៀន",
    projects: "កិច្ចការ",
    exams: "ការប្រឡង",
    sessions: "វគ្គរៀន",
    about: "ហេតុអ្វី CampusFlow",
    faq: "សំណួរដែលសួរញឹកញាប់",
    whyTitle: "ព័ត៌មានច្បាស់លាស់ មុនពេលអ្នកសម្រេចចិត្តទិញ។",
    whyBody: "មើលគ្រូ កាលវិភាគ ផែនការសិក្សា និងជំហានបង់ប្រាក់បានយ៉ាងងាយស្រួល។",
    benefitLessons: "ផែនការសិក្សាច្បាស់លាស់",
    benefitLessonsBody: "រៀនតាមកិច្ចការអនុវត្ត និងចំណុចសំខាន់ៗក្នុងវគ្គតែមួយ។",
    benefitFeedback: "មតិយោបល់ពីគ្រូ",
    benefitFeedbackBody: "ដាក់ស្នើកិច្ចការ និងតាមដានមតិយោបល់ជាមួយការរីកចម្រើនរបស់អ្នក។",
    benefitPayment: "បង់ប្រាក់ក្នុងស្រុកងាយស្រួល",
    benefitPaymentBody: "បង់ប្រាក់តាម KHQR ដោយ Bakong, ABA ឬកម្មវិធីធនាគារដែលគាំទ្រ។",
    benefitCommunity: "ការគាំទ្រក្នុងស្រុក",
    benefitCommunityBody: "ទទួលជំនួយតាម Telegram ជាភាសាខ្មែរ ឬអង់គ្លេស។",
    whatYouGet: "អ្វីដែលអ្នកនឹងទទួលបាន",
    includes: ["ផែនការសិក្សាដែលមានការណែនាំ", "កាលវិភាគ និងកាលកំណត់", "កិច្ចការ និងលទ្ធផលប្រឡង", "ការទំនាក់ទំនងជាមួយគ្រូ"],
    faqTitle: "មានសំណួរមុនពេលចាប់ផ្តើម?",
    faqs: [
      { question: "តើខ្ញុំទិញវគ្គសិក្សាដោយរបៀបណា?", answer: "បើកមើលវគ្គ ចូលជាសិស្ស ស្កេន KHQR ហើយពិនិត្យស្ថានភាពការបង់ប្រាក់។" },
      { question: "តើអាចប្រើកម្មវិធីធនាគារកម្ពុជាបានទេ?", answer: "បាន។ ប្រព័ន្ធប្រើ KHQR និងគាំទ្រ Bakong, ABA និងធនាគារដែលចូលរួមផ្សេងទៀត។" },
      { question: "តើវគ្គសិក្សាបើកនៅពេលណា?", answer: "បន្ទាប់ពីការបង់ប្រាក់ត្រូវបានបញ្ជាក់ វគ្គនឹងបង្ហាញក្នុងផ្ទៃសិស្សរបស់អ្នក។" },
    ],
    processBodies: ["ប្រៀបធៀបព័ត៌មានវគ្គ គ្រូ និងផែនការសិក្សា មុនពេលអ្នកសម្រេចចិត្ត។", "ប្រើ Bakong, ABA ឬកម្មវិធីធនាគារដែលគាំទ្រ KHQR ដើម្បីបង់ប្រាក់ដោយសុវត្ថិភាព។", "ផ្ទៃសិស្សរបស់អ្នកនឹងបើកជាមួយកាលវិភាគ កិច្ចការ ការប្រឡង និងលទ្ធផល។"],
    heroPanelEyebrow: "រៀនតាមការអនុវត្ត",
    heroPanelTitle: "មេរៀនច្បាស់លាស់។ លទ្ធផលជាក់ស្តែង។",
    heroPanelItems: ["មេរៀន", "អនុវត្ត", "លទ្ធផល"],
    liveSupport: "ការគាំទ្រផ្ទាល់",
    marketplace: "ទីផ្សារវគ្គសិក្សា",
    community: "សហគមន៍",
    signInToCommunity: "សូមចូលប្រើ ដើម្បីចូលរួមសហគមន៍។",
    supportLabel: "ជំនួយ",
    teacherFallback: "គ្រូ CampusFlow",
    assignmentFallback: "អនុវត្តតាមកិច្ចការដែលមានការណែនាំ និងទទួលមតិយោបល់ពីគ្រូ។",
    schedulePending: "កាលវិភាគនឹងត្រូវចែករំលែកបន្ទាប់ពីចុះឈ្មោះ។",
    paymentMethods: "គាំទ្រ KHQR · Bakong · ABA",
    loading: "កំពុងផ្ទុកវគ្គសិក្សា...",
    loadError: "មិនអាចផ្ទុកព័ត៌មានវគ្គសិក្សាបានទេ។",
    genericError: "មានបញ្ហាមួយបានកើតឡើង។ សូមព្យាយាមម្ដងទៀត។",
    support: "ត្រូវការជំនួយ? ជជែកជាមួយក្រុមគាំទ្រ",
    secure: "គណនីសិស្សមានសុវត្ថិភាព · គាំទ្រភាសាខ្មែរ និងអង់គ្លេស",
  },
};

export default function Storefront() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const copy = copyByLanguage[language] || copyByLanguage.en;
  const communityPath = user ? "/friends" : "/login/student";
  const [courses, setCourses] = useState([]);
  const [course, setCourse] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buyBusy, setBuyBusy] = useState("");
  const [payment, setPayment] = useState(null);
  const [paymentError, setPaymentError] = useState("");
  const [planChanging, setPlanChanging] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentPlanCourse, setPaymentPlanCourse] = useState(null);
  const [hasPurchasedCourse, setHasPurchasedCourse] = useState(false);
  const [purchasedCourseIds, setPurchasedCourseIds] = useState([]);
  const [purchasedCoursePlans, setPurchasedCoursePlans] = useState({});
  const paymentCloseTimer = useRef(null);
  const storefrontRef = useScrollReveal([id, courses.length, course?.id, loading]);

  useEffect(() => () => {
    if (paymentCloseTimer.current) window.clearTimeout(paymentCloseTimer.current);
  }, []);

  useEffect(() => {
    let active = true;
    if (!['STUDENT', 'CUSTOMER'].includes(user?.role)) {
      setHasPurchasedCourse(false);
      setPurchasedCourseIds([]);
      setPurchasedCoursePlans({});
      return undefined;
    }

    api.get("/enrollments/me")
      .then((response) => {
        if (!active) return;
        const enrollments = unwrap(response);
        const purchasedEnrollments = Array.isArray(enrollments)
          ? enrollments.filter((enrollment) => enrollment?.status === "ACTIVE" && ["PAID", "MANUAL"].includes(enrollment?.paymentStatus))
          : [];
        const purchasedIds = purchasedEnrollments.map((enrollment) => enrollment.courseId).filter(Boolean);
        const plans = purchasedEnrollments.reduce((result, enrollment) => {
          if (enrollment.courseId) result[enrollment.courseId] = String(enrollment.paymentPlan || "FULL").toUpperCase();
          return result;
        }, {});
        setPurchasedCourseIds(purchasedIds);
        setPurchasedCoursePlans(plans);
        setHasPurchasedCourse(purchasedIds.length > 0);
      })
      .catch(() => {
        if (active) {
          setHasPurchasedCourse(false);
          setPurchasedCourseIds([]);
          setPurchasedCoursePlans({});
        }
      });

    return () => { active = false; };
  }, [user?.id, user?.role]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (id) {
          const response = await api.get(`/storefront/courses/${id}`);
          let nextCourse = unwrap(response);
          if (['STUDENT', 'CUSTOMER'].includes(user?.role)) {
            try {
              const accessResponse = await api.get(`/storefront/courses/${id}/access`);
              nextCourse = unwrap(accessResponse);
            } catch (accessError) {
              if (accessError.response?.status !== 403) throw accessError;
            }
          }
          if (active) setCourse(nextCourse);
        } else {
          const response = await api.get("/storefront/courses", {
            params: search.trim() ? { search: search.trim() } : undefined,
          });
          if (active) setCourses(unwrap(response) || []);
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              copy.loadError,
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    const timer = window.setTimeout(load, id ? 0 : 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [id, search, user?.id, user?.role]);

  const startCoursePayment = async (selectedCourse, plan = "FULL") => {
    if (!user) {
      navigate("/login/student", {
        state: { message: copy.signInToBuy, from: `/courses/${selectedCourse.id}` },
      });
      return;
    }
    if (!['STUDENT', 'CUSTOMER'].includes(user.role)) {
      setError(copy.studentOnly);
      return;
    }
    setPaymentPlanCourse(null);
    setBuyBusy(selectedCourse.id);
    setPaymentError("");
    try {
      const response = await api.post(`/storefront/courses/${selectedCourse.id}/checkout?plan=${plan}`);
      setPayment(unwrap(response));
    } catch (requestError) {
      const message = requestError.response?.data?.message || copy.paymentError;
      setPaymentError(message);
      setPayment({ status: "FAILED", courseId: selectedCourse.id, courseName: selectedCourse.courseName, amount: "-", currency: "", paymentPlan: plan });
    } finally {
      setBuyBusy("");
    }
  };

  const buyCourse = async (selectedCourse) => {
    if (!user) {
      navigate("/login/student", {
        state: { message: copy.signInToBuy, from: `/courses/${selectedCourse.id}` },
      });
      return;
    }
    if (!['STUDENT', 'CUSTOMER'].includes(user.role)) {
      setError(copy.studentOnly);
      return;
    }
    const alreadyPurchased = purchasedCourseIds.includes(selectedCourse.id);
    const purchasePlan = purchasedCoursePlans[selectedCourse.id];
    if (alreadyPurchased && purchasePlan !== "MONTHLY") {
      navigate(`/courses/${selectedCourse.id}`);
      return;
    }
    if (selectedCourse.monthlyPaymentEnabled && Number(selectedCourse.monthlyPrice || 0) > 0) {
      setPaymentPlanCourse(selectedCourse);
      return;
    }
    await startCoursePayment(selectedCourse, "FULL");
  };

  const checkPayment = async () => {
    if (!payment?.publicToken || checkingPayment) return;
    setCheckingPayment(true);
    setPaymentError("");
    try {
      const response = await api.post(
        `/payments/course/${payment.publicToken}/check`,
      );
      const nextPayment = unwrap(response);
      setPayment(nextPayment);
      if (nextPayment.status === "PAID") {
        const paidCourseId = nextPayment.courseId || payment.courseId;
        const paidPlan = String(nextPayment.paymentPlan || payment.paymentPlan || "FULL").toUpperCase();
        if (paidCourseId) {
          setPurchasedCourseIds((current) => current.includes(paidCourseId) ? current : [...current, paidCourseId]);
          setPurchasedCoursePlans((current) => ({ ...current, [paidCourseId]: paidPlan }));
          setHasPurchasedCourse(true);
        }
        paymentCloseTimer.current = window.setTimeout(() => {
          setPayment(null);
          setPaymentError("");
          navigate("/student/courses");
        }, 1600);
      } else {
        setPaymentError(nextPayment.message || t("paymentPending"));
      }
    } catch (requestError) {
      setPaymentError(
        requestError.response?.data?.message || copy.paymentError,
      );
    } finally {
      setCheckingPayment(false);
    }
  };

  useEffect(() => {
    if (!payment?.publicToken || payment.status !== "PENDING") return undefined;
    const interval = window.setInterval(() => {
      if (!document.hidden && !checkingPayment) checkPayment();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [payment?.publicToken, payment?.status, checkingPayment]);

  const refreshPayment = async () => {
    if (!payment?.courseId) return;
    try {
      const response = await api.post(`/storefront/courses/${payment.courseId}/checkout?refresh=1&plan=${payment.paymentPlan || "FULL"}`);
      setPayment(unwrap(response));
      setPaymentError("");
    } catch (requestError) {
      setPaymentError(
        requestError.response?.data?.message || copy.paymentError,
      );
    }
  };

  const changePaymentPlan = async (plan) => {
    if (!payment?.courseId || payment.status !== "PENDING" || payment.paymentPlan === plan) return;
    setPlanChanging(true);
    setPaymentError("");
    try {
      const response = await api.post(`/storefront/courses/${payment.courseId}/checkout?refresh=1&plan=${plan}`);
      setPayment(unwrap(response));
    } catch (requestError) {
      setPaymentError(requestError.response?.data?.message || copy.paymentError);
    } finally {
      setPlanChanging(false);
    }
  };

  const closePayment = () => {
    if (paymentCloseTimer.current) {
      window.clearTimeout(paymentCloseTimer.current);
      paymentCloseTimer.current = null;
    }
    const paid = payment?.status === "PAID";
    setPayment(null);
    setPaymentError("");
    if (paid) navigate("/student/courses");
  };

  const paymentModal = payment ? (
    <CoursePayment
      payment={payment}
      error={paymentError}
      paymentUnavailable={isBakongUnavailable(paymentError)}
      onCheck={checkPayment}
      checkingPayment={checkingPayment}
      onRefresh={refreshPayment}
      onPlanChange={changePaymentPlan}
      planChanging={planChanging}
      onClose={closePayment}
    />
  ) : null;
  const paymentPlanModal = paymentPlanCourse ? <PaymentPlanChooser course={paymentPlanCourse} isPurchased={purchasedCourseIds.includes(paymentPlanCourse.id)} t={t} onChoose={(plan) => startCoursePayment(paymentPlanCourse, plan)} onClose={() => setPaymentPlanCourse(null)} /> : null;

  const seoDescription = course?.description || copy.heroBody;
  const seoTitle = course?.courseName
    ? `${course.courseName} | CampusFlow LMS`
    : "CampusFlow LMS | Practical Online Courses in Cambodia";
  const courseSchema = course ? {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.courseName,
    description: seoDescription,
    url: `${SITE_URL}/courses/${course.id}`,
    provider: { "@type": "Organization", name: "CampusFlow LMS", sameAs: SITE_URL },
    inLanguage: ["en", "km"],
    offers: {
      "@type": "Offer",
      price: String(course.salePrice ?? course.price ?? 0),
      priceCurrency: course.currency || "USD",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/courses/${course.id}`,
    },
  } : null;
  const listSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CampusFlow LMS",
    url: SITE_URL,
    description: copy.heroBody,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/courses?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  if (id) {
    return (
      <div ref={storefrontRef} className="storefront min-h-screen bg-[#f6fafc] text-[#10243f] transition-colors dark:bg-[#0b1220] dark:text-slate-100">
        <Seo title={seoTitle} description={seoDescription} path={`/courses/${id}`} language={language} jsonLd={courseSchema} />
        <StorefrontAmbientBackground />
        <StorefrontNav
          copy={copy}
          language={language}
          setLanguage={setLanguage}
          user={user}
          authLoading={authLoading}
          hasPurchasedCourse={hasPurchasedCourse}
          t={t}
        />
        <main className="pt-[4.5rem]">
          {loading && <LoadingState copy={copy} />}
          {!loading && course && (
            <CourseDetail
              course={course}
              copy={copy}
              language={language}
              t={t}
              user={user}
              buyBusy={buyBusy}
              onBuy={buyCourse}
              isPurchased={purchasedCourseIds.includes(course.id)}
              paymentPlan={purchasedCoursePlans[course.id]}
            />
          )}
          {!loading && !course && <ErrorState message={error} fallback={copy.genericError} />}
        </main>
        <StorefrontFooter copy={copy} />
        <SupportDock alwaysShow publicMode />
        {paymentPlanModal}
        {paymentModal}
      </div>
    );
  }

  return (
    <div ref={storefrontRef} className="storefront min-h-screen bg-[#f6fafc] text-[#10243f] transition-colors dark:bg-[#0b1220] dark:text-slate-100">
      <Seo title="CampusFlow LMS | Practical Online Courses in Cambodia" description={copy.heroBody} path="/" language={language} jsonLd={listSchema} />
      <StorefrontAmbientBackground />
      <StorefrontNav
        copy={copy}
        language={language}
        setLanguage={setLanguage}
        user={user}
        authLoading={authLoading}
        hasPurchasedCourse={hasPurchasedCourse}
        t={t}
      />
      <main className="pt-0">
        <section className="relative flex min-h-[100svh] overflow-hidden bg-[#10243f] text-white">
          <div className="absolute -left-24 -top-40 h-96 w-96 rounded-full bg-[#8de4ca]/15 blur-3xl" />
          <div className="absolute -bottom-48 right-0 h-[34rem] w-[34rem] rounded-full bg-[#f47b67]/15 blur-3xl" />
          <div className="relative mx-auto grid min-h-[100svh] w-full max-w-7xl gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:px-10 lg:py-16">
            <div className="storefront-reveal storefront-reveal-on-load">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#8de4ca]/25 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.22em] text-[#a5f1dc]">
                <span className="h-2 w-2 rounded-full bg-[#8de4ca] shadow-[0_0_14px_#8de4ca]" />
                {copy.heroEyebrow}
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl">
                {copy.heroTitle}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
                {copy.heroBody}
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a
                  href="#courses"
                  className="rounded-2xl bg-[#8de4ca] px-5 py-3.5 text-sm font-extrabold text-[#10243f] shadow-lg shadow-[#8de4ca]/15 transition hover:-translate-y-0.5 hover:bg-white"
                >
                  {copy.browse} <span className="ml-2">↓</span>
                </a>
                <Link
                  to="/register"
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-white/15"
                >
                  {copy.register}
                </Link>
                <Link
                  to={communityPath}
                  state={!user ? { message: copy.signInToCommunity, from: "/friends" } : undefined}
                  className="rounded-2xl border border-[#8de4ca]/30 bg-[#8de4ca]/10 px-5 py-3.5 text-sm font-extrabold text-[#a5f1dc] transition hover:bg-[#8de4ca]/20"
                >
                  {copy.community}
                </Link>
              </div>
              <div className="mt-11 grid max-w-xl grid-cols-3 gap-3">
                <MiniStat value={courses.length || "—"} label={copy.activeCourses} />
                <MiniStat value="KHQR" label={copy.localPayment} />
                <MiniStat value="1:1" label={copy.teacherSupport} />
              </div>
            </div>
            <div className="storefront-reveal storefront-reveal-on-load storefront-3d-scene relative mx-auto w-full max-w-lg [--reveal-delay:140ms]">
              <div className="absolute -inset-5 rounded-[2.25rem] bg-gradient-to-br from-[#8de4ca]/20 via-transparent to-[#f47b67]/20 blur-2xl" />
              <div className="storefront-3d-card relative rounded-[2rem] border border-white/15 bg-white/[.08] p-4 shadow-2xl backdrop-blur-xl sm:p-5">
                <div className="storefront-3d-surface rounded-[1.5rem] bg-gradient-to-br from-[#dff8ee] via-[#e8f2ff] to-[#fff0e9] p-5 text-[#10243f] sm:p-7">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[#10243f] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#a5f1dc]">
                      CampusFlow
                    </span>
                    <span className="text-xs font-bold text-[#53708b]">2026 · 2027</span>
                  </div>
                  <div className="mt-20 max-w-sm">
                    <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#f06f5b]">
                      {copy.heroPanelEyebrow}
                    </p>
                    <p className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                      {copy.heroPanelTitle}
                    </p>
                  </div>
                  <div className="mt-10 grid grid-cols-3 gap-2">
                    {copy.heroPanelItems.map((item, index) => (
                      <div key={item} className="rounded-2xl bg-white/70 p-3">
                        <span className="text-lg font-black text-[#10243f]">0{index + 1}</span>
                        <span className="mt-1 block text-[10px] font-bold text-[#6c8298]">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between px-2 pb-1 pt-4 text-xs font-semibold text-white/60">
                  <span>{copy.secure}</span>
                  <span className="text-[#a5f1dc]">● {copy.liveSupport}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="courses" data-scroll-reveal className="storefront-reveal mx-auto max-w-7xl scroll-mt-24 px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.22em] text-[#f06f5b]">
                {copy.heroEyebrow}
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                {copy.popular}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                {copy.popularBody}
              </p>
            </div>
            <label className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-[#132238] md:w-80">
              <span className="text-lg text-slate-400">⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#10243f] outline-none placeholder:text-slate-400 dark:text-white"
                placeholder={copy.search}
              />
            </label>
          </div>

          {error && <ErrorState message={error} fallback={copy.genericError} compact />}
          {loading && <LoadingState copy={copy} />}
          {!loading && !error && !courses.length && <EmptyState copy={copy} />}
          {!loading && !error && courses.length > 0 && (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {courses.map((item, index) => (
                <CourseCard
                  key={item.id}
                  course={item}
                  copy={copy}
                  language={language}
                  t={t}
                  user={user}
                  buyBusy={buyBusy}
                  onBuy={buyCourse}
                  isPurchased={purchasedCourseIds.includes(item.id)}
                  paymentPlan={purchasedCoursePlans[item.id]}
                  revealDelay={Math.min(index * 85, 340)}
                />
              ))}
            </div>
          )}
        </section>

        <section id="how-it-works" data-scroll-reveal className="storefront-reveal border-y border-slate-200/80 bg-white scroll-mt-24 dark:border-slate-700 dark:bg-[#0f1b2d]">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-extrabold uppercase tracking-[.22em] text-[#f06f5b]">{copy.purchaseSteps}</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">{copy.steps}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">{copy.stepsBody}</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <ProcessCard number="01" title={copy.purchaseStepOne} body={copy.processBodies[0]} revealDelay={0} />
              <ProcessCard number="02" title={copy.purchaseStepTwo} body={copy.processBodies[1]} revealDelay={90} />
              <ProcessCard number="03" title={copy.purchaseStepThree} body={copy.processBodies[2]} revealDelay={180} />
            </div>
          </div>
        </section>

        <section id="about" data-scroll-reveal className="storefront-reveal scroll-mt-24 bg-[#f6fafc] dark:bg-[#0b1220]">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-extrabold uppercase tracking-[.22em] text-[#f06f5b]">{copy.about}</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{copy.whyTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">{copy.whyBody}</p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FeatureCard icon="01" title={copy.benefitLessons} body={copy.benefitLessonsBody} revealDelay={0} />
              <FeatureCard icon="02" title={copy.benefitFeedback} body={copy.benefitFeedbackBody} revealDelay={90} />
              <FeatureCard icon="03" title={copy.benefitPayment} body={copy.benefitPaymentBody} revealDelay={180} />
              <FeatureCard icon="04" title={copy.benefitCommunity} body={copy.benefitCommunityBody} revealDelay={270} />
            </div>
          </div>
        </section>

        <section id="faq" data-scroll-reveal className="storefront-reveal scroll-mt-24 border-t border-slate-200/80 bg-white dark:border-slate-700 dark:bg-[#0f1b2d]">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[.72fr_1.28fr] lg:px-10 lg:py-20">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.22em] text-[#f06f5b]">{copy.faq}</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{copy.faqTitle}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">{copy.purchaseHint}</p>
              <a href="https://t.me/RoeunVathana" target="_blank" rel="noreferrer" className="mt-7 inline-flex rounded-xl bg-[#10243f] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#1c4e6b]">{copy.support} ↗</a>
            </div>
            <div className="space-y-3">
              {copy.faqs.map((item, index) => <FaqItem key={item.question} question={item.question} answer={item.answer} revealDelay={index * 90} />)}
            </div>
          </div>
        </section>
      </main>
      <StorefrontFooter copy={copy} />
      <SupportDock alwaysShow publicMode />
      {paymentPlanModal}
      {paymentModal}
    </div>
  );
}

function PaymentPlanChooser({ course, isPurchased = false, t, onChoose, onClose }) {
  const pricing = getCoursePricing(course);
  const monthlyPrice = Number(course.monthlyPrice || 0);
  return <Modal open title={t('choosePaymentPlan')} onClose={onClose} className="payment-plan-modal">
    <div className="space-y-5">
      <div className="rounded-2xl bg-[#10243f] p-5 text-white"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#a5f1dc]">{t('coursePayment')}</p><h3 className="mt-2 text-2xl font-black">{course.courseName}</h3><p className="mt-2 text-sm text-white/65">{t('choosePaymentPlanHint')}</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {!isPurchased && <button type="button" onClick={() => onChoose('FULL')} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#229ed9] hover:shadow-lg dark:border-slate-700 dark:bg-[#132238]"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dff8ee] text-lg font-black text-[#17624e] dark:bg-[#173f42] dark:text-[#a5f1dc]">✓</span><p className="mt-4 text-base font-black text-[#10243f] dark:text-white">{t('fullCoursePayment')}</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">{t('fullCoursePaymentHint')}</p><p className="mt-5 text-2xl font-black text-[#10243f] dark:text-[#a5f1dc]">{formatPrice(pricing.salePrice, course.currency)}</p>{pricing.active && <p className="mt-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">{t('discountApplied')}</p>}<span className="mt-5 inline-flex rounded-xl bg-[#10243f] px-3 py-2 text-xs font-extrabold text-white transition group-hover:bg-[#229ed9]">{t('payFullCourse')} →</span></button>}
        <button type="button" onClick={() => onChoose('MONTHLY')} className="group rounded-2xl border border-[#8de4ca] bg-gradient-to-br from-[#effcf7] to-[#eff6ff] p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-[#2f8b78] dark:from-[#122e35] dark:to-[#132238]"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#229ed9] text-lg font-black text-white shadow-lg shadow-sky-500/20">↻</span><p className="mt-4 text-base font-black text-[#10243f] dark:text-white">{t('monthlyPayment')}</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">{t('monthlyPaymentHint')}</p><p className="mt-5 text-2xl font-black text-[#17624e] dark:text-[#a5f1dc]">{formatPrice(monthlyPrice, course.currency)}<span className="ml-1 text-xs font-bold text-slate-500 dark:text-slate-300">/ {t('month')}</span></p><span className="mt-5 inline-flex rounded-xl bg-[#229ed9] px-3 py-2 text-xs font-extrabold text-white transition group-hover:bg-[#168dcc]">{t('payMonthly')} →</span></button>
      </div>
      <p className="text-center text-xs font-semibold text-slate-400">{t('monthlyPaymentReminder')}</p>
    </div>
  </Modal>;
}

function StorefrontAmbientBackground() {
  return (
    <div className="storefront-ambient-background" aria-hidden="true">
      <div className="storefront-ambient-grid" />
      <div className="storefront-ambient-orb storefront-ambient-orb-a" />
      <div className="storefront-ambient-orb storefront-ambient-orb-b" />
      <div className="storefront-ambient-orb storefront-ambient-orb-c" />
      <div className="storefront-ambient-ring storefront-ambient-ring-a" />
      <div className="storefront-ambient-ring storefront-ambient-ring-b" />
    </div>
  );
}

function LegacyLanguageMenu({ language, setLanguage, compact = false, onSelect }) {
  const [open, setOpen] = useState(false);
  const current = language === "en" ? { flag: "🇬🇧", label: "English" } : { flag: "🇰🇭", label: "ខ្មែរ" };
  const options = [
    { value: "km", flag: "🇰🇭", label: "ខ្មែរ" },
    { value: "en", flag: "🇬🇧", label: "English" },
  ];

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!(event.target instanceof Element) || !event.target.closest("[data-language-menu]")) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  const choose = (value) => {
    setLanguage(value);
    setOpen(false);
    onSelect?.();
  };

  return (
    <div className="relative" data-language-menu>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Language: ${current.label}`}
        title={`Language: ${current.label}`}
        onClick={() => setOpen((value) => !value)}
        className={compact
          ? "inline-flex h-10 min-w-14 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-2 text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-[#10243f] dark:border-slate-600 dark:bg-slate-800/90 dark:hover:border-[#8de4ca]"
          : "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-[#10243f] hover:text-[#10243f] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-mint dark:hover:text-mint"}
      >
        <span aria-hidden="true" className="text-base leading-none">{current.flag}</span>
        {!compact && <span>{current.label}</span>}
        <span aria-hidden="true" className={`text-[11px] text-slate-400 transition ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+.6rem)] z-[70] w-48 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-[0_18px_42px_rgba(16,36,63,.2)] backdrop-blur-xl dark:border-slate-600 dark:bg-[#101b2d]/98 dark:shadow-[0_18px_42px_rgba(0,0,0,.4)]">
          <p className="px-3 pb-1.5 pt-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-400 dark:text-slate-500">{language === "en" ? "Language" : "ភាសា"}</p>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={language === option.value}
              onClick={() => choose(option.value)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-extrabold transition ${language === option.value ? "bg-[#e8f5fb] text-[#17624e] dark:bg-[#1a3b4d] dark:text-[#a5f1dc]" : "text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"}`}
            >
              <span aria-hidden="true" className="text-lg leading-none">{option.flag}</span>
              <span className="flex-1">{option.label}</span>
              {language === option.value && <span aria-hidden="true" className="text-sm text-[#229ed9]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LanguageMenu({ language, setLanguage, compact = false, onSelect }) {
  const [open, setOpen] = useState(false);
  const options = [
    { value: 'km', flag: 'https://flagcdn.com/w40/kh.png', label: 'ខ្មែរ', alt: 'Cambodia' },
    { value: 'en', flag: 'https://flagcdn.com/w40/gb.png', label: 'English', alt: 'United Kingdom' },
  ];
  const current = options.find((option) => option.value === language) || options[1];

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-language-menu]')) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [open]);

  const choose = (value) => {
    setLanguage(value);
    setOpen(false);
    onSelect?.();
  };

  return <div className="relative" data-language-menu>
    <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={`Language: ${current.label}`} title={`Language: ${current.label}`} onClick={() => setOpen((value) => !value)} className={`group inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-2.5 text-xs font-extrabold shadow-sm transition duration-200 hover:-translate-y-0.5 sm:px-3 sm:text-sm ${open ? 'border-[#229ed9] bg-[#e8f5fb] text-[#14536a] dark:border-[#4ab8df] dark:bg-[#173d4d] dark:text-[#e8fff7]' : 'border-slate-200 bg-white/95 text-slate-700 hover:border-[#229ed9] dark:border-slate-600 dark:bg-slate-800/95 dark:text-slate-100 dark:hover:border-[#8de4ca]'}`}>
      <span className="flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-slate-100 ring-1 ring-black/10 dark:bg-slate-700" aria-hidden="true"><img src={current.flag} alt="" className="h-full w-full object-cover" /></span>
      {!compact && <span>{current.label}</span>}
      <span aria-hidden="true" className={`text-[11px] text-slate-400 transition duration-200 ${open ? 'rotate-180 text-[#229ed9]' : ''}`}>⌄</span>
    </button>
    {open && <div role="menu" className="absolute right-0 top-[calc(100%+.6rem)] z-[70] w-48 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_45px_rgba(16,36,63,.2)] ring-1 ring-black/5 dark:border-slate-600 dark:bg-[#101b2d] dark:shadow-[0_20px_45px_rgba(0,0,0,.42)]">
      <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[.16em] text-slate-400 dark:text-slate-500">{language === 'en' ? 'Language' : 'ភាសា'}</p>
      {options.map((option) => <button key={option.value} type="button" role="menuitemradio" aria-checked={language === option.value} onClick={() => choose(option.value)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-extrabold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#229ed9]/50 ${language === option.value ? 'bg-[#e8f5fb] text-[#14536a] dark:bg-[#173d4d] dark:text-[#a5f1dc]' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'}`}><span className="flex h-7 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700"><img src={option.flag} alt={option.alt} className="h-4 w-6 rounded-[3px] object-cover shadow-sm" /></span><span className="flex-1">{option.label}</span>{language === option.value && <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-[#229ed9] text-xs text-white">✓</span>}</button>)}
    </div>}
  </div>;
}

function StorefrontNav({ copy, language, setLanguage, user, authLoading, hasPurchasedCourse, t }) {
  const dashboardPath = roleHome(user?.role);
  const hasSession = !authLoading && Boolean(user);
  const canOpenWorkspace = hasSession && (!['STUDENT', 'CUSTOMER'].includes(user?.role) || hasPurchasedCourse);
  const communityPath = "/community";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const loginLabel = language === "en" ? "Login" : "ចូលគណនី";
  const logoutLabel = language === "en" ? "Logout" : "ចាកចេញ";
  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate("/", { replace: true });
  };
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/70 bg-white/90 shadow-[0_10px_30px_rgba(16,36,63,.08)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-[#101b2d]/95">
      <div className="storefront-mobile-header mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8 lg:px-10">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[1.15rem] border border-[#cdece1] bg-gradient-to-br from-[#d9fff1] via-white to-[#dcecff] p-1.5 shadow-[0_10px_24px_rgba(16,36,63,.16)] ring-1 ring-[#10243f]/10 transition duration-300 hover:scale-105 hover:rotate-2 dark:border-white/15 dark:ring-white/10"><BrandLogo className="rounded-[.9rem]" /></span>
          <span>
            <span className="block text-lg font-black tracking-tight text-[#10243f] dark:text-white">Campus<span className="text-[#f06f5b]">Flow</span></span>
            <span className="hidden text-[9px] font-extrabold uppercase tracking-[.2em] text-slate-400 sm:block">{copy.marketplace}</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-bold text-slate-500 lg:flex">
          <a href="/#courses" className="transition hover:text-[#10243f] dark:text-slate-300 dark:hover:text-white">{copy.browse}</a>
          <Link to={communityPath} className="transition hover:text-[#10243f] dark:text-slate-300 dark:hover:text-white">{copy.community}</Link>
          <a href="/#about" className="transition hover:text-[#10243f] dark:text-slate-300 dark:hover:text-white">{copy.about}</a>
          <a href="/#faq" className="transition hover:text-[#10243f] dark:text-slate-300 dark:hover:text-white">{copy.faq}</a>
          <a href="https://t.me/RoeunVathana" target="_blank" rel="noreferrer" className="transition hover:text-[#10243f] dark:text-slate-300 dark:hover:text-white">{copy.supportLabel}</a>
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <ThemeSwitch />
          <LanguageMenu language={language} setLanguage={setLanguage} />
          {hasSession ? (
            <>
              {canOpenWorkspace ? (
                <Link to={dashboardPath} className="hidden rounded-xl bg-[#10243f] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#1c4e6b] sm:inline-flex">{t("dashboard")}</Link>
              ) : (
                <Link to="/courses#courses" className="rounded-xl bg-[#10243f] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#1c4e6b] dark:bg-[#8de4ca] dark:text-[#10243f]">{copy.browse}</Link>
              )}
              <button type="button" onClick={handleLogout} className="inline-flex whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-extrabold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900/60 dark:bg-slate-800 dark:text-rose-300 dark:hover:bg-rose-950/30">{logoutLabel}</button>
            </>
          ) : (
            <>
              <Link to="/login/student" className="inline-flex whitespace-nowrap rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-[11px] font-extrabold text-[#10243f] transition hover:border-[#10243f] hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:border-[#8de4ca] dark:hover:bg-slate-700 sm:px-3 sm:text-xs">{loginLabel}</Link>
              <Link to="/register" className="inline-flex whitespace-nowrap rounded-xl bg-[#10243f] px-2.5 py-2.5 text-[11px] font-extrabold text-white shadow-md shadow-[#10243f]/15 transition hover:bg-[#1c4e6b] sm:px-4 sm:text-xs">{copy.register}</Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeSwitch />
          <LanguageMenu language={language} setLanguage={setLanguage} compact onSelect={() => setMobileMenuOpen(false)} />
          <button type="button" aria-expanded={mobileMenuOpen} aria-controls="storefront-mobile-menu" onClick={() => setMobileMenuOpen((open) => !open)} className="storefront-mobile-menu-button inline-flex items-center gap-2 rounded-xl bg-[#10243f] px-3 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-[#1c4e6b] dark:bg-[#229ed9] dark:hover:bg-[#168dcc]">
            <span className="text-base leading-none">{mobileMenuOpen ? "×" : "☰"}</span>{language === "en" ? "More" : "បន្ថែម"}
          </button>
        </div>
      </div>
      {mobileMenuOpen && <div id="storefront-mobile-menu" className="border-t border-slate-200/80 bg-white/95 px-5 py-4 shadow-xl dark:border-slate-700/80 dark:bg-[#101b2d]/98 lg:hidden"><div className="mx-auto max-w-7xl"><nav className="grid gap-2 text-sm font-bold text-slate-600 dark:text-slate-200"><a href="/#courses" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-3 transition hover:bg-slate-100 dark:hover:bg-slate-800">{copy.browse}</a><Link to="/community" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-3 transition hover:bg-slate-100 dark:hover:bg-slate-800">{copy.community}</Link><a href="/#about" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-3 transition hover:bg-slate-100 dark:hover:bg-slate-800">{copy.about}</a><a href="/#faq" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-3 transition hover:bg-slate-100 dark:hover:bg-slate-800">{copy.faq}</a><a href="https://t.me/RoeunVathana" target="_blank" rel="noreferrer" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-3 transition hover:bg-slate-100 dark:hover:bg-slate-800">{copy.supportLabel}</a></nav><div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">{hasSession ? <><Link to={canOpenWorkspace ? dashboardPath : "/courses#courses"} onClick={() => setMobileMenuOpen(false)} className="rounded-xl bg-[#10243f] px-4 py-3 text-center text-xs font-extrabold text-white dark:bg-[#229ed9]">{canOpenWorkspace ? t("dashboard") : copy.browse}</Link><button type="button" onClick={handleLogout} className="rounded-xl border border-rose-200 px-4 py-3 text-center text-xs font-extrabold text-rose-600 dark:border-rose-900/60 dark:text-rose-300">{logoutLabel}</button></> : <div className="grid grid-cols-2 gap-2"><Link to="/login/student" onClick={() => setMobileMenuOpen(false)} className="rounded-xl border border-slate-200 px-3 py-3 text-center text-xs font-extrabold text-[#10243f] dark:border-slate-600 dark:text-white">{loginLabel}</Link><Link to="/register" onClick={() => setMobileMenuOpen(false)} className="rounded-xl bg-[#10243f] px-3 py-3 text-center text-xs font-extrabold text-white dark:bg-[#229ed9]">{copy.register}</Link></div>}</div></div></div>}
    </header>
  );
}

function CoursePrice({ course, currency, large = false }) {
  const pricing = getCoursePricing(course);
  if (!pricing.active) return <span className={large ? "text-3xl font-black text-[#10243f] dark:text-[#a5f1dc]" : "text-sm font-black text-[#10243f] dark:text-[#a5f1dc]"}>{formatPrice(pricing.originalPrice, currency)}</span>;
  return <div className={large ? "space-y-2" : "flex flex-wrap items-center justify-end gap-2"}>
    <span className={large ? "text-sm font-bold text-slate-400 line-through" : "text-xs font-bold text-slate-400 line-through"}>{formatPrice(pricing.originalPrice, currency)}</span>
    <span className={large ? "block text-3xl font-black text-[#ee6f59] dark:text-[#a5f1dc]" : "text-sm font-black text-[#ee6f59] dark:text-[#a5f1dc]"}>{formatPrice(pricing.salePrice, currency)}</span>
    <span className="rounded-full bg-[#fff0eb] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#ee6f59]">-{pricing.discountPercent.toFixed(2)}%</span>
  </div>;
}

function CourseCard({ course, copy, language, t, user, buyBusy, onBuy, isPurchased = false, paymentPlan, revealDelay = 0 }) {
  return (
    <article data-scroll-reveal style={{ "--reveal-delay": `${revealDelay}ms` }} className="storefront-reveal storefront-course-card group overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(16,36,63,.08)] transition duration-300 hover:-translate-y-1 hover:border-[#8de4ca] hover:shadow-xl hover:shadow-[#10243f]/15 dark:border-slate-700 dark:bg-[#132238] dark:shadow-[0_18px_45px_rgba(0,0,0,.24)] dark:hover:border-[#2f8b78]">
      <Link to={`/courses/${course.id}`} className="block">
        <CourseVisual course={course} />
        <div className="p-5 pb-3">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-[#fff0eb] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#ee6f59]">{course.courseCode}</span>
            <CoursePrice course={course} currency={course.currency} />
          </div>
          <h3 className="mt-4 line-clamp-2 text-xl font-black tracking-tight text-[#10243f] dark:text-white">{course.courseName}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{course.description || t("courseInformation")}</p>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-3 px-5 pb-5 pt-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-[#10243f] dark:text-slate-100">{course.teacher?.user?.fullName || copy.teacherFallback}</p>
          <p className="mt-1 text-[11px] text-slate-400">{course._count?.enrollments || 0} {copy.learners} · {course._count?.assignments || 0} {copy.projects}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link to={`/courses/${course.id}`} className="rounded-xl px-2.5 py-2.5 text-xs font-extrabold text-[#1c4e6b] transition hover:bg-[#effcf7]">{copy.viewCourse} →</Link>
          {isPurchased && paymentPlan !== "MONTHLY" ? (
            <Link to={`/courses/${course.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-[#8de4ca]/50 bg-[#effcf7] px-3.5 py-2.5 text-xs font-extrabold text-[#17624e] transition hover:bg-[#dff8ee] dark:border-[#2f8b78] dark:bg-[#122e35] dark:text-[#a5f1dc] dark:hover:bg-[#173f42]">
              <span aria-hidden="true">✓</span>{t("purchaseComplete")}
            </Link>
          ) : (
            <button type="button" onClick={() => onBuy(course)} disabled={buyBusy === course.id} aria-label={!user ? copy.signInToBuy : undefined} className="rounded-xl bg-[#10243f] px-3.5 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#1c4e6b] disabled:cursor-wait disabled:opacity-60 dark:bg-[#229ed9] dark:hover:bg-[#168dcc]">
              {buyBusy === course.id ? "..." : isPurchased ? t("payMonthly") : user ? t("buyCourse") : `${copy.signIn} · ${t("buyCourse")}`}
            </button>
          )}
        </div>
      </div>
      <div className="border-t border-slate-100 px-5 py-3 text-xs font-bold text-slate-400">{formatDate(course.startDate, language)} → {formatDate(course.endDate, language)}</div>
    </article>
  );
}

function CourseDetail({ course, copy, language, t, user, buyBusy, onBuy, isPurchased = false, paymentPlan }) {
  const canViewLearningContent = ['STUDENT', 'CUSTOMER'].includes(user?.role) && isPurchased;

  return (
    <>
      <section data-scroll-reveal className="storefront-reveal bg-[#10243f] text-white">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
          <Link to="/courses" className="text-sm font-bold text-white/60 transition hover:text-white">← {copy.backToCourses}</Link>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
            <div>
              <span className="rounded-full bg-[#f47b67] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.15em] text-white">{course.courseCode}</span>
              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">{course.courseName}</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/70">{course.description || t("courseInformation")}</p>
              <div className="mt-7 flex flex-wrap gap-3 text-xs font-bold text-white/75">
                {canViewLearningContent ? <>
                  <span className="rounded-xl bg-white/10 px-3 py-2">{course._count?.assignments || 0} {copy.projects}</span>
                  <span className="rounded-xl bg-white/10 px-3 py-2">{course._count?.exams || 0} {copy.exams}</span>
                </> : <span className="rounded-xl border border-white/15 bg-white/10 px-3 py-2">{t("courseContentLocked")}</span>}
                <span className="rounded-xl bg-white/10 px-3 py-2">{course._count?.enrollments || 0} {copy.learners}</span>
              </div>
            </div>
            <CourseVisual course={course} large />
          </div>
        </div>
      </section>
      <section data-scroll-reveal className="storefront-reveal mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_360px] lg:px-10 lg:py-16">
        <div className="space-y-1">
          <div className="grid gap-4 sm:grid-cols-3">
            <InfoCard label={t("teacher")} value={course.teacher?.user?.fullName || copy.teacherFallback} />
            <InfoCard label={t("coursePeriodLabel")} value={`${formatDate(course.startDate, language)} – ${formatDate(course.endDate, language)}`} />
            <InfoCard label={copy.courseSchedule} value={canViewLearningContent ? `${course.schedules?.length || 0} ${copy.sessions}` : t("courseContentLocked")} />
          </div>
          <section className="mt-10 rounded-[1.6rem] bg-[#10243f] p-6 text-white sm:p-7">
            <p className="text-xs font-extrabold uppercase tracking-[.22em] text-[#a5f1dc]">{copy.whatYouGet}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {copy.includes.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-3 text-sm font-bold text-white/85">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#8de4ca] text-xs font-black text-[#10243f]">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </section>
          {canViewLearningContent ? <>
          <section id="curriculum" className="mt-12 scroll-mt-24">
            <p className="text-xs font-extrabold uppercase tracking-[.22em] text-[#f06f5b]">{copy.courseRoadmap}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight dark:text-white">{copy.learningPlan}</h2>
            <div className="mt-6 space-y-3">
              {course.assignments?.length ? course.assignments.map((assignment, index) => (
                <div key={assignment.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-[#132238]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#dff8ee] text-xs font-black text-[#17624e]">{String(index + 1).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-[#10243f] dark:text-white">{assignment.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{assignment.description || copy.assignmentFallback}</p>
                  </div>
                </div>
              )) : <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">{t("courseInformation")}</p>}
            </div>
          </section>
          <section className="mt-12">
            <p className="text-xs font-extrabold uppercase tracking-[.22em] text-[#f06f5b]">{copy.courseSchedule}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {course.schedules?.length ? course.schedules.map((schedule) => (
                <div key={schedule.id} className="rounded-2xl bg-[#10243f] p-4 text-white">
                  <p className="text-sm font-black">{schedule.dayOfWeek}</p>
                  <p className="mt-2 text-sm text-white/70">{schedule.startTime} – {schedule.endTime}{schedule.room ? ` · ${schedule.room}` : ""}</p>
                </div>
              )) : <p className="text-sm text-slate-500">{copy.schedulePending}</p>}
            </div>
          </section>
          <section id="materials" className="mt-12 scroll-mt-24">
            <p className="text-xs font-extrabold uppercase tracking-[.22em] text-[#f06f5b]">{t("courseMaterials")}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight dark:text-white">{t("courseMaterials")}</h2>
            <div className="mt-6 space-y-3">
              {course.materials?.length ? course.materials.map((material) => (
                <div key={material.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700 dark:bg-[#132238] sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#dff8ee] text-[10px] font-black text-[#17624e] dark:bg-[#173f42] dark:text-[#a5f1dc]">{fileTypeLabel(material)}</span>
                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-[#10243f] dark:text-white">{material.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-300">{material.description || material.originalName}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">{material.originalName} · {formatFileSize(material.fileSize)}</p>
                    </div>
                  </div>
                  <a href={mediaUrl(material.fileUrl)} download={material.originalName} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#10243f] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#1c4e6b] dark:bg-[#229ed9] dark:hover:bg-[#168dcc]">
                    {t("downloadMaterial")} ↓
                  </a>
                </div>
              )) : <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">{t("noMaterials")}</p>}
            </div>
          </section>
          </> : (
            <section className="mt-12 rounded-[1.7rem] border border-[#8de4ca]/25 bg-[#10243f] p-6 text-white shadow-xl shadow-[#10243f]/15 sm:p-8">
              <div className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#8de4ca] text-xl text-[#10243f]" aria-hidden="true">âœ“</span>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#a5f1dc]">{t("courseContentLocked")}</p>
                  <h2 className="mt-3 text-2xl font-black tracking-tight">{['STUDENT', 'CUSTOMER'].includes(user?.role) ? t("purchaseToUnlock") : t("signInToUnlock")}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">{t("courseContentLockedHint")}</p>
                  {!user ? (
                    <Link to="/login/student" state={{ from: `/courses/${course.id}` }} className="mt-6 inline-flex rounded-xl bg-[#8de4ca] px-4 py-3 text-sm font-extrabold text-[#10243f] transition hover:bg-[#a5f1dc]">{t("signInToUnlock")}</Link>
                  ) : ['STUDENT', 'CUSTOMER'].includes(user.role) && !isPurchased ? (
                    <button type="button" onClick={() => onBuy(course)} disabled={buyBusy === course.id} className="mt-6 rounded-xl bg-[#229ed9] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#168dcc] disabled:opacity-60">{buyBusy === course.id ? "..." : t("buyCourse")}</button>
                  ) : null}
                </div>
              </div>
            </section>
          )}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
           <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-xl shadow-[#10243f]/10 sm:p-6 dark:border-slate-700 dark:bg-[#132238] dark:shadow-black/25">
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-slate-400">{copy.from}</p>
             <CoursePrice course={course} currency={course.currency} large />
             {getCoursePricing(course).active && <p className="mt-2 text-sm font-bold text-emerald-700 dark:text-[#a5f1dc]">Save {formatPrice(getCoursePricing(course).savings, course.currency)}</p>}
             {course.monthlyPaymentEnabled && Number(course.monthlyPrice || 0) > 0 && <div className="mt-4 rounded-2xl border border-[#8de4ca]/60 bg-[#effcf7] p-3 dark:border-[#2f8b78] dark:bg-[#122e35]"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#17624e] dark:text-[#a5f1dc]">{t('monthlyPayment')}</p><p className="mt-1 text-lg font-black text-[#10243f] dark:text-white">{formatPrice(course.monthlyPrice, course.currency)} <span className="text-xs font-bold text-slate-500 dark:text-slate-300">/ {t('month')}</span></p></div>}
             <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-300">{copy.purchaseHint}</p>
            {isPurchased && paymentPlan !== "MONTHLY" ? (
              <Link to="/student/courses" className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#8de4ca]/50 bg-[#effcf7] px-4 py-4 text-sm font-extrabold text-[#17624e] transition hover:bg-[#dff8ee] dark:border-[#2f8b78] dark:bg-[#122e35] dark:text-[#a5f1dc] dark:hover:bg-[#173f42]">
                <span aria-hidden="true">✓</span>{t("purchaseComplete")}
              </Link>
            ) : (
              <button type="button" onClick={() => onBuy(course)} disabled={buyBusy === course.id} className="mt-6 w-full rounded-2xl bg-[#10243f] px-4 py-4 text-sm font-extrabold text-white shadow-lg shadow-[#10243f]/15 transition hover:-translate-y-0.5 hover:bg-[#1c4e6b] disabled:opacity-60 dark:bg-[#229ed9] dark:hover:bg-[#168dcc]">
                {buyBusy === course.id ? "..." : user ? (isPurchased ? t("payMonthly") : t("buyCourse")) : `${copy.signIn} · ${t("buyCourse")}`}
              </button>
            )}
            <p className="mt-4 text-center text-xs font-semibold text-slate-400">{copy.paymentMethods}</p>
          </div>
           <a href="https://t.me/RoeunVathana" target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-between rounded-2xl border border-[#b9e9db] bg-[#effcf7] px-4 py-3 text-sm font-extrabold text-[#17624e] transition hover:bg-[#dff8ee] dark:border-[#285b59] dark:bg-[#122e35] dark:text-[#a5f1dc] dark:hover:bg-[#173f42]">
            <span>{copy.support}</span><span>↗</span>
          </a>
        </aside>
      </section>
    </>
  );
}

function CourseVisual({ course, large = false }) {
  return (
    <div className={`storefront-course-visual group/visual relative overflow-hidden bg-gradient-to-br from-[#dff8ee] via-[#e8f2ff] to-[#fff0e9] dark:from-[#142c3c] dark:via-[#18243a] dark:to-[#2b1e2f] ${large ? "rounded-[1.75rem] border border-white/15 p-3 shadow-2xl" : "h-56 border-b border-slate-100 dark:border-slate-700"}`}>
      {course.imageUrl ? <img src={mediaUrl(course.imageUrl)} alt={course.courseName} className={`h-full w-full object-cover transition duration-700 group-hover/visual:scale-105 ${large ? "max-h-[28rem] rounded-[1.35rem]" : ""}`} /> : <div className="flex h-full min-h-56 flex-col justify-between p-6 text-[#10243f] dark:text-white">
        <span className="text-xs font-black uppercase tracking-[.2em] text-[#f06f5b]">{course.courseCode}</span>
        <div><p className="max-w-xs text-3xl font-black leading-tight">{course.courseName}</p><div className="mt-5 h-2 w-24 rounded-full bg-[#8de4ca]" /></div>
      </div>}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#08111f]/55 to-transparent opacity-80" />
      <div className="pointer-events-none absolute -bottom-14 -right-10 h-40 w-40 rounded-full border-[22px] border-white/30" />
      <span className="absolute bottom-4 left-4 rounded-full border border-white/25 bg-[#10243f]/75 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-white shadow-lg backdrop-blur-sm">{course.courseCode}</span>
    </div>
  );
}

function InfoCard({ label, value }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-[#132238]"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-2 line-clamp-2 text-sm font-extrabold text-[#10243f] dark:text-white">{value}</p></div>;
}

function MiniStat({ value, label }) {
  return <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur"><p className="text-lg font-black text-[#a5f1dc]"><AnimatedNumber value={value} /></p><p className="mt-1 text-[10px] font-bold leading-4 text-white/55">{label}</p></div>;
}

function ProcessCard({ number, title, body, revealDelay = 0 }) {
  return <div data-scroll-reveal style={{ "--reveal-delay": `${revealDelay}ms` }} className="storefront-reveal rounded-[1.5rem] border border-slate-200 bg-[#f8fbfd] p-5 transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-[#132238]"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10243f] text-xs font-black text-[#a5f1dc]">{number}</span><h3 className="mt-5 text-lg font-black text-[#10243f] dark:text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{body}</p></div>;
}

function FeatureCard({ icon, title, body, revealDelay = 0 }) {
  return <div data-scroll-reveal style={{ "--reveal-delay": `${revealDelay}ms` }} className="storefront-reveal rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-[#132238]"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dff8ee] text-xs font-black text-[#17624e]">{icon}</span><h3 className="mt-5 text-base font-black text-[#10243f] dark:text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{body}</p></div>;
}

function FaqItem({ question, answer, revealDelay = 0 }) {
  return <details data-scroll-reveal style={{ "--reveal-delay": `${revealDelay}ms` }} className="storefront-reveal group rounded-2xl border border-slate-200 bg-[#f8fbfd] p-4 dark:border-slate-700 dark:bg-[#132238]"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-extrabold text-[#10243f] dark:text-white"><span>{question}</span><span className="text-lg text-[#f06f5b] transition group-open:rotate-45">+</span></summary><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-300">{answer}</p></details>;
}

function useScrollReveal(dependencies = []) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const items = [...root.querySelectorAll("[data-scroll-reveal]")];
    if (!items.length) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, dependencies);

  return rootRef;
}

function LoadingState({ copy }) {
  return <div className="storefront-loading-state flex min-h-[calc(100svh-5rem)] items-center justify-center px-5 py-12 text-sm font-bold text-slate-400"><div className="storefront-loading-card flex w-full max-w-xs flex-col items-center rounded-[1.75rem] border border-white/70 bg-white/85 px-7 py-8 text-center shadow-[0_24px_70px_rgba(16,36,63,.14)] backdrop-blur-xl dark:border-slate-700 dark:bg-[#101c30]/90 dark:shadow-black/30"><div className="storefront-loading-mark flex h-14 w-14 items-center justify-center rounded-2xl bg-[#10243f] text-sm font-black tracking-tight text-[#a5f1dc] shadow-lg shadow-[#10243f]/20">CF</div><p className="mt-5 font-extrabold text-[#10243f] dark:text-white">{copy.loading}</p><div className="mt-4 h-1.5 w-36 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><span className="storefront-loading-progress block h-full w-1/2 rounded-full bg-gradient-to-r from-[#229ed9] via-[#8de4ca] to-[#f47b67]" /></div><div className="mt-4 flex items-center gap-1.5" aria-hidden="true"><span className="loading-dot h-1.5 w-1.5 rounded-full bg-[#229ed9]" /><span className="loading-dot loading-dot-delay-1 h-1.5 w-1.5 rounded-full bg-[#8de4ca]" /><span className="loading-dot loading-dot-delay-2 h-1.5 w-1.5 rounded-full bg-[#f47b67]" /></div></div></div>;
}

function EmptyState({ copy }) {
  return <div className="mt-10 rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-[#132238] dark:text-slate-300">{copy.noCourses}</div>;
}

function ErrorState({ message, fallback, compact = false }) {
  return <div className={`mx-auto max-w-7xl ${compact ? "mt-6" : "px-5 py-24 sm:px-8"}`}><div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">{message || fallback}</div></div>;
}

function StorefrontFooter({ copy }) {
  return <footer className="bg-[#10243f] text-white"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10"><div><p className="text-lg font-black">Campus<span className="text-[#8de4ca]">Flow</span></p><p className="mt-1 text-xs text-white/50">{copy.secure}</p></div><a href="https://t.me/RoeunVathana" target="_blank" rel="noreferrer" className="text-sm font-extrabold text-[#a5f1dc]">{copy.support} ↗</a></div></footer>;
}
