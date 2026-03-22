"""
Чаты ALISTER PRIME: список чатов, создание, сообщения.
GET / — список чатов
POST /start — начать чат с пользователем
GET /:chat_id/messages — сообщения
POST /:chat_id/messages — отправить
"""
import json
import os
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
    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE session_token=%s", (token,))
    row = cur.fetchone()
    return row[0] if row else None


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
        user_id = get_current_user(cur, auth_header)
        if not user_id:
            return json_response({"error": "Не авторизован"}, 401)

        path_parts = [p for p in path.split("/") if p]

        # GET / — список чатов
        if method == "GET" and len(path_parts) <= 1:
            cur.execute(
                f"""SELECT c.id,
                    CASE WHEN c.user1_id = %s THEN u2.id ELSE u1.id END AS partner_id,
                    CASE WHEN c.user1_id = %s THEN u2.username ELSE u1.username END AS partner_username,
                    CASE WHEN c.user1_id = %s THEN u2.display_name ELSE u1.display_name END AS partner_name,
                    CASE WHEN c.user1_id = %s THEN u2.avatar_url ELSE u1.avatar_url END AS partner_avatar,
                    CASE WHEN c.user1_id = %s THEN u2.is_online ELSE u1.is_online END AS partner_online,
                    (SELECT text FROM {SCHEMA}.messages WHERE chat_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_msg,
                    (SELECT created_at FROM {SCHEMA}.messages WHERE chat_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_time,
                    (SELECT COUNT(*) FROM {SCHEMA}.messages WHERE chat_id=c.id AND is_read=FALSE AND sender_id!=%s) AS unread
                    FROM {SCHEMA}.chats c
                    JOIN {SCHEMA}.users u1 ON c.user1_id=u1.id
                    JOIN {SCHEMA}.users u2 ON c.user2_id=u2.id
                    WHERE c.user1_id=%s OR c.user2_id=%s
                    ORDER BY last_time DESC NULLS LAST""",
                (user_id, user_id, user_id, user_id, user_id, user_id, user_id, user_id)
            )
            rows = cur.fetchall()
            chats = [
                {
                    "id": r[0], "partner_id": r[1], "partner_username": r[2],
                    "partner_name": r[3] or r[2], "partner_avatar": r[4],
                    "partner_online": r[5], "last_msg": r[6],
                    "last_time": str(r[7]) if r[7] else None, "unread": r[8]
                }
                for r in rows
            ]
            return json_response({"chats": chats})

        # POST /start — начать чат
        elif method == "POST" and path.endswith("/start"):
            partner_username = body.get("username", "").strip().lower()
            if not partner_username:
                return json_response({"error": "Укажите username"}, 400)

            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE username=%s", (partner_username,))
            partner = cur.fetchone()
            if not partner:
                return json_response({"error": "Пользователь не найден"}, 404)
            partner_id = partner[0]

            if partner_id == user_id:
                return json_response({"error": "Нельзя написать себе"}, 400)

            u1, u2 = min(user_id, partner_id), max(user_id, partner_id)
            cur.execute(
                f"SELECT id FROM {SCHEMA}.chats WHERE user1_id=%s AND user2_id=%s",
                (u1, u2)
            )
            existing = cur.fetchone()
            if existing:
                return json_response({"chat_id": existing[0], "existing": True})

            cur.execute(
                f"INSERT INTO {SCHEMA}.chats (user1_id, user2_id) VALUES (%s, %s) RETURNING id",
                (u1, u2)
            )
            chat_id = cur.fetchone()[0]
            db.commit()
            return json_response({"chat_id": chat_id, "existing": False})

        # GET /:chat_id/messages
        elif method == "GET" and len(path_parts) >= 2 and path_parts[-1] == "messages":
            chat_id = int(path_parts[-2])
            cur.execute(
                f"SELECT id FROM {SCHEMA}.chats WHERE id=%s AND (user1_id=%s OR user2_id=%s)",
                (chat_id, user_id, user_id)
            )
            if not cur.fetchone():
                return json_response({"error": "Нет доступа"}, 403)

            cur.execute(
                f"""SELECT id, sender_id, text, created_at, is_read
                    FROM {SCHEMA}.messages WHERE chat_id=%s
                    ORDER BY created_at ASC LIMIT 100""",
                (chat_id,)
            )
            rows = cur.fetchall()
            cur.execute(
                f"UPDATE {SCHEMA}.messages SET is_read=TRUE WHERE chat_id=%s AND sender_id!=%s AND is_read=FALSE",
                (chat_id, user_id)
            )
            db.commit()
            messages = [
                {"id": r[0], "sender_id": r[1], "text": r[2], "created_at": str(r[3]), "is_read": r[4]}
                for r in rows
            ]
            return json_response({"messages": messages})

        # POST /:chat_id/messages
        elif method == "POST" and len(path_parts) >= 2 and path_parts[-1] == "messages":
            chat_id = int(path_parts[-2])
            text = body.get("text", "").strip()
            if not text:
                return json_response({"error": "Пустое сообщение"}, 400)

            cur.execute(
                f"SELECT id FROM {SCHEMA}.chats WHERE id=%s AND (user1_id=%s OR user2_id=%s)",
                (chat_id, user_id, user_id)
            )
            if not cur.fetchone():
                return json_response({"error": "Нет доступа"}, 403)

            cur.execute(
                f"INSERT INTO {SCHEMA}.messages (chat_id, sender_id, text) VALUES (%s, %s, %s) RETURNING id, created_at",
                (chat_id, user_id, text)
            )
            msg_id, created_at = cur.fetchone()
            db.commit()
            return json_response({"id": msg_id, "sender_id": user_id, "text": text, "created_at": str(created_at)})

        else:
            return json_response({"error": "Not found"}, 404)

    finally:
        cur.close()
        db.close()
