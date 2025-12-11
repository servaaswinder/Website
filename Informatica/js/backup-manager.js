window.BackupManager = {
    // CSV Header Definition
    HEADERS: [
        "Email", 
        "Naam", 
        "Klas", 
        "AssignmentID", 
        "Periode", 
        "Cijfer", 
        "Opmerking", 
        "Rubric_JSON", 
        "GradedBy", 
        "GradedAt"
    ],

    exportData: async function() {
        if (!confirm("Wil je een backup maken van alle resultaten?")) return;

        const statusMsg = document.getElementById('backup-status');
        if (statusMsg) statusMsg.textContent = "Data ophalen...";

        try {
            const resultsRef = firebase.firestore().collection("results");
            const snapshot = await resultsRef.get();
            
            let csvRows = [];
            // Add Header
            csvRows.push(this.HEADERS.join(","));

            snapshot.forEach(doc => {
                const data = doc.data();
                const studentEmail = data.email || "";
                const studentName = data.name || "";
                const studentClass = data.class || "";

                if (data.assignments && Array.isArray(data.assignments)) {
                    data.assignments.forEach(a => {
                        // Serialize Rubric
                        const rubricJson = a.rubric ? JSON.stringify(a.rubric).replace(/"/g, '""') : ""; // Escape quotes for CSV
                        
                        const row = [
                            `"${studentEmail}"`,
                            `"${studentName}"`,
                            `"${studentClass}"`,
                            `"${a.assignmentId || a.title}"`,
                            `"${a.period || ""}"`,
                            `"${a.grade || ""}"`,
                            `"${(a.comment || "").replace(/"/g, '""')}"`,
                            `"${rubricJson}"`,
                            `"${a.gradedBy || ""}"`,
                            `"${a.gradedAt || ""}"`
                        ];
                        csvRows.push(row.join(","));
                    });
                }
            });

            const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\r\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            
            const date = new Date().toISOString().slice(0,16).replace(/[:T]/g,"-");
            link.setAttribute("download", `Backup_Informaticacijfers_${date}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (statusMsg) statusMsg.textContent = "Backup gedownload.";

        } catch (e) {
            console.error(e);
            alert("Fout bij exporteren: " + e.message);
        }
    },

    triggerImport: function() {
        document.getElementById('backup-file-input').click();
    },

    importData: async function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const confirmation = prompt("WAARSCHUWING: Dit zal alle huidige resultaten WISSEN en vervangen door de backup.\n\nTyp 'RESET' om te bevestigen.");
        if (confirmation !== "RESET") {
            event.target.value = ''; // Reset input
            return;
        }

        const statusMsg = document.getElementById('backup-status');
        if (statusMsg) statusMsg.textContent = "Bezig met herstellen...";

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    console.log("Parsed CSV:", results.data);
                    
                    // 1. Group by Email
                    const studentsMap = {};
                    
                    results.data.forEach(row => {
                        const email = row.Email;
                        if (!email) return;

                        if (!studentsMap[email]) {
                            studentsMap[email] = {
                                email: email,
                                name: row.Naam,
                                class: row.Klas,
                                assignments: []
                            };
                        }
                        
                        // Reconstruct Assignment Object
                        if (row.AssignmentID) {
                            let rubric = [];
                            try {
                                if (row.Rubric_JSON) {
                                    rubric = JSON.parse(row.Rubric_JSON);
                                }
                            } catch (e) { console.warn("Rubric parse error", e); }

                            studentsMap[email].assignments.push({
                                assignmentId: row.AssignmentID,
                                title: row.AssignmentID, // Fallback
                                period: row.Periode,
                                grade: row.Cijfer,
                                comment: row.Opmerking,
                                rubric: rubric,
                                gradedBy: row.GradedBy,
                                gradedAt: row.GradedAt
                            });
                        }
                    });

                    console.log("Reconstructed Data:", studentsMap);

                    // 2. Clear Collection (Batched or one-by-one)
                    const db = firebase.firestore();
                    const resultsRef = db.collection("results");
                    
                    // Delete all existing docs
                    const snapshot = await resultsRef.get();
                    const deleteBatchSize = 400; // Limit
                    // Simple approach: delete one by one or in chunks.
                    // For safety vs speed: delete all first.
                    const deletePromises = [];
                    snapshot.forEach(doc => {
                        deletePromises.push(doc.ref.delete());
                    });
                    await Promise.all(deletePromises);
                    console.log("Cleared existing results.");

                    // 3. Insert New Data
                    const entries = Object.values(studentsMap);
                    for (const student of entries) {
                        await resultsRef.add({
                            email: student.email,
                            name: student.name,
                            class: student.class,
                            assignments: student.assignments,
                            lastSyncedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }

                    if (statusMsg) statusMsg.textContent = "Herstel voltooid!";
                    alert("Backup succesvol teruggezet. Pagina wordt herladen.");
                    window.location.reload();

                } catch (e) {
                    console.error(e);
                    alert("Fout bij importeren: " + e.message);
                } finally {
                    event.target.value = ''; // Reset
                }
            }
        });
    }
};
