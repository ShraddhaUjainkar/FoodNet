import { NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { db } from '@/lib/db';
import { logger, captureException } from '@/lib/logger';

const analyzeQueue = new Queue('analyze', {
  connection: new Redis(process.env.REDIS_URL || 'redis://localhost:6379'),
} as any);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const job = await analyzeQueue.getJob(id as string);
    if (!job) {
      // Maybe it's already processed and stored as a scan id
      const scan = await db.getScan(id as string);
      if (scan) {
        return NextResponse.json({ status: 'completed', scan });
      }
      return NextResponse.json({ status: 'not_found' }, { status: 404 });
    }

    const state = await job.getState();
    const returnValue = job.returnvalue || null;

    // If job finished and created a scan, try to include it
    let scan = null;
    if (returnValue && typeof returnValue === 'object' && (returnValue as any).id) {
      scan = await db.getScan((returnValue as any).id);
    }

    return NextResponse.json({ status: state, returnValue, scan });
  } catch (err) {
    logger.error({ err }, 'Status lookup failed');
    captureException(err);
    return NextResponse.json({ error: 'Status lookup failed' }, { status: 500 });
  }
}
