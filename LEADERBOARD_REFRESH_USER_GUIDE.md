# 🔄 Leaderboard Refresh - User Guide

## Quick Start

### How to Update Leaderboard Points

1. **Navigate to League**
   - Go to your league page
   - Click on "Overview" tab

2. **Find the Leaderboard Section**
   - Scroll down to the "🏆 Leaderboard" section
   - You'll see the current rankings

3. **Click Refresh Button**
   - Look for the green **"🔄 Refresh & Update"** button in the top-right corner
   - Click it!

4. **Wait for Update**
   - Button will show "Updating Points..." with a spinner
   - This takes 2-5 seconds

5. **See Updated Rankings**
   - Leaderboard automatically refreshes with new points
   - Rankings may change based on recent matches!

## Visual Example

```
┌─────────────────────────────────────────────┐
│  🏆 Leaderboard     [🔄 Refresh & Update]  │
├─────────────────────────────────────────────┤
│                                             │
│  Rank  Team Name       Points  Avg  Trend  │
│  🥇 1   testuser1      1,401   175   ↑ 2   │
│  🥈 2   parvez         1,214   110   ↓ 1   │
│  🥉 3   Mohammed         652    82   −     │
│                                             │
└─────────────────────────────────────────────┘
```

## When to Use Refresh

### Use the refresh button when:
- ✅ New matches have been completed
- ✅ Player stats have been updated
- ✅ You want to see latest rankings
- ✅ Points seem outdated
- ✅ After multiple matches finish

### No need to refresh if:
- ❌ No new matches completed yet
- ❌ Just refreshed a minute ago
- ❌ Still waiting for player stats to be available

## What Gets Updated

When you click refresh, the system:

1. **Finds all matches** with available player stats
2. **Calculates points** for every player in Playing XI
3. **Applies multipliers** (Captain 2x, Vice-Captain 1.5x)
4. **Updates team scores** in the database
5. **Refreshes leaderboard** with new rankings

## Point Calculation Rules

### Batting Points
- **Run:** 1 point per run
- **Four:** 1 bonus point
- **Six:** 2 bonus points
- **Strike Rate > 150 (min 30 runs):** 6 bonus points

### Bowling Points
- **Wicket:** 25 points
- **Economy < 5 (min 2 wickets):** 6 bonus points

### Fielding Points
- **Catch:** 8 points
- **Stumping:** 12 points
- **Direct Run Out:** 12 points
- **Indirect Run Out:** 6 points

### Captain Bonus
- **Captain:** All points × 2
- **Vice Captain:** All points × 1.5

## Frequently Asked Questions

### Q: How often should I refresh?
**A:** Refresh after matches complete and player stats become available. Usually once per day or after major match days.

### Q: Will my old points be lost?
**A:** No! The refresh recalculates all points from scratch using the latest stats. Your historical points are preserved.

### Q: What if refresh shows an error?
**A:** Wait a moment and try again. If error persists, contact admin. The error message will show what went wrong.

### Q: Does refresh affect other teams?
**A:** Yes! Refresh recalculates points for ALL teams in the league, ensuring fair and up-to-date rankings.

### Q: Can I refresh multiple times?
**A:** Yes, but there's no benefit to refreshing multiple times quickly. The same data will be used unless new match stats arrive.

### Q: What if I have no Playing XI saved?
**A:** Your team won't score points for matches where you didn't save a Playing XI. Make sure to save your team before match deadlines!

## Troubleshooting

### Problem: Button doesn't respond
**Solution:** 
- Check your internet connection
- Refresh the page (F5)
- Try again in a few seconds

### Problem: "Failed to recalculate points" error
**Solution:**
- Wait 30 seconds and try again
- Check if backend server is running
- Contact admin if error persists

### Problem: Points don't change after refresh
**Solution:**
- This is normal if no new matches have stats available
- Player stats may not be in database yet
- Only matches with complete stats will have points

### Problem: Some matches show 0 points
**Solution:**
- You may not have saved Playing XI for those matches
- Player stats may not be available yet
- Check if match has been played

## Best Practices

### ✅ DO:
- Refresh once per day to stay updated
- Refresh after major match completion announcements
- Use refresh when rankings seem outdated
- Check last updated timestamp

### ❌ DON'T:
- Click refresh repeatedly (no benefit)
- Refresh during ongoing matches (stats not available yet)
- Panic if points don't update immediately
- Forget to save Playing XI before match deadlines

## Admin Notes

### For League Admins
The refresh feature can also be triggered via API:

```bash
POST /api/league/{leagueId}/recalculate-all-points
```

This is useful for:
- Automated scheduled updates
- Integration with external systems
- Batch processing after tournaments
- Testing and validation

### API Response
```json
{
  "success": true,
  "message": "Recalculation completed: 73 matches processed successfully, 0 errors",
  "data": {
    "totalMatches": 73,
    "successCount": 73,
    "errorCount": 0
  }
}
```

## Support

### Need Help?
- Check this guide first
- Review error messages carefully
- Contact league admin
- Report persistent issues on GitHub

### Feature Requests
If you'd like to see improvements to the refresh feature:
- Auto-refresh every X minutes
- Push notifications when points update
- Refresh status indicator
- Scheduled background updates

Submit your ideas to the development team!

---

## Summary

The **Leaderboard Refresh** feature gives you control over when points are calculated, ensuring you always have the latest rankings based on actual match performance. Just click the button and wait a few seconds - it's that easy!

**Remember:** Save your Playing XI before match deadlines to score points! 🏏

---

**Happy Fantasy Cricket!** 🏆
