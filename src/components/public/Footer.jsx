import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-3 mb-6">
              <img src="/logo.png" alt="ESCAM" className="h-10 w-10 object-contain" />
              <span className="text-xl font-bold">ESCAM</span>
            </Link>
            <p className="text-gray-400 mb-6">
              Plateforme de gestion universitaire moderne.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Liens rapides</h4>
            <ul className="space-y-3">
              <li><Link to="#" className="text-gray-400 hover:text-white transition-colors">À propos</Link></li>
              <li><Link to="#" className="text-gray-400 hover:text-white transition-colors">Formations</Link></li>
              <li><Link to="#" className="text-gray-400 hover:text-white transition-colors">Enseignants</Link></li>
              <li><Link to="#" className="text-gray-400 hover:text-white transition-colors">Événements</Link></li>
              <li><Link to="#" className="text-gray-400 hover:text-white transition-colors">Blog</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Support</h4>
            <ul className="space-y-3">
              <li><Link to="#" className="text-gray-400 hover:text-white transition-colors">FAQ</Link></li>
              <li><Link to="#" className="text-gray-400 hover:text-white transition-colors">Centre d'aide</Link></li>
              <li><Link to="#" className="text-gray-400 hover:text-white transition-colors">Conditions d'utilisation</Link></li>
              <li><Link to="#" className="text-gray-400 hover:text-white transition-colors">Politique de confidentialité</Link></li>
              <li><Link to="#" className="text-gray-400 hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Contact</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400">Cité des Arts, Cocody<br />Boulevard André Latrille<br />Abidjan – Côte d'Ivoire</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400">
                  +225 07 58 97 27 40<br />
                  +225 07 07 33 60 50<br />
                  +225 07 08 39 91 31
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <span className="text-gray-400">info@escam.net</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">
              © 2025 ESCAM. Tous droits réservés.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <Link to="#" className="text-gray-400 hover:text-white transition-colors">Conditions</Link>
              <Link to="#" className="text-gray-400 hover:text-white transition-colors">Confidentialité</Link>
              <Link to="#" className="text-gray-400 hover:text-white transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
