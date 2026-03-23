// ONE-TIME BACKFILL SCRIPT
// Run this in the browser console on docenten.html (while logged in as admin)
// BEFORE merging rubric-improvements branch.
// This adds rubricSnapshot to all pending/grading submissions that don't have one.

(async function backfillRubricSnapshots() {
    const db = firebase.firestore();
    const statuses = ['pending', 'grading'];
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const status of statuses) {
        const snapshot = await db.collection('submissions')
            .where('status', '==', status)
            .get();

        console.log(`Found ${snapshot.size} submissions with status '${status}'`);

        for (const doc of snapshot.docs) {
            const data = doc.data();

            // Skip if already has a snapshot
            if (data.rubricSnapshot && data.rubricSnapshot.categories) {
                skipped++;
                continue;
            }

            const assignmentId = data.assignmentId;
            const path = ASSIGNMENT_MAP[assignmentId];

            if (!path) {
                console.warn(`No ASSIGNMENT_MAP entry for '${assignmentId}' (doc ${doc.id})`);
                failed++;
                continue;
            }

            try {
                const resp = await fetch(path);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const html = await resp.text();
                const parsed = RubricParser.parse(html);

                if (parsed.error) {
                    console.warn(`Parse error for ${assignmentId} (doc ${doc.id}):`, parsed.error);
                    failed++;
                    continue;
                }

                await doc.ref.update({ rubricSnapshot: parsed });
                updated++;
                console.log(`Updated ${doc.id} (${assignmentId}) - ${data.userEmail}`);
            } catch (err) {
                console.error(`Failed for ${doc.id} (${assignmentId}):`, err);
                failed++;
            }
        }
    }

    console.log(`\nBackfill complete: ${updated} updated, ${skipped} skipped (already had snapshot), ${failed} failed`);
})();
