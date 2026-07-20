@echo off
echo Deploiement du frontend campus vers numerix.digital...
echo Entrez le mot de passe SSH quand demande.
echo.
scp -r "C:\Users\HP\Desktop\projets\campus-react\dist\assets" "C:\Users\HP\Desktop\projets\campus-react\dist\index.html" "C:\Users\HP\Desktop\projets\campus-react\dist\vite.svg" root@numerix.digital:/var/www/campus/
echo.
if %ERRORLEVEL%==0 (
  echo Deploiement reussi!
) else (
  echo Echec du deploiement. Verifiez le mot de passe et la connexion.
)
pause
