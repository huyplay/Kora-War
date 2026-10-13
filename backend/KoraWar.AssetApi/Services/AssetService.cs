using System.Security.Cryptography;
using System.Text.RegularExpressions;
using KoraWar.AssetApi.Data;
using KoraWar.AssetApi.Storage;

namespace KoraWar.AssetApi.Services;

public sealed class AssetService(AssetRepository repository, IObjectStorage storage)
{
    public static string Validate(AssetImport input, byte[] bytes)
    {
        if (!Regex.IsMatch(input.Id ?? "", @"\A[a-zA-Z0-9_-]{1,80}\z") || string.IsNullOrWhiteSpace(input.Name) || input.Name.Length > 160)
            throw new ArgumentException("Invalid asset identity.");
        if (bytes.Length == 0 || bytes.Length > 30 * 1024 * 1024 || input.Bytes != bytes.Length ||
            Convert.ToHexStringLower(SHA256.HashData(bytes)) != input.Sha256)
            throw new ArgumentException("Asset length/checksum mismatch.");
        var mime = (input.Kind, input.Extension) switch
        {
            ("model", "glb") when bytes.AsSpan().StartsWith("glTF"u8) => "model/gltf-binary",
            ("image", "png") when bytes.AsSpan().StartsWith(new byte[] { 137,80,78,71,13,10,26,10 }) => "image/png",
            ("image", "jpg") when bytes.AsSpan().StartsWith(new byte[] { 255,216,255 }) => "image/jpeg",
            ("image", "webp") when bytes.Length >= 12 && bytes.AsSpan(0,4).SequenceEqual("RIFF"u8) && bytes.AsSpan(8,4).SequenceEqual("WEBP"u8) => "image/webp",
            ("audio", "ogg") when bytes.AsSpan().StartsWith("OggS"u8) => "audio/ogg",
            ("audio", "wav") when bytes.Length >= 12 && bytes.AsSpan(0,4).SequenceEqual("RIFF"u8) && bytes.AsSpan(8,4).SequenceEqual("WAVE"u8) => "audio/wav",
            _ => throw new ArgumentException("Unsupported asset format.")
        };
        var meta = input.Metadata;
        if (meta.ValueKind != System.Text.Json.JsonValueKind.Object ||
            !meta.TryGetProperty("rightsConfirmed", out var rights) || rights.ValueKind != System.Text.Json.JsonValueKind.True ||
            !meta.TryGetProperty("author", out var author) || author.ValueKind != System.Text.Json.JsonValueKind.String || string.IsNullOrWhiteSpace(author.GetString()) ||
            !meta.TryGetProperty("license", out var license) || license.ValueKind != System.Text.Json.JsonValueKind.String || string.IsNullOrWhiteSpace(license.GetString()) ||
            !meta.TryGetProperty("sourceUrl", out var source) || source.ValueKind != System.Text.Json.JsonValueKind.String || !Uri.TryCreate(source.GetString(), UriKind.Absolute, out var url) ||
            (url.Scheme != "http" && url.Scheme != "https")) throw new ArgumentException("Missing asset provenance.");
        if (input.Kind == "audio" && bytes.Length > 4 * 1024 * 1024) throw new ArgumentException("Audio exceeds budget.");
        return mime;
    }
    public async Task<AssetRecord> ImportAsync(AssetImport input, byte[] bytes, CancellationToken cancellationToken)
    {
        var mime = Validate(input, bytes);
        var key = $"{input.Sha256[..2]}/{input.Sha256}.{input.Extension}";
        var existing = await repository.GetAsync(input.Id, cancellationToken);
        if (existing is not null && (existing.Sha256 != input.Sha256 || existing.StorageProvider != storage.Provider))
            throw new InvalidOperationException("Immutable asset conflict; use an explicit storage migration.");
        // Store first, then commit metadata. A failed DB transaction leaves an unreferenced object,
        // never a published row pointing to a missing file. Repeating the import is safe.
        await storage.PutAsync(key, bytes, mime, cancellationToken);
        var record = new AssetRecord(input.Id, input.Name, input.Kind, input.Sha256, input.Bytes, key, mime, storage.Provider, input.Metadata, input.Archived);
        await repository.UpsertAsync(record, cancellationToken);
        return record;
    }
}
