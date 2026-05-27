import prisma from '../config/prismaClient.js';

const riskCategory = (score) => {
  if (score == null || Number.isNaN(Number(score))) return 'Unknown';
  const s = Number(score);
  if (s <= 30) return 'Genuine';
  if (s <= 60) return 'Monitor';
  return 'Suspicious';
};

const listProfiles = async (req, res) => {
  try {
    const userId = req.user?.id || req.query?.userId || req.body?.userId;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing user context' });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Number(req.query.limit) || 25);
    const skip = (page - 1) * limit;

    const { startDate, endDate, riskMin, riskMax, search, sort } = req.query;

    const and = [];
    // scope to user via Analysis -> Entry -> ProfileResult
    and.push({ entry: { Analysis: { userId } } });

    if (startDate) and.push({ createdAt: { gte: new Date(startDate) } });
    if (endDate) and.push({ createdAt: { lte: new Date(endDate) } });
    if (riskMin) and.push({ riskScore: { gte: Number(riskMin) } });
    if (riskMax) and.push({ riskScore: { lte: Number(riskMax) } });
    if (search) and.push({ entry: { userName: { contains: String(search) } } });

    const where = and.length ? { AND: and } : {};

    // sorting
    let orderBy = { createdAt: 'desc' };
    if (sort) {
      const [key, dir] = String(sort).split(':');
      const direction = dir === 'asc' ? 'asc' : 'desc';
      if (key === 'score') orderBy = { riskScore: direction };
      else if (key === 'followers') orderBy = { entry: { followers: direction } };
      else if (key === 'date') orderBy = { createdAt: direction };
    }

    const [total, rows] = await Promise.all([
      prisma.profileResult.count({ where }),
      prisma.profileResult.findMany({
        where,
        include: { entry: { include: { Analysis: true } } },
        orderBy,
        skip,
        take: limit
      })
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      username: r.entry?.userName || null,
      displayName: r.entry?.displayName || null,
      platform: r.entry?.platform || null,
      scanDate: r.createdAt ? r.createdAt.toISOString() : null,
      riskScore: Number(r.riskScore || 0),
      riskCategory: riskCategory(r.riskScore),
      confidence: r.confidence ?? null,
      followers: Number(r.entry?.followers ?? 0),
      following: Number(r.entry?.following ?? 0),
      posts: Number(r.entry?.posts ?? 0),
      profilePicture: r.entry?.profilePicture ?? false,
      accountPrivacy: r.entry?.accountPrivacy ?? null,
      missingFeatures: r.entry?.missingFeatures ?? null,
      analysisType: r.entry?.Analysis?.type ?? null,
      action: { viewReportId: r.id }
    }));

    return res.json({ success: true, data, meta: { total, page, limit } });
  } catch (err) {
    console.error('Profiles List Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to list profiles' });
  }
};

const getProfileDetail = async (req, res) => {
  try {
    const userId = req.user?.id || req.query?.userId || req.body?.userId;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing user context' });

    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: 'Missing profile id' });

    const pr = await prisma.profileResult.findUnique({
      where: { id },
      include: { entry: { include: { Analysis: true } } }
    });
    if (!pr) return res.status(404).json({ success: false, message: 'Profile result not found' });

    // ensure user owns the analysis
    if (pr.entry?.Analysis?.userId !== userId) return res.status(403).json({ success: false, message: 'Forbidden' });

    // historical scans for same entry
    const history = await prisma.profileResult.findMany({
      where: { entryId: pr.entryId },
      orderBy: { createdAt: 'desc' }
    });

    const detail = {
      id: pr.id,
      username: pr.entry?.userName || null,
      displayName: pr.entry?.displayName || null,
      platform: pr.entry?.platform || null,
      scanDate: pr.createdAt ? pr.createdAt.toISOString() : null,
      riskScore: pr.riskScore,
      riskCategory: riskCategory(pr.riskScore),
      confidence: pr.confidence ?? null,
      followers: pr.entry?.followers ?? null,
      following: pr.entry?.following ?? null,
      posts: pr.entry?.posts ?? null,
      profilePicture: pr.entry?.profilePicture ?? false,
      accountPrivacy: pr.entry?.accountPrivacy ?? null,
      missingFeatures: pr.entry?.missingFeatures ?? null,
      analysis: {
        id: pr.entry?.Analysis?.id ?? null,
        type: pr.entry?.Analysis?.type ?? null,
        createdAt: pr.entry?.Analysis?.createdAt ? pr.entry.Analysis.createdAt.toISOString() : null
      },
      history: history.map(h => ({ id: h.id, riskScore: h.riskScore, createdAt: h.createdAt.toISOString() })),
      featureContributions: pr.featureContributions ?? null,
      anomalies: pr.anomalies ?? null
    };

    return res.json({ success: true, detail });
  } catch (err) {
    console.error('Profile Detail Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile detail' });
  }
};

export { listProfiles, getProfileDetail };
