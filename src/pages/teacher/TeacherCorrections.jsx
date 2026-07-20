import CorrectionHub from '../admin/CorrectionHub';
import { WorkflowHelpButton } from '../../components/WorkflowHelpModal';
import { useNotifications } from '../../components/Notifications';

export default function TeacherCorrections() {
  const { notify } = useNotifications();
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black" style={{ color: '#1e293b' }}>Corrections eLearning</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            Notation par question — Quiz, Devoirs et Examens de vos classes
          </p>
        </div>
        <WorkflowHelpButton defaultTab="admin" />
      </div>
      <CorrectionHub notify={notify} />
    </div>
  );
}
