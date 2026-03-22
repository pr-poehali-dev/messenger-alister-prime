
CREATE TABLE IF NOT EXISTS t_p42248577_messenger_alister_pr.users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  username VARCHAR(32) UNIQUE,
  display_name VARCHAR(100),
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  session_token VARCHAR(64),
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  is_online BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS t_p42248577_messenger_alister_pr.sms_codes (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '10 minutes',
  used BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS t_p42248577_messenger_alister_pr.chats (
  id SERIAL PRIMARY KEY,
  user1_id INTEGER REFERENCES t_p42248577_messenger_alister_pr.users(id),
  user2_id INTEGER REFERENCES t_p42248577_messenger_alister_pr.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS t_p42248577_messenger_alister_pr.messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER REFERENCES t_p42248577_messenger_alister_pr.chats(id),
  sender_id INTEGER REFERENCES t_p42248577_messenger_alister_pr.users(id),
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS t_p42248577_messenger_alister_pr.groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  owner_id INTEGER REFERENCES t_p42248577_messenger_alister_pr.users(id),
  invite_link VARCHAR(32) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p42248577_messenger_alister_pr.group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES t_p42248577_messenger_alister_pr.groups(id),
  user_id INTEGER REFERENCES t_p42248577_messenger_alister_pr.users(id),
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS t_p42248577_messenger_alister_pr.group_messages (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES t_p42248577_messenger_alister_pr.groups(id),
  sender_id INTEGER REFERENCES t_p42248577_messenger_alister_pr.users(id),
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p42248577_messenger_alister_pr.channels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(32) UNIQUE,
  description TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  owner_id INTEGER REFERENCES t_p42248577_messenger_alister_pr.users(id),
  subscribers_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p42248577_messenger_alister_pr.channel_subscribers (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER REFERENCES t_p42248577_messenger_alister_pr.channels(id),
  user_id INTEGER REFERENCES t_p42248577_messenger_alister_pr.users(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS t_p42248577_messenger_alister_pr.channel_posts (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER REFERENCES t_p42248577_messenger_alister_pr.channels(id),
  text TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p42248577_messenger_alister_pr.stories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES t_p42248577_messenger_alister_pr.users(id),
  text TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  views INTEGER DEFAULT 0,
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p42248577_messenger_alister_pr.story_views (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES t_p42248577_messenger_alister_pr.stories(id),
  viewer_id INTEGER REFERENCES t_p42248577_messenger_alister_pr.users(id),
  viewed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON t_p42248577_messenger_alister_pr.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON t_p42248577_messenger_alister_pr.group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON t_p42248577_messenger_alister_pr.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON t_p42248577_messenger_alister_pr.users(username);
CREATE INDEX IF NOT EXISTS idx_users_session ON t_p42248577_messenger_alister_pr.users(session_token);
