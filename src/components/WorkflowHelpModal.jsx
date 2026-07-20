import { useState } from 'react';
import {
  X, ClipboardCheck, ClipboardList, Shield, Trophy,
  Star, CheckCircle, ChevronRight, Info, HelpCircle,
  FileText, Upload, Eye, BarChart2, User, Users,
} from 'lucide-react';

const P = '#7c3aed';

function Step({ n, text, sub }) {
  return (
    <div className="flex gap-3">
      <span className="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-extrabold flex-shrink-0 mt-0.5"
            style={{ background: P, color: 'white' }}>{n}</span>
      <div>
        <p className="text-sm font-semibold leading-snug" style={{ color: '#1e293b' }}>{text}</p>
        {sub && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#64748b' }}>{sub}</p>}
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, color, bg, steps }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${color}20` }}>
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: bg }}>
        <Icon className="h-4 w-4" style={{ color }} />
        <p className="text-sm font-black" style={{ color }}>{title}</p>
      </div>
      <div className="px-4 py-3 space-y-3 bg-white">
        {steps.map((s, i) => <Step key={i} n={i + 1} text={s.text} sub={s.sub} />)}
      </div>
    </div>
  );
}

const ADMIN_CONTENT = [
  {
    icon: ClipboardCheck, title: 'Quiz & Évaluations', color: P, bg: '#f5f3ff',
    steps: [
      { text: 'Créer un quiz', sub: 'Onglet "Quiz & Évaluations" → Nouveau quiz → Remplir titre, classe, matière, durée, seuil de réussite' },
      { text: 'Ajouter les questions', sub: 'Cliquer "+ Question" → choisir le type (QCU, QCM, Vrai/Faux, Texte libre, Calcul) → définir les points par question' },
      { text: 'Uploader le sujet PDF (optionnel)', sub: 'Joindre un fichier sujet pour que les étudiants le téléchargent avant de répondre' },
      { text: 'Publier', sub: 'Activer le bouton "Publier" → le quiz devient visible pour les étudiants de la classe' },
      { text: 'Corriger dans "Corrections" → onglet "Quiz"', sub: 'Cliquer sur le quiz → voir les tentatives → "Voir / Noter" sur un étudiant → panneau par question s\'ouvre. QCU/QCM notés automatiquement. Les questions Texte libre : entrer la note à la main → "Valider les notes texte"' },
    ],
  },
  {
    icon: ClipboardList, title: 'Devoirs & Exercices', color: '#db2777', bg: '#fdf2f8',
    steps: [
      { text: 'Créer le devoir', sub: 'Onglet "Devoirs & Exercices" → Nouveau devoir → Titre, classe, date limite, note sur /X' },
      { text: 'Uploader le sujet PDF', sub: 'Joindre le fichier sujet que les étudiants devront télécharger et traiter' },
      { text: 'Ajouter des questions en ligne (optionnel)', sub: 'Si le devoir a des questions QCU/QCM/Texte en plus du sujet PDF, créer un quiz lié' },
      { text: 'Les étudiants soumettent', sub: 'Ils téléchargent le sujet, rédigent leurs réponses et uploadent un fichier ou répondent en ligne' },
      { text: 'Corriger dans "Corrections" → onglet "Devoirs"', sub: 'Cliquer sur le devoir → "Corriger" sur un étudiant → mode "Note globale" : entrer note + appréciation + fichier corrigé → ou mode "Par question" : noter chaque question, le total se calcule automatiquement → "Utiliser ce total"' },
    ],
  },
  {
    icon: Shield, title: 'Examens sécurisés', color: '#d97706', bg: '#fffbeb',
    steps: [
      { text: 'Créer l\'examen', sub: 'Onglet "Examens sécurisés" → Nouvel examen → Titre, durée, webcam, mode plein écran, questions' },
      { text: 'Configurer l\'anti-triche', sub: 'Activer la surveillance webcam, bloquer copier/coller, enregistrer les changements d\'onglets. "Max changements d\'onglet" définit le seuil avant fermeture automatique de la session' },
      { text: 'Publier', sub: 'Les étudiants voient l\'examen dans leur espace. Ils doivent passer en mode sécurisé' },
      { text: 'Vérification webcam avant le départ', sub: 'Si la webcam est requise, l\'étudiant ne peut pas cliquer "Commencer" tant qu\'une caméra fonctionnelle n\'est pas détectée — évite qu\'un examen entier se déroule sans surveillance à cause d\'un problème matériel' },
      { text: 'Surveillance webcam & IA', sub: 'Une fois l\'examen démarré, une photo est prise toutes les 30 secondes et analysée par IA (visage absent, téléphone visible, plusieurs visages...). Si la caméra est débranchée/désactivée en cours de route, c\'est aussi signalé. Une anomalie ne coupe pas l\'examen — elle marque la session "⚠ Signalé" pour que vous la vérifiiez vous-même' },
      { text: 'Corriger dans "Corrections" → onglet "Examens"', sub: 'Cliquer sur l\'examen → voir les sessions → une session signalée affiche le motif en rouge. Cliquer "Captures" pour ouvrir la galerie des photos (encadrées en rouge si anomalie) avant de décider si c\'est une vraie fraude ou un faux positif. Puis "Corriger" → entrer la note globale + appréciation + fichier corrigé' },
    ],
  },
  {
    icon: Star, title: 'Corrections — Vue détaillée', color: '#059669', bg: '#f0fdf4',
    steps: [
      { text: 'Accéder à "Corrections"', sub: 'Onglet "Corrections" dans le hub eLearning ou menu "Corrections eLearning" du portail Enseignant' },
      { text: 'Sélectionner le type', sub: 'Trois onglets : Devoirs & Exercices / Quiz & Évaluations / Examens sécurisés' },
      { text: 'Cliquer sur un quiz/devoir/examen', sub: 'La liste des étudiants qui ont soumis s\'affiche en dessous' },
      { text: 'Notation par question', sub: 'Cliquer "Voir / Noter" ou "Corriger" → un panneau s\'ouvre avec chaque question, la réponse de l\'étudiant, le statut (✓/✗) et les points. Pour les questions Texte libre : saisir la note manuellement' },
      { text: 'Total automatique', sub: 'La somme des points par question est calculée en temps réel. Cliquer "Utiliser ce total" pour reporter automatiquement dans la note finale' },
    ],
  },
];

const STUDENT_CONTENT = [
  {
    icon: ClipboardCheck, title: 'Quiz & Évaluations', color: P, bg: '#f5f3ff',
    steps: [
      { text: 'Accéder à "Évaluations"', sub: 'Section "ÉVALUATION" → "Évaluations" dans la sidebar' },
      { text: 'Télécharger le sujet (si disponible)', sub: 'Un fichier PDF peut être joint. Le télécharger et le traiter avant de répondre aux questions' },
      { text: 'Cliquer "Commencer" puis répondre', sub: 'Répondre à chaque question dans le temps imparti. Les questions QCU/QCM sont notées automatiquement à la soumission' },
      { text: 'Voir vos résultats dans "Mes Résultats"', sub: 'Onglet "Mes Résultats" → carte Quiz → "Voir le détail des questions" → affiche chaque question avec votre réponse, le statut ✓/✗ et les points obtenus' },
    ],
  },
  {
    icon: ClipboardList, title: 'Devoirs & Exercices', color: '#db2777', bg: '#fdf2f8',
    steps: [
      { text: 'Accéder à "Devoirs & Exercices"', sub: 'Section "ÉVALUATION" dans la sidebar → "Devoirs & Exercices"' },
      { text: 'Télécharger le sujet PDF', sub: 'Cliquer sur le devoir → bouton "Sujet" pour télécharger le fichier PDF à traiter' },
      { text: 'Soumettre votre travail', sub: 'Rédiger votre réponse dans la zone texte et/ou uploader votre fichier (PDF, Word, image) avant la date limite' },
      { text: 'Consulter la correction', sub: '"Mes Résultats" → carte Devoir → voir la note, l\'appréciation du prof et le fichier corrigé (si disponible)' },
    ],
  },
  {
    icon: Shield, title: 'Examens sécurisés', color: '#d97706', bg: '#fffbeb',
    steps: [
      { text: 'Accéder à "Examens"', sub: 'Section "ÉVALUATION" → "Examens"' },
      { text: 'Lancer l\'examen en mode sécurisé', sub: 'Cliquer "Passer l\'examen" → plein écran obligatoire. Les changements d\'onglet, copier/coller et clics droits sont enregistrés' },
      { text: 'Vérification de la webcam avant de démarrer', sub: 'Si l\'examen exige une webcam, le bouton "Commencer" reste désactivé tant qu\'une caméra fonctionnelle n\'est pas détectée. Pas de webcam ou périphérique défaillant → message d\'erreur explicite et bouton "Réessayer" (vérifiez les autorisations de votre navigateur)' },
      { text: 'Webcam active pendant l\'examen', sub: 'Une petite vignette caméra apparaît en haut de l\'écran avec un point : vert = tout va bien, rouge clignotant = visage non détecté à l\'instant. Une photo est envoyée automatiquement toutes les 30 secondes, sans action de votre part. Si la caméra se déconnecte en cours d\'examen, c\'est signalé au professeur — mais l\'examen continue normalement' },
      { text: 'Changement d\'onglet = risque de fermeture', sub: 'Si vous quittez l\'onglet/la fenêtre plus de fois que la limite autorisée pour cet examen, la session se ferme automatiquement et est transmise telle quelle pour correction' },
      { text: 'Répondre et soumettre', sub: 'Répondre aux questions dans le temps imparti. Soumettre avant la fin du temps, sinon l\'examen est soumis automatiquement' },
      { text: 'Attendre la correction', sub: 'Dans "Mes Résultats" → carte Examen → voir la note et le retour du professeur une fois corrigé. Une anomalie webcam signalée est toujours vérifiée par le professeur avant notation, ce n\'est jamais automatique' },
    ],
  },
  {
    icon: Trophy, title: 'Mes Résultats', color: '#059669', bg: '#f0fdf4',
    steps: [
      { text: 'Vue d\'ensemble', sub: 'Moyenne générale, devoirs rendus, quiz complétés et travaux corrigés affichés en haut de page' },
      { text: 'Filtrer par type', sub: 'Onglets "Tout / Quiz / Devoirs / Examens" pour filtrer vos résultats' },
      { text: 'Détail par question sur les quiz', sub: 'Cliquer "Voir le détail des questions" sur une carte Quiz pour voir chaque question, votre réponse et les points obtenus/perdus' },
      { text: 'Section "À faire"', sub: 'En bas de page : liste des devoirs à rendre et quiz non encore tentés' },
    ],
  },
];

const TABS = [
  { id: 'admin', label: 'Admin / Prof', icon: Users, content: ADMIN_CONTENT },
  { id: 'student', label: 'Étudiant', icon: User, content: STUDENT_CONTENT },
];

export default function WorkflowHelpModal({ open, onClose, defaultTab = 'admin' }) {
  const [tab, setTab] = useState(defaultTab);
  if (!open) return null;

  const current = TABS.find(t => t.id === tab);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
         style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
           style={{ background: 'white', maxHeight: '88vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
             style={{ background: `linear-gradient(135deg, ${P}, #6366f1)` }}>
          <div className="flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-white opacity-80" />
            <div>
              <p className="text-base font-black text-white">Guide — Comment ça marche ?</p>
              <p className="text-xs text-white opacity-70">
                Évaluations, devoirs et examens — workflow complet
              </p>
            </div>
          </div>
          <button onClick={onClose}
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 flex-shrink-0" style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all flex-1 justify-center"
                    style={{ background: tab === t.id ? 'white' : 'transparent', color: tab === t.id ? P : '#64748b', boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}>
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-xl text-xs leading-relaxed"
               style={{ background: '#f5f3ff', color: '#5b21b6' }}>
            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            {tab === 'admin'
              ? 'En tant qu\'admin ou professeur, vous créez les évaluations et corrigez les copies dans le hub eLearning (menu principal) ou le portail Enseignant.'
              : 'En tant qu\'étudiant, accédez à toutes vos évaluations, soumettez vos travaux et consultez vos notes dans votre espace eLearning.'}
          </div>
          {current?.content.map((s, i) => (
            <Section key={i} {...s} />
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex-shrink-0 text-center" style={{ borderTop: '1px solid #f1f5f9' }}>
          <button onClick={onClose}
                  className="px-8 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${P}, #6366f1)` }}>
            Compris, merci !
          </button>
        </div>
      </div>
    </div>
  );
}

export function WorkflowHelpButton({ defaultTab = 'admin', className = '' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${className}`}
        style={{ background: '#f5f3ff', color: P, border: `1.5px solid ${P}20` }}
        title="Comment ça marche ?">
        <HelpCircle className="h-3.5 w-3.5" />
        Guide
      </button>
      <WorkflowHelpModal open={open} onClose={() => setOpen(false)} defaultTab={defaultTab} />
    </>
  );
}
