import common from "./shared/common.json";
import navigation from "./shared/navigation.json";
import notifications from "./shared/notifications.json";
import home from "./public/home.json";
import auth from "./public/auth.json";
import adminLayout from "./admin/layout.json";
import adminDashboard from "./admin/dashboard.json";
import adminUsers from "./admin/users.json";
import adminQuestions from "./admin/questions.json";
import adminExams from "./admin/exams.json";
import adminExamReport from "./admin/examReport.json";
import adminSubmissionReport from "./admin/submissionReport.json";
import studentHome from "./student/home.json";
import studentExam from "./student/exam.json";
import studentResults from "./student/results.json";
import studentResultDetail from "./student/resultDetail.json";
import studentProfile from "./student/profile.json";
import lecturerDashboard from "./lecturer/dashboard.json";
import lecturerQuestions from "./lecturer/questions.json";
import lecturerExams from "./lecturer/exams.json";
import lecturerCreateExam from "./lecturer/createExam.json";
import lecturerEditExam from "./lecturer/editExam.json";
import lecturerMonitor from "./lecturer/monitor.json";
import lecturerExamReport from "./lecturer/examReport.json";
import lecturerProfile from "./lecturer/profile.json";
import questionImport from "./shared/questionImport.json";
import examPrint from "./shared/examPrint.json";
import mathInput from "./shared/mathInput.json";
import fileUpload from "./shared/fileUpload.json";
import ui from "./shared/ui.json";

const messages = {
  ...common,
  ...navigation,
  ...notifications,
  ...home,
  ...auth,
  ...adminLayout,
  admin: { dashboard: adminDashboard, users: adminUsers, questions: adminQuestions, exams: adminExams, examReport: adminExamReport, submissionReport: adminSubmissionReport },
  student: { home: studentHome, exam: studentExam, results: studentResults, resultDetail: studentResultDetail, profile: studentProfile },
  lecturer: { dashboard: lecturerDashboard, questions: lecturerQuestions, exams: lecturerExams, createExam: lecturerCreateExam, editExam: lecturerEditExam, monitor: lecturerMonitor, examReport: lecturerExamReport, profile: lecturerProfile },
  shared: { questionImport, examPrint, mathInput, fileUpload, ui },
};

export default messages;
