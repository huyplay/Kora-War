using System.Text.Json;
using Npgsql;
using NpgsqlTypes;

namespace KoraWar.AssetApi.Data;

public sealed class AssetRepository(NpgsqlDataSource dataSource)
{
    public async Task MigrateAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        await using var command = new NpgsqlCommand("""
            SELECT pg_advisory_xact_lock(724018001);
            CREATE SCHEMA IF NOT EXISTS kora;
            CREATE TABLE IF NOT EXISTS kora.schema_migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
            CREATE TABLE IF NOT EXISTS kora.assets(
                id text PRIMARY KEY, name text NOT NULL, kind text NOT NULL CHECK(kind IN ('model','image','audio')),
                sha256 text NOT NULL CHECK(length(sha256)=64), bytes bigint NOT NULL CHECK(bytes>0 AND bytes<=31457280),
                object_key text NOT NULL, content_type text NOT NULL, storage_provider text NOT NULL,
                metadata jsonb NOT NULL, archived boolean NOT NULL DEFAULT false,
                created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
            CREATE INDEX IF NOT EXISTS assets_sha256_idx ON kora.assets(sha256);
            CREATE TABLE IF NOT EXISTS kora.migration_snapshots(
                sha256 text PRIMARY KEY, source text NOT NULL, payload jsonb NOT NULL,
                created_at timestamptz NOT NULL DEFAULT now());
            CREATE TABLE IF NOT EXISTS kora.asset_audit(
                id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, action text NOT NULL,
                asset_id text NOT NULL, detail jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
            INSERT INTO kora.schema_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;
            """, connection, transaction);
        await command.ExecuteNonQueryAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task<AssetRecord?> GetAsync(string id, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("SELECT id,name,kind,sha256,bytes,object_key,content_type,storage_provider,metadata::text,archived FROM kora.assets WHERE id=$1");
        command.Parameters.AddWithValue(id);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? Read(reader) : null;
    }
    public async Task<List<AssetRecord>> ListAsync(CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("SELECT id,name,kind,sha256,bytes,object_key,content_type,storage_provider,metadata::text,archived FROM kora.assets ORDER BY created_at DESC LIMIT 10000");
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var result = new List<AssetRecord>();
        while (await reader.ReadAsync(cancellationToken)) result.Add(Read(reader));
        return result;
    }
    private static AssetRecord Read(NpgsqlDataReader r) => new(r.GetString(0), r.GetString(1), r.GetString(2),
        r.GetString(3), r.GetInt64(4), r.GetString(5), r.GetString(6), r.GetString(7),
        JsonSerializer.Deserialize<JsonElement>(r.GetString(8)), r.GetBoolean(9));

    public async Task UpsertAsync(AssetRecord asset, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        // Existing IDs can never be rebound to different binary content, including concurrent imports.
        await using var command = new NpgsqlCommand("""
            INSERT INTO kora.assets(id,name,kind,sha256,bytes,object_key,content_type,storage_provider,metadata,archived)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, metadata=excluded.metadata,
              archived=excluded.archived, updated_at=now()
            WHERE kora.assets.sha256=excluded.sha256 AND kora.assets.storage_provider=excluded.storage_provider
            """, connection, transaction);
        command.Parameters.AddWithValue(asset.Id); command.Parameters.AddWithValue(asset.Name);
        command.Parameters.AddWithValue(asset.Kind); command.Parameters.AddWithValue(asset.Sha256);
        command.Parameters.AddWithValue(asset.Bytes); command.Parameters.AddWithValue(asset.ObjectKey);
        command.Parameters.AddWithValue(asset.ContentType); command.Parameters.AddWithValue(asset.StorageProvider);
        command.Parameters.Add(new NpgsqlParameter { NpgsqlDbType = NpgsqlDbType.Jsonb, Value = asset.Metadata.GetRawText() });
        command.Parameters.AddWithValue(asset.Archived);
        if (await command.ExecuteNonQueryAsync(cancellationToken) != 1) throw new InvalidOperationException("Immutable asset conflict.");
        await using var audit = new NpgsqlCommand("INSERT INTO kora.asset_audit(action,asset_id,detail) VALUES('asset.sync',$1,$2)", connection, transaction);
        audit.Parameters.AddWithValue(asset.Id);
        audit.Parameters.Add(new NpgsqlParameter { NpgsqlDbType = NpgsqlDbType.Jsonb, Value = JsonSerializer.Serialize(new { asset.Sha256, asset.StorageProvider }) });
        await audit.ExecuteNonQueryAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }
    public async Task SaveSnapshotAsync(string hash, string source, JsonElement payload, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("INSERT INTO kora.migration_snapshots(sha256,source,payload) VALUES($1,$2,$3) ON CONFLICT DO NOTHING");
        command.Parameters.AddWithValue(hash); command.Parameters.AddWithValue(source);
        command.Parameters.Add(new NpgsqlParameter { NpgsqlDbType = NpgsqlDbType.Jsonb, Value = payload.GetRawText() });
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
