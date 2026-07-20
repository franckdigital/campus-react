# 🚀 Guide du Workflow - CampusLMS

## 📋 Table des Matières
1. [Vue d'ensemble du système](#vue-densemble-du-système)
2. [Workflow de développement](#workflow-de-développement)
3. [Workflow utilisateur](#workflow-utilisateur)
4. [Architecture du projet](#architecture-du-projet)
5. [Par où commencer](#par-où-commencer)
6. [Ordre de travail recommandé](#ordre-de-travail-recommandé)

---

## 🎯 Vue d'ensemble du système

CampusLMS est une plateforme complète de gestion d'établissement scolaire avec :
- **Frontend** : React + Vite + TailwindCSS v4
- **Backend** : Django REST Framework
- **Base de données** : SQLite (dev) / PostgreSQL (prod)
- **Authentification** : JWT tokens

---

## 🔄 Workflow de Développement

### Phase 1 : Configuration Initiale ✅
```
1. Installation des dépendances
   ├── npm install (frontend)
   └── pip install -r requirements.txt (backend)

2. Configuration de l'environnement
   ├── .env (frontend) → API_BASE_URL
   └── settings.py (backend) → CORS, JWT

3. Démarrage des serveurs
   ├── npm run dev (port 5174)
   └── python manage.py runserver 8002
```

### Phase 2 : Backend (Django) 🔧
```
1. Modèles (models.py)
   ├── Définir les champs
   ├── Relations (ForeignKey, ManyToMany)
   └── Méthodes personnalisées

2. Sérializers (serializers.py)
   ├── Convertir modèles → JSON
   ├── Validation des données
   └── Champs calculés

3. Vues (views.py)
   ├── ViewSets pour CRUD
   ├── Actions personnalisées
   └── Permissions

4. URLs (urls.py)
   ├── Router pour ViewSets
   └── Endpoints personnalisés

5. Migrations
   ├── python manage.py makemigrations
   └── python manage.py migrate
```

### Phase 3 : Frontend (React) 🎨
```
1. Services API (src/services/)
   ├── Créer service pour chaque module
   ├── Méthodes CRUD
   └── Nettoyage des paramètres

2. Hooks personnalisés (src/hooks/)
   ├── useApi pour appels API
   └── Gestion loading/error

3. Pages (src/pages/admin/)
   ├── Composants de liste
   ├── Formulaires (modal)
   ├── Actions CRUD
   └── Filtres et recherche

4. Composants réutilisables (src/components/)
   ├── SelectWithCreate
   ├── Modals
   └── Cards

5. Routing (src/App.jsx)
   ├── Routes publiques
   └── Routes protégées
```

---

## 👤 Workflow Utilisateur

### 1. Connexion et Authentification 🔐
```
Étape 1: Login
├── Utilisateur entre email/password
├── Frontend → POST /api/v1/auth/login/
├── Backend valide et retourne JWT tokens
├── Frontend stocke tokens dans localStorage
└── Redirection vers /admin/dashboard

Étape 2: Navigation
├── AuthContext vérifie le token
├── Routes protégées par AuthGuard
└── Header affiche infos utilisateur
```

### 2. Gestion des Étudiants 👨‍🎓
```
Workflow complet:

1. Voir la liste
   └── GET /api/v1/students/

2. Créer un étudiant
   ├── Clic "Nouvel Étudiant"
   ├── Matricule auto-généré (ETU-2026-0001)
   ├── Remplir formulaire complet
   ├── Créer programme/niveau/classe si nécessaire
   └── POST /api/v1/students/

3. Modifier un étudiant
   ├── Clic "Modifier"
   ├── Formulaire pré-rempli
   └── PATCH /api/v1/students/{id}/

4. Supprimer
   ├── Confirmation
   └── DELETE /api/v1/students/{id}/

5. Filtrer/Rechercher
   ├── Par statut, programme
   └── GET /api/v1/students/?search=...&status=...
```

### 3. Gestion des Présences 📊
```
Workflow quotidien:

1. Créer une session
   ├── Sélectionner classe et cours
   ├── Définir date/heure
   └── POST /api/v1/attendance-sessions/

2. Marquer les présences
   ├── Vue liste des étudiants
   ├── Clic sur statut (Présent/Absent/Retard/Excusé)
   └── POST /api/v1/attendance-records/

3. Marquage en masse
   ├── "Tous présents" ou "Tous absents"
   └── POST /api/v1/attendance-records/bulk/

4. Consulter statistiques
   └── GET /api/v1/reports/attendance/
```

### 4. Gestion des Documents 📄
```
Workflow de partage:

1. Upload
   ├── Sélectionner fichier
   ├── Remplir métadonnées (titre, catégorie, visibilité)
   └── POST /api/v1/documents/ (FormData)

2. Télécharger
   ├── Clic "Télécharger"
   └── GET /api/v1/documents/{id}/download/

3. Organiser
   ├── Filtrer par type/catégorie
   └── Rechercher par nom

4. Supprimer
   └── DELETE /api/v1/documents/{id}/
```

### 5. Messagerie 💬
```
Workflow de communication:

1. Créer conversation
   ├── Sélectionner destinataire
   ├── Sujet et message
   └── POST /api/v1/conversations/

2. Envoyer message
   ├── Écrire dans zone de texte
   └── POST /api/v1/messages/

3. Consulter conversations
   ├── Liste avec badge non lus
   └── GET /api/v1/conversations/

4. Actions
   ├── Favoris, Archiver
   └── Supprimer conversation
```

---

## 🏗️ Architecture du Projet

### Structure Frontend
```
src/
├── components/          # Composants réutilisables
│   ├── dashboard/      # Sidebar, Header
│   └── forms/          # SelectWithCreate
├── context/            # React Context (Auth)
├── hooks/              # Hooks personnalisés (useApi)
├── pages/              # Pages principales
│   ├── public/         # Login
│   └── admin/          # Dashboard, Students, Teachers, etc.
├── services/           # Services API
│   ├── api.js          # Service de base
│   ├── students.js
│   ├── teachers.js
│   └── ...
├── utils/              # Utilitaires
│   └── matriculeGenerator.js
├── config/             # Configuration
│   └── api.js
└── App.jsx             # Routing principal
```

### Structure Backend
```
prepaconcours/
├── models.py           # Modèles de données
├── serializers.py      # Sérializers DRF
├── views.py            # ViewSets et vues
├── urls.py             # Configuration URLs
├── admin.py            # Admin Django
└── migrations/         # Migrations DB

core/
├── settings.py         # Configuration Django
├── urls.py             # URLs principales
└── cors.py             # Middleware CORS
```

---

## 🎬 Par où commencer ?

### Pour un nouveau module (ex: Bibliothèque)

#### 1️⃣ Backend d'abord
```bash
# 1. Créer le modèle
# prepaconcours/models.py
class Book(models.Model):
    title = models.CharField(max_length=200)
    isbn = models.CharField(max_length=13, unique=True)
    author = models.CharField(max_length=100)
    available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

# 2. Créer le serializer
# prepaconcours/serializers.py
class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = '__all__'

# 3. Créer le ViewSet
# prepaconcours/views.py
class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    permission_classes = [IsAuthenticated]

# 4. Enregistrer l'URL
# prepaconcours/urls.py
router.register(r'books', BookViewSet)

# 5. Migrer
python manage.py makemigrations
python manage.py migrate
```

#### 2️⃣ Frontend ensuite
```javascript
// 1. Créer le service API
// src/services/library.js
export const libraryService = {
  getAll: (params = {}) => {
    const cleanParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    const query = new URLSearchParams(cleanParams).toString();
    return api.get(`/books/${query ? `?${query}` : ''}`);
  },
  create: (data) => api.post('/books/', data),
  update: (id, data) => api.patch(`/books/${id}/`, data),
  delete: (id) => api.delete(`/books/${id}/`),
};

// 2. Créer la page
// src/pages/admin/Library.jsx
export default function Library() {
  const [showModal, setShowModal] = useState(false);
  const { data: books, loading, execute: fetchBooks } = useApi(
    () => libraryService.getAll(),
    [],
    true
  );
  
  // Formulaire, liste, actions CRUD...
}

// 3. Ajouter la route
// src/App.jsx
<Route path="/admin/library" element={<Library />} />

// 4. Ajouter au menu
// src/components/dashboard/Sidebar.jsx
{ path: '/admin/library', name: 'Bibliothèque', icon: BookOpen }
```

---

## 📝 Ordre de Travail Recommandé

### Pour démarrer le projet de zéro :

#### Semaine 1 : Configuration et Base
```
Jour 1-2: Configuration
├── Installation dépendances
├── Configuration .env
├── CORS et JWT backend
└── Test connexion frontend-backend

Jour 3-4: Authentification
├── Modèle User (si custom)
├── Endpoints login/logout
├── AuthContext frontend
└── Routes protégées

Jour 5: Dashboard
├── Layout (Sidebar + Header)
├── Page Dashboard de base
└── Navigation
```

#### Semaine 2-3 : Modules Principaux
```
Ordre recommandé:

1. Students (Étudiants) ⭐ PRIORITÉ
   ├── Base de tout le système
   ├── Matricules auto
   └── Relations avec autres modules

2. Teachers (Enseignants)
   ├── Matricules auto
   └── Départements

3. Programs, Levels, Classes
   ├── Données de référence
   └── Boutons création rapide

4. Courses (Cours)
   ├── Lié aux programmes
   └── Assignation enseignants

5. Attendance (Présences)
   ├── Sessions quotidiennes
   └── Statistiques

6. Finance
   ├── Factures et paiements
   └── Rapports financiers

7. Documents
   ├── Upload/Download
   └── Catégorisation

8. Messages
   ├── Communication interne
   └── Notifications
```

#### Semaine 4 : Finalisation
```
1. Settings (Paramètres)
   ├── Configuration système
   └── Gestion des référentiels

2. Dashboard dynamique
   ├── Statistiques réelles
   ├── Graphiques
   └── Données en temps réel

3. Tests et corrections
   ├── Tests utilisateur
   ├── Corrections bugs
   └── Optimisations

4. Documentation
   ├── Guide utilisateur
   ├── Documentation technique
   └── Déploiement
```

---

## 🔍 Points Clés à Retenir

### 1. Toujours Backend → Frontend
- Créer l'API backend d'abord
- Tester avec Postman/Insomnia
- Puis créer l'interface frontend

### 2. Nettoyage des Paramètres
```javascript
// TOUJOURS filtrer les undefined
const cleanParams = Object.entries(params)
  .filter(([_, value]) => value !== undefined && value !== null && value !== '')
  .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
```

### 3. Gestion des Erreurs
```javascript
try {
  await service.create(data);
  fetchData(); // Refresh
} catch (err) {
  console.error('Error:', err);
  alert(err.response?.data?.message || 'Erreur');
}
```

### 4. États de Chargement
```javascript
const { data, loading, error, execute } = useApi(
  () => service.getAll(),
  [],
  true // auto-execute
);

if (loading) return <Spinner />;
if (error) return <Error message={error} />;
```

### 5. Matricules Automatiques
```javascript
// Générer au moment de l'ouverture du modal
useEffect(() => {
  if (!editing && showModal) {
    const newMatricule = generateMatricule('student', existingMatricules);
    setFormData(prev => ({ ...prev, matricule: newMatricule }));
  }
}, [showModal, editing]);
```

---

## 🎯 Checklist de Démarrage

### Configuration Initiale
- [ ] Node.js et npm installés
- [ ] Python et pip installés
- [ ] Dépendances frontend installées
- [ ] Dépendances backend installées
- [ ] Fichier .env configuré
- [ ] Base de données migrée
- [ ] Serveurs démarrés (frontend + backend)

### Premier Module (Students)
- [ ] Modèle créé dans models.py
- [ ] Serializer créé
- [ ] ViewSet créé
- [ ] URL enregistrée
- [ ] Migrations appliquées
- [ ] Service API frontend créé
- [ ] Page Students créée
- [ ] Route ajoutée
- [ ] Menu mis à jour
- [ ] Tests CRUD fonctionnels

### Dashboard
- [ ] Services dashboard créés
- [ ] Statistiques dynamiques
- [ ] Graphiques avec données réelles
- [ ] Inscriptions récentes affichées
- [ ] Événements configurés

---

## 🚨 Erreurs Courantes à Éviter

1. **Paramètres undefined dans les URLs**
   - ❌ `?status=undefined`
   - ✅ Nettoyer les params avant

2. **Oublier les migrations**
   - ❌ Modifier models.py sans migrer
   - ✅ Toujours `makemigrations` + `migrate`

3. **CORS non configuré**
   - ❌ Erreurs CORS bloquent les requêtes
   - ✅ Configurer CORS dans Django

4. **Tokens non gérés**
   - ❌ Requêtes sans Authorization header
   - ✅ Utiliser le service API centralisé

5. **États non synchronisés**
   - ❌ Modifier sans rafraîchir
   - ✅ Appeler `fetchData()` après CRUD

---

## 📚 Ressources Utiles

- **Documentation React** : https://react.dev
- **TailwindCSS** : https://tailwindcss.com
- **Django REST Framework** : https://www.django-rest-framework.org
- **Recharts** : https://recharts.org
- **Lucide Icons** : https://lucide.dev

---

**Le système est maintenant complet et prêt à l'emploi ! Suivez ce workflow pour ajouter de nouvelles fonctionnalités.** 🎉
