const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { exec } = require('child_process');

// Use stealth plugin to avoid easy detection
puppeteer.use(StealthPlugin());

// ─── Logger structuré ──────────────────────────────────────────────────────────
const COLORS = {
    reset:  '\x1b[0m',
    grey:   '\x1b[90m',
    cyan:   '\x1b[36m',
    yellow: '\x1b[33m',
    green:  '\x1b[32m',
    red:    '\x1b[31m',
    bold:   '\x1b[1m',
};

function log(level, message) {
    const now = new Date().toLocaleTimeString('fr-FR', { hour12: false });
    const ts = `${COLORS.grey}[${now}]${COLORS.reset}`;
    let prefix;
    switch (level) {
        case 'INFO':  prefix = `${COLORS.cyan}[INFO]${COLORS.reset}`;  break;
        case 'WARN':  prefix = `${COLORS.yellow}[WARN]${COLORS.reset}`; break;
        case 'ALERT': prefix = `${COLORS.bold}${COLORS.green}[ALERT]${COLORS.reset}`; break;
        case 'ERROR': prefix = `${COLORS.red}[ERROR]${COLORS.reset}`; break;
        default:      prefix = `[${level}]`;
    }
    console.log(`${ts} ${prefix} ${message}`);
}

// ─── Auto-création de config.json ─────────────────────────────────────────────
const configPath    = path.join(__dirname, 'config.json');
const examplePath   = path.join(__dirname, 'config.example.json');

if (!fs.existsSync(configPath)) {
    if (fs.existsSync(examplePath)) {
        fs.copyFileSync(examplePath, configPath);
        log('WARN', '⚠️  config.json absent — copie automatique depuis config.example.json.');
        log('WARN', '   Ouvrez config.json et renseignez vos identifiants avant de relancer.');
    } else {
        log('ERROR', 'config.json introuvable et config.example.json absent. Impossible de démarrer.');
        process.exit(1);
    }
    process.exit(0);
}

// ─── Chargement et validation de la configuration ────────────────────────────
let config;
try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
    log('ERROR', `Impossible de lire config.json : ${err.message}`);
    process.exit(1);
}

const REQUIRED_FIELDS = ['email', 'password', 'location', 'targetMonth', 'url', 'checkIntervalMs'];
for (const field of REQUIRED_FIELDS) {
    if (!config[field]) {
        log('ERROR', `Champ requis manquant dans config.json : "${field}"`);
        process.exit(1);
    }
}

if (config.email === 'votre_email@exemple.com' || config.email === 'your_email@example.com') {
    log('ERROR', 'Vous n\'avez pas encore configuré vos identifiants dans config.json.');
    process.exit(1);
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Recharge la page avec jusqu'à `maxRetries` tentatives.
 * Retourne true si succès, false sinon.
 */
async function reloadWithRetry(page, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            log('INFO', `Rafraîchissement de la page (tentative ${attempt}/${maxRetries})...`);
            await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
            return true;
        } catch (err) {
            log('WARN', `Échec du rafraîchissement #${attempt} : ${err.message}`);
            if (attempt < maxRetries) await delay(5000);
        }
    }
    log('ERROR', 'Impossible de rafraîchir la page après plusieurs tentatives.');
    return false;
}

/**
 * Envoie une notification native (macOS ou Windows).
 */
