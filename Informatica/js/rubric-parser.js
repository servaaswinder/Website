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

        // Parse Headers to map columns to point values
        const headerCells = rubricTable.querySelectorAll('thead th');
        const colPointMap = []; // Index -> Point Value
        let headerHasNumbers = false;

        if (headerCells.length > 0) {
            headerCells.forEach((th, index) => {
                if (index === 0) return; // Skip Category
                const match = th.textContent.match(/(\d+)/);
                if (match) {
                    colPointMap[index] = parseInt(match[1], 10);
                    headerHasNumbers = true;
                } else {
                    // Fallback: assume standard 0-indexed progression if no numbers found
                    colPointMap[index] = index - 1; 
                }
            });
        }

        const rows = rubricTable.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length < 2) return;

            const categoryCell = cells[0];
            const categoryText = categoryCell.textContent.trim();
            
            // Extract Weight
            let weight = 1;
            const weightMatch = categoryText.match(/\(weging\s+(\d+)\)/i);
            if (weightMatch) {
                weight = parseInt(weightMatch[1], 10);
            } else if (categoryText.toLowerCase().includes('(max 2pt)')) {
                 // Explicit max point override in text? 
                 // Actually relying on "N.v.t." detection is better, but this is a safety.
                 // Let's stick to column detection mostly.
            }

            // Determine max points for this row
            // Find the last "active" column (not N.v.t.)
            let maxPointsIndex = cells.length - 1;
            for (let i = cells.length - 1; i >= 1; i--) {
                const cellText = cells[i].textContent.trim().toLowerCase();
                if (!cellText.includes('n.v.t.') && cellText !== '-') {
                    maxPointsIndex = i;
                    break;
                }
            }

            let rawMaxPoints = 0;
            if (headerHasNumbers && colPointMap[maxPointsIndex] !== undefined) {
                rawMaxPoints = colPointMap[maxPointsIndex];
            } else {
                // Fallback logic
                // If headers didn't have numbers, or we couldn't map, assume 0-indexed count
                // But account for excluded N.v.t columns
                // Effective score columns = maxPointsIndex (since index 1 is column 0)
                rawMaxPoints = maxPointsIndex - 1; 
            }
            
            // Extract descriptions for each point level
            // Extract descriptions for each point level, mapped by Point Value
            const descriptions = [];
            for (let i = 1; i < cells.length; i++) {
                const pointVal = colPointMap[i];
                if (pointVal !== undefined) {
                     descriptions[pointVal] = cells[i].innerHTML.trim();
                } else {
                     // Fallback: assume standard 0-based index if map fails
                     descriptions[i-1] = cells[i].innerHTML.trim();
                }
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
        
        let expectedTotal = 0;
        
        // Check for Strict Formula: ((Totaal - Deduction) / Scale) * 9 + 1
        // Example: ((Totaal - 2) / 10)
        let strictMatch = bodyText.match(/Cijfer\s*=\s*\(\(.*?-\s*(\d+)\)\s*\/\s*(\d+)\)/i);
        if (strictMatch) {
            expectedTotal = parseInt(strictMatch[2], 10) + parseInt(strictMatch[1], 10);
        } else {
            // Standard Formula: (Totaal / Max) * 9 + 1
            let formulaMatch = bodyText.match(/Cijfer\s*=\s*.*?(\d+)\s*\)\s*[\*×x]/i) || bodyText.match(/Cijfer\s*=\s*.*?(\d+)\s*[\*×x]/i);
            
            if (!formulaMatch) {
                if (bodyText.match(/Cijfer\s*=\s*.*?aantal punten\s*\+\s*1/i)) {
                     expectedTotal = 9;
                }
            } else {
                 expectedTotal = parseInt(formulaMatch[1], 10);
            }
        }

        // Extract the grade scale and offset from the formula, e.g. "... ) * 8 + 2".
        // Supports * × x as the multiplication sign. Falls back to null so the
        // caller can apply the standard * 9 + 1.
        let formulaScale = null;
        let formulaOffset = null;
        const scaleOffsetMatch = bodyText.match(/Cijfer\s*=\s*.*?[\*×x]\s*(\d+(?:[.,]\d+)?)\s*\+\s*(\d+(?:[.,]\d+)?)/i);
        if (scaleOffsetMatch) {
            formulaScale = parseFloat(scaleOffsetMatch[1].replace(',', '.'));
            formulaOffset = parseFloat(scaleOffsetMatch[2].replace(',', '.'));
        }

        return {
            categories: categories,
            totalMaxPoints: totalMaxPoints,
            expectedTotalFromFormula: expectedTotal,
            match: expectedTotal ? (totalMaxPoints === expectedTotal) : null,
            formulaScale: formulaScale,
            formulaOffset: formulaOffset
        };
    }
};

// Export if module system is used, otherwise global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RubricParser;
}
