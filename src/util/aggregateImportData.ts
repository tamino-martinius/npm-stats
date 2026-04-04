import type { ImportData } from "get-all-npm-contributions";
import {
  AccountStats,
  PackageDetails,
  PackageStats,
  UserStats,
  DateKey,
  HourKey,
} from "../types/stats.js";
import { Formatter, getDateFormatter } from "./formatter.js";

function reduceWithFormatter<KeyType extends DateKey | HourKey>(props: {
  timestamps: number[];
  formatter: Formatter<KeyType>;
}) {
  return props.timestamps.reduce<Partial<Record<KeyType, number>>>((acc, timestamp) => {
    const key = props.formatter.format(timestamp);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

export function aggregateImportData(
  data: ImportData,
  exclude: string[] = [],
  timeZone: string = "UTC",
): AccountStats {
  const { dateFormatter, hourFormatter } = getDateFormatter(timeZone);

  // Aggregate user-level version publish stats (across all packages)
  const allVersionTimestamps = Object.values(data.packages).flatMap((pkg) =>
    Object.values(pkg.versions),
  );
  const versionsPerDate = reduceWithFormatter<DateKey>({
    timestamps: allVersionTimestamps,
    formatter: dateFormatter,
  });
  const versionsPerHour = reduceWithFormatter<HourKey>({
    timestamps: allVersionTimestamps,
    formatter: hourFormatter,
  });

  const user: UserStats = {
    username: data.username,
    versionsPerDate,
    versionsPerHour,
  };

  // Packages
  const packages = Object.values(data.packages).flatMap<PackageStats>((pkg) => {
    if (exclude.includes(pkg.name)) {
      return [];
    }

    const downloadsPerDate = pkg.downloads as Partial<Record<DateKey, number>>;
    const versionTimestamps = Object.values(pkg.versions);

    if (Object.keys(downloadsPerDate).length === 0 && versionTimestamps.length === 0) {
      return [];
    }

    const pkgVersionsPerDate = reduceWithFormatter<DateKey>({
      timestamps: versionTimestamps,
      formatter: dateFormatter,
    });
    const pkgVersionsPerHour = reduceWithFormatter<HourKey>({
      timestamps: versionTimestamps,
      formatter: hourFormatter,
    });

    const details: PackageDetails = {
      name: pkg.name,
      description: pkg.description,
      latestVersion: pkg.latestVersion,
      license: pkg.license,
      keywords: pkg.keywords,
      links: pkg.links,
    };

    return [{
      details,
      downloadsPerDate,
      versionsPerDate: pkgVersionsPerDate,
      versionsPerHour: pkgVersionsPerHour,
    }];
  });

  return { user, packages };
}
