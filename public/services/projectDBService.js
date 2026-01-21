const db = require("./db");
const fss = require("./fsServices")
const uuid = require("uuid-v4")

async function listProjects(uid) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT projectID, projectName
            FROM project
            WHERE projectOwnerUid = ?

            UNION

            SELECT p.projectID, p.projectName
            FROM project p
            JOIN projectShare ps ON ps.projectID = p.projectID
            WHERE ps.collabUid = ?
        `;

        db.all(sql, [uid, uid], (err, rows) => {
            if (err) {
                console.error('Error in listProjects query:', err);
                return reject(err);
            }
            resolve(rows);
        });
    });
}

async function createProject(data) {
    console.log("Data received: " + JSON.stringify(data))

    const sql = `INSERT INTO project (projectID, projectOwnerUid, projectName, dateCreate) VALUES (?, ?, ?, ?)`
    const params = [
        data.projectID,
        data.uid,
        data.projectName,
        new Date().toISOString()
    ]

    console.log("Params: " + params)
    try {
        await db.run(sql, params);
        await fss.createProjectFolder(data.projectID)

        console.log("Project created successfully")

        return true;
    } catch (error) {
        throw error;
    }
}

async function deleteProject(projectID) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🗑️  DELETING PROJECT: ${projectID}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
        // Get project details before deletion
        const projectInfo = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM project WHERE projectID = ?', [projectID], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (projectInfo) {
            console.log(`📋 Project Info:`);
            console.log(`   - Name: ${projectInfo.projectName}`);
            console.log(`   - Owner: ${projectInfo.projectOwnerUid}`);
            console.log(`   - Created: ${projectInfo.dateCreate}\n`);
        }

        // Count related data before deletion
        const counts = await Promise.all([
            new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM chat WHERE projectID = ?', [projectID], (err, row) => {
                    if (err) reject(err);
                    else resolve({ table: 'chat', count: row.count });
                });
            }),
            new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM documents WHERE projectID = ?', [projectID], (err, row) => {
                    if (err) reject(err);
                    else resolve({ table: 'documents', count: row.count });
                });
            }),
            new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM userStories WHERE projectID = ?', [projectID], (err, row) => {
                    if (err) reject(err);
                    else resolve({ table: 'userStories', count: row.count });
                });
            }),
            new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM requirements WHERE projectID = ?', [projectID], (err, row) => {
                    if (err) reject(err);
                    else resolve({ table: 'requirements', count: row.count });
                });
            }),
            new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM reports WHERE projectID = ?', [projectID], (err, row) => {
                    if (err) reject(err);
                    else resolve({ table: 'reports', count: row.count });
                });
            }),
            new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM projectShare WHERE projectID = ?', [projectID], (err, row) => {
                    if (err) reject(err);
                    else resolve({ table: 'projectShare', count: row.count });
                });
            }),
            new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM notification WHERE projectID = ?', [projectID], (err, row) => {
                    if (err) reject(err);
                    else resolve({ table: 'notification', count: row.count });
                });
            })
        ]);

        console.log(`📊 Database Records to Delete (CASCADE):`);
        counts.forEach(({ table, count }) => {
            if (count > 0) {
                console.log(`   ✓ ${table}: ${count} record(s)`);
            }
        });

        // Get conversation count (related to chats)
        const chatCount = counts.find(c => c.table === 'chat')?.count || 0;
        if (chatCount > 0) {
            const conversationCount = await new Promise((resolve, reject) => {
                db.get(`
                    SELECT COUNT(*) as count 
                    FROM conversation 
                    WHERE chatID IN (SELECT chatID FROM chat WHERE projectID = ?)
                `, [projectID], (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            });

            const responseCount = await new Promise((resolve, reject) => {
                db.get(`
                    SELECT COUNT(*) as count 
                    FROM response 
                    WHERE conversationID IN (
                        SELECT conversationID FROM conversation 
                        WHERE chatID IN (SELECT chatID FROM chat WHERE projectID = ?)
                    )
                `, [projectID], (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            });

            if (conversationCount > 0) {
                console.log(`   ✓ conversation: ${conversationCount} record(s)`);
            }
            if (responseCount > 0) {
                console.log(`   ✓ response: ${responseCount} record(s)`);
            }
        }

        console.log();

        // First delete the files from MinIO
        console.log(`🗄️  Deleting files from MinIO...`);
        await fss.deleteProjectFolder(projectID);
        console.log(`   ✓ MinIO files deleted\n`);

        // Manually delete from child tables to avoid foreign key mismatch errors
        // The CASCADE may not work properly due to schema issues with composite keys
        console.log(`💾 Deleting from database...`);

        const deleteFromTable = (tableName, whereClause, params) => {
            return new Promise((resolve) => {
                db.run(`DELETE FROM ${tableName} WHERE ${whereClause}`, params, function(err) {
                    if (err) {
                        console.log(`   ⚠️ Could not delete from ${tableName}: ${err.message}`);
                    } else if (this.changes > 0) {
                        console.log(`   ✓ Deleted ${this.changes} record(s) from ${tableName}`);
                    }
                    resolve(); // Always resolve to continue with other tables
                });
            });
        };

        // Delete from source/reference tables first (they reference userStories/requirements/documents)
        // These have foreign keys that may cause issues

        // Get all storyIDs for this project to delete from userStorySource
        const storyIDs = await new Promise((resolve, reject) => {
            db.all('SELECT storyID FROM userStories WHERE projectID = ?', [projectID], (err, rows) => {
                if (err) reject(err);
                else resolve(rows ? rows.map(r => r.storyID) : []);
            });
        });

        if (storyIDs.length > 0) {
            const placeholders = storyIDs.map(() => '?').join(',');
            await deleteFromTable('userStorySource', `storyID IN (${placeholders})`, storyIDs);
        }

        // Get all requirementsIDs for this project to delete from requirementsSource and requirementsStoryRef
        const reqIDs = await new Promise((resolve, reject) => {
            db.all('SELECT requirementsID FROM requirements WHERE projectID = ?', [projectID], (err, rows) => {
                if (err) reject(err);
                else resolve(rows ? rows.map(r => r.requirementsID) : []);
            });
        });

        if (reqIDs.length > 0) {
            const placeholders = reqIDs.map(() => '?').join(',');
            await deleteFromTable('requirementsSource', `requirementsID IN (${placeholders})`, reqIDs);
            await deleteFromTable('requirementsStoryRef', `requirementsID IN (${placeholders})`, reqIDs);
        }

        // Get all documentIDs for this project to delete from conversationDocRef
        const docIDs = await new Promise((resolve, reject) => {
            db.all('SELECT documentID FROM documents WHERE projectID = ?', [projectID], (err, rows) => {
                if (err) reject(err);
                else resolve(rows ? rows.map(r => r.documentID) : []);
            });
        });

        if (docIDs.length > 0) {
            const placeholders = docIDs.map(() => '?').join(',');
            await deleteFromTable('conversationDocRef', `documentID IN (${placeholders})`, docIDs);
        }

        // Get all conversationIDs for this project to delete responses
        const chatIDs = await new Promise((resolve, reject) => {
            db.all('SELECT chatID FROM chat WHERE projectID = ?', [projectID], (err, rows) => {
                if (err) reject(err);
                else resolve(rows ? rows.map(r => r.chatID) : []);
            });
        });

        if (chatIDs.length > 0) {
            const convIDs = await new Promise((resolve, reject) => {
                const placeholders = chatIDs.map(() => '?').join(',');
                db.all(`SELECT conversationID FROM conversation WHERE chatID IN (${placeholders})`, chatIDs, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows ? rows.map(r => r.conversationID) : []);
                });
            });

            if (convIDs.length > 0) {
                const placeholders = convIDs.map(() => '?').join(',');
                await deleteFromTable('response', `conversationID IN (${placeholders})`, convIDs);
                await deleteFromTable('conversationDocRef', `conversationID IN (${placeholders})`, convIDs);
            }

            // Delete conversations
            const chatPlaceholders = chatIDs.map(() => '?').join(',');
            await deleteFromTable('conversation', `chatID IN (${chatPlaceholders})`, chatIDs);
        }

        // Now delete from main tables that reference project directly
        await deleteFromTable('userStories', 'projectID = ?', [projectID]);
        await deleteFromTable('requirements', 'projectID = ?', [projectID]);
        await deleteFromTable('chat', 'projectID = ?', [projectID]);
        await deleteFromTable('documents', 'projectID = ?', [projectID]);
        await deleteFromTable('reports', 'projectID = ?', [projectID]);
        await deleteFromTable('voiceAnalysis', 'projectID = ?', [projectID]);
        await deleteFromTable('projectShare', 'projectID = ?', [projectID]);
        await deleteFromTable('notification', 'projectID = ?', [projectID]);

        // Finally delete the project itself
        const query = `DELETE FROM project WHERE projectID = ?`;

        return new Promise((resolve, reject) => {
            db.run(query, [projectID], function (err) {
                if (err) {
                    console.error('❌ Error deleting Project from database:', err);
                    return reject(err);
                }
                console.log(`   ✓ Project record deleted`);
                console.log(`\n${'='.repeat(60)}`);
                console.log(`✅ PROJECT DELETION COMPLETE`);
                console.log(`${'='.repeat(60)}\n`);
                resolve(true);
            });
        });
    } catch (err) {
        console.error(`❌ Error deleting project:`, err);
        console.log(`${'='.repeat(60)}\n`);
        throw err;
    }
}

async function renameProject(projectID, newProjectName) {
    console.log("Renaming project:", projectID, "to", newProjectName);

    const sql = `UPDATE project SET projectName = ? WHERE projectID = ?`;
    const params = [newProjectName, projectID];

    console.log("Params:", params);

    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                console.error('Error renaming project:', err);
                return reject(err);
            }

            if (this.changes === 0) {
                console.log("No project found with ID:", projectID);
                return reject(new Error("Project not found"));
            }

            console.log("Project renamed successfully");
            resolve(true);
        });
    });
}


async function queryProjectOwner(projectID) {
    const query = `
        SELECT projectOwnerUid
        FROM project
        WHERE projectID = ?
        LIMIT 1
    `;
    const params = [projectID];

    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) return reject(err);
            if (row) {
                console.log(`Project ${projectID} owner uid:`, row.projectOwnerUid);
                resolve(row.projectOwnerUid);
            } else {
                resolve(false);
            }
        });
    });
}

async function updateProjectShare(projectID, shareOptions) {

    const sql_invite = `INSERT INTO projectShare (shareID, projectID, collabUid, confirmed) VALUES (?, ?, ?, ?)`;
    const sql_delete = `DELETE FROM projectShare WHERE projectID = ? AND collabUid = ?`

    for (const option of shareOptions) {
        const { uid, operation } = option;

        switch (operation) {
            case "invite":
                console.log(`Setting up invitation for user ${uid} to project ${projectID}`)
                await db.run(sql_invite, [uuid(), projectID, uid, 0])
                await setupProjectShareNotification(projectID, uid)
                console.log("invite", uid);
                break;
            case "remove":
            case "remove-invite":
                console.log(`Removing / Deleting invitation / collaboration for user ${uid} for project ${projectID}`)
                await db.run(sql_delete, [projectID, uid])
                if (operation === "remove") {
                    await setProjectShareRemoveNotification(projectID, uid)
                }
                console.log("remove", uid);
                break;
            default:
                console.log("unknown operation", operation);
        }
    }
}

async function isProjectCollaborator(projectID, userID) {
    console.log(`Checking projectID: ${projectID} with userID ${userID}`)
    const query = `
        SELECT collabUid AS uid
        FROM projectShare
        WHERE projectID = ? AND collabUid = ?

        UNION ALL

        SELECT projectOwnerUid AS uid
        FROM project
        WHERE projectID = ? AND projectOwnerUid = ?

        LIMIT 1
    `;
    const param = [projectID, userID, projectID, userID];

    return new Promise((resolve, reject) => {
        db.get(query, param, (err, row) => {
            if (err) {
                console.error("DB error:", err);
                return reject(false);
            }
            console.log(`Is collaborator: ${!!row}`)
            resolve(!!row); // return true if row exists, else false
        });
    });
}

async function fetchProjectCollaborator(projectID) {
    const query = `
        SELECT
            user.firstName,
            user.lastName,
            user.userName,
            user.uid
        FROM projectShare ps
                 JOIN user
                      ON ps.collabUid = user.uid
        WHERE ps.projectID = ?;
    `;

    return new Promise((resolve, reject) => {
        db.all(query, [projectID], (err, rows) => {
            if (err) {
                console.error("Error fetching collaborators:", err);
                return reject(err);
            }
            resolve(rows);
        });
    });
}

async function fetchProjectName(projectID) {
    const query = `SELECT projectName FROM project WHERE projectID = ?`;

    return new Promise((resolve, reject) => {
        db.get(query, [projectID], (err, row) => {
            if (err) {
                console.error("Error fetching project name:", err);
                return reject(err);
            }
            resolve(row ? row.projectName : null);
        });
    });
}


async function setupProjectShareNotification(projectID, collaboratorID) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const projectName = await fetchProjectName(projectID);

        const params = [
            uuid(),
            collaboratorID,
            Date.now(),
            "invitation",
            projectID,
            `You are invited to join ${projectName}`,
            false
        ];

        return new Promise((resolve, reject) => {
            db.run(sql, params, (err) => {
                if (err) {
                    console.error("Error inserting notification:", err);
                    return reject(err);
                }
                resolve(true);
            });
        });

    } catch (err) {
        console.error("Notification setup failed:", err);
        return false;
    }
}

async function setProjectShareRemoveNotification(projectID, collaboratorID) {
    const sql = `
        INSERT INTO notification
            (notifID, receiveUid, dateReceive, kind, projectID, message, isRead)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const projectName = await fetchProjectName(projectID);

        const params = [
            uuid(),
            collaboratorID,
            Date.now(),
            "remove",
            projectID,
            `You have been removed from the project ${projectName}`,
            false
        ];

        return new Promise((resolve, reject) => {
            db.run(sql, params, (err) => {
                if (err) {
                    console.error("Error inserting notification:", err);
                    return reject(err);
                }
                resolve(true);
            });
        });

    } catch (err) {
        console.error("Notification setup failed:", err);
        return false;
    }
}

module.exports = {
    listProjects,
    createProject,
    deleteProject,
    renameProject,
    updateProjectShare,
    queryProjectOwner,
    isProjectCollaborator,
    fetchProjectCollaborator,
    fetchProjectName
}
