import { STEP } from '../data/rules';
/** Bounds catch-up work after a slow frame; never supplies a variable dt to combat. */
export class FixedStepRunner {
    accumulator = 0;
    readonly maxSteps = 12;
    reset(): void { this.accumulator = 0; }
    advance(dt: number, speed: number, step: () => void, isPlaying: () => boolean): number {
        if (!Number.isFinite(dt) || dt < 0 || !Number.isFinite(speed) || speed <= 0 || !isPlaying())
            return 0;
        this.accumulator = Math.min(this.accumulator + Math.min(0.25, dt) * speed, this.maxSteps * STEP);
        let count = 0;
        while (this.accumulator + 1e-10 >= STEP && count < this.maxSteps && isPlaying()) {
            step();
            this.accumulator = Math.max(0, this.accumulator - STEP);
            count++;
        }
        return count;
    }
}
