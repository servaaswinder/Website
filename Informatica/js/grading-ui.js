/**
 * Grading UI Manager
 * Handles the interactive rubric modal for teachers.
 * Dependencies: RubricParser (must be loaded)
 */

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function sanitizeHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    tmp.querySelectorAll('script, iframe, object, embed, link').forEach(el => el.remove());
    tmp.querySelectorAll('*').forEach(el => {
        for (const attr of Array.from(el.attributes)) {
            if (attr.name.startsWith('on') || attr.value.trim().toLowerCase().startsWith('javascript:')) {
                el.removeAttribute(attr.name);
            }
        }
    });
    return tmp.innerHTML;
}

const GradingUI = {
    currentSubmissionId: null,
    currentRubricData: null,
    selectedCells: {}, // Map<CategoryName, PointsValue>
    teacherComment: "",
    isDirty: false,

    init: function () {
        // Create modal structure if not exists
        if (!document.getElementById('grading-modal')) {
            this.createModal();
        }
        // Bind events with checks
        const bind = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', fn);
            else console.warn(`[GradingUI] Element not found: ${id}`);
        };

        bind('close-grading-modal', () => this.closeModal());
        bind('save-draft-btn', () => this.saveDraft());
        bind('finalize-grade-btn', () => this.finalizeGrade());
        bind('release-grading-btn', () => this.releaseGrading());
        bind('delete-grading-btn', () => this.deleteGrading());

        const commentBox = document.getElementById('grading-comment');
        if (commentBox) {
            commentBox.addEventListener('input', (e) => {
                this.teacherComment = e.target.value;
                this.isDirty = true;
            });
        }
    },

    createModal: function () {
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
                                <div style="margin-top: 5px; padding-top: 5px; border-top: 1px solid #cce5ff;">
                                    <label style="font-size: 0.8em; cursor: pointer; color: #d63384; font-weight: 600;">
                                        <input type="checkbox" id="grading-late-check" onchange="GradingUI.updateCalculation()"> Te laat (Max 6.0)
                                    </label>
                                </div>
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
                        <button id="release-grading-btn" style="background: none; border: 1px solid #ffc107; color: #856404; background-color:#fff3cd; padding: 10px 15px; border-radius: 4px; font-size:0.9em; cursor:pointer; margin-right: 10px;" title="Stoppen met nakijken en vrijgeven voor collega's">🔓 Vrijgeven</button>
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
                    border: 2px solid #0366d6;
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
                /* AI-concept stijl: geel/oranje i.p.v. blauw */
                .rubric-cell.ai-selected {
                    background-color: #fffbea;
                    border: 2px solid #f59e0b;
                    box-shadow: inset 0 0 0 1px #f59e0b;
                }
                .rubric-cell.ai-selected::after {
                    content: "✦";
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    color: #d97706;
                    font-weight: bold;
                    font-size: 1.2em;
                }
                .rubric-cell.ai-selected .point-badge {
                    background: #f59e0b;
                    color: white;
                }
                /* AI banner bovenin modal */
                #ai-grading-banner {
                    background: #fffbea;
                    border: 1px solid #f59e0b;
                    border-radius: 6px;
                    padding: 8px 14px;
                    margin-bottom: 16px;
                    font-size: 0.9em;
                    color: #92400e;
                    display: flex;
                    align-items: center;
                    gap: 8px;
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
            </style>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    // Mapping loaded from shared assignment-map.js
    ASSIGNMENT_MAP: ASSIGNMENT_MAP,
    ASSIGNMENT_TITLES: ASSIGNMENT_TITLES,

    open: async function (submissionId, submissionData, forceGrading = false, readOnly = false) {
        this.currentSubmissionId = submissionId;
        this.currentSubmissionData = submissionData; // Assign this!
        this.currentRubricData = null;
        this.selectedCells = {};
        this.isReadOnly = !!readOnly; // Ensure boolean
        this.isAIGraded = !!submissionData.gradedByAI; // Track AI concept

        // Setup Modal Title
        const displayName = submissionData.userName || submissionData.name || submissionData.userEmail || "Onbekend";
        document.getElementById('grading-student-name').textContent = displayName + (readOnly ? " (Inzien)" : "");

        const title = this.ASSIGNMENT_TITLES[submissionData.assignmentId] || submissionData.assignmentId;
        document.getElementById('grading-assignment-title').innerHTML = `${escapeHtml(submissionData.assignmentId)} <small style="font-weight:normal; color:#666;"> - ${escapeHtml(title)}</small>`;

        // Comment Handling
        if (submissionData.status === 'pending') {
            this.teacherComment = "";
        } else {
            this.teacherComment = submissionData.teacherComment || "";
        }

        // Late Check Restore
        const lateCheck = document.getElementById('grading-late-check');
        if (lateCheck) {
            lateCheck.checked = !!submissionData.isLate; // Restore if saved
        }

        const commentBox = document.getElementById('grading-comment');
        commentBox.value = this.teacherComment;
        commentBox.readOnly = readOnly;
        commentBox.style.backgroundColor = readOnly ? "#f9f9f9" : "white";

        this.isDirty = false;

        // 1. Rubric Link (Trusted source)
        let rubricLink = submissionData.assignmentUrl; // Fallback
        if (this.ASSIGNMENT_MAP && this.ASSIGNMENT_MAP[submissionData.assignmentId]) {
            rubricLink = this.ASSIGNMENT_MAP[submissionData.assignmentId];
        }
        document.getElementById('grading-rubric-link').href = rubricLink;

        // 2. Student Link (Portfolio)
        const studentLink = document.getElementById('grading-student-link');
        // Logic: if URL provided AND it's not just the rubric itself (legacy fallback)
        if (submissionData.assignmentUrl && submissionData.assignmentUrl.length > 5 && submissionData.assignmentUrl !== rubricLink) {
            studentLink.href = submissionData.assignmentUrl;
            studentLink.textContent = "🔗 Open werk van leerling";
            studentLink.style.display = 'inline-block';
            studentLink.style.color = '#28a745';
            studentLink.style.pointerEvents = 'auto';
            studentLink.style.textDecoration = 'underline';
        } else {
            // If manual entry with no link or same as rubric
            studentLink.removeAttribute('href');
            studentLink.textContent = "⚠️ Geen link beschikbaar";
            studentLink.style.display = 'inline-block';
            studentLink.style.color = '#999';
            studentLink.style.pointerEvents = 'none';
            studentLink.style.textDecoration = 'none';
        }

        document.getElementById('grading-rubric-container').innerHTML = '<div style="padding: 20px; text-align: center;">Beoordelingsmodel laden...</div>';

        // AI banner tonen/verbergen
        let aiBanner = document.getElementById('ai-grading-banner');
        if (this.isAIGraded) {
            if (!aiBanner) {
                aiBanner = document.createElement('div');
                aiBanner.id = 'ai-grading-banner';
                document.getElementById('grading-rubric-container').before(aiBanner);
            }
            aiBanner.innerHTML = '🤖 <strong>Concept door AI</strong> — Controleer de beoordeling en rond af. De gele vakjes zijn door AI geselecteerd.';
            aiBanner.style.display = 'flex';
        } else if (aiBanner) {
            aiBanner.style.display = 'none';
        }

        document.getElementById('grading-modal').style.display = 'block';
        document.body.style.overflow = 'hidden';

        // --- Handle Buttons for Read-Only ---
        const footerBtns = document.querySelector('#grading-modal .action-btn').parentElement; // The container
        // We can just query by ID
        const btnRelease = document.getElementById('release-grading-btn');
        const btnDelete = document.getElementById('delete-grading-btn');
        const btnSave = document.getElementById('save-draft-btn');
        const btnFinalize = document.getElementById('finalize-grade-btn');
        const periodSelect = document.getElementById('grading-period');

        if (readOnly) {
            if (btnRelease) btnRelease.style.display = 'none';
            if (btnDelete) btnDelete.style.display = 'none';
            if (btnSave) btnSave.style.display = 'none';
            if (btnFinalize) btnFinalize.style.display = 'none';
            if (periodSelect) periodSelect.disabled = true;

            // Add "Edit" button if not exists
            if (!document.getElementById('edit-grading-btn')) {
                const editBtn = document.createElement('button');
                editBtn.id = 'edit-grading-btn';
                editBtn.className = 'action-btn';
                editBtn.style.backgroundColor = '#ffc107';
                editBtn.style.color = '#333';
                editBtn.innerHTML = '✏️ Bewerken starten';
                editBtn.style.marginRight = '10px';
                editBtn.onclick = () => {
                    // Close and Reopen in Edit Mode
                    GradingUI.open(submissionId, submissionData, true, false);
                };
                // Insert before Close/Finalize
                footerBtns.appendChild(editBtn);
            } else {
                document.getElementById('edit-grading-btn').style.display = 'inline-block';
            }
        } else {
            if (btnRelease) btnRelease.style.display = 'inline-block';
            if (btnDelete) btnDelete.style.display = 'inline-block';
            if (btnSave) btnSave.style.display = 'inline-block';
            if (btnFinalize) btnFinalize.style.display = 'inline-block';
            if (periodSelect) periodSelect.disabled = false;
            if (document.getElementById('edit-grading-btn')) {
                document.getElementById('edit-grading-btn').style.display = 'none';
            }
        }

        // Load Rubric — prefer snapshot from submission, fallback to live fetch
        try {
            if (submissionData.rubricSnapshot &&
                submissionData.rubricSnapshot.categories &&
                submissionData.rubricSnapshot.categories.length > 0) {
                // Use stored rubric snapshot (captured at submission time)
                this.currentRubricData = submissionData.rubricSnapshot;
                this.renderRubric(submissionData.rubricSnapshot);
            } else {
                // Fallback: fetch rubric from live HTML file
                const tryFetch = async (url) => {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
                    return await response.text();
                };

                let html = "";
                const variants = [
                    this.ASSIGNMENT_MAP[submissionData.assignmentId],
                    `opdrachten/${submissionData.assignmentId}.html`,
                    `${submissionData.assignmentId}.html`
                ];

                for (const path of variants) {
                    if (!path) continue;
                    try {
                        html = await tryFetch(path);
                        break;
                    } catch (e) { console.warn("Fetch failed:", path); }
                }

                if (!html) throw new Error("Kan opdrachtbestand niet laden locaal.");

                if (typeof RubricParser === 'undefined') {
                    throw new Error("RubricParser library not loaded.");
                }

                const result = RubricParser.parse(html);
                if (result.error) throw new Error(result.error);

                this.currentRubricData = result;
                this.renderRubric(result);
            }

            // Set Period if available
            if (submissionData.period) {
                const periodSelect = document.getElementById('grading-period');
                if (periodSelect) {
                    // Normalize "1" to "P1" just in case
                    let p = String(submissionData.period);
                    if (!p.startsWith('P') && ['1', '2', '3', '4'].includes(p)) p = 'P' + p;
                    periodSelect.value = p;
                }
            }

        // Initialize per-category AI styling tracking
        this.aiGradedCategories = {};

        // Restore Selection and State
        // 1. DRAFT (Highest priority)
        if (this.currentSubmissionData.gradingDraft && this.currentSubmissionData.gradingDraft.selectedCells) {
            // Normalize "row-X" to "X" for AI backward compatibility
            const normalizedCells = {};
            for (const [key, value] of Object.entries(this.currentSubmissionData.gradingDraft.selectedCells)) {
                const normalizedKey = key.toString().replace("row-", "");
                normalizedCells[normalizedKey] = value;
                
                // If this is an AI draft, mark these specific categories as AI graded initially
                if (this.isAIGraded) {
                    this.aiGradedCategories[normalizedKey] = true;
                }
            }
            this.selectedCells = normalizedCells;
            
            this.teacherComment = this.currentSubmissionData.gradingDraft.comment || this.teacherComment;
            this.updateUISelection();
            this.updateCalculation();

                // CRITICAL: If restoring DRAFT, and we are NOT read-only, ensure status is synced?
                // No, usually status is already 'grading' if draft exists. 
                // But if we clicked "Bewerken", we might need to lock it now if it wasn't locked.
                if (!this.isReadOnly && this.currentSubmissionData.status === 'pending') {
                    await this.lockSubmission(submissionId, forceGrading);
                }

                // 2. FINAL (If already graded)
            } else if (this.currentSubmissionData.finalRubric) {
                this.selectedCells = this.currentSubmissionData.finalRubric;
                if (this.currentSubmissionData.teacherComment) {
                    this.teacherComment = this.currentSubmissionData.teacherComment;
                }
                this.updateUISelection();
                this.updateCalculation();
                // 3. CSV IMPORT RESTORE
            } else if (this.currentSubmissionData.csvRubric) {
                this.applyCsvRubric(this.currentSubmissionData.csvRubric);
                // 4. PREVIOUS GRADED ASSIGNMENT (Resubmission inheritance)
            } else {
                // Only check for previous grade if in edit mode, OR if we want to show it in read-only too?
                // Showing it in read-only is good.

                // We use the helper function from earlier changes in finalizeGrade.
                // NOTE: checkForPreviousGrade might trigger logic? No, just reads.
                this.checkForPreviousGrade(submissionData).then(prevData => {
                    if (prevData) {
                        // Fill Rubric if Rubric Empty?
                        //  if (prevData.rubric && Array.isArray(prevData.rubric)) {
                        //      // Only if we want to AUTO-FILL. User asked: "Als deze opdracht al een eerder is nagekeken moet in de rubric de vakjes aangekruist zijn".
                        //      // YES, pre-fill!
                        //      prevData.rubric.forEach(item => {
                        //          this.applyCsvRubric([item]);
                        //      });
                        //  }
                        // Let's defer rubric fill to explicit user action or just do it?
                        // "Als deze opdracht... moet de rubric... aangekruist zijn".
                        // So yes, do it. But maybe add a visual indicator.


                        // UPDATE UI with Timestamp Info
                        const titleEl = document.getElementById('grading-assignment-title');
                        if (titleEl) {
                            const prevDate = prevData.gradedAt ? new Date(prevData.gradedAt).toLocaleString() : "Eerder";
                            const curDate = submissionData.timestamp ? new Date(submissionData.timestamp.toDate()).toLocaleString() : "Nu";

                            titleEl.innerHTML += `<div style="font-size: 0.6em; margin-top: 4px; color: #d63384; background: #fff0f6; padding: 2px 6px; border-radius: 4px; display: inline-block;">
                                 ⚠️ <strong>Herkansing</strong> (Vorige: ${escapeHtml(String(prevData.grade))} op ${escapeHtml(prevDate)})<br>
                                 Ingeleverd: ${escapeHtml(curDate)}
                             </div>`;
                        }

                        // FILL RUBRIC (If empty?)
                        if (Object.keys(this.selectedCells).length === 0 && prevData.rubric && Array.isArray(prevData.rubric)) {
                            prevData.rubric.forEach(item => {
                                this.applyCsvRubric([item]);
                            });
                            this.updateUISelection();
                            this.updateCalculation();
                        }

                        // Fill Comment Context
                        if (!this.teacherComment.includes("--- HERKANSING ---")) {
                            // Don't overwrite if already there
                            // Just append context
                        }

                        // Fill Comment
                        if (prevData.comment && !this.teacherComment) {
                            this.teacherComment = "--- HERBEOORDELING (Vorig cijfer: " + prevData.grade + ") ---\n" + prevData.comment;
                        } else {
                            this.teacherComment = "--- HERBEOORDELING (Vorig cijfer: " + prevData.grade + ") ---\n" + this.teacherComment;
                        }

                        document.getElementById('grading-comment').value = this.teacherComment;

                        // Show Notification
                        const statusMsg = document.getElementById('grading-status-msg');
                        statusMsg.textContent = "⚠️ Vorige beoordeling ingeladen!";
                        statusMsg.style.color = "#ff9800";
                    }
                });
            }

            // Show resubmission label regardless of rubric source
            if (submissionData.isResubmission) {
                this.checkForPreviousGrade(submissionData).then(prevData => {
                    if (prevData) {
                        const titleEl = document.getElementById('grading-assignment-title');
                        if (titleEl && !titleEl.innerHTML.includes('Herkansing')) {
                            const prevDate = prevData.gradedAt ? new Date(prevData.gradedAt).toLocaleString() : "Eerder";
                            const curDate = submissionData.timestamp ? new Date(submissionData.timestamp.toDate()).toLocaleString() : "Nu";
                            titleEl.innerHTML += `<div style="font-size: 0.6em; margin-top: 4px; color: #d63384; background: #fff0f6; padding: 2px 6px; border-radius: 4px; display: inline-block;">
                                ⚠️ <strong>Herkansing</strong> (Vorige: ${escapeHtml(String(prevData.grade))} op ${escapeHtml(prevDate)})<br>
                                Ingeleverd: ${escapeHtml(curDate)}
                            </div>`;
                        }
                    }
                });
            }

            // Apply Comment to UI
            document.getElementById('grading-comment').value = this.teacherComment;
            this.updateUISelection();
            this.updateCalculation();

            // Lock submission ONLY if NOT readOnly
            if (!this.isReadOnly) {
                await this.lockSubmission(submissionId, forceGrading);
            }

        } catch (error) {
            console.error(error);
            const errorDiv = document.createElement('div');
            errorDiv.style.color = 'red';
            errorDiv.style.padding = '20px';
            errorDiv.style.background = '#ffe6e6';
            errorDiv.style.border = '1px solid red';
            errorDiv.innerHTML = `<strong>Fout bij laden beoordelingsmodel:</strong><br>${escapeHtml(error.message)}<br><br><em>Tried fetching: ${escapeHtml(submissionData.assignmentUrl || '')}</em>`;
            document.getElementById('grading-rubric-container').innerHTML = '';
            document.getElementById('grading-rubric-container').appendChild(errorDiv);

            alert("Er ging iets mis bij het laden van het beoordelingsmodel. Probeer het opnieuw of neem contact op met de beheerder.");
        }
    },

    applyCsvRubric: function (csvRubric) {
        if (!this.currentRubricData || !csvRubric) return;

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
                let points = parseFloat(item.value.toString().replace(',', '.'));

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
                    if (this.aiGradedCategories) {
                        this.aiGradedCategories[catIndex] = false;
                    }
                }
            }
        });
        // UI update called after this returns by the caller
    },

    renderRubric: function (data) {
        const container = document.getElementById('grading-rubric-container');

        if (!data || !Array.isArray(data.categories)) {
            container.innerHTML = '<p style="color:#c00;">Ongeldig beoordelingsmodel: geen categorieën gevonden.</p>';
            return;
        }

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
            html += `<th>${i} Punt${i !== 1 ? 'en' : ''}</th>`;
        }
        html += '</tr></thead><tbody>';

        data.categories.forEach((cat, index) => {
            html += `<tr>`;

            // Category Column
            html += `<td class="category-col">`;
            html += `<div class="category-title">${escapeHtml(cat.name)}</div>`;
            html += `<div class="category-weight">Weging: ${cat.weight}x</div>`;
            html += `</td>`;

            // Score Columns
            for (let i = minCol; i < maxCols; i++) {
                if (i <= cat.rawMaxPoints) {
                    const isSelected = GradingUI.selectedCells[index] === i;
                    const rawDesc = cat.descriptions && cat.descriptions[i] ? cat.descriptions[i] : '';
                    const desc = rawDesc ? sanitizeHtml(rawDesc) : '<span style="color:#999; font-style:italic;">Geen beschrijving</span>';

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

    selectCell: function (catIndex, points) {
        if (this.isReadOnly) {
            return;
        }

        // If the teacher manually changes a rubric score, remove AI styling for THIS category
        if (this.aiGradedCategories && this.aiGradedCategories[catIndex]) {
            this.aiGradedCategories[catIndex] = false;
        }

        // Toggle: clicking an already-selected cell deselects it
        if (this.selectedCells[catIndex] === points) {
            delete this.selectedCells[catIndex];
        } else {
            this.selectedCells[catIndex] = points;
        }

        this.updateUISelection();
        this.updateCalculation();
        this.isDirty = true;
    },

    updateUISelection: function () {
        // Clear all selection classes
        document.querySelectorAll('.rubric-cell.selected, .rubric-cell.ai-selected').forEach(el => {
            el.classList.remove('selected');
            el.classList.remove('ai-selected');
        });

        // Apply selected classes — geel als AI-concept (per categorie), blauw als door docent
        for (const [catIndex, points] of Object.entries(this.selectedCells)) {
            const cellClass = (this.aiGradedCategories && this.aiGradedCategories[catIndex]) ? 'ai-selected' : 'selected';
            const cell = document.querySelector(`.rubric-cell[data-cat-index="${catIndex}"][data-points="${points}"]`);
            if (cell) cell.classList.add(cellClass);
        }
    },

    updateCalculation: function () {
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

        // Calculate Grade using the assignment's own formula: (Points / Max) * scale + offset.
        // Falls back to the standard (Points / Max) * 9 + 1 when the rubric has no parsed formula.
        const max = this.currentRubricData.totalMaxPoints;
        const scale = (typeof this.currentRubricData.formulaScale === 'number') ? this.currentRubricData.formulaScale : 9;
        const offset = (typeof this.currentRubricData.formulaOffset === 'number') ? this.currentRubricData.formulaOffset : 1;
        let grade = ((totalPoints / max) * scale) + offset;

        // --- TOO LATE CHECK ---
        const isLate = document.getElementById('grading-late-check')?.checked;
        if (isLate && grade > 6.0) {
            grade = 6.0;
        }

        // Round to 1 decimal
        const displayGrade = Math.round(grade * 10) / 10;
        document.getElementById('grading-calculated-grade').textContent = displayGrade.toFixed(1);
    },

    lockSubmission: async function (docId, forceGrading = false) {
        // Only lock if status is pending (or already grading) OR if forced
        // Do NOT change status if it is already 'checked' or 'rejected', UNLESS forced (Reopen)
        const currentStatus = this.currentSubmissionData ? this.currentSubmissionData.status : null;

        if (!forceGrading && (currentStatus === 'checked' || currentStatus === 'rejected')) {
            return;
        }

        const user = firebase.auth().currentUser;
        await firebase.firestore().collection("submissions").doc(docId).update({
            status: "grading",
            gradingBy: user.email,
            gradingStartedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    saveDraft: async function () {
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
            alert("Fout bij opslaan concept. Probeer het opnieuw.");
        }
    },

    finalizeGrade: async function () {
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
                gradingDraft: firebase.firestore.FieldValue.delete(), // Remove draft
                isLate: document.getElementById('grading-late-check')?.checked || false, // Feature 4
                history: firebase.firestore.FieldValue.arrayUnion({
                    action: 'checked',
                    timestamp: new Date(),
                    by: teacherEmail,
                    grade: calculatedGrade
                })
            });

            // 2. Sync to 'results' collection (Student Database)
            if (studentEmail) {
                try {
                    const resultsRef = firebase.firestore().collection("results");

                    // Use robust resolveStudentDocument from student-utils.js
                    // Note: GradingUI needs access to db. We can get it from firebase.firestore()
                    const db = firebase.firestore();
                    const userObj = {
                        email: this.currentSubmissionData.userEmail || studentEmail,
                        uid: this.currentSubmissionData.userId // might be undefined, which is fine
                    };

                    let studentDoc = null;
                    if (typeof resolveStudentDocument === 'function') {
                        const docSnapshot = await resolveStudentDocument(db, userObj, () => {});
                        if (docSnapshot && docSnapshot.exists) {
                            studentDoc = docSnapshot;
                        }
                    } else {
                        // Fallback if student-utils not loaded (should not happen in updated docenten.html)
                        console.warn("GradingUI: resolveStudentDocument not found, using legacy lookup.");
                        let snapshot = await resultsRef.where("email", "==", this.currentSubmissionData.userEmail).limit(1).get();
                        if (snapshot.empty) {
                            snapshot = await resultsRef.where("email", "==", studentEmail).limit(1).get();
                        }
                        if (!snapshot.empty) studentDoc = snapshot.docs[0];
                    }

                    if (studentDoc) {
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
                            assignmentId: assignmentTitle,
                            // Preserve metadata from submission
                            timestamp: this.currentSubmissionData.timestamp || null,
                            history: this.currentSubmissionData.history || [],
                            isLate: document.getElementById('grading-late-check')?.checked || false
                        };

                        // Remove existing entry for this assignment if it exists
                        assignments = assignments.filter(a => a.title !== assignmentTitle);
                        assignments.push(assignmentObj);

                        await studentDoc.ref.update({
                            assignments: assignments,
                            lastSyncedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    } else {
                        // Create new result document
                        // IMPORTANT: Only create if really not found. 
                        // If we are here, it means resolveStudentDocument failed.
                        // We should prefer creating with the EXACT email from the submission IF it seems reliable,
                        // OR stick to lowercase to prevent duplicates if that's the policy.
                        // But user wants "Blokletters behouden".

                        // If the submission email HAS capitals, we use that for the NEW document email field.
                        const newEmail = this.currentSubmissionData.userEmail || studentEmail;

                        const studentName = this.currentSubmissionData.userName || this.currentSubmissionData.name || newEmail.split('@')[0];
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
                            assignmentId: assignmentTitle,
                            // Preserve metadata
                            timestamp: this.currentSubmissionData.timestamp || null,
                            history: this.currentSubmissionData.history || [],
                            isLate: document.getElementById('grading-late-check')?.checked || false
                        };

                        // Use sanitized ID to prevent weird chars in Doc ID
                        const newDocId = (typeof sanitizeDocId === 'function')
                            ? sanitizeDocId(newEmail)
                            : newEmail.toLowerCase().replace(/[^a-z0-9]+/g, '-');

                        await resultsRef.doc(newDocId).set({
                            email: newEmail, // Keep original casing in field
                            name: studentName,
                            class: studentClass,
                            assignments: [assignmentObj],
                            lastSyncedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                } catch (syncErr) {
                    console.error("Error syncing to results collection:", syncErr);
                    alert("Let op: Cijfer is opgeslagen in inlevering, maar NIET in leerlingdossier (results). Neem contact op met de beheerder.");
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
            alert("Fout bij afronden. Probeer het opnieuw.");
        }
    },

    deleteGrading: async function () {
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
            alert("Fout bij wissen. Probeer het opnieuw.");
        }
    },

    releaseGrading: async function () {
        // Reset status to pending so others can pick it up
        const statusMsg = document.getElementById('grading-status-msg');
        statusMsg.textContent = "Vrijgeven...";

        try {
            await firebase.firestore().collection("submissions").doc(this.currentSubmissionId).update({
                status: "pending",
                gradingBy: firebase.firestore.FieldValue.delete(),
                gradingStartedAt: firebase.firestore.FieldValue.delete(),
                gradingDraft: firebase.firestore.FieldValue.delete() // Also clear draft if any? Maybe better to keep draft? 
                // User asked: "I want to reset so my colleague can grade it". Implicitly "I didn't do anything useful yet". 
                // If we keep draft, the colleague sees my draft. That might be confusing or helpful. 
                // Let's Keep the draft! Just unlock it.
            });

            // Note: If we really want to remove the "lock", we should probably remove the field `gradingBy`.
            // Done above.

            this.isDirty = false; // No need to save
            this.closeModal();

            // Refresh parent
            if (typeof loadSubmissions === 'function') {
                loadSubmissions();
            } else {
                window.location.reload();
            }

        } catch (e) {
            console.error(e);
            statusMsg.textContent = "Fout bij vrijgeven!";
            alert("Fout bij vrijgeven. Probeer het opnieuw.");
        }
    },

    closeModal: async function () {
        if (this.isDirty) {
            if (!confirm("Je hebt wijzigingen die nog niet zijn opgeslagen als concept. Wil je toch sluiten?")) return;
        }

        document.getElementById('grading-modal').style.display = 'none';
        document.body.style.overflow = '';
    },

    checkForPreviousGrade: async function (submissionData) {
        try {
            const db = firebase.firestore();
            const studentEmail = submissionData.userEmail;
            const assignmentId = submissionData.assignmentId;

            if (!studentEmail || !assignmentId) return null;

            // Use resolveStudentDocument if available (it is in docenten.html now)
            let studentDoc = null;
            if (typeof resolveStudentDocument === 'function') {
                const docSnapshot = await resolveStudentDocument(db, { email: studentEmail }, () => { });
                if (docSnapshot && docSnapshot.exists) studentDoc = docSnapshot;
            }

            if (!studentDoc) return null;

            const data = studentDoc.data();
            if (data.assignments && Array.isArray(data.assignments)) {
                // Find matching assignment
                // Assuming assignmentId matches 'title' or 'assignmentId' in result object
                const found = data.assignments.find(a =>
                    a.title === assignmentId || a.assignmentId === assignmentId
                );
                return found || null;
            }
        } catch (e) {
            console.warn("Error checking previous grade:", e);
            return null;
        }
        return null;
    }
};

window.GradingUI = GradingUI;
