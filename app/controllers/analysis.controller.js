import prisma from '../config/prismaClient.js';

export const getAnalysisSummary = async (req, res) => {
  try {
    const { analysisId } = req.params;

    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      select: {
        id: true,
        fileName: true,
        totalProfiles: true,
        overallConfidence: true,
        overallDataIntegrity: true,
        createdAt: true
      }
    });

    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Analysis not found' });
    }

    return res.status(200).json({ success: true, data: analysis });
  } catch (error) {
    console.error('Get analysis summary error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch analysis summary' });
  }
};

export default { getAnalysisSummary };
