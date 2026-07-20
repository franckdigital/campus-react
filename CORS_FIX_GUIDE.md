# Guide de correction CORS pour Campus Backend

## Problème
Le frontend React (http://localhost:5174) ne peut pas communiquer avec le backend Django (http://127.0.0.1:8002) à cause de CORS.

## Solution rapide

### Étape 1: Installer django-cors-headers
```bash
cd C:\Users\HP\Desktop\projets\campus-backend
.\venv\Scripts\activate
pip install django-cors-headers
```

### Étape 2: Modifier config/settings.py

#### A. Ajouter 'corsheaders' dans INSTALLED_APPS
```python
INSTALLED_APPS = [
    'corsheaders',  # ← Ajouter cette ligne
    'django.contrib.admin',
    'django.contrib.auth',
    # ... autres apps
]
```

#### B. Ajouter CorsMiddleware dans MIDDLEWARE (en 2ème position)
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # ← Ajouter cette ligne
    'django.middleware.common.CommonMiddleware',
    # ... autres middlewares
]
```

#### C. Ajouter la configuration CORS à la fin du fichier
```python
# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
```

### Étape 3: Redémarrer le serveur Django
```bash
python manage.py runserver 8002
```

### Étape 4: Tester la connexion
1. Allez sur http://localhost:5174/login
2. Essayez de vous connecter avec les identifiants de test
3. Vérifiez la console (F12) - l'erreur CORS devrait avoir disparu

## Alternative: Script automatique

Exécutez le script Python fourni :
```bash
cd C:\Users\HP\Desktop\projets\campus-backend
python ..\campus-react\fix_cors_backend.py
```

## Vérification

Pour vérifier que CORS est bien configuré, testez avec :
```bash
curl -X OPTIONS http://127.0.0.1:8002/api/v1/auth/login/ -H "Origin: http://localhost:5174" -H "Access-Control-Request-Method: POST" -v
```

Vous devriez voir dans la réponse :
- `Access-Control-Allow-Origin: http://localhost:5174`
- `Access-Control-Allow-Methods: POST, ...`
