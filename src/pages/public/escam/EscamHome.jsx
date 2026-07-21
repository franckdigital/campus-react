import { Link } from 'react-router-dom';
import {
  GraduationCap, Award, ArrowRight, Star, CheckCircle, Sparkles,
  Briefcase, Landmark, Truck, Code2, Scale, Megaphone,
  BookOpen, Video, FileText, BarChart3, Brain, Shield, MessageSquare, Globe,
  UserCheck, Users, Building2, Handshake, ClipboardCheck,
  FileCheck, CalendarCheck, Wallet, Bell, Trophy,
} from 'lucide-react';

const SKY = '#0ea5e9';
const SKY_DARK = '#0369a1';

/* ── data ─────────────────────────────────────────────────────────────── */

const heroChecks = ['Formations diplômantes', 'Certifications reconnues', 'Encadrement personnalisé', 'Multi-sites en Côte d\'Ivoire'];

const heroStats = [
  { icon: BookOpen, value: '20+', label: 'Filières' },
  { icon: Users, value: '2 500+', label: 'Étudiants' },
  { icon: Trophy, value: '90%', label: 'Taux d\'insertion' },
  { icon: Building2, value: '6', label: 'Sites en Côte d\'Ivoire' },
];

const whyFeatures = [
  { icon: BookOpen, title: 'Catalogue de Filières', desc: 'BTS, Licences Pro, Masters et MBA structurés en modules et semestres.', color: 'sky' },
  { icon: Video, title: 'E-learning & Cours en ligne', desc: 'Accédez à vos cours, supports et devoirs depuis votre espace étudiant.', color: 'blue' },
  { icon: FileCheck, title: 'Certifications reconnues', desc: 'Diplômes et attestations vérifiables, reconnus par les entreprises partenaires.', color: 'indigo' },
  { icon: Handshake, title: 'Stages & Insertion', desc: 'Un accompagnement dédié vers le stage et l\'emploi tout au long du cursus.', color: 'violet' },
  { icon: BarChart3, title: 'Suivi de la progression', desc: 'Notes, absences et bulletins consultables en temps réel depuis le portail.', color: 'emerald' },
  { icon: Brain, title: 'Pédagogie active', desc: 'Cas pratiques, ateliers professionnels et intervenants du monde de l\'entreprise.', color: 'pink' },
  { icon: MessageSquare, title: 'Communauté & Vie associative', desc: 'Clubs, associations étudiantes et événements tout au long de l\'année.', color: 'teal' },
  { icon: Shield, title: 'Encadrement pédagogique', desc: 'Un corps enseignant qualifié et un suivi personnalisé de chaque étudiant.', color: 'orange' },
  { icon: Globe, title: 'Multi-sites', desc: 'Plusieurs campus en Côte d\'Ivoire pour être formé près de chez vous.', color: 'cyan' },
];

const featureColorMap = {
  sky: 'bg-sky-50 text-sky-600', blue: 'bg-blue-50 text-blue-600', indigo: 'bg-indigo-50 text-indigo-600',
  violet: 'bg-violet-50 text-violet-600', emerald: 'bg-emerald-50 text-emerald-600', pink: 'bg-pink-50 text-pink-600',
  teal: 'bg-teal-50 text-teal-600', orange: 'bg-orange-50 text-orange-600', cyan: 'bg-cyan-50 text-cyan-600',
};

const steps = [
  { icon: FileCheck, title: 'Candidatez en ligne', desc: 'Déposez votre dossier de candidature pour la filière de votre choix en quelques minutes.' },
  { icon: ClipboardCheck, title: 'Passez la sélection', desc: 'Entretien et/ou test d\'admission selon la filière visée, avec retour rapide.' },
  { icon: GraduationCap, title: 'Intégrez votre filière', desc: 'Inscription définitive, emploi du temps et accès à votre espace étudiant.' },
];

const profiles = [
  { icon: UserCheck, title: 'Étudiant', desc: 'Cours, notes, emploi du temps et paiements depuis un seul espace.', color: '#0ea5e9', bg: '#e0f2fe' },
  { icon: GraduationCap, title: 'Enseignant', desc: 'Gestion des cours, saisie des notes et suivi des classes.', color: '#7c3aed', bg: '#f5f3ff' },
  { icon: Users, title: 'Parent', desc: 'Suivi de la scolarité et des paiements de votre enfant en temps réel.', color: '#059669', bg: '#ecfdf5' },
  { icon: Briefcase, title: 'Administration', desc: 'Pilotage des inscriptions, finances et de la vie académique.', color: '#d97706', bg: '#fffbeb' },
  { icon: Handshake, title: 'Entreprise partenaire', desc: 'Offres de stage et d\'emploi auprès de nos étudiants et diplômés.', color: '#db2777', bg: '#fdf2f8' },
  { icon: Award, title: 'Alumni', desc: 'Restez connecté au réseau ESCAM après l\'obtention de votre diplôme.', color: '#0d9488', bg: '#f0fdfa' },
];

