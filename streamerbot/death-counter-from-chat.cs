using System;
using System.Globalization;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;

public class CPHInline
{
    private static readonly HttpClient Http = new HttpClient
    {
        Timeout = TimeSpan.FromSeconds(10),
    };

    private static readonly string[] RequestedByArgCandidates = new[]
    {
        "display",
        "displayName",
        "authorName",
        "targetUser",
        "user",
    };

    private static readonly string[] ActionArgCandidates = new[]
    {
        "counterAction",
        "action",
    };

    private static readonly string[] AmountArgCandidates = new[]
    {
        "amount",
        "count",
        "value",
    };

    private static readonly string[] ScopeKeyArgCandidates = new[]
    {
        "scopeKey",
        "gameKey",
        "counterGameKey",
    };

    private static readonly string[] ScopeLabelArgCandidates = new[]
    {
        "scopeLabel",
        "gameLabel",
        "counterGameLabel",
    };

    private static readonly string[] CommandPayloadArgCandidates = new[]
    {
        "rawInput",
        "commandInput",
        "input",
        "message",
        "text",
        "input0",
    };

    public bool Execute()
    {
        string appBaseUrl = ReadRequiredGlobal("lojaneon.appBaseUrl");
        string sharedSecret = ReadRequiredGlobal("lojaneon.streamerbotSharedSecret");
        bool useBotAccount = ReadOptionalBoolGlobal("lojaneon.useBotAccount", true);

        if (string.IsNullOrWhiteSpace(appBaseUrl) || string.IsNullOrWhiteSpace(sharedSecret))
        {
            return false;
        }

        string rawCommand = GetRawCommandText();
        string action = ResolveAction(rawCommand);
        if (string.IsNullOrWhiteSpace(action))
        {
            Reply("Comando invalido. Use !morte+, !morte- ou !mortes.", useBotAccount);
            return false;
        }

        int amount = ResolveAmount(rawCommand);
        string requestedBy = GetFirstArgString(RequestedByArgCandidates);
        string scopeKey = ResolveScopeKey();
        string scopeLabel = ResolveScopeLabel();
        string body = BuildRequestBody(action, amount, requestedBy, scopeKey, scopeLabel, "streamerbot_chat");
        string timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
        string signature = BuildSignature(body, timestamp, sharedSecret);

        try
        {
            using (var request = new HttpRequestMessage(
                HttpMethod.Post,
                string.Format("{0}/api/internal/streamerbot/deaths", appBaseUrl.TrimEnd('/'))
            ))
            {
                request.Headers.TryAddWithoutValidation("x-timestamp", timestamp);
                request.Headers.TryAddWithoutValidation("x-signature", signature);
                request.Content = new StringContent(body, Encoding.UTF8, "application/json");

                using (HttpResponseMessage response = Http.SendAsync(request).GetAwaiter().GetResult())
                {
                    string responseText = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                    string replyMessage = ExtractReplyMessage(responseText);

                    if (string.IsNullOrWhiteSpace(replyMessage))
                    {
                        replyMessage = response.IsSuccessStatusCode
                            ? "Contador atualizado."
                            : "Nao consegui atualizar o contador agora.";
                    }

                    Reply(replyMessage, useBotAccount);

                    if (!response.IsSuccessStatusCode)
                    {
                        CPH.LogWarn(string.Format(
                            "[Loja Neon] Falha ao chamar contador de mortes: HTTP {0} - {1}",
                            (int)response.StatusCode,
                            responseText
                        ));
                    }

                    return response.IsSuccessStatusCode;
                }
            }
        }
        catch (Exception ex)
        {
            CPH.LogError(string.Format("[Loja Neon] Erro ao chamar API de contadores: {0}", ex));
            Reply("Nao consegui atualizar o contador agora.", useBotAccount);
            return false;
        }
    }

    private void Reply(string message, bool useBot)
    {
        CPH.SendYouTubeMessageToLatestMonitored(message, useBot, true);
    }

    private string ResolveAction(string rawCommand)
    {
        string explicitAction = NormalizeAction(GetFirstArgString(ActionArgCandidates));
        if (!string.IsNullOrWhiteSpace(explicitAction))
        {
            return explicitAction;
        }

        string commandName = GetCommandName(rawCommand);
        switch (commandName)
        {
            case "!morte+":
            case "!death+":
                return "increment";
            case "!morte-":
            case "!death-":
                return "decrement";
            case "!mortes":
            case "!deaths":
                return "get";
            default:
                return string.Empty;
        }
    }

