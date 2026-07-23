import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SiteProvider } from './contexts/SiteContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { NotificationsProvider } from './components/Notifications';
import { ConfirmDialogProvider } from './components/ConfirmDialog';
import WorkspaceStudio from './pages/admin/WorkspaceStudio';
import PublicLayout from './layouts/PublicLayout';
import EscamLayout from './layouts/EscamLayout';
import EscamHome from './pages/public/escam/EscamHome';
import DashboardLayout from './layouts/DashboardLayout';
import ParentLayout from './layouts/ParentLayout';
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentStudentView from './pages/parent/ParentStudentView';
import ParentMessages from './pages/parent/ParentMessages';
import TeacherLayout from './layouts/TeacherLayout';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherTimetable from './pages/teacher/TeacherTimetable';
import TeacherMySubjects from './pages/teacher/TeacherMySubjects';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherGradeEntry from './pages/teacher/TeacherGradeEntry';
import TeacherProfile from './pages/teacher/TeacherProfile';
import TeacherCorrections from './pages/teacher/TeacherCorrections';
import TeacherLessons from './pages/teacher/TeacherLessons';
import TeacherAssignments from './pages/teacher/TeacherAssignments';
import TeacherQuizzes from './pages/teacher/TeacherQuizzes';
import TeacherCourses from './pages/teacher/TeacherCourses';
import TeacherExams from './pages/teacher/TeacherExams';
import TeacherVirtualLabs from './pages/teacher/TeacherVirtualLabs';
import TeacherVirtualClasses from './pages/teacher/TeacherVirtualClasses';
import StudentLayout from './layouts/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentCourses from './pages/student/StudentCourses';
import StudentNotes from './pages/student/StudentNotes';
import StudentPresences from './pages/student/StudentPresences';
import StudentPlanning from './pages/student/StudentPlanning';
import StudentFinances from './pages/student/StudentFinances';
import StudentDocuments from './pages/student/StudentDocuments';
import StudentMessages from './pages/student/StudentMessages';
import StudentVideoLibrary from './pages/student/StudentVideoLibrary';
import ExamPage from './pages/student/ExamPage';
import StudentQuizPage from './pages/student/StudentQuizPage';
import StudentVirtualLabs from './pages/student/StudentVirtualLabs';
import StudentLibrary from './pages/student/StudentLibrary';
import StudentAITutor from './pages/student/StudentAITutor';
import StudentELearning from './pages/student/StudentELearning';
import StudentProfile from './pages/student/StudentProfile';
import StudentHub from './pages/student/StudentHub';
import FeeGate from './components/FeeGate';
import Home from './pages/public/Home';
import Login from './pages/public/Login';
import TestLogin from './pages/TestLogin';
import Dashboard from './pages/admin/Dashboard';
import Statistics from './pages/admin/Statistics';
import Students from './pages/admin/Students';
import Teachers from './pages/admin/Teachers';
import Staff from './pages/admin/Staff';
import Classes from './pages/admin/Classes';
import Courses from './pages/admin/Courses';
import Attendance from './pages/admin/Attendance';
import Finance from './pages/admin/Finance';
import Accounting from './pages/admin/Accounting';
import ELearning from './pages/admin/ELearning';
import ELearningHub from './pages/admin/ELearningHub';
import Documents from './pages/admin/Documents';
import Messages from './pages/admin/Messages';
import AIResponses from './pages/admin/AIResponses';
import Settings from './pages/admin/Settings';
import ParametresHub from './pages/admin/ParametresHub';
import Sites from './pages/admin/Sites';
import StudentDossierPage from './pages/admin/StudentDossierPage';
import UserRoles from './pages/admin/UserRoles';
import Timetable from './pages/admin/Timetable';
import Grades from './pages/admin/Grades';
import ReportCards from './pages/admin/ReportCards';
import Expenses from './pages/admin/Expenses';
import BankAccounts from './pages/admin/BankAccounts';
import CashRegister from './pages/admin/CashRegister';
import FeeConfigurationPage from './pages/admin/FeeConfiguration';
import AuditLogs from './pages/admin/AuditLogs';
import NotificationsAdmin from './pages/admin/NotificationsAdmin';
import ReminderSettings from './pages/admin/ReminderSettings';
import ScanPage from './pages/ScanPage';