const studentSpaceFeatures = [
  { icon: BarChart3, title: 'Suivi de la scolarité', desc: 'Notes, absences et progression en temps réel' },
  { icon: CalendarCheck, title: 'Emploi du temps', desc: 'Cours et examens consultables à tout moment' },
  { icon: Wallet, title: 'Paiement Mobile Money', desc: 'Réglez vos frais directement depuis l\'application' },
  { icon: FileText, title: 'Documents & certificats', desc: 'Bulletins, attestations et diplômes en un clic' },
  { icon: Bell, title: 'Notifications', desc: 'Alertes cours, notes et paiements en temps réel' },
  { icon: MessageSquare, title: 'Messagerie', desc: 'Échangez avec vos enseignants et l\'administration' },
];

const domains = [
  { icon: Briefcase, title: 'Commerce & Management', count: '5+ filières' },
  { icon: Landmark, title: 'Gestion & Comptabilité', count: '4+ filières' },
  { icon: Megaphone, title: 'Marketing & Communication', count: '3+ filières' },
  { icon: Truck, title: 'Logistique, Transport & Douane', count: '3+ filières' },
  { icon: Code2, title: 'Informatique', count: '4+ filières' },
  { icon: Scale, title: 'RH & Droit des Affaires', count: '3+ filières' },
];

const btsDut = ['Gestion Commerciale (GESCOM)', 'Ressources Humaines et Communication (RHCOM)', 'Finance, Comptabilité et Gestion d\'Entreprise (FCGE)', 'Logistique', 'Informatique et Développeur d\'Applications (IDA)'];
const licencesPro = ['Transit – Douane', 'Audit et Contrôle de Gestion', 'Réseaux Télécom', 'Gestion en Immobilier', 'Informatique Appliquée', 'Qualité', 'Marketing Management', 'Marketing Communication'];
const masters = ['Gestion des Ressources Humaines', 'Management des Entreprises et Gestion des Produits', 'Marketing Opérationnel', 'Marketing Communication', 'Audit et Contrôle de Gestion', 'Transport et Logistique', 'Fiscalité et Droit des Affaires', 'Finances et Comptabilité', 'Informatique — Option Génie Logiciel', 'Informatique — Option Réseaux et Télécommunications'];
const autres = ['Auxiliaire en pharmacie', 'Préparation aux séries technologiques (BAC G1, G2, B)', 'Doctorat (spécialités professionnelles)'];

/* ── small components ────────────────────────────────────────────────── */

function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">
      {children}
    </span>
  );
}

function SectionHeading({ badge, title, subtitle }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-16">
      <Badge>{badge}</Badge>
      <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-4">{title}</h2>
      {subtitle && <p className="text-lg text-gray-500 mt-3">{subtitle}</p>}
    </div>
  );
}

function ProgramGroup({ id, title, items }) {
  return (
    <div id={id} className="scroll-mt-24">
      <h3 className="text-lg font-bold mb-4 text-gray-900">{title}</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2.5 bg-white rounded-xl p-4 border border-gray-100">
            <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: SKY }} />
            <span className="text-sm text-gray-700">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── page ─────────────────────────────────────────────────────────────── */

