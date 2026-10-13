using System.Text.Json;

namespace KoraWar.AssetApi.Data;

public sealed record AssetRecord(string Id, string Name, string Kind, string Sha256, long Bytes,
    string ObjectKey, string ContentType, string StorageProvider, JsonElement Metadata, bool Archived);

public sealed record AssetImport(string Id, string Name, string Kind, string Sha256, long Bytes,
    string Extension, JsonElement Metadata, bool Archived);
