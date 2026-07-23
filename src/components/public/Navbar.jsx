import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronDown, ArrowLeftRight } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="ESCAM" className="h-10 w-10 object-contain" />
            <span className="text-xl font-bold text-gray-900">ESCAM</span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden lg:flex lg:items-center lg:gap-8">
            <Link to="/" className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
              Accueil
            </Link>
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                Formations
                <ChevronDown className="h-4 w-4" />
              </button>
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="p-2">
                  <Link to="#" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Informatique</Link>
                  <Link to="#" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Gestion</Link>
                  <Link to="#" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Droit</Link>
                  <Link to="#" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Médecine</Link>
                </div>
              </div>
            </div>
            <Link to="#" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              À propos
            </Link>
            <Link to="#" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              Contact
            </Link>
          </div>

          {/* CTA buttons */}
          <div className="hidden lg:flex lg:items-center lg:gap-4">
            <Link to="/" className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Vitrine ESCAM
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              Connexion
            </Link>
            <Link 
              to="/login" 
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all"
            >
              S'inscrire
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
              <Link to="/" className="block px-4 py-2 text-gray-900 hover:bg-gray-50 rounded-lg">Accueil</Link>
              <Link to="#" className="block px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">Formations</Link>
              <Link to="#" className="block px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">À propos</Link>
              <Link to="#" className="block px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">Contact</Link>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <Link to="/" className="flex items-center justify-center gap-1.5 px-4 py-2 text-center text-gray-500 hover:bg-gray-50 rounded-lg text-sm">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Vitrine ESCAM
              </Link>
              <Link to="/login" className="block px-4 py-2 text-center text-gray-700 hover:bg-gray-50 rounded-lg">
                Connexion
              </Link>
              <Link to="/login" className="block px-4 py-2.5 bg-blue-600 text-white text-center rounded-xl">
                S'inscrire
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
