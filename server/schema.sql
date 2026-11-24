CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL,
 avatar TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
 verified INTEGER NOT NULL DEFAULT 0, banned INTEGER NOT NULL DEFAULT 0, about TEXT NOT NULL DEFAULT '',
 created_at BIGINT NOT NULL, username_changed_at BIGINT NOT NULL, notification_seen_at BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_ci ON users(lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_ci ON users(lower(email));
CREATE TABLE IF NOT EXISTS songs (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, artist TEXT NOT NULL, category TEXT NOT NULL CHECK(category IN ('مهرجانات','حزينة','راب','شعبي')),
 audio_url TEXT NOT NULL, cover TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 reports_count INTEGER NOT NULL DEFAULT 0, user_id TEXT NOT NULL REFERENCES users(id), flagged INTEGER NOT NULL DEFAULT 0,
 duration INTEGER NOT NULL DEFAULT 0, plays BIGINT NOT NULL DEFAULT 0, created_at BIGINT NOT NULL, published_at BIGINT NOT NULL DEFAULT 0,
 review_note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS songs_publication ON songs(status,flagged,published_at);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS likes (user_id TEXT NOT NULL REFERENCES users(id),song_id TEXT NOT NULL REFERENCES songs(id),PRIMARY KEY(user_id,song_id));
CREATE TABLE IF NOT EXISTS favorites (user_id TEXT NOT NULL REFERENCES users(id),song_id TEXT NOT NULL REFERENCES songs(id),PRIMARY KEY(user_id,song_id));
CREATE TABLE IF NOT EXISTS follows (user_id TEXT NOT NULL REFERENCES users(id),artist_id TEXT NOT NULL REFERENCES users(id),PRIMARY KEY(user_id,artist_id),CHECK(user_id<>artist_id));
CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),song_id TEXT NOT NULL REFERENCES songs(id),reason TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',created_at BIGINT NOT NULL,UNIQUE(user_id,song_id));
CREATE TABLE IF NOT EXISTS banners (id INTEGER PRIMARY KEY CHECK(id BETWEEN 1 AND 3),title TEXT NOT NULL,subtitle TEXT NOT NULL,image TEXT NOT NULL,label TEXT NOT NULL,song_id TEXT REFERENCES songs(id));
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY,audience TEXT NOT NULL,kind TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,song_id TEXT,created_at BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS notification_feed ON notifications(audience,created_at);
CREATE TABLE IF NOT EXISTS visitors (id TEXT PRIMARY KEY, first_seen BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS play_events (visitor_id TEXT NOT NULL,song_id TEXT NOT NULL REFERENCES songs(id),played_at BIGINT NOT NULL,PRIMARY KEY(visitor_id,song_id));
CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,mime TEXT NOT NULL,storage_key TEXT NOT NULL,created_at BIGINT NOT NULL);
