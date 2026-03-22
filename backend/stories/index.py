"""
Истории ALISTER PRIME: публикация, просмотр, активные истории.
POST / — опубликовать историю
GET / — активные истории друзей
POST /:id/view — отметить просмотр
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

        # POST / — опубликовать историю
        if method == "POST" and len(path_parts) <= 1:
            text = body.get("text", "").strip()
            image_url = body.get("image_url", "").strip()
            if not text and not image_url:
                return json_response({"error": "Добавьте текст или изображение"}, 400)

            cur.execute(
                f"INSERT INTO {SCHEMA}.stories (user_id, text, image_url) VALUES (%s, %s, %s) RETURNING id, created_at, expires_at",
                (user_id, text, image_url)
            )
            story_id, created_at, expires_at = cur.fetchone()
            db.commit()
            return json_response({"ok": True, "story_id": story_id, "expires_at": str(expires_at)})

        # GET / — активные истории (свои + из чатов)
        elif method == "GET" and len(path_parts) <= 1:
            cur.execute(
                f"""SELECT s.id, s.user_id, u.username, u.display_name, u.avatar_url,
                    s.text, s.image_url, s.views, s.created_at, s.expires_at,
                    EXISTS(SELECT 1 FROM {SCHEMA}.story_views sv WHERE sv.story_id=s.id AND sv.viewer_id=%s) AS viewed
                    FROM {SCHEMA}.stories s
                    JOIN {SCHEMA}.users u ON s.user_id=u.id
                    WHERE s.expires_at > NOW()
                    ORDER BY s.user_id = %s DESC, s.created_at DESC
                    LIMIT 100""",
                (user_id, user_id)
            )
            rows = cur.fetchall()

            users_map = {}
            for r in rows:
                uid = r[1]
                if uid not in users_map:
                    users_map[uid] = {
                        "user_id": uid, "username": r[2],
                        "display_name": r[3] or r[2], "avatar_url": r[4],
                        "stories": [], "has_unviewed": False
                    }
                story = {
                    "id": r[0], "text": r[5], "image_url": r[6],
                    "views": r[7], "created_at": str(r[8]),
                    "expires_at": str(r[9]), "viewed": r[10]
                }
                users_map[uid]["stories"].append(story)
                if not r[10]:
                    users_map[uid]["has_unviewed"] = True

            result = sorted(users_map.values(), key=lambda x: (not x["has_unviewed"], x["user_id"] != user_id))
            return json_response({"stories": result})

        # POST /:id/view
        elif method == "POST" and len(path_parts) >= 2 and path_parts[-1] == "view":
            story_id = int(path_parts[-2])
            try:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.story_views (story_id, viewer_id) VALUES (%s, %s)",
                    (story_id, user_id)
                )
                cur.execute(
                    f"UPDATE {SCHEMA}.stories SET views=views+1 WHERE id=%s",
                    (story_id,)
                )
                db.commit()
            except Exception:
                pass
            return json_response({"ok": True})

        else:
            return json_response({"error": "Not found"}, 404)

    finally:
        cur.close()
        db.close()
