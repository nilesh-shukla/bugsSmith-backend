import prisma from '../app/config/prismaClient.js';
import generateTokens from '../app/utils/generateToken.js';

const BASE = 'http://localhost:3000';

const analysisId = process.argv[2];
if (!analysisId) {
  console.error('Usage: node scripts/fetch_analysis_summary.js <analysisId>');
  process.exit(1);
}

async function main() {
  try {
    const analysis = await prisma.analysis.findUnique({ where: { id: analysisId } });
    if (!analysis) {
      console.error('Analysis not found:', analysisId);
      process.exit(2);
    }

    const user = await prisma.user.findUnique({ where: { id: analysis.userId } });
    if (!user) {
      console.error('User not found for analysis:', analysis.userId);
      process.exit(2);
    }

    const tokens = generateTokens(user);
    const accessToken = tokens.accessToken;

    const res = await fetch(`${BASE}/api/analytics/analysis/${analysisId}/summary`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const body = await res.json();
    console.log('Status:', res.status);
    console.log(JSON.stringify(body, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
