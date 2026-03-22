"""
Группы и каналы ALISTER PRIME.
Группы: POST /groups/, GET /groups/, POST /groups/:id/invite, GET/POST /groups/:id/messages, POST /groups/join/:link
Каналы: POST /channels/, GET /channels/, POST /channels/:id/subscribe, GET/POST /channels/:id/posts
"""
import json
import os
import secrets
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p42248577_messenger_alister_pr")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token, X-Session-Id",
    "Access-Control-Max-Age": "86400",
}


def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def json_response(data, status=200):
    return {
        "statusCode": status,
        "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
        "body": json.dumps(data, ensure_ascii=False, default=str),
    }


def get_current_user(cur, token):
    if not token:
        return None
    cur.execute(f"SELECT id, username, display_name FROM {SCHEMA}.users WHERE session_token=%s", (token,))
    row = cur.fetchone()
    return row if row else None


def handle_groups(event, method, path, body, user_id, username, display_name, db, cur):
    path_parts = [p for p in path.split("/") if p and p != "groups"]

    if method == "POST" and len(path_parts) == 0:
        name = body.get("name", "").strip()
        description = body.get("description", "").strip()
        invite_usernames = body.get("members", [])
        if not name:
            return json_response({"error": "Укажите название"}, 400)
        invite_link = secrets.token_hex(8)
        cur.execute(
            f"INSERT INTO {SCHEMA}.groups (name, description, owner_id, invite_link) VALUES (%s, %s, %s, %s) RETURNING id",
            (name, description, user_id, invite_link)
        )
        group_id = cur.fetchone()[0]
        cur.execute(
            f"INSERT INTO {SCHEMA}.group_members (group_id, user_id, role) VALUES (%s, %s, 'owner')",
            (group_id, user_id)
        )
        invited = []
        for uname in invite_usernames:
            uname = uname.strip().lower().lstrip("@")
            if not uname:
                continue
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE username=%s", (uname,))
            row = cur.fetchone()
            if row:
                try:
                    cur.execute(f"INSERT INTO {SCHEMA}.group_members (group_id, user_id) VALUES (%s, %s)", (group_id, row[0]))
                    invited.append(uname)
                except Exception:
                    pass
        db.commit()
        return json_response({"ok": True, "group_id": group_id, "invite_link": invite_link, "invited": invited})

    elif method == "GET" and len(path_parts) == 0:
        cur.execute(
            f"""SELECT g.id, g.name, g.description, g.avatar_url, g.invite_link,
                (SELECT COUNT(*) FROM {SCHEMA}.group_members WHERE group_id=g.id) AS cnt, gm.role
                FROM {SCHEMA}.groups g
                JOIN {SCHEMA}.group_members gm ON g.id=gm.group_id
                WHERE gm.user_id=%s ORDER BY g.created_at DESC""",
            (user_id,)
        )
        rows = cur.fetchall()
        return json_response({"groups": [
            {"id": r[0], "name": r[1], "description": r[2], "avatar_url": r[3],
             "invite_link": r[4], "members_count": r[5], "role": r[6]}
            for r in rows
        ]})

    elif method == "POST" and len(path_parts) >= 2 and path_parts[0] == "join":
        link = path_parts[1]
        cur.execute(f"SELECT id, name FROM {SCHEMA}.groups WHERE invite_link=%s", (link,))
        group = cur.fetchone()
        if not group:
            return json_response({"error": "Группа не найдена"}, 404)
        try:
            cur.execute(f"INSERT INTO {SCHEMA}.group_members (group_id, user_id) VALUES (%s, %s)", (group[0], user_id))
            db.commit()
        except Exception:
            pass
        return json_response({"ok": True, "group_id": group[0], "name": group[1]})

    elif method == "POST" and len(path_parts) >= 2 and path_parts[-1] == "invite":
        group_id = int(path_parts[0])
        cur.execute(f"SELECT id FROM {SCHEMA}.group_members WHERE group_id=%s AND user_id=%s AND role IN ('owner','admin')", (group_id, user_id))
        if not cur.fetchone():
            return json_response({"error": "Нет прав"}, 403)
        usernames = body.get("usernames", [])
        invited = []
        for uname in usernames:
            uname = uname.strip().lower().lstrip("@")
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE username=%s", (uname,))
            row = cur.fetchone()
            if row:
                try:
                    cur.execute(f"INSERT INTO {SCHEMA}.group_members (group_id, user_id) VALUES (%s, %s)", (group_id, row[0]))
                    invited.append(uname)
                except Exception:
                    pass
        db.commit()
        return json_response({"ok": True, "invited": invited})

    elif method == "GET" and len(path_parts) >= 2 and path_parts[-1] == "messages":
        group_id = int(path_parts[0])
        cur.execute(f"SELECT id FROM {SCHEMA}.group_members WHERE group_id=%s AND user_id=%s", (group_id, user_id))
        if not cur.fetchone():
            return json_response({"error": "Нет доступа"}, 403)
        cur.execute(
            f"""SELECT gm.id, gm.sender_id, u.username, u.display_name, gm.text, gm.created_at
                FROM {SCHEMA}.group_messages gm JOIN {SCHEMA}.users u ON gm.sender_id=u.id
                WHERE gm.group_id=%s ORDER BY gm.created_at ASC LIMIT 100""",
            (group_id,)
        )
        rows = cur.fetchall()
        return json_response({"messages": [
            {"id": r[0], "sender_id": r[1], "sender_username": r[2],
             "sender_name": r[3] or r[2], "text": r[4], "created_at": str(r[5])}
            for r in rows
        ]})

    elif method == "POST" and len(path_parts) >= 2 and path_parts[-1] == "messages":
        group_id = int(path_parts[0])
        text = body.get("text", "").strip()
        if not text:
            return json_response({"error": "Пустое сообщение"}, 400)
        cur.execute(f"SELECT id FROM {SCHEMA}.group_members WHERE group_id=%s AND user_id=%s", (group_id, user_id))
        if not cur.fetchone():
            return json_response({"error": "Нет доступа"}, 403)
        cur.execute(
            f"INSERT INTO {SCHEMA}.group_messages (group_id, sender_id, text) VALUES (%s, %s, %s) RETURNING id, created_at",
            (group_id, user_id, text)
        )
        msg_id, created_at = cur.fetchone()
        db.commit()
        return json_response({"id": msg_id, "sender_id": user_id, "sender_username": username,
                              "sender_name": display_name or username, "text": text, "created_at": str(created_at)})

    return json_response({"error": "Not found"}, 404)


