import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'Fantasy',
  user: 'postgres',
  password: 'P@rvezn00r'
});

async function cleanupAndReset() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('\n🧹 Cleaning up Playing XI data after Match 846...\n');
    
    // Get baseline info
    const baselineQuery = `
      SELECT match_id, player_id, is_captain, is_vice_captain
      FROM team_playing_xi
      WHERE team_id = 103 AND match_id = 846
    `;
    const baseline = await client.query(baselineQuery);
    
    console.log('📋 Baseline (Match 846):');
    const baselineCaptain = baseline.rows.find(p => p.is_captain);
    const baselineVC = baseline.rows.find(p => p.is_vice_captain);
    console.log(`   Captain: ${baselineCaptain?.player_id}`);
    console.log(`   VC: ${baselineVC?.player_id}\n`);
    
    // Delete all Playing XI entries after Match 846 for this team
    const deleteXIQuery = `
      DELETE FROM team_playing_xi
      WHERE team_id = 103 AND match_id > 846
      RETURNING match_id
    `;
    const deletedXI = await client.query(deleteXIQuery);
    
    const deletedMatches = [...new Set(deletedXI.rows.map(r => r.match_id))];
    console.log(`🗑️  Deleted Playing XI for matches: ${deletedMatches.join(', ')}`);
    console.log(`   Total rows deleted: ${deletedXI.rowCount}\n`);
    
    // Delete transfer logs after Match 846
    const deleteTransfersQuery = `
      DELETE FROM playing_xi_transfers
      WHERE team_id = 103 AND match_id > 846
      RETURNING match_id, transfer_type
    `;
    const deletedTransfers = await client.query(deleteTransfersQuery);
    console.log(`🗑️  Deleted ${deletedTransfers.rowCount} transfer log entries\n`);
    
    // Reset captain_changes_made to 0
    const resetQuery = `
      UPDATE fantasy_teams
      SET captain_changes_made = 0
      WHERE id = 103
      RETURNING team_name, captain_changes_made
    `;
    const reset = await client.query(resetQuery);
    console.log(`✅ Reset captain_changes_made to 0 for: ${reset.rows[0].team_name}\n`);
    
    // Reset transfers_made to baseline (transfers made up to Match 846)
    const transferCountQuery = `
      SELECT COUNT(*) as count
      FROM playing_xi_transfers
      WHERE team_id = 103 AND transfer_type IN ('transfer_in', 'transfer_out')
    `;
    const transferCount = await client.query(transferCountQuery);
    
    const resetTransfersQuery = `
      UPDATE fantasy_teams
      SET transfers_made = $1
      WHERE id = 103
      RETURNING transfers_made
    `;
    const resetTransfers = await client.query(resetTransfersQuery, [parseInt(transferCount.rows[0].count) / 2]);
    console.log(`✅ Reset transfers_made to: ${resetTransfers.rows[0].transfers_made}\n`);
    
    await client.query('COMMIT');
    
    console.log('🎉 Cleanup complete! You can now start fresh from Match 847+\n');
    console.log('📝 Summary:');
    console.log(`   - Baseline match: 846`);
    console.log(`   - Baseline captain: ${baselineCaptain?.player_id}`);
    console.log(`   - Captain changes available: 1`);
    console.log(`   - Matches cleared: ${deletedMatches.join(', ')}`);
    console.log(`   - You can now make your ONE captain change after Match 846\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupAndReset();
