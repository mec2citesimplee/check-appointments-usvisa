# Visa Appointment Bot

Ce script automatise la surveillance du calendrier de rendez-vous sur le site des visas. Il vérifie régulièrement les disponibilités et déclenche une alerte sonore et visuelle si un créneau est trouvé avant une date limite définie.

## 1. Prérequis (Installation initiale)

Le script nécessite **Node.js** pour fonctionner.
1. Rendez-vous sur le site officiel : [https://nodejs.org/](https://nodejs.org/)
2. Téléchargez et installez la version LTS (recommandée).

## 2. Configuration

Ouvrez le fichier `config.json` avec un éditeur de texte standard (Bloc-notes, TextEdit, VS Code) et personnalisez les paramètres suivants :

- `"email"` : L'adresse email associée à votre compte.
- `"password"` : Le mot de passe de votre compte.
- `"location"` : La ville sélectionnée pour le rendez-vous (ex: `"Paris"`).
- `"targetMonth"` : Le mois limite de recherche (ex: `"July 2026"` ou `"August 2026"`). **Important :** Écrivez toujours le mois en **anglais** pour que le programme le comprenne correctement. Le bot déclenchera une notification si un rendez-vous est trouvé **avant** ou **pendant** ce mois précis.
- `"checkIntervalMs"` : Le délai d'attente entre chaque vérification de calendrier, exprimé en millisecondes (par défaut `180000`, soit 3 minutes). Vous pouvez réduire ou augmenter cette valeur selon vos besoins.

*N'oubliez pas d'enregistrer le fichier après avoir apporté vos modifications.*

## 3. Lancement du Bot

L'exécution du script a été simplifiée au maximum :

- **Sur macOS** : Double-cliquez sur le script `start-mac.command`
- **Sur Windows** : Double-cliquez sur le script `start-windows.bat`

### Déroulement de l'exécution :
1. Lors du tout premier lancement, le script téléchargera automatiquement les dépendances logicielles nécessaires (cette étape peut prendre environ une minute).
2. Une fenêtre Google Chrome automatisée s'ouvrira et pré-remplira vos identifiants.
3. **Action requise** : Vous devez résoudre le CAPTCHA manuellement et cliquer sur "Connexion".
4. Une fois l'authentification réussie, laissez simplement la fenêtre Chrome ouverte (vous pouvez la réduire). Le script s'occupera du rafraîchissement régulier du calendrier.

*Note de confort : La session de navigation est sauvegardée localement. Lors de vos prochaines utilisations, le navigateur s'ouvrira directement sur votre espace connecté, sans nécessiter de nouveau CAPTCHA.*

---

> **🚑 Dépannage Mac (Si le fichier refuse de s'ouvrir) :**
> Si votre Mac refuse d'ouvrir `start-mac.command` pour une question de "privilèges", c'est une sécurité d'Apple. Pour corriger ça en 5 secondes :
> 1. Ouvrez l'application **Terminal** (sur votre Mac).
> 2. Tapez `chmod +x ` (n'oubliez pas l'espace à la fin).
> 3. Glissez et déposez le fichier `start-mac.command` directement dans la fenêtre du Terminal.
> 4. Appuyez sur la touche Entrée. C'est réparé pour toujours, vous pouvez double-cliquer dessus !
