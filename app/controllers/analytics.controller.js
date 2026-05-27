import prisma from '../config/prismaClient.js';

const getScanCounts = async (req, res) => {
  try {
    const userId = req.user?.id || req.query?.userId || req.body?.userId;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing user context' });

    // allow overriding threshold via query param (default: 50)
    const threshold = Number(req.query?.riskThreshold) || 50;

    const [dailyRows, monthlyRows, yearlyRows, monthlyStatusRows] = await Promise.all([
      prisma.$queryRaw`
        SELECT DATE("createdAt") AS period, SUM("totalProfiles")::int AS total
        FROM "Analysis"
        WHERE "userId" = ${userId}
        GROUP BY period
        ORDER BY period;
      `,
      prisma.$queryRaw`
        SELECT DATE_TRUNC('month', "createdAt") AS period, SUM("totalProfiles")::int AS total
        FROM "Analysis"
        WHERE "userId" = ${userId}
        GROUP BY period
        ORDER BY period;
      `,
      prisma.$queryRaw`
        SELECT DATE_TRUNC('year', "createdAt") AS period, SUM("totalProfiles")::int AS total
        FROM "Analysis"
        WHERE "userId" = ${userId}
        GROUP BY period
        ORDER BY period;
      `,
      prisma.$queryRaw`
        SELECT DATE_TRUNC('month', pr."createdAt") AS period,
               SUM(CASE WHEN pr."riskScore" >= ${threshold} THEN 1 ELSE 0 END)::int AS suspicious,
               SUM(CASE WHEN pr."riskScore" < ${threshold} THEN 1 ELSE 0 END)::int AS genuine
        FROM "ProfileResult" pr
        JOIN "Entry" e ON e.id = pr."entryId"
        JOIN "Analysis" a ON a.id = e."analysisId"
        WHERE a."userId" = ${userId}
        GROUP BY period
        ORDER BY period;
      `
    ]);

    const fmtDaily = (rows) => (rows || []).map((r) => {
      const d = r.period && r.period.toISOString ? r.period.toISOString().slice(0, 10) : String(r.period);
      return { period: d, total: Number(r.total) || 0 };
    });

    const fmtMonth = (rows) => (rows || []).map((r) => {
      const d = r.period && r.period.toISOString ? r.period.toISOString().slice(0, 7) + '-01' : String(r.period);
      return { period: d, total: Number(r.total) || 0 };
    });

    const fmtYear = (rows) => (rows || []).map((r) => {
      const d = r.period && r.period.toISOString ? r.period.toISOString().slice(0, 4) + '-01-01' : String(r.period);
      return { period: d, total: Number(r.total) || 0 };
    });

    const fmtMonthBreakdown = (rows) => (rows || []).map((r) => {
      const d = r.period && r.period.toISOString ? r.period.toISOString().slice(0, 7) + '-01' : String(r.period);
      return { period: d, suspicious: Number(r.suspicious) || 0, genuine: Number(r.genuine) || 0 };
    });

    return res.json({
      success: true,
      daily: fmtDaily(dailyRows),
      monthly: fmtMonth(monthlyRows),
      yearly: fmtYear(yearlyRows),
      monthlyBreakdown: fmtMonthBreakdown(monthlyStatusRows)
    });
  } catch (err) {
    console.error('Analytics Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch scan counts' });
  }
};

export { getScanCounts };
