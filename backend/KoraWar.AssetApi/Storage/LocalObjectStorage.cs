namespace KoraWar.AssetApi.Storage;

public sealed class LocalObjectStorage(string root) : IObjectStorage
{
    private readonly string root = Path.GetFullPath(root);
    public string Provider => "local";
    public async Task PutAsync(string key, byte[] bytes, string contentType, CancellationToken cancellationToken)
    {
        ObjectKey.Validate(key);
        var file = Path.Combine(root, key);
        Directory.CreateDirectory(Path.GetDirectoryName(file)!);
        if (File.Exists(file))
        {
            var existing = await File.ReadAllBytesAsync(file, cancellationToken);
            if (!existing.AsSpan().SequenceEqual(bytes)) throw new IOException("Object checksum conflict.");
            return;
        }
        var staging = file + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            await File.WriteAllBytesAsync(staging, bytes, cancellationToken);
            try { File.Move(staging, file, false); }
            catch (IOException) when (File.Exists(file))
            {
                var existing = await File.ReadAllBytesAsync(file, cancellationToken);
                if (!existing.AsSpan().SequenceEqual(bytes)) throw new IOException("Object checksum conflict.");
            }
        }
        finally { if (File.Exists(staging)) File.Delete(staging); }
    }
    public Task<Stream> OpenAsync(string key, CancellationToken cancellationToken)
    {
        ObjectKey.Validate(key);
        return Task.FromResult<Stream>(File.OpenRead(Path.Combine(root, key)));
    }
}
