export interface AssetDefinition<T> {
    id: string;
    create: () => T;
    dispose?: (asset: T) => void;
}
/** Lazy, typed asset ownership. Prefab factories create instances; cached assets are shared. */
export class AssetRegistry<T> {
    private definitions = new Map<string, AssetDefinition<T>>();
    private loaded = new Map<string, T>();
    register(definition: AssetDefinition<T>): void {
        if (this.definitions.has(definition.id))
            throw new Error(`Duplicate asset: ${definition.id}`);
        this.definitions.set(definition.id, definition);
    }
    get(id: string): T {
        const existing = this.loaded.get(id);
        if (existing !== undefined)
            return existing;
        const definition = this.definitions.get(id);
        if (!definition)
            throw new Error(`Missing asset: ${id}`);
        const asset = definition.create();
        this.loaded.set(id, asset);
        return asset;
    }
    dispose(): void {
        for (const [id, asset] of this.loaded)
            this.definitions.get(id)?.dispose?.(asset);
        this.loaded.clear();
    }
}
