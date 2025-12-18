/**
 * Grading UI Manager
 * Handles the interactive rubric modal for teachers.
 * Dependencies: RubricParser (must be loaded)
 */

const GradingUI = {
    currentSubmissionId: null,
    currentRubricData: null,
    selectedCells: {}, // Map<CategoryName, PointsValue>
    teacherComment: "",
    isDirty: false,

    init: function() {
        // Create modal structure if not exists
        if (!document.getElementById('grading-modal')) {
            this.createModal();
        }
        // Bind events
        document.getElementById('close-grading-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('save-draft-btn').addEventListener('click', () => this.saveDraft());
        document.getElementById('finalize-grade-btn').addEventListener('click', () => this.finalizeGrade());
        document.getElementById('delete-grading-btn').addEventListener('click', () => this.deleteGrading()); // New Binding
        document.getElementById('grading-comment').addEventListener('input', (e) => {
            this.teacherComment = e.target.value;
            this.isDirty = true;
        });
    },

    createModal: function() {
        const modalHtml = `
            <div id="grading-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; overflow-y: auto;">
                <div style="background: white; max-width: 85vw; margin: 20px auto; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); display: flex; flex-direction: column; max-height: 95vh;">
                    
                    <div style="padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; border-radius: 8px 8px 0 0;">
                        <h3 style="margin: 0;">Nakijken: <span id="grading-student-name">...</span></h3>
                        <button id="close-grading-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                    </div>

                    <div style="padding: 20px; overflow-y: auto; flex: 1;">
                        
                        <div style="display: flex; gap: 20px; margin-bottom: 20px; align-items: flex-start;">
                            <div style="flex: 1;">
                                <strong style="font-size: 1.2em;">Opdracht: <span id="grading-assignment-title">...</span></strong><br>
                                <a id="grading-rubric-link" href="#" target="_blank" style="font-size: 0.95em; color: #0044B3; text-decoration: underline; margin-right: 15px;">📄 Open opdrachtbeschrijving</a>
                                <a id="grading-student-link" href="#" target="_blank" style="display:none; font-size: 0.95em; color: #28a745; text-decoration: underline;">🔗 Open werk van leerling</a>
                            </div>
                            <div style="text-align: right; background: #f0f8ff; padding: 10px 15px; border-radius: 8px; border: 1px solid #cce5ff;">
                                <div style="font-size: 0.9em; color: #555; margin-bottom: 2px;">Cijfer</div>
                                <div style="font-size: 2em; font-weight: bold; color: #0044B3; line-height: 1;"><span id="grading-calculated-grade">-</span></div>
                                <div style="font-size: 0.85em; color: #666; margin-top: 4px;">(<span id="grading-total-points">0</span> / <span id="grading-max-points">0</span> pt)</div>
                            </div>
                        </div>

                        <h4 style="border-bottom: 2px solid #0044B3; padding-bottom: 8px; margin-bottom: 15px;">Beoordelingsmodel</h4>
                        <!-- Wrapper for horizontal text scroll if needed -->
                        <div style="overflow-x: auto;">
                            <div id="grading-rubric-container">Laden...</div>
                        </div>

                        <h4 style="border-bottom: 2px solid #0044B3; padding-bottom: 8px; margin-top: 30px; margin-bottom: 15px;">Opmerkingen & Feedback</h4>
                        <textarea id="grading-comment" placeholder="Typ hier feedback voor de leerling..." style="width: 100%; min-height: 120px; padding: 12px; border: 1px solid #ccc; border-radius: 4px; font-family: inherit; font-size: 1rem; line-height: 1.5; resize: vertical;"></textarea>

                    </div>

                    <div style="padding: 15px 20px; border-top: 1px solid #eee; background: #f8f9fa; border-radius: 0 0 8px 8px; text-align: right; display: flex; justify-content: flex-end; gap: 10px; align-items: center;">
                        <button id="delete-grading-btn" style="background: none; border: 1px solid #dc3545; color: #dc3545; padding: 10px 15px; border-radius: 4px; font-size:0.9em; margin-right: auto; cursor:pointer;" title="Inzending resetten en cijfer wissen">Wis Resultaat</button>
                        <span id="grading-status-msg" style="font-style: italic; color: #666;"></span>
                        
                        <!-- Period Selector -->
                        <div style="display: flex; align-items: center; gap: 5px; margin-right: 10px;">
                            <label for="grading-period" style="font-size: 0.9em; font-weight: 600; color: #555;">Periode:</label>
                            <select id="grading-period" style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; background: white;">
                                <option value="" disabled selected>Kies...</option>
                                <option value="P1">P1</option>
                                <option value="P2">P2</option>
                                <option value="P3">P3</option>
                                <option value="P4">P4</option>
                            </select>
                        </div>

                        <button id="save-draft-btn" class="action-btn secondary" style="padding: 10px 20px;">Concept opslaan</button>
                        <button id="finalize-grade-btn" class="action-btn" style="background-color: #28a745; padding: 10px 20px; font-weight: 600;">Afronden & Cijfer opslaan</button>
                    </div>
                </div>
            </div>
            
            <style>
                /* ... exisiting styles ... */
                .rubric-grid {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                    table-layout: fixed; /* Force equal widths */
                    display: table !important; /* Force table behavior */
                }
                .rubric-grid thead {
                    display: table-header-group !important;
                }
                .rubric-grid tbody {
                    display: table-row-group !important;
                }
                .rubric-grid tr {
                    display: table-row !important;
                }
                .rubric-grid th, .rubric-grid td {
                    border: 1px solid #e1e4e8;
                    padding: 12px;
                    vertical-align: top;
                    display: table-cell !important;
                    float: none !important;
                }
                .rubric-grid th {
                    background-color: #f1f8ff;
                    color: #24292e;
                    font-weight: 600;
                    text-align: center;
                    border-bottom: 2px solid #e1e4e8;
                    position: sticky; /* Keep header visible if scrolling */
                    top: 0;
                    z-index: 10;
                }
                .category-col {
                    background-color: #fafbfc;
                    border-right: 2px solid #e1e4e8;
                    vertical-align: middle !important;
                }
                .category-title {
                    font-size: 1.0em;
                    font-weight: 700;
                    color: #24292e;
                    margin-bottom: 4px;
                }
                .category-weight {
                    font-weight: normal;
                    color: #586069;
                    background: #eff3f6;
                    padding: 2px 6px;
                    border-radius: 12px;
                    font-size: 0.8em;
                    display: inline-block;
                    border: 1px solid #e1e4e8;
                }
                .rubric-cell {
                    cursor: pointer;
                    transition: all 0.2s ease;
                    position: relative;
                    background: #fff;
                }
                .rubric-cell:hover {
                    background-color: #f6f8fa;
                    border-color: #0366d6;
                }
                .rubric-cell.selected {
                    background-color: #f1f8ff;
                    border: 2px solid #0366d6; /* Highlight border */
                    box-shadow: inset 0 0 0 1px #0366d6;
                }
                .rubric-cell.selected::after {
                    content: "✔";
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    color: #0366d6;
                    font-weight: bold;
                    font-size: 1.2em;
                }
                .point-badge {
                    display: inline-block;
                    min-width: 24px;
                    height: 24px;
                    line-height: 24px;
                    border-radius: 50%;
                    background: #eee;
                    color: #444;
                    text-align: center;
                    font-weight: bold;
                    margin-bottom: 8px;
                    font-size: 0.9em;
                }
                .rubric-cell.selected .point-badge {
                    background: #0366d6;
                    color: white;
                }
                .cell-desc {
                    font-size: 0.95em;
                    line-height: 1.5;
                    color: #24292e;
                }
                .rubric-cell.selected .point-badge {
                    background: #0366d6;
                    color: white;
                }
                .cell-desc {
                    font-size: 0.95em;
                    line-height: 1.5;
                    color: #24292e;
                }
            </style>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    // Mapping of Assignment IDs to their definition files
    ASSIGNMENT_MAP: {
        "A3": "opdrachten/portfoliostartopdracht_a3.html",
        "A2": "opdrachten/a2_communiceren.html",
        "A5": "opdrachten/a5_onderzoeken.html",
        "F2": "opdrachten/f2_maatschappij.html",
        "A4": "opdrachten/a4_orienteren.html",
        "A1": "opdrachten/a1_informatievaardigheden.html",
        "A7": "opdrachten/a7_waarderen.html",
        "E2": "opdrachten/e2_security.html",
        "F4": "opdrachten/f4_security.html",
        "F3": "opdrachten/f3_privacy.html",
        "ModIntro": "opdrachten/modintro_leren_modelleren.html",
        "A6": "opdrachten/a6_modelleren.html",
        "C5": "opdrachten/c5_gestructureerde_data.html",
        "C1": "opdrachten/c1_warming_stripes.html",
        "C2": "opdrachten/c2_identificeren.html",
        "B3": "opdrachten/b3_automaten.html",
        "B1": "opdrachten/b1_algoritme.html",
        "B2": "opdrachten/b2_datastructuren.html",
        "C3": "opdrachten/c3_representeren.html",
        "D1": "opdrachten/d1_ontwikkelen.html",
        "D2": "opdrachten/d2_inspecteren.html",
        "B4": "opdrachten/b4_introductie_html.html",
        "F1": "opdrachten/f1_usability.html",
        "C4": "opdrachten/c4_standaard_representaties.html",
        "E1": "opdrachten/e1_decompositie.html",
        "Eind1": "opdrachten/eindopdracht_gamedev.html",
        "Eind2": "opdrachten/eindopdracht_webshop.html"
    },

    open: async function(submissionId, submissionData, forceGrading = false) {
        this.currentSubmissionId = submissionId;
        this.currentSubmissionData = submissionData; // Assign this!
        this.currentRubricData = null;
        this.selectedCells = {};
        this.teacherComment = submissionData.teacherComment || "";
        this.isDirty = false;

        // Determine display name
        const displayName = submissionData.userName || submissionData.name || submissionData.userEmail || "Onbekend";
        document.getElementById('grading-student-name').textContent = displayName;
        document.getElementById('grading-assignment-title').textContent = submissionData.assignmentId;
        
        // 1. Rubric Link (Trusted source)
        let rubricLink = submissionData.assignmentUrl; // Fallback
        if (this.ASSIGNMENT_MAP && this.ASSIGNMENT_MAP[submissionData.assignmentId]) {
            rubricLink = this.ASSIGNMENT_MAP[submissionData.assignmentId];
        }
        document.getElementById('grading-rubric-link').href = rubricLink; 

        // 2. Student Link (Portfolio)
        const studentLink = document.getElementById('grading-student-link');
        if (submissionData.assignmentUrl && submissionData.assignmentUrl !== rubricLink) {
             studentLink.href = submissionData.assignmentUrl;
             studentLink.textContent = "🔗 Open werk van leerling";
             studentLink.style.display = 'inline-block';
             studentLink.style.color = '#28a745';
             studentLink.style.pointerEvents = 'auto';
             studentLink.style.textDecoration = 'underline';
        } else {
             // Fallback for manual/old assignments
             studentLink.removeAttribute('href');
             studentLink.textContent = "⚠️ Geen link (Handmatig/Legacy)";
             studentLink.style.display = 'inline-block';
             studentLink.style.color = '#999';
             studentLink.style.pointerEvents = 'none';
             studentLink.style.textDecoration = 'none';
        } 

        document.getElementById('grading-comment').value = this.teacherComment;
        document.getElementById('grading-rubric-container').innerHTML = '<div style="padding: 20px; text-align: center;">Beoordelingsmodel laden...</div>';
        document.getElementById('grading-modal').style.display = 'block';
        document.body.style.overflow = 'hidden';

        // Load Rubric
        const tryFetch = async (url) => {
            console.log(`[GradingUI] Trying to fetch: ${url}`);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
            return await response.text();
        };

        try {
            // 1. Try relative path
            let html = "";
            let finalUrl = "";
            const variants = [
                this.ASSIGNMENT_MAP[submissionData.assignmentId], // Preferred
                `opdrachten/${submissionData.assignmentId}.html`, // Fallback 1
                `${submissionData.assignmentId}.html`             // Fallback 2
            ];

            for (const path of variants) {
                if (!path) continue;
                try {
                    html = await tryFetch(path);
                    finalUrl = path;
                    break;
                } catch (e) { console.warn("Fetch failed:", path); }
            }

            if (!html) throw new Error("Kan opdrachtbestand niet laden locaal.");

            // Use RubricParser (must be available globally)
            if (typeof RubricParser === 'undefined') {
                throw new Error("RubricParser library not loaded.");
            }

            const result = RubricParser.parse(html);
            if (result.error) {
                throw new Error(result.error);
            }

            this.currentRubricData = result;
            this.renderRubric(result);
            
            // Set Period if available
            if (submissionData.period) {
                 const periodSelect = document.getElementById('grading-period');
                 if (periodSelect) periodSelect.value = submissionData.period;
            }

            // Restore Selection and State
            if (this.currentSubmissionData.gradingDraft && this.currentSubmissionData.gradingDraft.selectedCells) {
                 this.selectedCells = this.currentSubmissionData.gradingDraft.selectedCells;
                 this.teacherComment = this.currentSubmissionData.gradingDraft.comment || this.teacherComment;
                 this.updateUISelection();
                 this.updateCalculation(); 
            } else if (this.currentSubmissionData.finalRubric) {
                 this.selectedCells = this.currentSubmissionData.finalRubric;
                 if (this.currentSubmissionData.teacherComment) {
                     this.teacherComment = this.currentSubmissionData.teacherComment;
                 }
                 this.updateUISelection();
                 this.updateCalculation();
            } else if (this.currentSubmissionData.csvRubric) {
                 // Smart Restore from CSV (New Feature)
                 this.applyCsvRubric(this.currentSubmissionData.csvRubric);
            }
            
            // Apply Comment to UI
            document.getElementById('grading-comment').value = this.teacherComment;
            this.updateUISelection();
            this.updateCalculation();

            // Lock submission
            await this.lockSubmission(submissionId, forceGrading);

        } catch (error) {
            console.error(error);
            const errorDiv = document.createElement('div');
            errorDiv.style.color = 'red';
            errorDiv.style.padding = '20px';
            errorDiv.style.background = '#ffe6e6';
            errorDiv.style.border = '1px solid red';
            errorDiv.innerHTML = `<strong>Fout bij laden beoordelingsmodel:</strong><br>${error.message}<br><br><em>Tried fetching: ${submissionData.assignmentUrl}</em>`;
            document.getElementById('grading-rubric-container').innerHTML = '';
            document.getElementById('grading-rubric-container').appendChild(errorDiv);
            
            // Explicit alert for user to see
            alert(`DEBUG INFO:\nFout bij ophalen pagina.\nOorspronkelijke URL: ${submissionData.assignmentUrl}\nFoutmelding: ${error.message}`);
        }
    },

    applyCsvRubric: function(csvRubric) {
        if (!this.currentRubricData || !csvRubric) return;
        
        console.log("Applying CSV Rubric:", csvRubric);

        // Helper to clean strings for comparison
        const cleanStr = (s) => (s || "").toLowerCase().replace(/[:\.\s]+/g, ' ').trim();

        csvRubric.forEach(item => {
            // Find category by name with loose matching
            const itemTheme = cleanStr(item.theme);
            
            const catIndex = this.currentRubricData.categories.findIndex(c => {
                const catName = cleanStr(c.name);
                // 1. Exact cleaned match
                if (catName === itemTheme) return true;
                // 2. Substring match (e.g. "Layout" in "Layout of site")
                if (catName.includes(itemTheme) || itemTheme.includes(catName)) return true;
                return false;
            });

            if (catIndex !== -1) {
                const category = this.currentRubricData.categories[catIndex];
                let points = parseFloat(item.value.toString().replace(',','.'));
                
                if (isNaN(points)) return;

                // Logic: matched points to rubric options.
                // If value > maxPoints, it might be the weighted value.
                if (points > category.rawMaxPoints) {
                    if (category.weight > 0 && (points / category.weight) <= category.rawMaxPoints) {
                         points = points / category.weight;
                    }
                }
                
                // Assume integer steps for buttons
                points = Math.round(points);

                if (points >= 0 && points <= category.rawMaxPoints) {
                    this.selectedCells[catIndex] = points; // Set directly to avoid UI redraw loops
                }
            }
        });
        // UI update called after this returns by the caller
    },

    renderRubric: function(data) {
        const container = document.getElementById('grading-rubric-container');
        
        // Determine max columns for header (0 to Max)
        let maxCols = 0;
        data.categories.forEach(c => maxCols = Math.max(maxCols, c.rawMaxPoints + 1));
        
        // Determine Min Column (skip 0 if unused)
        let minCol = maxCols; // Start high
        if (data.categories.length === 0) minCol = 0;
        
        data.categories.forEach(cat => {
            if (cat.descriptions) {
                 // Check indices 0 to rawMax
                 // Since descriptions is a sparse array, custom iteration or check
                 if (cat.descriptions[0]) minCol = 0;
                 else {
                     // Check finding first non-empty
                     for (let i = 0; i < cat.descriptions.length; i++) {
                         if (cat.descriptions[i]) {
                             minCol = Math.min(minCol, i);
                             break;
                         }
                     }
                 }
            } else {
                minCol = 0; // Fallback
            }
        });
        if (minCol === maxCols) minCol = 0; // If nothing found, default 0

        let html = '<table class="rubric-grid">';
        
        // Main Header Row (Points)
        html += '<thead><tr>';
        html += '<th style="width: 200px;">Categorie</th>'; // Fixed width for category
        for (let i = minCol; i < maxCols; i++) {
            html += `<th>${i} Punt${i!==1?'en':''}</th>`;
        }
        html += '</tr></thead><tbody>';

        data.categories.forEach((cat, index) => {
            html += `<tr>`;
            
            // Category Column
            html += `<td class="category-col">`;
            html += `<div class="category-title">${cat.name}</div>`;
            html += `<div class="category-weight">Weging: ${cat.weight}x</div>`;
            html += `</td>`;
            
            // Score Columns
            for (let i = minCol; i < maxCols; i++) {
                if (i <= cat.rawMaxPoints) {
                    const isSelected = GradingUI.selectedCells[index] === i;
                    const desc = cat.descriptions && cat.descriptions[i] ? cat.descriptions[i] : '<span style="color:#999; font-style:italic;">Geen beschrijving</span>';
                    
                    html += `<td class="rubric-cell ${isSelected ? 'selected' : ''}" data-cat-index="${index}" data-points="${i}" onclick="GradingUI.selectCell(${index}, ${i})">`;
                    html += `<div class="point-badge">${i}</div>`;
                    html += `<div class="cell-desc">${desc}</div>`;
                    html += `</td>`;
                } else {
                    html += `<td style="background: #fafbfc; border: 1px solid #eee;"></td>`; // Empty/disabled cell
                }
            }
            html += `</tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
        
        document.getElementById('grading-max-points').textContent = data.totalMaxPoints;
    },

    selectCell: function(catIndex, points) {
        // Toggle logic: If already selected, deselect it
        if (this.selectedCells[catIndex] === points) {
            delete this.selectedCells[catIndex];
        } else {
            this.selectedCells[catIndex] = points;
        }
        
        this.updateUISelection();
        this.updateCalculation();
        this.isDirty = true;
    },

    updateUISelection: function() {
        // Clear all selected classes
        document.querySelectorAll('.rubric-cell.selected').forEach(el => el.classList.remove('selected'));
        
        // Apply selected classes
        for (const [catIndex, points] of Object.entries(this.selectedCells)) {
            const cell = document.querySelector(`.rubric-cell[data-cat-index="${catIndex}"][data-points="${points}"]`);
            if (cell) cell.classList.add('selected');
        }
    },

    updateCalculation: function() {
        if (!this.currentRubricData) return;
        
        let totalPoints = 0;
        let allSelected = true;

        this.currentRubricData.categories.forEach((cat, index) => {
            if (this.selectedCells[index] !== undefined) {
                totalPoints += this.selectedCells[index] * cat.weight;
            } else {
                allSelected = false;
            }
        });

        document.getElementById('grading-total-points').textContent = totalPoints;
        
        // Calculate Grade: (Points / Max) * 9 + 1
        // Or if max is 9, Points + 1 (But uniform formula handles both)
        const max = this.currentRubricData.totalMaxPoints;
        const grade = ((totalPoints / max) * 9) + 1;
        
        // Round to 1 decimal
        const displayGrade = Math.round(grade * 10) / 10;
        document.getElementById('grading-calculated-grade').textContent = displayGrade.toFixed(1);
    },

    lockSubmission: async function(docId, forceGrading = false) {
        // Only lock if status is pending (or already grading) OR if forced
        // Do NOT change status if it is already 'checked' or 'rejected', UNLESS forced (Reopen)
        const currentStatus = this.currentSubmissionData ? this.currentSubmissionData.status : null;
        
        if (!forceGrading && (currentStatus === 'checked' || currentStatus === 'rejected')) {
            console.log("Skipping lock: Submission is already final (" + currentStatus + ") and not forced.");
            return;
        }

        const user = firebase.auth().currentUser;
        await firebase.firestore().collection("submissions").doc(docId).update({
            status: "grading",
            gradingBy: user.email,
            gradingStartedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    saveDraft: async function() {
        const statusMsg = document.getElementById('grading-status-msg');
        statusMsg.textContent = "Opslaan...";
        try {
            const user = firebase.auth().currentUser;
            await firebase.firestore().collection("submissions").doc(this.currentSubmissionId).update({
                gradingDraft: {
                    selectedCells: this.selectedCells,
                    comment: this.teacherComment
                },
                teacherComment: this.teacherComment, // Sync comment to main field too
                // Force status to 'grading' so it reappears in inbox
                status: "grading",
                gradingBy: user.email
            });
            
            this.isDirty = false;
            this.closeModal();
            
            // Refresh parent page list if available
            if (typeof loadSubmissions === 'function') {
                loadSubmissions();
            } else {
                window.location.reload();
            }
            
        } catch (e) {
            console.error(e);
            statusMsg.textContent = "Fout bij opslaan!";
            alert("Fout bij opslaan concept: " + e.message);
        }
    },

    finalizeGrade: async function() {
        if (!confirm("Weet je zeker dat je dit cijfer wilt afronden? De leerling kan dit zien bij de resultaten.")) return;
        
        const statusMsg = document.getElementById('grading-status-msg');
        statusMsg.textContent = "Afronden...";
        
        try {
            const calculatedGrade = document.getElementById('grading-calculated-grade').textContent;
            const selectedPeriod = document.getElementById('grading-period').value; // Get Period
            
            if (!selectedPeriod) {
                alert("Selecteer eerst een periode (P1-P4) voordat je het cijfer afrondt.");
                return;
            }
            
            const user = firebase.auth().currentUser;
            const teacherEmail = user ? user.email : 'Unknown';
            const studentEmail = this.currentSubmissionData.userEmail ? this.currentSubmissionData.userEmail.toLowerCase() : null;
            
            // 1. Update the Submission Document
            await firebase.firestore().collection("submissions").doc(this.currentSubmissionId).update({
                status: "checked",
                grade: calculatedGrade,
                teacherComment: this.teacherComment,
                finalRubric: this.selectedCells,
                period: selectedPeriod, // Save period to submission for reopening
                checkedBy: teacherEmail,
                checkedAt: firebase.firestore.FieldValue.serverTimestamp(),
                gradingDraft: firebase.firestore.FieldValue.delete() // Remove draft
            });

            // 2. Sync to 'results' collection (Student Database)
            if (studentEmail) {
                try {
                    const resultsRef = firebase.firestore().collection("results");
                    // Try exact match first (original case)
                    let snapshot = await resultsRef.where("email", "==", this.currentSubmissionData.userEmail).limit(1).get();
                    
                    // If not found, try lowercase
                    if (snapshot.empty && this.currentSubmissionData.userEmail !== studentEmail) {
                        snapshot = await resultsRef.where("email", "==", studentEmail).limit(1).get();
                    }
                    
                    if (!snapshot.empty) {
                        const studentDoc = snapshot.docs[0];
                        const studentData = studentDoc.data();
                        let assignments = studentData.assignments || [];
                        
                        // Create assignment object
                        const assignmentTitle = this.currentSubmissionData.assignmentId || "Opdracht";
                        const assignmentObj = {
                            title: assignmentTitle,
                            grade: calculatedGrade,
                            comment: this.teacherComment,
                            rubric: Object.entries(this.selectedCells).map(([catIdx, score]) => ({
                                theme: this.currentRubricData.categories[catIdx].name,
                                value: score
                            })),
                            period: selectedPeriod, // Add Period
                            gradedAt: new Date().toISOString(),
                            gradedBy: teacherEmail,
                            assignmentId: assignmentTitle
                        };
                        
                        // Remove existing entry for this assignment if it exists
                        assignments = assignments.filter(a => a.title !== assignmentTitle);
                        assignments.push(assignmentObj);
                        
                        await studentDoc.ref.update({
                            assignments: assignments,
                            lastSyncedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        console.log("Synced result to student record:", studentDoc.id);
                    } else {
                        // Create new result document
                        console.log("Creating new student record in 'results' for:", studentEmail);
                        
                        const studentName = this.currentSubmissionData.userName || this.currentSubmissionData.name || studentEmail.split('@')[0];
                        const studentClass = this.currentSubmissionData.userClass || this.currentSubmissionData.class || 'Onbekend';
                        
                        const assignmentTitle = this.currentSubmissionData.assignmentId || "Opdracht";
                        const assignmentObj = {
                            title: assignmentTitle,
                            grade: calculatedGrade,
                            comment: this.teacherComment,
                            rubric: Object.entries(this.selectedCells).map(([catIdx, score]) => ({
                                theme: this.currentRubricData.categories[catIdx].name,
                                value: score
                            })),
                            period: selectedPeriod, // Add Period
                            gradedAt: new Date().toISOString(),
                            gradedBy: teacherEmail,
                            assignmentId: assignmentTitle
                        };
                        
                        await resultsRef.add({
                            email: studentEmail,
                            name: studentName,
                            class: studentClass,
                            assignments: [assignmentObj],
                            lastSyncedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                } catch (syncErr) {
                    console.error("Error syncing to results collection:", syncErr);
                    alert("Let op: Cijfer is opgeslagen in inlevering, maar NIET in leerlingdossier (results). Fout: " + syncErr.message);
                }
            }

            this.isDirty = false;
            this.closeModal();
            
            // Refresh parent
            if (typeof refreshDashboard === 'function') {
                refreshDashboard();
            } else if (typeof loadSubmissions === 'function') {
                loadSubmissions();
            } else {
                window.location.reload();
            }
            
        } catch (e) {
            console.error(e);
            statusMsg.textContent = "Fout bij afronden!";
            alert("Fout bij afronden: " + e.message);
        }
    },

    deleteGrading: async function() {
        if (!confirm("LET OP: Weet je zeker dat je deze beoordeling wilt verwijderen?\n\n- Het cijfer wordt gewist.\n- De inzending wordt VOLLEDIG VERWIJDERD (ook geen backup meer).\n\nWil je doorgaan?")) return;
        
        const statusMsg = document.getElementById('grading-status-msg');
        statusMsg.textContent = "Wissen...";
        
        try {
            const studentEmail = this.currentSubmissionData.userEmail;
            const assignmentTitle = this.currentSubmissionData.assignmentId || "Opdracht";
            
            // 1. Remove from 'results' collection
            if (studentEmail) {
                const resultsRef = firebase.firestore().collection("results");
                // Try exact match first
                let snapshot = await resultsRef.where("email", "==", studentEmail).limit(1).get();
                 if (snapshot.empty && studentEmail) {
                    snapshot = await resultsRef.where("email", "==", studentEmail.toLowerCase()).limit(1).get();
                }

                if (!snapshot.empty) {
                    const studentDoc = snapshot.docs[0];
                    const studentData = studentDoc.data();
                    let assignments = studentData.assignments || [];
                    
                    // Filter out this assignment
                    const originalLength = assignments.length;
                    assignments = assignments.filter(a => a.title !== assignmentTitle && a.assignmentId !== assignmentTitle);
                    
                    if (assignments.length < originalLength) {
                        await studentDoc.ref.update({
                            assignments: assignments,
                            lastSyncedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        console.log("Removed result from student record.");
                    }
                }
            }

            // 2. Reset Submission Document
            // User requested full deletion ("ook niet pending")
            await firebase.firestore().collection("submissions").doc(this.currentSubmissionId).delete();

            this.isDirty = false;
            this.closeModal();
            
            // Refresh parent
            if (typeof refreshDashboard === 'function') {
                refreshDashboard();
            } else if (typeof loadSubmissions === 'function') {
                loadSubmissions();
            } else {
                window.location.reload();
            }

        } catch (e) {
            console.error(e);
            statusMsg.textContent = "Fout bij wissen!";
            alert("Fout bij wissen: " + e.message);
        }
    },

    closeModal: async function() {
        if (this.isDirty) {
            if (!confirm("Je hebt wijzigingen die nog niet zijn opgeslagen als concept. Wil je toch sluiten?")) return;
        }
        
        document.getElementById('grading-modal').style.display = 'none';
        document.body.style.overflow = '';
        
        // Only unlock if we are closing without finishing?
        // Actually, if we close, we probably keep the lock until explicitly unlocked or finished?
        // But user might just want to stop grading for now.
        // Let's leave it in 'grading' status so Jaimy sees it.
        // Or should we revert to 'pending' if no draft saved?
        // "Op het moment dat ik een inzending open, wil ik dat dit zichtbaar wordt... zodat Jaimy kan zien dat ik bezig ben".
        // So keeping it 'grading' is correct.
    }
};

window.GradingUI = GradingUI;
