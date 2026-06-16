# Visa Appointment Bot

Ce script automatise la surveillance du calendrier de rendez-vous sur le site des visas US. Il vérifie régulièrement les disponibilités et déclenche une alerte sonore et visuelle si un créneau est trouvé avant une date limite définie.

---

## 1. Prérequis

- **Node.js v18 ou supérieur** — [Télécharger sur nodejs.org](https://nodejs.org/)
- **Connexion internet** — Chrome (~300 MB) est téléchargé automatiquement à la première installation
- **Compte actif** sur [usvisaappt.com](https://www.usvisaappt.com/)

---

## 2. Configuration

Ouvrez le fichier `config.json` avec un éditeur de texte (Bloc-notes, TextEdit, VS Code) et personnalisez :

```json
{
  "email": "votre_email@exemple.com",
  "password": "votre_mot_de_passe",
  "location": "Paris",
  "checkIntervalMs": 180000,
  "targetMonth": "July 2026",
  "url": "https://www.usvisaappt.com/visaapplicantui/login"
}
```

| Champ | Description | Exemple |
|---|---|---|
| `email` | Votre email de connexion | `"jean@mail.com"` |
| `password` | Votre mot de passe | `"MonMotDePasse"` |
| `location` | Ambassade/consulat cible | `"Paris"` |
| `checkIntervalMs` | Délai entre chaque vérification (ms) | `180000` = 3 min |
| `targetMonth` | Mois limite (en **anglais**) | `"July 2026"` |
| `url` | URL du site — ne pas modifier | — |

### Villes / Consulats valides pour `"location"`

Le bot cherche ce texte dans le menu déroulant du site. Utilisez le nom exact affiché sur le site :

- `"Paris"`
- `"Marseille"`
- `"Bordeaux"`
- `"Lyon"`
- `"Strasbourg"`

> **Note :** Si votre ville n'est pas trouvée, le bot affichera un avertissement `[WARN]`. Vérifiez le nom exact en vous connectant manuellement sur le site.

---

## 3. Lancement

- **Sur macOS** : Double-cliquez sur `start-mac.command`
- **Sur Windows** : Double-cliquez sur `start-windows.bat`

### Déroulement :
1. Vérification de Node.js (≥ 18)
2. Installation des dépendances au **premier lancement** (~300 MB, 1–2 min)
3. Chrome s'ouvre et pré-remplit vos identifiants
4. **Action requise** : Résoudre le CAPTCHA et cliquer sur "Connexion"
5. Le bot surveille le calendrier automatiquement — vous pouvez réduire la fenêtre Chrome

> **Session sauvegardée** : La session est conservée dans le dossier `chrome_session`. Aux prochains lancements, vous serez directement connecté sans nouveau CAPTCHA.

---

## 4. Comprendre les logs

Le bot affiche des messages horodatés dans le terminal :

| Niveau | Signification |
|---|---|
| `[INFO]` | Fonctionnement normal |
| `[WARN]` | Avertissement non bloquant (session expirée, option introuvable…) |
| `[ALERT]` | 🚨 Créneau trouvé ! Une notification apparaît aussi sur votre bureau |
| `[ERROR]` | Erreur bloquante |

---

## 5. Dépannage

### 🔒 Session expirée
Le bot détecte automatiquement si votre session expire et attend que vous vous reconnectiez dans Chrome. Une notification de bureau vous prévient.

### 📡 Erreur réseau
Le bot retente automatiquement jusqu'à 3 fois en cas d'échec réseau. Après 5 erreurs consécutives, il s'arrête proprement avec une notification.

### 🍎 macOS — « fichier endommagé » ou refusé à l'ouverture

**Cas 1 — Reçu par WhatsApp / email / AirDrop**

macOS bloque les fichiers `.command` reçus via une application tierce (quarantaine Gatekeeper). Pour débloquer **tout le dossier** en une commande :

1. Ouvrez l'application **Terminal** (⌘ + Espace → "Terminal")
2. Tapez `xattr -cr ` (avec un espace à la fin)
3. Glissez le **dossier** `mini-bot-fixed` directement dans la fenêtre Terminal
4. Appuyez sur Entrée

Le dossier est maintenant déblocqué. Double-cliquez sur `start-mac.command` — ça marche.

**Cas 2 — Problème de permissions (téléchargé depuis internet)**

1. Ouvrez l'application **Terminal**
2. Tapez `chmod +x ` (avec un espace à la fin)
3. Glissez `start-mac.command` dans la fenêtre Terminal
4. Appuyez sur Entrée — c'est réglé définitivement

### ❌ `config.json` absent au démarrage
Le bot crée automatiquement `config.json` depuis le modèle `config.example.json`. Renseignez vos identifiants et relancez.

### ❌ Version Node incorrecte
Le script de lancement vérifie que Node ≥ 18 est installé et affiche un message clair si ce n'est pas le cas. Mettez à jour Node depuis [nodejs.org](https://nodejs.org/).
