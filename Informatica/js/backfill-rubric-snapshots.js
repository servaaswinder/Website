// ONE-TIME BACKFILL SCRIPT
// Run this in the browser console on docenten.html (while logged in as admin)
// BEFORE merging rubric-improvements branch.
// This adds rubricSnapshot to all pending/grading submissions that don't have one.

(async function backfillRubricSnapshots() {
    const db = firebase.firestore();
    const statuses = ['pending', 'grading'];
    const rubricCache = new Map();
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    let batch = db.batch();
    let batchSize = 0;

    const commitBatch = async () => {
        if (batchSize > 0) {
            await batch.commit();
            console.log(`Committed batch of ${batchSize} updates.`);
            batch = db.batch();
            batchSize = 0;
        }
    };

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

            // Use cache to avoid redundant fetches and parsing
            let parsed = rubricCache.get(assignmentId);
            if (parsed === undefined) {
                const path = ASSIGNMENT_MAP[assignmentId];
                if (!path) {
                    console.warn(`No ASSIGNMENT_MAP entry for '${assignmentId}' (doc ${doc.id})`);
                    rubricCache.set(assignmentId, null);
                    failed++;
                    continue;
                }

                try {
                    const resp = await fetch(path);
                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                    const html = await resp.text();
                    parsed = RubricParser.parse(html);

                    if (parsed.error) {
                        console.warn(`Parse error for ${assignmentId} (doc ${doc.id}):`, parsed.error);
                        rubricCache.set(assignmentId, null);
                        failed++;
                        continue;
                    }
                    rubricCache.set(assignmentId, parsed);
                } catch (err) {
                    console.error(`Failed to fetch/parse for ${assignmentId} (doc ${doc.id}):`, err);
                    rubricCache.set(assignmentId, null);
                    failed++;
                    continue;
                }
            }

            if (parsed === null) {
                failed++;
                continue;
            }

            // Use WriteBatch to group updates (Firestore limit: 500 per batch)
            batch.update(doc.ref, { rubricSnapshot: parsed });
            batchSize++;
            updated++;
            console.log(`Queued update for ${doc.id} (${assignmentId}) - ${data.userEmail}`);

            if (batchSize >= 500) {
                await commitBatch();
            }
        }
    }

    // Final commit for remaining operations
    await commitBatch();

    console.log(`\nBackfill complete: ${updated} updated, ${skipped} skipped (already had snapshot), ${failed} failed`);
})();
