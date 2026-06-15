import prisma from '../app/config/prismaClient.js';

async function main(){
  const r = await prisma.profileResult.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { entry: true } });
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}

main().catch(e=>{ console.error(e); process.exit(1); });