export default function EscamHome() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative pt-16 pb-28 lg:pt-24 lg:pb-40"
               style={{ background: `linear-gradient(160deg, #0b1223 0%, #0f2e64 45%, ${SKY_DARK} 100%)` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm mb-6">
                <Sparkles className="h-3.5 w-3.5" style={{ color: '#7dd3fc' }} />
                Groupe ESCAM — du BTS au Doctorat
              </span>

              <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Réussissez votre
                <span className="bg-gradient-to-r from-sky-300 to-cyan-200 bg-clip-text text-transparent"> parcours académique.</span>
              </h1>

              <p className="text-lg text-white/70 mb-8 max-w-lg">
                Le Groupe ESCAM forme aux métiers du commerce, de la gestion, du marketing, de la logistique,
                de l'informatique et du droit des affaires, avec un accompagnement personnalisé jusqu'à l'emploi.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-8 max-w-md">
                {heroChecks.map((c) => (
                  <div key={c} className="flex items-center gap-2 text-sm text-white/80">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#7dd3fc' }} />
                    {c}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4">
                <Link to="/login"
                  className="inline-flex items-center gap-2 px-8 py-4 text-white font-semibold rounded-xl hover:shadow-2xl transition-all"
                  style={{ background: `linear-gradient(135deg, ${SKY}, ${SKY_DARK})`, boxShadow: `0 8px 24px ${SKY}50` }}>
                  Tableau de bord
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a href="#filieres" className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-medium rounded-xl hover:bg-white/20 transition-all">
                  Découvrir nos filières
                </a>
              </div>
            </div>

            {/* Mockup card */}
            <div className="relative hidden lg:block">
              <div className="relative z-10 bg-white rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${SKY}, ${SKY_DARK})` }}>
                      <GraduationCap className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-bold text-gray-900">Portail ESCAM</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-sky-50 text-sky-600">2025-2026</span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[{ v: '20+', l: 'Filières' }, { v: '2 500', l: 'Étudiants' }, { v: '90%', l: 'Insertion' }].map((s) => (
                    <div key={s.l} className="rounded-xl p-3 text-center bg-gray-50">
                      <p className="text-lg font-extrabold text-gray-900">{s.v}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{s.l}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 mb-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Scolarité — Licence 3 FCGE</span>
                    <span className="font-bold text-gray-700">78%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: '78%', background: `linear-gradient(90deg, ${SKY}, ${SKY_DARK})` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Modules validés</span>
                    <span className="font-bold text-gray-700">12/16</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: '75%', background: '#a78bfa' }} />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-emerald-500 flex-shrink-0">
                    <Award className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-700">Diplôme obtenu !</p>
                    <p className="text-[11px] text-emerald-600">BTS Gestion Commerciale</p>
                  </div>
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl -z-0"
                   style={{ background: `${SKY}30` }} />
            </div>
          </div>
        </div>

        {/* Stats strip, overlapping the curved bottom */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative mt-16">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {heroStats.map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-5 text-center shadow-xl">
                <s.icon className="h-5 w-5 mx-auto mb-2" style={{ color: SKY }} />
                <p className="text-xl font-extrabold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why ESCAM — 3x3 features */}
      <section id="pourquoi" className="pt-24 pb-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading badge="Tout-en-un" title="Pourquoi choisir ESCAM ?"
            subtitle="Une école qui couvre l'intégralité de votre parcours, de la candidature à l'insertion professionnelle." />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyFeatures.map((f) => (
              <div key={f.title} className="group p-6 rounded-2xl border border-gray-100 bg-white hover:border-sky-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${featureColorMap[f.color]}`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Et bien plus encore */}
          <div className="mt-10 rounded-2xl p-8 grid md:grid-cols-2 gap-8 items-center" style={{ background: '#f0f9ff' }}>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Et bien plus encore…</h3>
              <p className="text-sm text-gray-600 mb-5">
                Une école complète qui accompagne chaque étape de la vie étudiante et professionnelle.
              </p>
              <a href="#admission" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
                 style={{ background: `linear-gradient(135deg, ${SKY}, ${SKY_DARK})` }}>
                Voir le parcours d'admission
              </a>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {['Suivi de la progression en temps réel', 'Gestion multi-sites et multi-filières', 'Certifications et diplômes vérifiables', 'Vie associative et communauté étudiante', 'Parcours personnalisés par filière', 'Accompagnement stage et insertion'].map((t) => (
                <div key={t} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: SKY }} />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3 steps — admission */}
      <section id="admission" className="py-24" style={{ background: '#f8fafc' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading badge="Simple et rapide" title="Intégrez ESCAM en 3 étapes"
            subtitle="Un processus d'admission clair, de la candidature à la rentrée." />

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-[16.66%] right-[16.66%] h-0.5 bg-sky-200" />
            {steps.map((s, idx) => (
              <div key={s.title} className="relative text-center">
                <div className="relative z-10 h-16 w-16 mx-auto rounded-2xl flex items-center justify-center mb-5 text-white font-bold"
                     style={{ background: `linear-gradient(135deg, ${SKY}, ${SKY_DARK})` }}>
                  <s.icon className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{idx + 1}. {s.title}</h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Profiles */}
      <section id="profils" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading badge="Pour tous les profils" title="Une plateforme pour chaque acteur d'ESCAM"
            subtitle="Chaque profil dispose d'un espace pensé pour ses besoins, du candidat à l'entreprise partenaire." />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((p) => (
              <div key={p.title} className="flex items-start gap-4 p-5 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: p.bg }}>
                  <p.icon className="h-5 w-5" style={{ color: p.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{p.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Student space showcase */}
      <section id="etudiant" className="py-24" style={{ background: '#f8fafc' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge>Espace Étudiant</Badge>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-4 mb-4">
                Votre scolarité, <span style={{ color: SKY_DARK }}>à portée de main</span>
              </h2>
              <p className="text-gray-600 mb-8">
                Notes, emploi du temps, paiements et documents : tout votre parcours ESCAM dans une seule application,
                accessible sur ordinateur comme sur mobile.
              </p>
              <div className="grid sm:grid-cols-2 gap-5">
                {studentSpaceFeatures.map((f) => (
                  <div key={f.title} className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-sky-50">
                      <f.icon className="h-4.5 w-4.5" style={{ color: SKY_DARK }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{f.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mockup */}
            <div className="relative">
              <div className="rounded-2xl p-6 shadow-2xl text-white" style={{ background: `linear-gradient(160deg, ${SKY_DARK}, #1e293b)` }}>
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Espace Étudiant</p>
                <p className="text-lg font-bold mb-5">Bonsoir, Aïcha K.</p>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[{ v: '3', l: 'En cours' }, { v: '2', l: 'Certificats' }, { v: '540', l: 'Points' }].map((s) => (
                    <div key={s.l} className="rounded-xl p-3 text-center bg-white/10">
                      <p className="text-lg font-extrabold">{s.v}</p>
                      <p className="text-[10px] text-white/60 mt-0.5">{s.l}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {[{ l: 'Scolarité réglée', v: 65 }, { l: 'Modules complétés', v: 82 }].map((b) => (
                    <div key={b.l}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-white/70">{b.l}</span>
                        <span className="font-bold">{b.v}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${b.v}%`, background: '#38bdf8' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-3 rounded-xl p-3 bg-white/10">
                  <Bell className="h-4 w-4 flex-shrink-0" style={{ color: '#7dd3fc' }} />
                  <p className="text-xs text-white/80">Nouvelle note disponible en Marketing Digital</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed filières listing */}
      <section id="filieres" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <SectionHeading badge="Nos formations" title="Toutes nos filières"
            subtitle="Du BTS au Master/MBA, choisissez le parcours qui vous correspond." />

          <ProgramGroup id="bts-dut" title="BTS & DUT" items={btsDut} />
          <ProgramGroup id="licences" title="Licences Professionnelles" items={licencesPro} />
          <ProgramGroup id="masters" title="Masters & MBA" items={masters} />
          <ProgramGroup id="autres" title="Autres formations" items={autres} />
        </div>
      </section>

      {/* Domains bar */}
      <section className="py-24" style={{ background: '#f8fafc' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Explorez nos domaines de formation</h2>
              <p className="text-gray-500">Des dizaines de filières réparties dans 6 grands domaines.</p>
            </div>
            <a href="#filieres" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex-shrink-0"
               style={{ background: `linear-gradient(135deg, ${SKY}, ${SKY_DARK})` }}>
              Accéder aux filières
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {domains.map((d) => (
              <div key={d.title} className="flex items-center gap-4 bg-white rounded-2xl p-5 border border-gray-100">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-sky-50">
                  <d.icon className="h-5 w-5" style={{ color: SKY_DARK }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{d.title}</p>
                  <p className="text-xs text-gray-500">{d.count}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" style={{ color: SKY }} /> Admission après étude du dossier</div>
            <div className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" style={{ color: SKY }} /> Paiement échelonné disponible</div>
            <div className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" style={{ color: SKY }} /> Accompagnement à l'insertion</div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex items-center justify-center gap-1 mb-6">
              {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />)}
            </div>
            <p className="text-xl font-medium text-gray-800 leading-relaxed mb-6">
              "ESCAM m'a donné une vraie formation professionnalisante, avec des enseignants disponibles et un
              accompagnement qui a fait toute la différence pour trouver mon premier emploi."
            </p>
            <div className="flex items-center justify-center gap-3">
              <img src="https://ui-avatars.com/api/?name=Fatou+Camara&background=0ea5e9&color=fff" alt="Fatou Camara" className="h-12 w-12 rounded-full" />
              <div className="text-left">
                <p className="font-semibold text-gray-900">Fatou Camara</p>
                <p className="text-sm text-gray-500">Diplômée Licence Pro Audit et Contrôle de Gestion</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20" style={{ background: `linear-gradient(135deg, ${SKY_DARK}, #0b1223)` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm mb-6">
              Prêt à démarrer ?
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Lancez votre parcours au Groupe ESCAM.
            </h2>
            <p className="text-lg text-white/70 mb-8">
              Rejoignez des milliers d'étudiants qui font confiance à ESCAM pour construire leur avenir professionnel.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Link to="/login"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white font-semibold rounded-xl hover:bg-gray-100 transition-colors"
                style={{ color: SKY_DARK }}>
                Tableau de bord
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a href="#admission" className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors">
                En savoir plus
              </a>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-white/50">
              <span>✓ Admission rapide</span>
              <span>✓ Sans engagement</span>
              <span>✓ Accompagnement inclus</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
