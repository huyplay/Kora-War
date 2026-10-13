using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using KoraWar.AssetApi.Configuration;
using KoraWar.AssetApi.Data;
using KoraWar.AssetApi.Services;
using KoraWar.AssetApi.Storage;
using Npgsql;

// Run from the repo root. Environment variables take precedence over the local file.
LocalEnvironment.Load(Path.GetFullPath(".env.local"));
var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls(Environment.GetEnvironmentVariable("KORA_ASSET_LISTEN") ?? "http://127.0.0.1:8790");
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 31 * 1024 * 1024);
var token = LocalEnvironment.Required("KORA_ASSET_API_TOKEN");
if (token.Length < 32) throw new InvalidOperationException("Asset API token must have at least 32 characters.");
var tokenHash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
var connectionString = LocalEnvironment.Required("KORA_POSTGRES_CONNECTION");
builder.Services.AddSingleton(NpgsqlDataSource.Create(connectionString));
builder.Services.AddSingleton<AssetRepository>();
builder.Services.AddSingleton<AssetService>();
builder.Services.AddSingleton<IObjectStorage>(_ => (Environment.GetEnvironmentVariable("KORA_STORAGE_PROVIDER") ?? "local") switch
{
    "local" => new LocalObjectStorage(Environment.GetEnvironmentVariable("KORA_OBJECT_ROOT") ?? ".data/objects"),
    "r2" => new R2ObjectStorage(),
    _ => throw new InvalidOperationException("Unsupported object storage provider.")
});
var app = builder.Build();
await app.Services.GetRequiredService<AssetRepository>().MigrateAsync();

// This service is a backend-to-backend API. Browser login remains with the game gateway.
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    var supplied = context.Request.Headers["X-Kora-Service-Token"].ToString();
    if (supplied.Length > 512 || !CryptographicOperations.FixedTimeEquals(
        SHA256.HashData(Encoding.UTF8.GetBytes(supplied)), tokenHash))
    { context.Response.StatusCode = 401; return; }
    try { await next(context); }
    catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
    catch (ArgumentException) { await Error(context, 400, "Invalid asset payload."); }
    catch (JsonException) { await Error(context, 400, "Invalid JSON payload."); }
    catch (InvalidOperationException) { await Error(context, 409, "Asset conflict or unavailable storage provider."); }
    catch (Exception e)
    {
        // Do not log request headers, metadata, credentials or connection strings.
        app.Logger.LogError("Asset operation failed: {ErrorType}", e.GetType().Name);
        await Error(context, 503, "Asset storage unavailable.");
    }
});
app.MapGet("/internal/health", async (NpgsqlDataSource source, IObjectStorage storage, CancellationToken ct) =>
{
    await using var command = source.CreateCommand("SELECT 1");
    await command.ExecuteScalarAsync(ct);
    return Results.Ok(new { ok = true, database = "postgresql", storage = storage.Provider, schema = 1 });
});
app.MapGet("/internal/assets", async (AssetRepository repository, CancellationToken ct) => Results.Ok(await repository.ListAsync(ct)));
app.MapPost("/internal/assets/{id}", async (string id, HttpRequest request, AssetService service, CancellationToken ct) =>
{
    var header = request.Headers["X-Asset-Metadata"].ToString();
    if (header.Length > 64 * 1024) return Results.BadRequest(new { error = "Metadata too large." });
    AssetImport? input;
    try { input = JsonSerializer.Deserialize<AssetImport>(Uri.UnescapeDataString(header), new JsonSerializerOptions(JsonSerializerDefaults.Web)); }
    catch (JsonException) { return Results.BadRequest(new { error = "Invalid metadata." }); }
    if (input is null || input.Id != id) return Results.BadRequest(new { error = "Asset ID mismatch." });
    using var buffer = new MemoryStream();
    var chunk = new byte[65536];
    int count;
    while ((count = await request.Body.ReadAsync(chunk, ct)) > 0)
    {
        if (buffer.Length + count > 30 * 1024 * 1024) return Results.StatusCode(413);
        await buffer.WriteAsync(chunk.AsMemory(0, count), ct);
    }
    return Results.Ok(await service.ImportAsync(input, buffer.ToArray(), ct));
});
app.MapGet("/internal/assets/{id}", async (string id, AssetRepository repository, CancellationToken ct) =>
{
    var asset = await repository.GetAsync(id, ct);
    return asset is null ? Results.NotFound() : Results.Ok(asset);
});
app.MapGet("/internal/assets/{id}/file", async (string id, AssetRepository repository, IObjectStorage storage, CancellationToken ct) =>
{
    var asset = await repository.GetAsync(id, ct);
    if (asset is null || asset.StorageProvider != storage.Provider) return Results.NotFound();
    return Results.Stream(await storage.OpenAsync(asset.ObjectKey, ct), asset.ContentType);
});
app.MapPost("/internal/snapshots", async (HttpRequest request, AssetRepository repository, CancellationToken ct) =>
{
    using var doc = await JsonDocument.ParseAsync(request.Body, cancellationToken: ct);
    var payload = doc.RootElement;
    // Exporter deliberately excludes administrator hashes and active session tokens.
    if (payload.ValueKind != JsonValueKind.Object || !payload.TryGetProperty("schema", out var schema) ||
        schema.ValueKind != JsonValueKind.Number || !schema.TryGetInt32(out var version) || version != 1 ||
        payload.TryGetProperty("admins", out _) || payload.TryGetProperty("sessions", out _))
        return Results.BadRequest(new { error = "Invalid migration snapshot." });
    var hash = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(payload.GetRawText())));
    await repository.SaveSnapshotAsync(hash, "sqlite-v1", payload, ct);
    return Results.Ok(new { sha256 = hash });
});
app.Run();

static async Task Error(HttpContext context, int status, string message)
{
    if (context.Response.HasStarted) { context.Abort(); return; }
    context.Response.StatusCode = status;
    await context.Response.WriteAsJsonAsync(new { error = message });
}