    private int ResolveAmount(string rawCommand)
    {
        foreach (string candidate in AmountArgCandidates)
        {
            if (TryGetIntArg(candidate, out int directAmount) && directAmount > 0)
            {
                return directAmount;
            }
        }

        string commandArgs = GetCommandArgs(rawCommand);
        if (!string.IsNullOrWhiteSpace(commandArgs) &&
            int.TryParse(commandArgs, NumberStyles.Integer, CultureInfo.InvariantCulture, out int parsedAmount) &&
            parsedAmount > 0)
        {
            return parsedAmount;
        }

        return 1;
    }

    private string ResolveScopeKey()
    {
        string argValue = NormalizeScopeKey(GetFirstArgString(ScopeKeyArgCandidates));
        if (!string.IsNullOrWhiteSpace(argValue))
        {
            return argValue;
        }

        return NormalizeScopeKey(ReadOptionalGlobal("lojaneon.counterGameKey"));
    }

    private string ResolveScopeLabel()
    {
        string argValue = GetFirstArgString(ScopeLabelArgCandidates);
        if (!string.IsNullOrWhiteSpace(argValue))
        {
            return argValue.Trim();
        }

        string globalValue = ReadOptionalGlobal("lojaneon.counterGameLabel");
        return string.IsNullOrWhiteSpace(globalValue) ? string.Empty : globalValue.Trim();
    }

    private string BuildRequestBody(
        string action,
        int amount,
        string requestedBy,
        string scopeKey,
        string scopeLabel,
        string source
    )
    {
        var builder = new StringBuilder();
        builder.Append("{");
        builder.AppendFormat("\"action\":\"{0}\"", JsonEscape(action));
        builder.AppendFormat(",\"amount\":{0}", amount);

        if (!string.IsNullOrWhiteSpace(requestedBy))
        {
            builder.AppendFormat(",\"requestedBy\":\"{0}\"", JsonEscape(requestedBy));
        }

        if (!string.IsNullOrWhiteSpace(scopeKey))
        {
            builder.Append(",\"scopeType\":\"game\"");
            builder.AppendFormat(",\"scopeKey\":\"{0}\"", JsonEscape(scopeKey));

            if (!string.IsNullOrWhiteSpace(scopeLabel))
            {
                builder.AppendFormat(",\"scopeLabel\":\"{0}\"", JsonEscape(scopeLabel));
            }
        }

        builder.AppendFormat(",\"source\":\"{0}\"", JsonEscape(source));
        builder.Append("}");
        return builder.ToString();
    }

