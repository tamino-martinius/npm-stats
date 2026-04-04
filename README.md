# npm Stats

Automatically syncs your npm package data and download statistics and publishes aggregated statistics as JSON.

Full sync data is stored encrypted (AES-256-GCM) in Git LFS for delta syncs. The aggregated stats are committed as plain JSON.

## Setup

### 1. Fork this repository

### 2. Enable GitHub Actions

Workflows are disabled by default on forked repositories. Go to the **Actions** tab of your fork and click **"I understand my workflows, go ahead and enable them"**.

### 3. Add repository secrets

Go to **Settings > Secrets and variables > Actions** and add:

| Secret | Description | How to generate |
|--------|-------------|-----------------|
| `ENCRYPTION_KEY` | 32-byte hex key for encrypting sync data | `openssl rand -hex 32` |

> **Note:** No npm token is needed — the npm registry API is public.

### 4. Run the setup workflow

Go to **Actions > Setup User Branch > Run workflow**. Enter your **npm username** when prompted. This creates a branch named after your GitHub username and commits a `config.json` with your npm username.

### 5. Enable the sync workflow

Scheduled workflows are disabled by default on forks, even after enabling Actions in step 2. Go to **Actions > Sync npm Stats** and click **"Enable workflow"** to activate the cron schedule.

### 6. Done

The sync workflow runs every 6 hours on your user branch. You can also trigger it manually from **Actions > Sync npm Stats > Run workflow**.

Your aggregated stats will be available at:
```
https://raw.githubusercontent.com/<you>/npm-stats/<you>/data/stats.json
```

## Configuration

Create or edit `config.json` on your user branch (see `config.schema.json` for the full schema):

```json
{
  "$schema": "./config.schema.json",
  "npmUsername": "your-npm-username",
  "timeZone": "America/New_York",
  "concurrency": 10,
  "maxRetries": 2,
  "pageSize": 250,
  "exclude": [
    "package-to-exclude"
  ]
}
```

| Field | Description |
|-------|-------------|
| `npmUsername` | **Required.** Your npm username (set automatically by the setup workflow) |
| `timeZone` | IANA time zone for grouping version publishes by date and hour (default: `UTC`) |
| `concurrency` | Number of concurrent API requests during sync |
| `maxRetries` | Maximum retries for failed API requests |
| `pageSize` | Number of items per page for search pagination (default: `250`) |
| `exclude` | Package names to exclude from aggregated stats but still sync |

## Output format

The `data/stats.json` file has this structure:

```typescript
{
  user: {
    username: string;
    versionsPerDate: {
      [date: string]: number;  // yyyy-MM-dd → version publish count
    };
    versionsPerHour: {
      [weekdayHour: string]: number;  // "ddd, hh" e.g. "Tue, 09"
    };
  };
  packages: {
    details: {
      name: string;
      description: string;
      latestVersion: string;
      license: string;
      keywords: string[];
      links: {
        npm?: string;
        homepage?: string;
        repository?: string;
        bugs?: string;
      };
    };
    downloadsPerDate: {
      [date: string]: number;  // yyyy-MM-dd → download count
    };
    versionsPerDate: {
      [date: string]: number;  // yyyy-MM-dd → version publish count
    };
    versionsPerHour: {
      [weekdayHour: string]: number;  // "ddd, hh" e.g. "Tue, 09"
    };
  }[];
}
```

Version publish dates and hours are grouped using the configured `timeZone` (defaults to UTC). Download dates are as reported by the npm registry (UTC).

## How it works

1. **Sync** (`src/scripts/sync.ts`): Decrypts previous data, fetches new package data and download statistics via [get-all-npm-contributions](https://github.com/tamino-martinius/node-get-all-npm-contributions), saves snapshots every 60 seconds (survives timeouts), encrypts and writes the full data.

2. **Stats** (`src/scripts/stats.ts`): Reads the encrypted data, checks for new data, aggregates per-package download and version publish stats, writes `stats.json`. Only triggers a commit when there is actual new data.

3. **Encryption**: AES-256-GCM with a random IV per write. The encrypted file is stored in Git LFS. Only the GitHub Actions workflow can decrypt it using the `ENCRYPTION_KEY` secret.
