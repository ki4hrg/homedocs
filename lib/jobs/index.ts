/*
 * The in-process scheduler: a few housekeeping jobs on timers. One container is
 * the whole deployment, so there is no queue to coordinate. WORKER=off keeps a
 * container (a debugging copy, say) from running them.
 */

import { processMap } from '../process-state'

type Job = { name: string; everyMs: number; run: () => Promise<void> }

const started = processMap<boolean>('jobs')

export function startJobs(): boolean {
  if (process.env.WORKER === 'off' || started.get('started')) return false
  started.set('started', true)

  void import('./all').then(({ jobs }) => {
    for (const job of jobs) {
      const tick = () =>
        job.run().catch((err) => console.error(`[jobs] ${job.name} failed: ${err instanceof Error ? err.message : err}`))
      // A first run shortly after boot, then on the interval.
      setTimeout(tick, 30_000).unref?.()
      setInterval(tick, job.everyMs).unref?.()
    }
  })
  return true
}

export type { Job }
