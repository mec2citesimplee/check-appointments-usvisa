const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Use stealth plugin to avoid easy detection
puppeteer.use(StealthPlugin());

// Load configurations
const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
    console.error("Error: config.json file not found. Please create one based on the template.");
    process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runBot() {
    console.log("=== Visa Appointment Bot ===");
    console.log(`Target Location: ${config.location}`);
    console.log(`Target Month: ${config.targetMonth}`);
    console.log(`Polling Interval: ${config.checkIntervalMs / 1000}s`);
    console.log("============================");

    // Launch browser in headed mode
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        userDataDir: './chrome_session', // <-- SAUVEGARDE LA SESSION ET LES COOKIES ICI
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--start-maximized',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const page = await browser.newPage();
    
    // Set custom user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        console.log(`Navigating to login page: ${config.url}`);
        await page.goto(config.url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Autofill credentials if provided
        if (config.email && config.email !== "your_email@example.com") {
            console.log("Attempting to auto-fill credentials...");
            try {
                await page.waitForSelector("input[formcontrolname='username']", { timeout: 10000 });
                await page.type("input[formcontrolname='username']", config.email, { delay: 100 });
                
                await page.waitForSelector("input[formcontrolname='password']", { timeout: 10000 });
                await page.type("input[formcontrolname='password']", config.password, { delay: 100 });
                console.log("Autofilled email and password.");
            } catch (err) {
                console.log("Could not auto-fill credentials automatically. Please enter them manually.");
            }
        }

        console.log("\n[ACTION REQUIRED] Please solve any CAPTCHA/2FA and complete the login in the opened browser window.");
        console.log("Waiting for successful login (detecting redirect or dashboard page)...");

        // Wait until the user has logged in
        // Usually, the login button has formcontrolname='username' or the URL contains '/login'.
        // We will wait until we are no longer on the login page.
        let loggedIn = false;
        while (!loggedIn) {
            const currentUrl = page.url();
            if (currentUrl.includes('/dashboard') || currentUrl.includes('/applicant') || (!currentUrl.includes('/login') && currentUrl !== config.url)) {
                // Double check if login inputs are gone
                const loginInput = await page.$("input[formcontrolname='username']");
                if (!loginInput) {
                    loggedIn = true;
                    console.log("Login detected successfully!");
                    break;
                }
            }
            await delay(2000);
        }

        // Monitoring Loop
        let cycle = 1;
        while (true) {
            console.log(`\n--- Cycle #${cycle} (${new Date().toLocaleTimeString()}) ---`);
            
            try {
                // Au premier cycle, on attend un peu pour laisser l'utilisateur interagir si besoin
                // Aux cycles suivants, on rafraîchit la page
                if (cycle > 1) {
                    console.log("Rafraîchissement de la page...");
                    await page.reload({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
                }

                // Attendre quelques secondes pour que les éléments Angular s'initialisent
                await delay(3000);

                // Tenter de trouver le BON menu déroulant (mat-select)
                const matSelects = await page.$$('mat-select');
                let targetSelect = null;
                let isAlreadySelected = false;

                for (const select of matSelects) {
                    const text = await page.evaluate(el => el.innerText || "", select);
                    // Si on trouve "Select" ou si c'est déjà sur la ville cible
                    if (text.includes('Select') || text.includes(config.location)) {
                        targetSelect = select;
                        if (text.includes(config.location)) {
                            isAlreadySelected = true;
                        }
                        break; // On a trouvé le bon menu !
                    }
                }

                if (targetSelect) {
                    if (!isAlreadySelected) {
                        console.log(`Sélection de '${config.location}' dans le menu déroulant...`);
                        await targetSelect.click();
                        await delay(1000); // Attendre l'animation d'ouverture
                        
                        const options = await page.$$('mat-option');
                        for (let option of options) {
                            const text = await page.evaluate(el => el.innerText, option);
                            if (text && text.includes(config.location)) {
                                await option.click();
                                break;
                            }
                        }
                        // Attendre que le calendrier se charge après la sélection
                        await delay(3000);
                    } else {
                        console.log(`'${config.location}' est bien sélectionné.`);
                    }
                } else {
                    console.log("Menu déroulant introuvable sur cette page.");
                }
                const { month, dates: availableDates } = await page.evaluate(() => {
                    const dates = [];
                    // Essayer de récupérer le mois (généralement dans le bouton de période d'Angular Material)
                    const periodBtn = document.querySelector('.mat-calendar-period-button') || document.querySelector('[id^="mat-calendar-button-"]');
                    const monthText = periodBtn ? periodBtn.innerText.trim() : "Mois en cours";

                    // Cherche tous les boutons du calendrier
                    const buttons = document.querySelectorAll('.mat-calendar-body-cell');
                    
                    buttons.forEach(button => {
                        // La capture d'écran montre que les cases vertes ont la classe "special-date" sur le <button>
                        if (button.classList.contains('special-date')) {
                            const content = button.querySelector('.mat-calendar-body-cell-content');
                            if (content) {
                                dates.push(content.innerText.trim());
                            } else {
                                dates.push(button.innerText.trim());
                            }
                        }
                    });
                    return { month: monthText, dates };
                });

                if (availableDates.length === 0) {
                    console.log(`Status: Aucun créneau vert trouvé pour ${month}.`);
                } else {
                    // On convertit le texte du mois en date
                    const currentMonthDate = new Date(`${month} 1`);
                    const targetMonthDate = new Date(`${config.targetMonth} 1`);
                    
                    // Si c'est avant ou égal au mois cible (ou mois illisible)
                    if (isNaN(currentMonthDate) || currentMonthDate <= targetMonthDate) {
                        console.log("\x1b[32m%s\x1b[0m", `[ALERT] Créneaux trouvés pour ${month} ! (Jours : ${availableDates.join(', ')})`);
                        
                        // Envoi de la notification native
                        const { exec } = require('child_process');
                        const message = `Créneaux disponibles le ${availableDates.join(', ')} en ${month} !`;
                        
                        if (process.platform === 'darwin') {
                            // Pop-up native Mac
                            exec(`osascript -e 'display notification "${message}" with title "🚨 Visa Bot 🚨" sound name "Glass"'`);
                        } else if (process.platform === 'win32') {
                            // Pop-up native Windows (PowerShell)
                            exec(`powershell -Command "(New-Object -ComObject WScript.Shell).Popup('${message}', 0, '🚨 Visa Bot 🚨', 64)"`);
                        }
                        
                        // Bip sonore dans le terminal
                        process.stdout.write('\x07');
                    } else {
                        // Pas de pop-up, juste un message silencieux dans la console MAIS avec les dates
                        console.log(`Status: Créneaux trouvés en ${month} (jours : ${availableDates.join(', ')}), mais on ignore car c'est après la date limite (${config.targetMonth}).`);
                    }
                }
            } catch (err) {
                console.error("Error during checking cycle:", err.message);
                // If we got disconnected or logged out, try to alert
                if (page.url().includes('/login')) {
                    console.log("[WARNING] Redirected back to login page. Please log in again.");
                }
            }

            console.log(`Waiting for ${config.checkIntervalMs / 1000} seconds before next check...`);
            await delay(config.checkIntervalMs);
            cycle++;
        }

    } catch (error) {
        console.error("An error occurred during bot execution:", error);
    }
}

runBot().catch(console.error);
