import prisma from '../app/config/prismaClient.js';

const id = process.argv[2];
if (!id) {
  console.error('Usage: node scripts/check_analysis.js <analysisId>');
  process.exit(1);
}

async function main() {
  try {
    const analysis = await prisma.analysis.findUnique({ where: { id } });
    console.log(JSON.stringify(analysis, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error fetching analysis:', err);
    process.exit(2);
  }
}

main();
