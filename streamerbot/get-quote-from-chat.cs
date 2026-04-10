using System;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

public class CPHInline
{
    private static readonly HttpClient Http = new HttpClient
    {
        Timeout = TimeSpan.FromSeconds(10),
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

        if (!TryGetOptionalQuoteId(out string quoteId))
        {
            Reply("Comando invalido. Use !quote ou !quote <numero>.", useBotAccount);
            return false;
        }

        string body = BuildRequestBody(quoteId, "streamerbot_chat");
        string timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
        string signature = BuildSignature(body, timestamp, sharedSecret);

        try
        {
            using (var request = new HttpRequestMessage(
                HttpMethod.Post,
                string.Format("{0}/api/internal/streamerbot/quotes", appBaseUrl.TrimEnd('/'))
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
                            ? "Quote carregada com sucesso."
                            : "Nao consegui buscar a quote agora.";
                    }

                    Reply(replyMessage, useBotAccount);

                    if (!response.IsSuccessStatusCode)
                    {
                        CPH.LogWarn(string.Format(
                            "[Loja Neon] Falha ao buscar quote: HTTP {0} - {1}",
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
            CPH.LogError(string.Format("[Loja Neon] Erro ao chamar API de quotes: {0}", ex));
            Reply("Nao consegui buscar a quote agora.", useBotAccount);
            return false;
        }
    }

    private void Reply(string message, bool useBot)
    {
        CPH.SendYouTubeMessageToLatestMonitored(message, useBot, true);
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

    private bool TryGetOptionalQuoteId(out string quoteId)
    {
        quoteId = GetArgString("quoteId");
        if (string.IsNullOrWhiteSpace(quoteId))
        {
            quoteId = null;
            return true;
        }

        if (!int.TryParse(quoteId, out int parsed) || parsed <= 0)
        {
            quoteId = null;
            return false;
        }

        quoteId = parsed.ToString();
        return true;
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
            Match replyMatch = Regex.Match(
                responseText,
                "\"replyMessage\"\\s*:\\s*\"(?<value>(?:\\\\.|[^\"])*)\"",
                RegexOptions.Singleline
            );
            if (replyMatch.Success)
            {
                return JsonUnescape(replyMatch.Groups["value"].Value);
            }

            Match errorMatch = Regex.Match(
                responseText,
                "\"error\"\\s*:\\s*\"(?<value>(?:\\\\.|[^\"])*)\"",
                RegexOptions.Singleline
            );
            if (errorMatch.Success)
            {
                return JsonUnescape(errorMatch.Groups["value"].Value);
            }
        }
        catch (Exception ex)
        {
            CPH.LogWarn(string.Format("[Loja Neon] Nao consegui ler a resposta de quote: {0}", ex.Message));
        }

        return string.Empty;
    }

    private string BuildRequestBody(string quoteId, string source)
    {
        var builder = new StringBuilder();
        builder.Append("{");
        builder.Append("\"action\":\"get\"");

        if (!string.IsNullOrWhiteSpace(quoteId))
        {
            builder.AppendFormat(",\"quoteId\":{0}", quoteId);
        }

        builder.AppendFormat(",\"source\":\"{0}\"", JsonEscape(source));
        builder.Append("}");
        return builder.ToString();
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
