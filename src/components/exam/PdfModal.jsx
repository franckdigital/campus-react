import { FileText, XCircle } from 'lucide-react';

// Full-page in-app PDF viewer — deliberately never opens a new tab/window
// (no target="_blank" link anywhere here) so viewing the exam subject never
// triggers the anti-cheat tab-switch/blur detection during a live exam.
export default function PdfModal({ url, onClose }) {
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(15,23,42,0.97)' }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: '#1e293b' }}>
        <p className="text-sm font-black text-white flex items-center gap-2">
          <FileText className="h-4 w-4" /> Sujet de l'examen
        </p>
        <button onClick={onClose} className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
          <XCircle className="h-5 w-5" />
        </button>
      </div>
      <iframe src={url} title="Sujet PDF" className="flex-1 w-full" style={{ border: 'none', background: 'white' }} />
    </div>
  );
}
