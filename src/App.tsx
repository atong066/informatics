import { BrowserRouter, Route, Routes } from 'react-router-dom';
import {
  GuestOnlyRoute,
  RoleProtectedRoute,
  SessionHomeRedirect,
} from './components/RouteGuards';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/student/Dashboard';
import Profile from './pages/student/Profile';
import Settings from './pages/student/Settings';
import StudentAssessmentAttempt from './pages/student/AssessmentAttempt';
import StudentMeetingDetails from './pages/student/MeetingDetails';
import SubjectDetails from './pages/student/SubjectDetails';
import FacultyClassroom from './pages/faculty/Classroom';
import FacultyMeetingClassroom from './pages/faculty/MeetingClassroom';
import FacultyDashboard from './pages/faculty/Dashboard';
import FacultyMeetingDetails from './pages/faculty/MeetingDetails';
import FacultyStudentList from './pages/faculty/StudentList';
import FacultyActivitySubmissions from './pages/faculty/ActivitySubmissions';
import FacultyAssessmentBuilder from './pages/faculty/AssessmentBuilder';
import FacultyAssessmentTakers from './pages/faculty/AssessmentTakers';
import FacultySubjectDetails from './pages/faculty/SubjectDetails';
import AdminDashboard from './pages/admin/Dashboard';
import AdminSubjects from './pages/admin/Subjects';
import AdminCurriculums from './pages/admin/Curriculums';
import AdminSections from './pages/admin/Sections';
import AdminFaculty from './pages/admin/Faculty';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SessionHomeRedirect />} />
        <Route path="/dashboard" element={<SessionHomeRedirect />} />
        <Route
          path="/student/dashboard"
          element={(
            <RoleProtectedRoute role="student">
              <Dashboard />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/student/profile"
          element={(
            <RoleProtectedRoute role="student">
              <Profile />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/student/settings"
          element={(
            <RoleProtectedRoute role="student">
              <Settings />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/student/subjects/:subjectId"
          element={(
            <RoleProtectedRoute role="student">
              <SubjectDetails />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/student/subjects/:subjectId/assessments/:assessmentId"
          element={(
            <RoleProtectedRoute role="student">
              <StudentAssessmentAttempt />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/student/subjects/:subjectId/meetings/:meetingId"
          element={(
            <RoleProtectedRoute role="student">
              <StudentMeetingDetails />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/admin/dashboard"
          element={(
            <RoleProtectedRoute role="admin">
              <AdminDashboard />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/admin/subjects"
          element={(
            <RoleProtectedRoute role="admin">
              <AdminSubjects />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/admin/curriculums"
          element={(
            <RoleProtectedRoute role="admin">
              <AdminCurriculums />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/admin/sections"
          element={(
            <RoleProtectedRoute role="admin">
              <AdminSections />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/admin/faculty"
          element={(
            <RoleProtectedRoute role="admin">
              <AdminFaculty />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/faculty/dashboard"
          element={(
            <RoleProtectedRoute role="faculty">
              <FacultyDashboard />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/faculty/classroom"
          element={(
            <RoleProtectedRoute role="faculty">
              <FacultyClassroom />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/faculty/student-list"
          element={(
            <RoleProtectedRoute role="faculty">
              <FacultyStudentList />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/faculty/subjects/:subjectId"
          element={(
            <RoleProtectedRoute role="faculty">
              <FacultySubjectDetails />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/faculty/subjects/:subjectId/meetings/:meetingId"
          element={(
            <RoleProtectedRoute role="faculty">
              <FacultyMeetingDetails />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/faculty/subjects/:subjectId/meetings/:meetingId/classroom"
          element={(
            <RoleProtectedRoute role="faculty">
              <FacultyMeetingClassroom />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/faculty/subjects/:subjectId/activities/:activityId/submissions"
          element={(
            <RoleProtectedRoute role="faculty">
              <FacultyActivitySubmissions />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/faculty/subjects/:subjectId/assignments/:assignmentId/submissions"
          element={(
            <RoleProtectedRoute role="faculty">
              <FacultyActivitySubmissions />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/faculty/subjects/:subjectId/assessments/:assessmentId/takers"
          element={(
            <RoleProtectedRoute role="faculty">
              <FacultyAssessmentTakers />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/faculty/subjects/:subjectId/assessments/:assessmentId"
          element={(
            <RoleProtectedRoute role="faculty">
              <FacultyAssessmentBuilder />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/login"
          element={(
            <GuestOnlyRoute>
              <Login />
            </GuestOnlyRoute>
          )}
        />
        <Route
          path="/register"
          element={(
            <GuestOnlyRoute>
              <Register />
            </GuestOnlyRoute>
          )}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App
