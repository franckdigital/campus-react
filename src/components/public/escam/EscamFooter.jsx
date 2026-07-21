import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function EscamFooter() {
  return (
    <footer className="text-white" style={{ background: '#0b1223' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <img src="/logo.png" alt="ESCAM" className="h-9 w-9 object-contain" />
              <span className="text-lg font-bold">ESCAM</span>
            </Link>
            <p className="text-gray-400 text-sm max-w-sm leading-relaxed">
              La plateforme complète du Groupe ESCAM pour former, diplômer et certifier vos compétences —
              du BTS au Doctorat, efficacement.
            </p>
          </div>

          {/* Filières */}
          <div>
            <h4 className="text-sm font-semibold mb-5 text-gray-200">Filières</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#bts-dut" className="text-gray-400 hover:text-white transition-colors">BTS &amp; DUT</a></li>
              <li><a href="#licences" className="text-gray-400 hover:text-white transition-colors">Licences Professionnelles</a></li>
              <li><a href="#masters" className="text-gray-400 hover:text-white transition-colors">Masters &amp; MBA</a></li>
              <li><a href="#autres" className="text-gray-400 hover:text-white transition-colors">Autres formations</a></li>
            </ul>
          </div>

          {/* Accès */}
          <div>
            <h4 className="text-sm font-semibold mb-5 text-gray-200">Accès</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/login" className="text-gray-400 hover:text-white transition-colors">Tableau de bord</Link></li>
              <li><a href="#admission" className="text-gray-400 hover:text-white transition-colors">Admission</a></li>
              <li><a href="#etudiant" className="text-gray-400 hover:text-white transition-colors">Espace étudiant</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-gray-500 text-xs">
              © 2026 Groupe ESCAM. Tous droits réservés.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: '#0ea5e9' }} />
              Plateforme sécurisée
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
