import prisma from '../config/prismaClient.js';
import { parseUploadedFile, processProfilesWithML } from '../services/upload.service.js';

const uploadProfiles = async (req, res) => {
  try {
    let profiles = [];

    if (req.file) {
      profiles = await parseUploadedFile(req.file.path, req.file.originalname);
    } else if (Array.isArray(req.body)) {
      profiles = req.body;
    } else if (req.body && req.body.profiles) {
      profiles = req.body.profiles;
    } else {
      return res.status(400).json({ success: false, message: 'No file or profile data provided' });
    }

    // require a user/context for the Analysis relation
    const userId = req.user?.id || req.body?.userId;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing user context for analysis' });

    const analysis = await prisma.analysis.create({
      data: {
        userId,
        fileName: req.file?.originalname ?? null,
        type: req.body?.type || 'upload',
        totalProfiles: Array.isArray(profiles) ? profiles.length : 0
      }
    });

    const entries = await Promise.all(profiles.map((p) => {
      // map incoming profile fields to Prisma `Entry` model fields
      const entryData = {
        analysisId: p.analysisId || p.analysis_id || p.analysis || analysis.id,
        userName: p.userName || p.username || 'Unnamed',
        displayName: p.displayName || p.display_name || 'Unnamed',
        followers: Number.isFinite(+p.followers) ? +p.followers : 0,
        following: Number.isFinite(+p.following) ? +p.following : 0,
        posts: Number.isFinite(+p.posts) ? +p.posts : 0,
        bio: p.bio ?? null,
        // Prisma schema defines `profilePicture` as Boolean?, so store presence as boolean or null
        profilePicture: p.profilePicture == null ? null : !!p.profilePicture
      };

      return prisma.entry.create({ data: entryData });
    }));

    // send created entries to ML service (they include `id`) and persist scores
    const results = await processProfilesWithML(entries);

    // Prisma model is `ProfileResult` (client: prisma.profileResult)
    await prisma.profileResult.createMany({
      data: results.map((r) => ({
        // `riskScore` in schema is non-null Int, default to 0 when missing
        riskScore: Number.isFinite(+r.risk_score) ? +r.risk_score : 0,
        confidence: Number.isFinite(+r.confidence) ? +r.confidence : null,
        featureContributions: r.featureContributions ?? r.raw?.featureContributions ?? null,
        anomalies: r.anomalies ?? r.raw?.anomalies ?? null,
        status: r.status || 'unknown',
        entryId: r.entryId || r.input?.id || null
      }))
    });

    return res.status(200).json({ success: true, count: results.length, results });
  } catch (error) {
    console.error('Upload Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process upload' });
  }
};

export { uploadProfiles };
