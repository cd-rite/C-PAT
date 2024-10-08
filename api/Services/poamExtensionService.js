/*
!#######################################################################
! C-PATTM SOFTWARE
! CRANE C-PATTM plan of action and milestones software. Use is governed by the Open Source Academic Research License Agreement contained in the file
! crane_C_PAT.1_license.txt, which is part of this software package. BY
! USING OR MODIFYING THIS SOFTWARE, YOU ARE AGREEING TO THE TERMS AND    
! CONDITIONS OF THE LICENSE.  
!########################################################################
*/

'use strict';
const dbUtils = require('./utils');

async function withConnection(callback) {
	const connection = await dbUtils.pool.getConnection();
    try {
        return await callback(connection);
    } finally {
        await connection.release();
    }
}

function addDays(date, days) {
    let result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

exports.getPoamExtension = async function (poamId) {
    return withConnection(async (connection) => {
        let sql = "SELECT poamId, extensionTimeAllowed, extensionJustification, scheduledCompletionDate FROM cpat.poam WHERE poamId = ?";
        let [poamExtensions] = await connection.query(sql, [poamId]);
        return poamExtensions;
    });
};

exports.putPoamExtension = async function (extensionData) {
    return withConnection(async (connection) => {
        try {
            let sql = `UPDATE cpat.poam SET 
                extensionTimeAllowed = ?, 
                extensionJustification = ?,
                mitigations = ?,
                requiredResources = ?,
                residualRisk = ?,
                likelihood = ?,
                impactDescription = ?,
                status = ?
                WHERE poamId = ?`;

            const params = [
                extensionData.extensionTimeAllowed,
                extensionData.extensionJustification,
                extensionData.mitigations,
                extensionData.requiredResources,
                extensionData.residualRisk,
                extensionData.likelihood,
                extensionData.impactDescription,
                extensionData.status,
                extensionData.poamId
            ];
            const [result] = await connection.query(sql, params);

            if (extensionData.poamLog && extensionData.poamLog.length > 0) {
                let action = `POAM Updated. Status: ${extensionData.status}`;
                if (extensionData.extensionTimeAllowed > 0) {
                    let scheduledCompletionDateQuery = `SELECT scheduledCompletionDate FROM cpat.poam WHERE poamId = ?`;
                    let [[scheduledCompletionDateResult]] = await connection.query(scheduledCompletionDateQuery, [extensionData.poamId]);
                    if (scheduledCompletionDateResult) {
                        let scheduledCompletionDate = new Date(scheduledCompletionDateResult.scheduledCompletionDate);
                        let deadlineWithExtension = new Date(scheduledCompletionDate.getTime() + extensionData.extensionTimeAllowed * 24 * 60 * 60 * 1000);
                        let formattedDeadline = deadlineWithExtension.toLocaleDateString("en-US");
                        action += `<br>Extension time requested: ${extensionData.extensionTimeAllowed} days<br>Extension Justification: ${extensionData.extensionJustification}<br>Deadline with Extension: ${formattedDeadline}`;
                    }
                }
                let logSql = "INSERT INTO cpat.poamlogs (poamId, action, userId) VALUES (?, ?, ?)";
                await connection.query(logSql, [extensionData.poamId, action, extensionData.poamLog[0].userId]);
            }

            return result;
        } catch (error) {
            return { error: error.message };
        }
    });
};

exports.deletePoamExtension = async function ({ poamId }) {
    return withConnection(async (connection) => {
        let sql = "UPDATE cpat.poam SET extensionTimeAllowed = NULL, extensionJustification = NULL WHERE poamId = ?";
        await connection.query(sql, [poamId]);
    });
};