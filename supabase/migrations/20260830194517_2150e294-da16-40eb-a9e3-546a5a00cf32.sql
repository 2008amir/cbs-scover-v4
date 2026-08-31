CREATE SCHEMA IF NOT EXISTS bot_private;

CREATE TABLE IF NOT EXISTS bot_private.bot_secrets (
  name TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON SCHEMA bot_private FROM anon, authenticated;
REVOKE ALL ON bot_private.bot_secrets FROM anon, authenticated;

INSERT INTO bot_private.bot_secrets (name, value) VALUES
  ('BOT_KEYS_TOKEN', '3dc2096e4b39bc6ad723e9db8176e5ebb1470f50587f3fdb'),
  ('GEMINI_API_KEY', 'AQ.Ab8RN6INzQaxvJocs6hVMesGHtbZVMZqvWLSpY3I2sYaTWiyqQ'),
  ('GEMINI_KEY_2', 'AQ.Ab8RN6LG2a76V7xvRPsj2o1SsGJ_uToU20NTH6q582OYdiyqjw'),
  ('GEMINI_KEY_3', 'AQ.Ab8RN6LAH1FaVrsZkZ7uC0q1KTy9BSYTUc4hfb6CYFISB4sjMg'),
  ('GEMINI_KEY_4', 'AQ.Ab8RN6Kw6mzACjDub_2p7PloXIeS3SdrfljERi8IZyVLq4_B2A'),
  ('VIDEO_KNOWLEDGE_GEMINI_API_KEY', 'AQ.Ab8RN6Km1hjQ04uW2QFZImcaXT1z5gieW6kGMPbHaIutZSSu8w'),
  ('YOUTUBE_API_KEY', 'AIzaSyDAhhSSEHDEyOEDCA3_Unz6XS-aLFKQoO0')
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

CREATE OR REPLACE FUNCTION public.get_bot_api_keys(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = bot_private, public
AS $$
DECLARE
  expected TEXT;
  result JSONB;
BEGIN
  SELECT value INTO expected FROM bot_private.bot_secrets WHERE name = 'BOT_KEYS_TOKEN';
  IF expected IS NULL OR p_token IS NULL OR length(p_token) < 16 OR p_token <> expected THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'geminiKeys', COALESCE((
      SELECT jsonb_agg(value ORDER BY name)
      FROM bot_private.bot_secrets
      WHERE name IN ('GEMINI_API_KEY','GEMINI_KEY_2','GEMINI_KEY_3','GEMINI_KEY_4')
        AND length(trim(value)) > 0
    ), '[]'::jsonb),
    'videoGeminiKey', (SELECT value FROM bot_private.bot_secrets WHERE name = 'VIDEO_KNOWLEDGE_GEMINI_API_KEY'),
    'youtubeKey', (SELECT value FROM bot_private.bot_secrets WHERE name = 'YOUTUBE_API_KEY')
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_bot_api_keys(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bot_api_keys(TEXT) TO anon, authenticated, service_role;