    private string ReadRequiredGlobal(string variableName)
    {
        string value = ReadOptionalGlobal(variableName);
        if (!string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        CPH.LogError(string.Format("[Loja Neon] Global obrigatoria ausente: {0}", variableName));
        return string.Empty;
    }

    private string ReadOptionalGlobal(string variableName)
    {
        try
        {
            return CPH.GetGlobalVar<string>(variableName, true) ?? string.Empty;
        }
        catch
        {
            return string.Empty;
        }
    }

    private bool ReadOptionalBoolGlobal(string variableName, bool defaultValue)
    {
        try
        {
            return CPH.GetGlobalVar<bool>(variableName, true);
        }
        catch
        {
            return defaultValue;
        }
    }

    private string GetRawCommandText()
    {
        return GetFirstArgString(CommandPayloadArgCandidates) ?? string.Empty;
    }

    private string GetCommandName(string rawCommand)
    {
        if (string.IsNullOrWhiteSpace(rawCommand))
        {
            return string.Empty;
        }

        string trimmed = rawCommand.Trim();
        int separatorIndex = trimmed.IndexOf(' ');
        return separatorIndex < 0 ? trimmed.ToLowerInvariant() : trimmed.Substring(0, separatorIndex).ToLowerInvariant();
    }

    private string GetCommandArgs(string rawCommand)
    {
        if (string.IsNullOrWhiteSpace(rawCommand))
        {
            return string.Empty;
        }

        string trimmed = rawCommand.Trim();
        int separatorIndex = trimmed.IndexOf(' ');
        if (separatorIndex < 0 || separatorIndex == trimmed.Length - 1)
        {
            return string.Empty;
        }

        return trimmed.Substring(separatorIndex + 1).Trim();
    }

    private string NormalizeAction(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        string normalized = value.Trim().ToLowerInvariant();
        switch (normalized)
        {
            case "increment":
            case "decrement":
            case "get":
            case "reset":
                return normalized;
            default:
                return string.Empty;
        }
    }

    private string NormalizeScopeKey(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return value.Trim().ToLowerInvariant().Replace(" ", "_");
    }

    private string GetArgString(string argName)
    {
        if (args != null && args.ContainsKey(argName) && args[argName] != null)
        {
            string directValue = args[argName].ToString();
            if (!string.IsNullOrWhiteSpace(directValue))
            {
                return directValue.Trim();
            }
        }

        if (CPH.TryGetArg(argName, out string value) && !string.IsNullOrWhiteSpace(value))
        {
            return value.Trim();
        }

        return null;
    }

    private string GetFirstArgString(string[] candidates)
    {
        foreach (string candidate in candidates)
        {
            string value = GetArgString(candidate);
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return null;
    }

    private bool TryGetIntArg(string argName, out int value)
    {
        if (args != null && args.ContainsKey(argName) && args[argName] != null)
        {
            string rawValue = args[argName].ToString();
            if (int.TryParse(rawValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out value))
            {
                return true;
            }
        }

        if (CPH.TryGetArg(argName, out int typedValue))
        {
            value = typedValue;
            return true;
        }

        if (CPH.TryGetArg(argName, out string stringValue) &&
            int.TryParse(stringValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out value))
        {
            return true;
        }

        value = 0;
        return false;
    }

    private string BuildSignature(string body, string timestamp, string secret)
    {
        using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret)))
        {
            byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(string.Format("{0}.{1}", timestamp, body)));
            return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
        }
    }

    private string ExtractReplyMessage(string responseText)
    {
        if (string.IsNullOrWhiteSpace(responseText))
        {
            return string.Empty;
        }

        try
        {
            if (TryExtractJsonStringProperty(responseText, "replyMessage", out string reply))
            {
                return JsonUnescape(reply);
            }

            if (TryExtractJsonStringProperty(responseText, "error", out string errorMessage))
            {
                return JsonUnescape(errorMessage);
            }
        }
        catch (Exception ex)
        {
            CPH.LogWarn(string.Format("[Loja Neon] Nao consegui ler a resposta do contador: {0}", ex.Message));
        }

        return string.Empty;
    }

    private bool TryExtractJsonStringProperty(string json, string propertyName, out string value)
    {
        value = string.Empty;

        string needle = "\"" + propertyName + "\"";
        int propertyIndex = json.IndexOf(needle, StringComparison.Ordinal);
        if (propertyIndex < 0)
        {
            return false;
        }

        int colonIndex = json.IndexOf(':', propertyIndex + needle.Length);
        if (colonIndex < 0)
        {
            return false;
        }

        int valueStart = colonIndex + 1;
        while (valueStart < json.Length && char.IsWhiteSpace(json[valueStart]))
        {
            valueStart++;
        }

        if (valueStart >= json.Length || json[valueStart] != '"')
        {
            return false;
        }

        var builder = new StringBuilder();
        bool escaping = false;

        for (int i = valueStart + 1; i < json.Length; i++)
        {
            char current = json[i];

            if (escaping)
            {
                builder.Append('\\');
                builder.Append(current);
                escaping = false;
                continue;
            }

            if (current == '\\')
            {
                escaping = true;
                continue;
            }

            if (current == '"')
            {
                value = builder.ToString();
                return true;
            }

            builder.Append(current);
        }

        return false;
    }

    private string JsonEscape(string value)
    {
        if (value == null)
        {
            return string.Empty;
        }

        return value
            .Replace("\\", "\\\\")
            .Replace("\"", "\\\"")
            .Replace("\r", "\\r")
            .Replace("\n", "\\n")
            .Replace("\t", "\\t");
    }

    private string JsonUnescape(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        return value
            .Replace("\\\"", "\"")
            .Replace("\\\\", "\\")
            .Replace("\\r", "\r")
            .Replace("\\n", "\n")
            .Replace("\\t", "\t");
    }
}
