# Monitoring Targets System

## Overview

The monitoring targets system enables automated, scheduled ingestion of customer feedback from multiple review platforms. Each target represents a specific source (like a Trustpilot page or Reddit subreddit) that should be polled regularly for new reviews and feedback.

## Quick Setup

### 1. Seed Monitoring Targets

Run the seed script to create monitoring targets for 10+ review sites:

```bash
npx tsx scripts/seed-monitoring-targets.ts
```

This will create:
- 12 diverse monitoring targets across major platforms
- Active monitoring status for immediate polling
- Appropriate polling intervals based on platform characteristics

### 2. Verify in Dashboard

Visit `/dashboard/monitoring` to see:
- All active monitoring targets
- Real-time statistics
- Pause/Resume controls for each target
- Last check and next scheduled check times

## Monitoring Target Structure

Each monitoring target includes:

- **Source**: The review platform/page being monitored
- **Polling Interval**: How frequently to check for new content
- **Status**: `active`, `paused`, `failing`, or `disabled`
- **Health Metrics**: Consecutive failures, success rate
- **Schedule Info**: Last check, next check timestamps

## Polling Intervals by Platform

| Platform | Interval | Reason |
|----------|----------|--------|
| Reddit (brand mentions) | 1 hour | High volume, fast-moving discussions |
| App Store / Play Store | 6 hours | Moderate review frequency |
| Trustpilot | 6 hours | Active review platform |
| Google Maps | 24 hours | Slower review accumulation |
| G2 / Capterra | 24 hours | B2B platforms with fewer daily reviews |
| Yelp | 12 hours | Local business reviews |
| Generic Web | 2-24 hours | Varies by platform importance |

## Using the Monitoring Dashboard

### Pause a Target

Click the "Pause" button to temporarily stop polling a source. Useful for:
- Maintenance windows
- Rate limit management
- Temporarily disabling low-value sources

### Resume a Target

Click "Resume" to reactivate a paused target. The system will:
- Reset consecutive failure counter
- Schedule immediate check
- Resume regular polling interval

### Delete a Target

Click the trash icon to permanently remove a monitoring target. This will:
- Stop all future polling
- Keep historical ingestion data
- Require admin permissions

## Integration with Pipeline

Monitoring targets work with the ingestion pipeline:

1. **Scheduled Check**: When `next_check_at` arrives, the system triggers ingestion
2. **Run Pipeline**: Calls the scraping provider to fetch new content
3. **Extract Feedback**: Processes and extracts structured feedback
4. **Update Target**: Records check time, updates next check, tracks failures
5. **Store Results**: Saves to `ingestion_runs` table for audit trail

## Status Indicators

- **Active** (Green): Target is operational and polling on schedule
- **Paused** (Gray): Temporarily disabled by user
- **Failing** (Red): Multiple consecutive failures detected
- **Disabled** (Gray): Permanently disabled

## Troubleshooting

### High Consecutive Failures

If a target shows many failures:
1. Check source URL is still valid
2. Verify rate limits aren't exceeded
3. Review scraping provider logs
4. Consider increasing polling interval

### No Data Ingested

If monitoring is active but no data appears:
1. Verify source has new content
2. Check ingestion_runs table for error messages
3. Test source URL manually
4. Review RLS policies for data access

## Future Enhancements

- [ ] Automatic failure recovery with exponential backoff
- [ ] Email alerts for prolonged failures
- [ ] Dynamic interval adjustment based on content velocity
- [ ] Batch processing for multiple targets
- [ ] Webhook support for real-time notifications
- [ ] A/B testing different polling strategies

## Database Schema

### `monitoring_targets` Table

```sql
CREATE TABLE monitoring_targets (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  source_id UUID NOT NULL,
  status monitoring_status NOT NULL DEFAULT 'active',
  polling_interval_seconds INTEGER NOT NULL DEFAULT 86400,
  next_check_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ,
  last_content_hash TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Related Tables

- `sources`: Platform pages/URLs being monitored
- `ingestion_runs`: Historical log of each polling attempt
- `raw_feedback`: Extracted feedback items from ingestion
