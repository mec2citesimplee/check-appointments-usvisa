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
    echo "   Veuillez télécharger et installer Node.js depuis https://nodejs.org/"
    echo ""
    echo "Appuyez sur une touche pour quitter..."
    read -n 1 -s
    exit 1
fi

# Vérifier la version de Node.js (minimum 18)
NODE_VERSION=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ ERREUR: Node.js version $NODE_VERSION détectée. La version 18 ou supérieure est requise."
    echo "   Veuillez mettre à jour Node.js depuis https://nodejs.org/"
    echo ""
    echo "Appuyez sur une touche pour quitter..."
    read -n 1 -s
    exit 1
fi
echo "✅ Node.js v$(node --version | sed 's/v//') détecté."

# Installer les dépendances la première fois
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Première utilisation détectée : Installation des dépendances..."
    echo "   (Cette étape peut prendre 1 à 2 minutes et télécharge ~300 MB pour Chrome)"
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ ERREUR: L'installation des dépendances a échoué."
        echo "   Vérifiez votre connexion internet et réessayez."
        read -n 1 -s
        exit 1
    fi
fi

echo ""
echo "🚀 Lancement du bot..."
echo ""
node bot.js

echo ""
echo "Bot arrêté. Appuyez sur une touche pour fermer cette fenêtre..."
read -n 1 -s
