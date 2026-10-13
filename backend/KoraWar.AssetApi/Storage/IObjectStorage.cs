namespace KoraWar.AssetApi.Storage;

public interface IObjectStorage
{
    string Provider { get; }
    Task PutAsync(string key, byte[] bytes, string contentType, CancellationToken cancellationToken);
    Task<Stream> OpenAsync(string key, CancellationToken cancellationToken);
}

public static class ObjectKey
{
    public static void Validate(string key)
    {
        if (!System.Text.RegularExpressions.Regex.IsMatch(key, @"\A[a-f0-9]{2}/[a-f0-9]{64}\.(glb|png|jpg|webp|wav|ogg)\z"))
            throw new ArgumentException("Invalid immutable object key.");
    }
}
