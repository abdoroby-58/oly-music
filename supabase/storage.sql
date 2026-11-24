-- Optional: run in the Supabase SQL Editor when using hosted media storage.
-- The server uses the service role. Do not add anonymous insert/list/read policies.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('oly-media','oly-media',false,41943040,
 ARRAY['audio/mpeg','audio/mp4','audio/ogg','audio/wav','image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public=false,
 file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;
