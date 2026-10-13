export interface Disposable {
    dispose(): void;
}
/** Owns a scene's listeners/resources. Cleanup runs in reverse acquisition order. */
export class Lifetime implements Disposable {
    private cleanups: (() => void)[] = [];
    private ended = false;
    own<T extends Disposable>(resource: T): T { this.defer(() => resource.dispose()); return resource; }
    defer(cleanup: () => void): void {
        if (this.ended)
            cleanup();
        else
            this.cleanups.push(cleanup);
    }
    dispose(): void {
        if (this.ended)
            return;
        this.ended = true;
        const errors: unknown[] = [];
        for (const cleanup of this.cleanups.reverse())
            try {
                cleanup();
            }
            catch (error) {
                errors.push(error);
            }
        this.cleanups = [];
        if (errors.length)
            throw new AggregateError(errors, 'Scene cleanup failed');
    }
}
