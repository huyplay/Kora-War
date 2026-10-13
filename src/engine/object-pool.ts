/** A bounded pool. Overflow drops a visual effect instead of allocating without limit. */
export class ObjectPool<T> {
    private idle: T[] = [];
    private active = new Set<T>();
    private created = 0;
    constructor(private capacity: number, private create: () => T, private reset: (value: T) => void, private destroy: (value: T) => void = () => { }) { }
    acquire(): T | null {
        const value = this.idle.pop() ?? (this.created < this.capacity ? (this.created++, this.create()) : null);
        if (value !== null)
            this.active.add(value);
        return value;
    }
    release(value: T): void {
        if (!this.active.delete(value))
            return;
        this.reset(value);
        this.idle.push(value);
    }
    get size(): number { return this.created; }
    get used(): number { return this.active.size; }
    clear(): void {
        for (const value of this.active)
            this.release(value);
    }
    dispose(): void { this.clear(); this.idle.forEach(this.destroy); this.idle = []; this.created = 0; }
}
