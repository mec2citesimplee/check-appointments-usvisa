#!/bin/bash
# Se placer dans le dossier du script
cd "$(dirname "$0")"

echo "=========================================="
echo "         DÉMARRAGE DU VISA BOT            "
echo "=========================================="
echo ""

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null
then
    echo "❌ ERREUR: Node.js n'est pas installé sur cet ordinateur."
    echo "Veuillez télécharger et installer Node.js depuis https://nodejs.org/"
    echo "Appuyez sur une touche pour quitter..."
    read -n 1 -s
    exit
fi

# Installer les dépendances la première fois
if [ ! -d "node_modules" ]; then
    echo "📦 Première utilisation détectée : Installation des dépendances (patientez...)"
    npm install
fi

echo "🚀 Lancement du bot..."
node bot.js