function App() {
  return (
    <WorkspaceProvider>
    <SiteProvider>
      <Router>
      <NotificationProvider>
      <NotificationsProvider>
      <ConfirmDialogProvider>
        <Routes>
        {/* Public scan page — no auth wrapper */}
        <Route path="/scan/:classId" element={<ScanPage />} />

        {/* Test Route */}
        <Route path="/test-login" element={<TestLogin />} />

        {/* E-Learning Hub — standalone page with its own sidebar */}
        <Route path="/admin/elearning" element={<ELearningHub />} />

        {/* Student E-Learning Hub — standalone, own sidebar */}
        <Route path="/student/dashboard/elearning" element={<FeeGate elearningGate><StudentHub /></FeeGate>} />

        {/* Standalone exam page — full-screen, no layout nav */}
        <Route path="/student/exams/:examId" element={<FeeGate elearningGate><ExamPage /></FeeGate>} />

        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
        </Route>

        {/* ESCAM vitrine — separate branding/layout, switch link to/from CampusLMS */}
        <Route path="/escam" element={<EscamLayout />}>
          <Route index element={<EscamHome />} />
        </Route>

        {/* Teacher Portal Routes */}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="timetable" element={<TeacherTimetable />} />
          <Route path="my-subjects" element={<TeacherMySubjects />} />
          <Route path="attendance" element={<TeacherAttendance />} />
          <Route path="grades" element={<TeacherGradeEntry />} />
          <Route path="corrections" element={<TeacherCorrections />} />
          <Route path="lessons" element={<TeacherLessons />} />
          <Route path="assignments" element={<TeacherAssignments />} />
          <Route path="quizzes" element={<TeacherQuizzes />} />
          <Route path="courses" element={<TeacherCourses />} />
          <Route path="exams" element={<TeacherExams />} />
          <Route path="virtual-labs" element={<TeacherVirtualLabs />} />
          <Route path="virtual-classes" element={<TeacherVirtualClasses />} />
          <Route path="profile" element={<TeacherProfile />} />
        </Route>

        {/* Parent Portal Routes */}
        <Route path="/parent" element={<ParentLayout />}>
          <Route index element={<ParentDashboard />} />
          <Route path="enfant/:studentId" element={<ParentStudentView />} />
          <Route path="messages" element={<ParentMessages />} />
        </Route>

        {/* Student Portal Routes */}
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="courses" element={<StudentCourses />} />
          <Route path="notes" element={<StudentNotes />} />
          <Route path="presences" element={<StudentPresences />} />
          <Route path="planning" element={<StudentPlanning />} />
          <Route path="finances" element={<StudentFinances />} />
          <Route path="documents" element={<StudentDocuments />} />
          <Route path="messages" element={<StudentMessages />} />
          <Route path="videos" element={<StudentVideoLibrary />} />
          <Route path="labs" element={<StudentVirtualLabs />} />
          <Route path="library" element={<StudentLibrary />} />
          <Route path="elearning" element={<StudentELearning />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="ai-tutor" element={<StudentAITutor />} />
          <Route path="quiz/:quizId" element={<StudentQuizPage />} />
          <Route path="exams/:examId" element={<ExamPage />} />
        </Route>

        {/* Admin Dashboard Routes */}
        <Route path="/admin" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="students" element={<Students />} />
          <Route path="students/:studentId/dossier" element={<StudentDossierPage />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="staff" element={<Staff />} />
          <Route path="classes" element={<Classes />} />
          <Route path="courses" element={<Courses />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="finance" element={<Finance />} />
          <Route path="accounting" element={<Accounting />} />
          <Route path="elearning-classic" element={<Navigate to="/admin/elearning" replace />} />
          <Route path="documents" element={<Documents />} />
          <Route path="messages" element={<Messages />} />
          <Route path="ai-responses" element={<AIResponses />} />
          <Route path="settings" element={<ParametresHub />} />
          <Route path="settings/general" element={<Settings />} />
          <Route path="sites" element={<Sites />} />
          <Route path="user-roles" element={<UserRoles />} />
          <Route path="workspace" element={<WorkspaceStudio />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="grades" element={<Grades />} />
          <Route path="report-cards" element={<ReportCards />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="bank-accounts" element={<BankAccounts />} />
          <Route path="cash-register" element={<CashRegister />} />
          <Route path="fee-config" element={<FeeConfigurationPage />} />
          <Route path="reminder-settings" element={<ReminderSettings />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="notifications" element={<NotificationsAdmin />} />
        </Route>
      </Routes>
      </ConfirmDialogProvider>
      </NotificationsProvider>
      </NotificationProvider>
    </Router>
    </SiteProvider>
    </WorkspaceProvider>
  );
}

export default App;