def handle_channels(event, method, path, body, user_id, db, cur):
    path_parts = [p for p in path.split("/") if p and p != "channels"]
    qs = event.get("queryStringParameters") or {}

    if method == "POST" and len(path_parts) == 0:
        name = body.get("name", "").strip()
        uname = body.get("username", "").strip().lower()
        description = body.get("description", "").strip()
        if not name or not uname:
            return json_response({"error": "Укажите название и username"}, 400)
        if not all(c.isalnum() or c == '_' for c in uname):
            return json_response({"error": "Username: только буквы, цифры и _"}, 400)
        cur.execute(f"SELECT id FROM {SCHEMA}.channels WHERE username=%s", (uname,))
        if cur.fetchone():
            return json_response({"error": "Username канала уже занят"}, 409)
        cur.execute(
            f"INSERT INTO {SCHEMA}.channels (name, username, description, owner_id) VALUES (%s, %s, %s, %s) RETURNING id",
            (name, uname, description, user_id)
        )
        channel_id = cur.fetchone()[0]
        cur.execute(f"INSERT INTO {SCHEMA}.channel_subscribers (channel_id, user_id) VALUES (%s, %s)", (channel_id, user_id))
        cur.execute(f"UPDATE {SCHEMA}.channels SET subscribers_count=1 WHERE id=%s", (channel_id,))
        db.commit()
        return json_response({"ok": True, "channel_id": channel_id, "username": uname})

    elif method == "GET" and len(path_parts) == 0:
        mine = qs.get("mine", "false") == "true"
        if mine:
            cur.execute(
                f"""SELECT c.id, c.name, c.username, c.description, c.avatar_url, c.subscribers_count,
                    EXISTS(SELECT 1 FROM {SCHEMA}.channel_subscribers cs WHERE cs.channel_id=c.id AND cs.user_id=%s)
                    FROM {SCHEMA}.channels c
                    JOIN {SCHEMA}.channel_subscribers cs2 ON c.id=cs2.channel_id
                    WHERE cs2.user_id=%s ORDER BY c.created_at DESC""",
                (user_id, user_id)
            )
        else:
            cur.execute(
                f"""SELECT c.id, c.name, c.username, c.description, c.avatar_url, c.subscribers_count,
                    EXISTS(SELECT 1 FROM {SCHEMA}.channel_subscribers cs WHERE cs.channel_id=c.id AND cs.user_id=%s)
                    FROM {SCHEMA}.channels c ORDER BY c.subscribers_count DESC LIMIT 50""",
                (user_id,)
            )
        rows = cur.fetchall()
        return json_response({"channels": [
            {"id": r[0], "name": r[1], "username": r[2], "description": r[3],
             "avatar_url": r[4], "subscribers_count": r[5], "subscribed": r[6]}
            for r in rows
        ]})

    elif method == "POST" and len(path_parts) >= 2 and path_parts[-1] == "subscribe":
        channel_id = int(path_parts[0])
        cur.execute(f"SELECT id FROM {SCHEMA}.channel_subscribers WHERE channel_id=%s AND user_id=%s", (channel_id, user_id))
        if cur.fetchone():
            return json_response({"ok": True, "subscribed": True})
        cur.execute(f"INSERT INTO {SCHEMA}.channel_subscribers (channel_id, user_id) VALUES (%s, %s)", (channel_id, user_id))
        cur.execute(f"UPDATE {SCHEMA}.channels SET subscribers_count=subscribers_count+1 WHERE id=%s", (channel_id,))
        db.commit()
        return json_response({"ok": True, "subscribed": True})

    elif method == "POST" and len(path_parts) >= 2 and path_parts[-1] == "posts":
        channel_id = int(path_parts[0])
        cur.execute(f"SELECT id FROM {SCHEMA}.channels WHERE id=%s AND owner_id=%s", (channel_id, user_id))
        if not cur.fetchone():
            return json_response({"error": "Нет прав"}, 403)
        text = body.get("text", "").strip()
        if not text:
            return json_response({"error": "Пустой пост"}, 400)
        cur.execute(
            f"INSERT INTO {SCHEMA}.channel_posts (channel_id, text) VALUES (%s, %s) RETURNING id, created_at",
            (channel_id, text)
        )
        post_id, created_at = cur.fetchone()
        db.commit()
        return json_response({"ok": True, "post_id": post_id, "created_at": str(created_at)})

    elif method == "GET" and len(path_parts) >= 2 and path_parts[-1] == "posts":
        channel_id = int(path_parts[0])
        cur.execute(
            f"SELECT id, text, image_url, views, created_at FROM {SCHEMA}.channel_posts WHERE channel_id=%s ORDER BY created_at DESC LIMIT 50",
            (channel_id,)
        )
        rows = cur.fetchall()
        return json_response({"posts": [
            {"id": r[0], "text": r[1], "image_url": r[2], "views": r[3], "created_at": str(r[4])}
            for r in rows
        ]})

    return json_response({"error": "Not found"}, 404)


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    path = event.get("path", "/")
    method = event.get("httpMethod", "GET")
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass
    auth_header = event.get("headers", {}).get("X-Auth-Token", "")

    db = get_db()
    cur = db.cursor()

    try:
        user_row = get_current_user(cur, auth_header)
        if not user_row:
            return json_response({"error": "Не авторизован"}, 401)
        user_id, username, display_name = user_row

        if "/channels" in path:
            return handle_channels(event, method, path, body, user_id, db, cur)
        else:
            return handle_groups(event, method, path, body, user_id, username, display_name, db, cur)

    finally:
        cur.close()
        db.close()
