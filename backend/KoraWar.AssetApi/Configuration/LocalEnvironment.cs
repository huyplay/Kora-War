namespace KoraWar.AssetApi.Configuration;

public static class LocalEnvironment
{
    public static void Load(string path)
    {
        if (!File.Exists(path)) return;
        foreach (var raw in File.ReadLines(path))
        {
            var line = raw.Trim();
            if (line.Length == 0 || line.StartsWith('#')) continue;
            var separator = line.IndexOf('=');
            if (separator < 1) throw new InvalidOperationException("Invalid environment file line.");
            var key = line[..separator].Trim();
            if (!key.StartsWith("KORA_", StringComparison.Ordinal)) continue;
            var value = line[(separator + 1)..].Trim();
            if (value.Length >= 2 && ((value[0] == '"' && value[^1] == '"') || (value[0] == '\'' && value[^1] == '\''))) value = value[1..^1];
            if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
                Environment.SetEnvironmentVariable(key, value);
        }
    }
    public static string Required(string key)
    {
        var value = Environment.GetEnvironmentVariable(key);
        if (string.IsNullOrWhiteSpace(value) || value.Contains("CHANGE_ME", StringComparison.Ordinal))
            throw new InvalidOperationException($"Configure {key} in .env.local before starting the asset service.");
        return value;
    }
}
