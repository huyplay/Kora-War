using Amazon.S3;
using Amazon.S3.Model;
using KoraWar.AssetApi.Configuration;

namespace KoraWar.AssetApi.Storage;

public sealed class R2ObjectStorage : IObjectStorage, IDisposable
{
    private readonly AmazonS3Client client;
    private readonly string bucket;
    public string Provider => "r2";
    public R2ObjectStorage()
    {
        var account = LocalEnvironment.Required("KORA_R2_ACCOUNT_ID");
        if (!System.Text.RegularExpressions.Regex.IsMatch(account, "^[a-fA-F0-9]{32}$"))
            throw new InvalidOperationException("Invalid R2 account ID.");
        bucket = LocalEnvironment.Required("KORA_R2_BUCKET");
        client = new AmazonS3Client(LocalEnvironment.Required("KORA_R2_ACCESS_KEY_ID"),
            LocalEnvironment.Required("KORA_R2_SECRET_ACCESS_KEY"), new AmazonS3Config
            {
                ServiceURL = $"https://{account}.r2.cloudflarestorage.com",
                AuthenticationRegion = "auto", ForcePathStyle = true
            });
    }
    public async Task PutAsync(string key, byte[] bytes, string contentType, CancellationToken cancellationToken)
    {
        ObjectKey.Validate(key);
        using var input = new MemoryStream(bytes, writable: false);
        await client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = bucket, Key = key, InputStream = input, ContentType = contentType,
            DisablePayloadSigning = true, DisableDefaultChecksumValidation = true,
            Headers = { CacheControl = "public,max-age=31536000,immutable" }
        }, cancellationToken);
    }
    public async Task<Stream> OpenAsync(string key, CancellationToken cancellationToken)
    {
        ObjectKey.Validate(key);
        using var response = await client.GetObjectAsync(bucket, key, cancellationToken);
        var output = new MemoryStream();
        await response.ResponseStream.CopyToAsync(output, cancellationToken);
        output.Position = 0;
        return output;
    }
    public void Dispose() => client.Dispose();
}
