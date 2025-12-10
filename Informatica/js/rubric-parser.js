/**
 * Rubric Parser
 * Parses assignment HTML content to extract grading categories, points, and weights.
 */

const RubricParser = {
    /**
     * Parses the grading table from an assignment's HTML content.
     * @param {string} htmlContent - The full HTML string of the assignment page.
     * @returns {object} - Object containing total points, categories, and potentially warnings.
     */
    parse: function(htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Find the "Beoordelingsmodel" section and the table following it
        // Often it's an h2 with text "Beoordelingsmodel"
        const headings = Array.from(doc.querySelectorAll('h2, h3'));
        let rubricTable = null;

        for (const h of headings) {
            if (h.textContent.trim().toLowerCase().includes('beoordelingsmodel')) {
                // Look for the next table
                let sibling = h.nextElementSibling;
                while (sibling) {
                    if (sibling.tagName === 'TABLE') {
                        rubricTable = sibling;
                        break;
                    }
                    // Handle wrapper divs (like <div style="overflow-x: auto;"><table>...</table></div>)
                    if (sibling.querySelector('table')) {
                        rubricTable = sibling.querySelector('table');
                        break;
                    }
                    sibling = sibling.nextElementSibling;
                }
                if (rubricTable) break;
            }
        }

        if (!rubricTable) {
            return { error: "No rubric table found." };
        }

        const categories = [];
        let totalMaxPoints = 0;

        // Parse Header to find point values for columns if possible
        // Standard format: [Categorie | 0 Punten | 1 Punt | ... | Max Punten]
        // Actually, usually headers are "0 punten", "1 punt", etc.
        // We need to determine the max points per row.
        // Usually, the last column represents the max points for that row *if* it's just linear.
        // But weight multipliers mean we should look at the row content/header.

        const rows = rubricTable.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length < 2) return;

            const categoryCell = cells[0];
            const categoryText = categoryCell.textContent.trim();
            
            // Extract Weight
            // Format example: "Inhoud (weging 2)" or just "Analyse"
            let weight = 1;
            const weightMatch = categoryText.match(/\(weging\s+(\d+)\)/i);
            if (weightMatch) {
                weight = parseInt(weightMatch[1], 10);
            }

            // Determine max points for this specific category
            // The table columns usually represent 0, 1, 2, 3... points indices.
            // But we shouldn't assume the index matches points perfectly without checking headers.
            // HOWEVER, based on user description: "meest rechter kolom" is max score.
            // Let's count how many score columns there are.
            // Standard: Categorie + N columns.
            // Points usually range from 0 to N-1.
            const scoreColumnsCount = cells.length - 1;
            const rawMaxPoints = scoreColumnsCount - 1; // 0-indexed, so 4 score cols = 0,1,2,3 -> max 3.
            
            // Wait, let's verify with f1_usability.
            // Header: Categorie, 0 Punten, 1 Punt, 2 Punten, 3 Punten.
            // Columns: 5. Score cols: 4. Max points: 3. Correct.
            
            // Extract descriptions for each point level
            const descriptions = [];
            // Skip the first cell (Category Name) and iterate through score cells
            for (let i = 1; i < cells.length; i++) {
                descriptions.push(cells[i].innerHTML.trim()); // Use innerHTML to preserve formatting like <br> or <b>
            }

            const rowTotal = rawMaxPoints * weight;
            totalMaxPoints += rowTotal;

            categories.push({
                name: categoryText.replace(/\(weging\s+\d+\)/, '').trim(),
                weight: weight,
                rawMaxPoints: rawMaxPoints,
                totalPoints: rowTotal,
                descriptions: descriptions
            });
        });

        // Try to find the formula text to verify
        // "Cijfer = (Totaal aantal punten / 9) * 9 + 1"
        // Variations: "Cijferberekening: Cijfer = ...", use of '×' instead of '*'
        const bodyText = rubricTable.closest('section') ? rubricTable.closest('section').textContent : doc.body.textContent;
        // Regex explanation:
        // Cijfer\s*=\s*  -> "Cijfer ="
        // Case A: (Points / Max) * 9 + 1
        // Case B: Points + 1 (Implicitly Max=9, or points map directly to grade)
        // We look for patterns.
        
        let formulaMatch = bodyText.match(/Cijfer\s*=\s*.*?(\d+)\s*\)\s*[\*×x]/i) || bodyText.match(/Cijfer\s*=\s*.*?(\d+)\s*[\*×x]/i);
        
        // Check for simplified "Count + 1" pattern which implies Max=9 (usually) or just additive
        // Example: "Cijfer = aantal punten + 1" or "Cijfer = totaal aantal punten + 1"
        if (!formulaMatch) {
            if (bodyText.match(/Cijfer\s*=\s*.*?aantal punten\s*\+\s*1/i)) {
                 // If formula is just "points + 1", and we assume linear 0-9 scale, then max points = 9.
                 // However, we can't extract "9" from "points + 1".
                 // But we can infer expectedTotal = 9 if this formula is used.
                 expectedTotal = 9;
            }
        } else {
             expectedTotal = parseInt(formulaMatch[1], 10);
        }

        return {
            categories: categories,
            totalMaxPoints: totalMaxPoints,
            expectedTotalFromFormula: expectedTotal,
            match: expectedTotal ? (totalMaxPoints === expectedTotal) : null
        };
    }
};

// Export if module system is used, otherwise global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RubricParser;
}
