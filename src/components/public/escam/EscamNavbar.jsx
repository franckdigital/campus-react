import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, GraduationCap, ArrowLeftRight } from 'lucide-react';

const NAV_LINKS = [
  { href: '#filieres', label: 'Filières' },
  { href: '#admission', label: 'Admission' },
  { href: '#profils', label: 'Profils' },
  { href: '#etudiant', label: 'Espace Étudiant' },
];

export default function EscamNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-18 py-3 items-center justify-between">
          {/* Logo */}
          <Link to="/escam" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">ESCAM</span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden lg:flex lg:items-center lg:gap-8">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-gray-600 hover:text-sky-600 transition-colors">
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="hidden lg:flex lg:items-center lg:gap-4">
            <Link to="/" className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-sky-600 transition-colors">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Vitrine CampusLMS
            </Link>
            <Link
              to="/login"
              className="px-5 py-2.5 text-white text-sm font-semibold rounded-xl hover:shadow-lg transition-all"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}
            >
              Portail Étudiant
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-100">
            <div className="space-y-1">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                   className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg">
                  {link.label}
                </a>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <Link to="/" className="flex items-center justify-center gap-1.5 px-4 py-2 text-center text-gray-400 hover:bg-gray-50 rounded-lg text-sm">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Vitrine CampusLMS
              </Link>
              <Link to="/login" className="block px-4 py-2.5 text-white text-center rounded-xl font-semibold"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
                Portail Étudiant
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
