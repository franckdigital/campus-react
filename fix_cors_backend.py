"""
Script pour configurer CORS dans le backend Django Campus
À exécuter dans le dossier campus-backend
"""

import os
import re

def fix_cors_settings():
    settings_path = 'config/settings.py'
    
    if not os.path.exists(settings_path):
        print("❌ Fichier settings.py non trouvé. Assurez-vous d'être dans le dossier campus-backend")
        return False
    
    with open(settings_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Vérifier si django-cors-headers est dans INSTALLED_APPS
    if 'corsheaders' not in content:
        print("✅ Ajout de corsheaders dans INSTALLED_APPS...")
        
        # Trouver INSTALLED_APPS et ajouter corsheaders
        installed_apps_pattern = r"(INSTALLED_APPS\s*=\s*\[)(.*?)(\])"
        match = re.search(installed_apps_pattern, content, re.DOTALL)
        
        if match:
            apps_content = match.group(2)
            if 'corsheaders' not in apps_content:
                new_apps = match.group(1) + "\n    'corsheaders'," + match.group(2) + match.group(3)
                content = content[:match.start()] + new_apps + content[match.end():]
    
    # Vérifier si CorsMiddleware est dans MIDDLEWARE
    if 'CorsMiddleware' not in content:
        print("✅ Ajout de CorsMiddleware dans MIDDLEWARE...")
        
        middleware_pattern = r"(MIDDLEWARE\s*=\s*\[)(.*?)(\])"
        match = re.search(middleware_pattern, content, re.DOTALL)
        
        if match:
            middleware_content = match.group(2)
            if 'CorsMiddleware' not in middleware_content:
                # Ajouter après SecurityMiddleware
                new_middleware = match.group(2).replace(
                    "'django.middleware.security.SecurityMiddleware',",
                    "'django.middleware.security.SecurityMiddleware',\n    'corsheaders.middleware.CorsMiddleware',"
                )
                content = content[:match.start()] + match.group(1) + new_middleware + match.group(3) + content[match.end():]
    
    # Ajouter les configurations CORS à la fin du fichier
    cors_config = """

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
"""
    
    if 'CORS_ALLOWED_ORIGINS' not in content:
        print("✅ Ajout de la configuration CORS...")
        content += cors_config
    else:
        print("⚠️  Configuration CORS déjà présente, mise à jour...")
        # Remplacer la configuration existante
        cors_pattern = r"# CORS Configuration.*?(?=\n\n[A-Z_]|\Z)"
        content = re.sub(cors_pattern, cors_config.strip(), content, flags=re.DOTALL)
    
    # Sauvegarder
    with open(settings_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("\n✅ Configuration CORS mise à jour avec succès!")
    print("\n📋 Prochaines étapes:")
    print("1. Installer django-cors-headers si ce n'est pas déjà fait:")
    print("   pip install django-cors-headers")
    print("\n2. Redémarrer le serveur Django:")
    print("   python manage.py runserver 8002")
    print("\n3. Tester la connexion depuis le frontend")
    
    return True

if __name__ == '__main__':
    print("🔧 Configuration CORS pour Campus Backend\n")
    fix_cors_settings()
