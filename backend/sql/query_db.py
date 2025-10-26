import argparse
import psycopg2
from psycopg2.extras import DictCursor


def get_connection(dsn):
    return psycopg2.connect(dsn, cursor_factory=DictCursor)


def list_users(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT id, username, email, role, created_at FROM users ORDER BY created_at")
        rows = cur.fetchall()
        for row in rows:
            print(f"{row['id']} | {row['username']} | {row['email']} | {row['role']} | {row['created_at']}")


def delete_user(conn, username):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM users WHERE username = %s", (username,))
        if cur.rowcount:
            print(f"Usuário '{username}' removido.")
        else:
            print(f"Usuário '{username}' não encontrado.")
    conn.commit()


def list_comments(conn, slug):
    with conn.cursor() as cur:
        cur.execute(
            """SELECT id, author, message, created_at
               FROM comments
               WHERE page_slug = %s
               ORDER BY created_at DESC LIMIT 20""",
            (slug,)
        )
        rows = cur.fetchall()
        for row in rows:
            print(f"{row['id']} | {row['author']} | {row['created_at']} | {row['message']}")

def promote_admin(conn, username):
    with conn.cursor() as cur:
        cur.execute("UPDATE users SET role='admin' WHERE username = %s", (username,))
        if cur.rowcount:
            print(f"Usuário '{username}' promovido a admin.")
        else:
            print(f"Usuário '{username}' não encontrado.")
    conn.commit()


def main():
    parser = argparse.ArgumentParser(description="Ferramenta simples para consultas admin no banco SCOM.")
    parser.add_argument("--dsn", default="postgres://postgres:postgres@localhost:5432/scomdb", help="Connection string do Postgres.")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("list-users", help="Lista até 20 usuários.")
    del_user = sub.add_parser("delete-user", help="Remove um usuário pelo username.")
    del_user.add_argument("username")

    list_comments_cmd = sub.add_parser("list-comments", help="Lista comentários por slug.")
    list_comments_cmd.add_argument("slug")

    list_comments_cmd = sub.add_parser("promote-admin", help="Promove usuário como admin.")
    list_comments_cmd.add_argument("username")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        return

    conn = get_connection(args.dsn)
    try:
        if args.command == "list-users":
            list_users(conn)
        elif args.command == "delete-user":
            delete_user(conn, args.username)
        elif args.command == "list-comments":
            list_comments(conn, args.slug)
        elif args.command == "promote-admin":
            promote_admin(conn, args.username)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
