import db from './src/config/database.js';

const query = `
  SELECT series_id, series_name, start_date, end_date
  FROM tournaments 
  WHERE series_id = 10884;
`;

db.query(query)
  .then((result) => {
    console.log('\n=== Tournament Date Verification ===\n');
    
    if (result.rows.length > 0) {
      const tournament = result.rows[0];
      console.log('Tournament:', tournament.series_name);
      console.log('Series ID:', tournament.series_id);
      console.log('\nDates (timestamps):');
      console.log('Start:', tournament.start_date);
      console.log('End:', tournament.end_date);
      
      if (tournament.start_date && tournament.end_date) {
        const startDate = new Date(parseInt(tournament.start_date));
        const endDate = new Date(parseInt(tournament.end_date));
        
        console.log('\nFormatted Dates:');
        console.log('Start:', startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
        console.log('End:', endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
      }
    } else {
      console.log('No tournament found with ID 10884');
    }
    
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
