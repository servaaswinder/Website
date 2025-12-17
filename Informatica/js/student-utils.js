/**
 * HULPFUNCTIES VOOR LEERLING DATA
 * Bevat de logica om student-documenten te vinden, ongeacht ID-format of casing.
 */

/**
 * Maakt een veilige document ID van een email adres (lowercase, slugified).
 * @param {string} value - Het email adres
 * @returns {string} - De gesanitizeerde ID
 */
function sanitizeDocId(value) {
    if (!value) return `leerling-${Date.now()}`;
    return (
        value
            .toLowerCase()
            .replace(/[^a-z0-9]+/gi, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 120) || `leerling-${Date.now()}`
    );
}

/**
 * Probeert het student-document te vinden via een robuuste 5-stappen strategie.
 * 
 * Strategie:
 * 1. UID Check (Direct op Auth UID)
 * 2. Exacte Email Query
 * 3. Lowercase Email Query
 * 4. Uppercase Local-Part Email Query (bijv. LLN123@...)
 * 5. Predicted ID Check (Sanitized Email)
 * 
 * @param {object} db - De Firestore instantie
 * @param {object} user - Het Firebase user object
 * @param {function} logFn - Optionele logging functie (bijv. console.log of een UI logger)
 * @returns {Promise<firebase.firestore.DocumentSnapshot|null>} - Het gevonden document of null
 */
async function resolveStudentDocument(db, user, logFn = console.log) {
    let doc = null;

    // 1. Probeer direct op UID
    try {
        logFn(`[StudentUtils] Poging 1: UID check on '${user.uid}'...`);
        const directDoc = await db.collection("results").doc(user.uid).get();
        if (directDoc.exists) {
            logFn(`[StudentUtils] Gevonden via UID.`);
            return directDoc;
        }
    } catch (e) {
        logFn(`[StudentUtils] UID lookup failed/blocked: ${e.message}`);
    }

    // 2. Probeer exacte email
    logFn(`[StudentUtils] Poging 2: Exact email check on '${user.email}'...`);
    let q = await db.collection("results").where("email", "==", user.email).limit(1).get();
    if (!q.empty) {
        logFn(`[StudentUtils] Gevonden via Exact Email.`);
        return q.docs[0];
    }

    // 3. Probeer lowercase email
    logFn(`[StudentUtils] Poging 3: Lowercase email check on '${user.email.toLowerCase()}'...`);
    q = await db.collection("results").where("email", "==", user.email.toLowerCase()).limit(1).get();
    if (!q.empty) {
        logFn(`[StudentUtils] Gevonden via Lowercase Email.`);
        return q.docs[0];
    }

    // 4. Probeer uppercase local part (voor gevallen als LLN10378@...)
    const parts = user.email.split("@");
    let emailUppercaseLocal = user.email;
    if (parts.length === 2) {
        emailUppercaseLocal = parts[0].toUpperCase() + "@" + parts[1];
    }
    logFn(`[StudentUtils] Poging 4: Uppercase-local check on '${emailUppercaseLocal}'...`);
    q = await db.collection("results").where("email", "==", emailUppercaseLocal).limit(1).get();
    
    if (!q.empty) {
        logFn(`[StudentUtils] Gevonden via Uppercase-Local Email.`);
        return q.docs[0];
    }

    // 5. Probeer predicted (sanitized) ID
    const predictedId = sanitizeDocId(user.email);
    logFn(`[StudentUtils] Poging 5: Predicted ID check on '${predictedId}'...`);
    try {
        const pDoc = await db.collection("results").doc(predictedId).get();
        if (pDoc.exists) {
             logFn(`[StudentUtils] Gevonden via Predicted ID.`);
             return pDoc;
        }
    } catch(e) { 
        logFn(`[StudentUtils] Predicted ID lookup failed: ${e.message}`); 
    }

    logFn(`[StudentUtils] Niks gevonden na 5 pogingen.`);
    return null;
}