function sendNativeNotification(title, message) {
    if (process.platform === 'darwin') {
        const safeMsg = message.replace(/'/g, "\\'");
        exec(`osascript -e 'display notification "${safeMsg}" with title "${title}" sound name "Glass"'`,
            (err) => { if (err) log('WARN', `Erreur notification macOS : ${err.message}`); });
    } else if (process.platform === 'win32') {
        const safeMsg = message.replace(/'/g, "''");
        exec(`powershell -Command "(New-Object -ComObject WScript.Shell).Popup('${safeMsg}', 0, '${title}', 64)"`,
            (err) => { if (err) log('WARN', `Erreur notification Windows : ${err.message}`); });
    }
    // Bip sonore dans le terminal
    process.stdout.write('\x07');
}

// ─── Bot principal ────────────────────────────────────────────────────────────
async function runBot() {
    log('INFO', '=== Visa Appointment Bot v1.1 ===');
    log('INFO', `Ambassade cible : ${config.location}`);
    log('INFO', `Mois limite     : ${config.targetMonth}`);
    log('INFO', `Intervalle      : ${config.checkIntervalMs / 1000}s`);
    log('INFO', '=================================');

    // Lancement du navigateur
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            userDataDir: './chrome_session',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--start-maximized',
                '--disable-blink-features=AutomationControlled'
            ]
        });
    } catch (err) {
        log('ERROR', `Impossible de lancer Chrome : ${err.message}`);
        log('ERROR', 'Assurez-vous que Chrome est installé (~300 MB lors du premier lancement).');
        process.exit(1);
    }

    const page = await browser.newPage();

    // Gérer les crashs de page
    page.on('error', (err) => {
        log('ERROR', `Crash de la page : ${err.message}`);
    });

    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    try {
        log('INFO', `Navigation vers : ${config.url}`);
        await page.goto(config.url, { waitUntil: 'networkidle2', timeout: 60000 });

        // ── Auto-remplissage des identifiants ──────────────────────────────
        if (config.email && config.password) {
            log('INFO', 'Tentative de remplissage automatique des identifiants...');
            try {
                await page.waitForSelector("input[formcontrolname='username']", { timeout: 10000 });
                await page.type("input[formcontrolname='username']", config.email, { delay: 80 });

                await page.waitForSelector("input[formcontrolname='password']", { timeout: 10000 });
                await page.type("input[formcontrolname='password']", config.password, { delay: 80 });

                log('INFO', 'Identifiants remplis automatiquement.');
            } catch (err) {
                log('WARN', 'Remplissage automatique échoué — saisissez vos identifiants manuellement.');
            }
        }

        log('INFO', '');
        log('INFO', '👉 ACTION REQUISE : Résolvez le CAPTCHA et connectez-vous dans la fenêtre Chrome.');
        log('INFO', 'Attente de la connexion...');

        // ── Attente de la connexion ────────────────────────────────────────
        let loggedIn = false;
        while (!loggedIn) {
            const currentUrl = page.url();
            const isOnDashboard =
                currentUrl.includes('/dashboard') ||
                currentUrl.includes('/applicant') ||
                (!currentUrl.includes('/login') && currentUrl !== config.url);

            if (isOnDashboard) {
                const loginInput = await page.$("input[formcontrolname='username']");
                if (!loginInput) {
                    loggedIn = true;
                    log('INFO', '✅ Connexion détectée !');
                    break;
                }
            }
            await delay(2000);
        }

        // ── Boucle de surveillance ─────────────────────────────────────────
        let cycle = 1;
        let consecutiveErrors = 0;

        while (true) {
            log('INFO', `--- Cycle #${cycle} ---`);

            try {
                // ── Détection de session expirée ───────────────────────────
                const currentUrl = page.url();
                if (currentUrl.includes('/login')) {
                    log('WARN', '🔒 Session expirée — redirection vers la page de connexion détectée.');
                    sendNativeNotification('🔒 Visa Bot — Session expirée', 'Votre session a expiré. Reconnectez-vous dans Chrome.');
                    log('WARN', 'Reconnectez-vous dans la fenêtre Chrome. Le bot reprendra automatiquement...');

                    // Attendre que l'utilisateur se reconnecte
                    let reconnected = false;
                    while (!reconnected) {
                        await delay(5000);
                        const url = page.url();
                        if (!url.includes('/login')) {
                            const loginInput = await page.$("input[formcontrolname='username']");
                            if (!loginInput) {
                                reconnected = true;
                                log('INFO', '✅ Reconnexion détectée, reprise de la surveillance.');
                            }
                        }
                    }
                }

                // ── Rafraîchissement (sauf au premier cycle) ───────────────
                if (cycle > 1) {
                    const reloaded = await reloadWithRetry(page);
                    if (!reloaded) {
                        consecutiveErrors++;
                        if (consecutiveErrors >= 5) {
                            log('ERROR', '5 échecs consécutifs — arrêt du bot. Vérifiez votre connexion internet.');
                            sendNativeNotification('🚨 Visa Bot — Erreur réseau', 'Trop d\'erreurs réseau consécutives. Le bot s\'est arrêté.');
                            break;
                        }
                        log('WARN', `Erreur réseau #${consecutiveErrors}/5 — nouvel essai dans ${config.checkIntervalMs / 1000}s`);
                        await delay(config.checkIntervalMs);
                        cycle++;
                        continue;
                    }
                }
                consecutiveErrors = 0; // Réinitialiser le compteur d'erreurs

                // ── Attente Angular ────────────────────────────────────────
                await delay(3000);

                // ── Sélection de l'ambassade ───────────────────────────────
                const matSelects = await page.$$('mat-select');
                let targetSelect = null;
                let isAlreadySelected = false;

                for (const select of matSelects) {
                    const text = await page.evaluate(el => el.innerText || '', select);
                    if (text.includes('Select') || text.includes(config.location)) {
                        targetSelect = select;
                        if (text.includes(config.location)) {
                            isAlreadySelected = true;
                        }
                        break;
                    }
                }

                if (targetSelect) {
                    if (!isAlreadySelected) {
                        log('INFO', `Sélection de "${config.location}" dans le menu déroulant...`);
                        await targetSelect.click();
                        await delay(1000);

                        const options = await page.$$('mat-option');
                        let found = false;
                        for (const option of options) {
                            const text = await page.evaluate(el => el.innerText, option);
                            if (text && text.includes(config.location)) {
                                await option.click();
                                found = true;
                                break;
                            }
                        }

                        if (!found) {
                            log('WARN', `"${config.location}" non trouvé dans les options du menu. Vérifiez la valeur dans config.json.`);
                            log('WARN', 'Valeurs connues : Paris, Marseille, Lyon, Bordeaux, Strasbourg');
                        }

                        await delay(3000);
                    } else {
                        log('INFO', `"${config.location}" est bien sélectionné.`);
                    }
                } else {
                    log('WARN', 'Menu déroulant introuvable — peut-être déjà sur une ambassade présélectionnée.');
                }

                // ── Lecture du calendrier ──────────────────────────────────
                const { month, dates: availableDates } = await page.evaluate(() => {
                    const dates = [];
                    const periodBtn =
                        document.querySelector('.mat-calendar-period-button') ||
                        document.querySelector('[id^="mat-calendar-button-"]');
                    const monthText = periodBtn ? periodBtn.innerText.trim() : 'Mois en cours';

                    document.querySelectorAll('.mat-calendar-body-cell').forEach(button => {
                        if (button.classList.contains('special-date')) {
                            const content = button.querySelector('.mat-calendar-body-cell-content');
                            dates.push(content ? content.innerText.trim() : button.innerText.trim());
                        }
                    });

                    return { month: monthText, dates };
                });

                // ── Analyse des résultats ──────────────────────────────────
                if (availableDates.length === 0) {
                    log('INFO', `Aucun créneau disponible pour ${month}.`);
                } else {
                    const currentMonthDate = new Date(`${month} 1`);
                    const targetMonthDate  = new Date(`${config.targetMonth} 1`);

                    if (isNaN(currentMonthDate) || currentMonthDate <= targetMonthDate) {
                        const message = `Créneaux disponibles le ${availableDates.join(', ')} en ${month} !`;
                        log('ALERT', `🚨 ${message}`);
                        sendNativeNotification('🚨 Visa Bot 🚨', message);
                    } else {
                        log('INFO', `Créneaux en ${month} (jours : ${availableDates.join(', ')}) — ignorés car après ${config.targetMonth}.`);
                    }
                }

            } catch (err) {
                consecutiveErrors++;
                log('ERROR', `Erreur au cycle #${cycle} : ${err.message}`);

                // Vérifier si on est repassé sur la page de login
                try {
                    if (page.url().includes('/login')) {
                        log('WARN', 'Session expirée détectée dans le catch — relance de la vérification...');
                    }
                } catch (_) { /* page peut être inaccessible */ }
            }

            log('INFO', `Prochain cycle dans ${config.checkIntervalMs / 1000}s...`);
            await delay(config.checkIntervalMs);
            cycle++;
        }

    } catch (error) {
        log('ERROR', `Erreur fatale : ${error.message}`);
        log('ERROR', error.stack || '');
    } finally {
        if (browser) {
            log('INFO', 'Fermeture du navigateur...');
            await browser.close().catch(() => {});
        }
    }
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────
runBot().catch((err) => {
    log('ERROR', `Erreur non gérée : ${err.message}`);
    process.exit(1);
});
