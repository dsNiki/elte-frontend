from flask import request, jsonify  # pyright: ignore[reportMissingImports]
import re
import bcrypt  # pyright: ignore[reportMissingImports]
import jwt  # pyright: ignore[reportMissingImports]
from datetime import datetime, timedelta, timezone
from config import Config
from models import db, User, Group, GroupMember, Post, Comment, Event


# Email minta
ELTE_EMAIL_REGEX = r"^[a-zA-Z0-9._%+-]+@(student\.elte\.hu|elte\.hu)$"


def create_jwt_token(user_id):
    expiration = datetime.now(timezone.utc) + timedelta(hours=1)
    payload = {
        "user_id": user_id,
        "exp": expiration
    }

    token = jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")
    return token


def verify_jwt_token(token):
    try:
        data = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
        return data
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def register_routes(app):

    @app.route("/register", methods=["POST","OPTIONS"])
    def register():
        if request.method == "OPTIONS":
            return "", 200
        data = request.get_json()
        if not data:
            return jsonify({
                "error": "Hibás JSON formátum",
                "code": 400
            }), 400
            

        email = data.get("email")
        password = data.get("password")
        name = data.get("name")
        major = data.get("major")  
        hobbies = data.get("hobbies", [])
        hobbies_str = ",".join(hobbies) if isinstance(hobbies, list) else str(hobbies)
        avatar_url = data.get("avatar_url", None) 

        if not re.match(ELTE_EMAIL_REGEX, email):
            return jsonify({"message": "Csak ELTE-s email használható!"}), 400

        if not major:
            return jsonify({"message": "A szak megadása kötelező!"}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"message": "Ez az email már regisztrálva van!"}), 400

        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode()

        #bio_value = ",".join(interests) if isinstance(interests, list) else interests
        
        new_user = User(
            email=email,
            password_hash=password_hash,
            major=major,
            name=name,
            hobbies=hobbies_str,
            avatar_url=avatar_url
        )

        db.session.add(new_user)
        db.session.commit()

        return jsonify({
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "name": new_user.name,
            "major": new_user.major,
            "hobbies": new_user.hobbies,
            "avatar_url": new_user.avatar_url
        },
        "token": create_jwt_token(new_user.id),
        "message": "Sikeres regisztráció!"
    }), 201

    @app.route("/login", methods=["POST", "OPTIONS"])
    def login():
        if request.method == "OPTIONS":
            return "", 200
        data = request.json
        email = data.get("email")
        password = data.get("password")

        user = User.query.filter_by(email=email).first()

        if not user:
            return jsonify({"error": "Hibás email vagy jelszó!"}), 401

        if not bcrypt.checkpw(password.encode("utf-8"), user.password_hash.encode()):
            return jsonify({"error": "Hibás email vagy jelszó!"}), 401

        token = create_jwt_token(user.id)

        return jsonify({
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "major": user.major,
                "hobbies": user.hobbies
            },
            "message": "Sikeres bejelentkezés!", 
            "token": token,
        }), 200

    @app.route("/profile", methods=["GET"])
    def profile():
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({"error": "Hiányzó Authorization header"}), 401

        try:
            token = auth_header.split(" ")[1]
        except:
            return jsonify({"error": "Hibás Authorization formátum"}), 401

        decoded = verify_jwt_token(token)

        if not decoded:
            return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401

        user = User.query.get(decoded["user_id"])

        return jsonify({
            "email": user.email,
            "major": user.major,
            "name": user.name,
            "hobbies": user.hobbies,
            "avatar_url": user.avatar_url
        })

    @app.route("/groups/search", methods=["GET"])
    def search_groups():
        # Token check
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Hiányzó token"}), 401

        try:
            token = auth_header.split(" ")[1]
            decoded = verify_jwt_token(token)
        except:
            return jsonify({"error": "Hibás token"}), 401

        if not decoded:
            return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401

        user_id = decoded["user_id"]
        user = User.query.get(user_id)

        subject = request.args.get("q", "").strip()
        if not subject:
            return jsonify({"error": "Hiányzik a keresési kifejezés"}), 400

        # 1) A tárgyhoz tartozó csoportok
        groups = Group.query.filter(Group.subject.ilike(f"%{subject}%")).all()

        user_interests = set((user.hobbies or "").split(","))

        zero_member_group = None
        group_list = []

        best_group = None
        best_interest_count = -1

        for g in groups:
            members = GroupMember.query.filter_by(group_id=g.id).all()
            member_count = len(members)

            same_interest_count = 0
            for m in members:
                u = User.query.get(m.user_id)
                if u and u.hobbies:
                    if user_interests.intersection(set(u.hobbies.split(","))):
                        same_interest_count += 1

            if member_count == 0 and zero_member_group is None:
                zero_member_group = g

            if same_interest_count > best_interest_count:
                best_interest_count = same_interest_count
                best_group = g

            group_list.append({
                "id": g.id,
                "name": g.name,
                "subject": g.subject,
                "description": g.description,
                "member_count": member_count,
                "same_interest_members": same_interest_count,
                "is_member": False
            })

            existing_member = GroupMember.query.filter_by(
                group_id=g.id,
                user_id=user_id
            ).first()
            group_list[-1]["is_member"] = existing_member is not None

        # 2) Ha nincs egyetlen csoport sem: automatikusan létrehozzuk
        if not groups:
            new_group = Group(
                name=f"{subject} Study Group #1",
                subject=subject,
                description=f"{subject} automatikusan létrehozott tanulócsoport.",
                creator_id=user_id
            )
            db.session.add(new_group)
            db.session.commit()

            return jsonify({
                "recommended_group": {
                    "id": new_group.id,
                    "name": new_group.name,
                    "subject": new_group.subject,
                    "description": new_group.description,
                    "member_count": 0,
                    "same_interest_members": 0,
                    "is_member": False  # ← EZ HIÁNYZIK!
                },
                "all_groups": []
            })

        # 3) Ha nincs üres csoport -> hozzunk létre egyet
        if zero_member_group is None:
            new_group = Group(
                name=f"{subject} Study Group #{len(groups)+1}",
                subject=subject,
                description=f"{subject} új automatikusan létrehozott tanulócsoport.",
                creator_id=user_id
            )
            db.session.add(new_group)
            db.session.commit()

            zero_member_group = new_group

            group_list.append({
                "id": zero_member_group.id,
                "name": zero_member_group.name,
                "subject": zero_member_group.subject,
                "description": zero_member_group.description,
                "member_count": 0,
                "same_interest_members": 0,
                "is_member": False
            })

            
            existing_member = GroupMember.query.filter_by(
                group_id=zero_member_group.id,  # zero_member_group.id!
                user_id=user_id
            ).first()

            if existing_member:
                group_list[-1]["is_member"] = True  

        # 4) Ha nincs olyan csoport, amelyikben lenne közös érdeklődés -> ajánlott legyen az üres
        if best_interest_count == 0 or best_group is None:
            recommended_group = {
                "id": zero_member_group.id,
                "name": zero_member_group.name,
                "subject": zero_member_group.subject,
                "description": zero_member_group.description,
                "member_count": 0,
                "same_interest_members": 0,
                "is_member": False
            }
        else:
            # külön kiszámoljuk, hogy mennyi same_interest volt abban a csoportban
            recommended_group = {
                "id": best_group.id,
                "name": best_group.name,
                "subject": best_group.subject,
                "description": best_group.description,
                "member_count": GroupMember.query.filter_by(group_id=best_group.id).count(),
                "same_interest_members": best_interest_count,
                "is_member": False
            }

            existing_member = GroupMember.query.filter_by(
                group_id=best_group.id,
                user_id=user_id
            ).first()

            if existing_member:
                recommended_group["is_member"] = True

        # 5) válasz
        return jsonify({
            "recommended_group": recommended_group,
            "all_groups": group_list
        })

            

    @app.route("/groups/join", methods=["POST", "OPTIONS"])
    def join_group():
        if request.method == "OPTIONS":
            return "", 200
    
        data = request.get_json()
    
        if not data:
            return jsonify({"error": "Nincs JSON adat"}), 400
        
        group_id = data.get("group_id")
    
        if not group_id:
            return jsonify({"error": "group_id szükséges"}), 400
        

        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Hiányzó token"}), 401

        try:
            token = auth_header.split(" ")[1]
            decoded = verify_jwt_token(token)
        except:
            return jsonify({"error": "Hibás token"}), 401

        if not decoded:
            return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401

        user_id = decoded["user_id"]

        if not group_id:
            return jsonify({"error": "group_id szükséges"}), 400

        group = Group.query.get(group_id)
        if not group:
            return jsonify({"error": "A csoport nem létezik"}), 404

        subject = group.subject

        # ELLENŐRIZZÜK: van-e már CSOPORTJA EHHEZ A TÁRGYHOZ
        existing_subject_group = (
            GroupMember.query
            .join(Group, GroupMember.group_id == Group.id)
            .filter(
                GroupMember.user_id == user_id,
                Group.subject == subject   # ugyanaz a tárgy
            )
            .first()
        )

        if existing_subject_group:
            return jsonify({
                "error": "Már van tanulócsoportod ehhez a tárgyhoz.",
                "subject": subject
            }), 400

        # ELLENŐRIZZÜK: ebben a konkrét csoportban tag-e
        existing_exact = GroupMember.query.filter_by(
            user_id=user_id, group_id=group_id
        ).first()

        if existing_exact:
            return jsonify({"message": "Már tag vagy ebben a csoportban"}), 200

        # Csatlakozás
        new_member = GroupMember(
            user_id=user_id,
            group_id=group_id
        )
        db.session.add(new_member)
        db.session.commit()

        return jsonify({"message": "Sikeresen csatlakoztál a csoporthoz!"}), 201

    @app.route("/groups/my-groups", methods=["GET"])
    def my_groups():
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Hiányzó token"}), 401

        try:
            token = auth_header.split(" ")[1]
            decoded = verify_jwt_token(token)
        except:
            return jsonify({"error": "Hibás token"}), 401

        if not decoded:
            return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401

        user_id = decoded["user_id"]

        # A user összes csoportja
        memberships = GroupMember.query.filter_by(user_id=user_id).all()

        if not memberships:
            return jsonify({
                "groups": [],
                "message": "Még nem vagy tagja egyetlen tanulócsoportnak sem."
            }), 200

        group_list = []
        for m in memberships:
            group = Group.query.get(m.group_id)
            if group:
                group_list.append({
                    "id": group.id,
                    "name": group.name,
                    "subject": group.subject,
                    "description": group.description,
                    "joined_at": m.joined_at.strftime("%Y-%m-%d %H:%M:%S")
                })

        return jsonify({"groups": group_list}), 200

    @app.route("/groups/<int:group_id>/members", methods=["GET"])
    def list_group_mmbrs(group_id):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Hiányzó token"}), 401

        try:
            token = auth_header.split(" ")[1]
            decoded = verify_jwt_token(token)
        except Exception:
            return jsonify({"error": "Hibás token"}), 401

        if not decoded:
            return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401

        group = Group.query.get(group_id)
        if not group:
            return jsonify({"error": "Csoport nem található"}), 404
        
        group_memberships = GroupMember.query.filter_by(group_id=group_id).all()

        members = []
        for gm in group_memberships:
            u = User.query.get(gm.user_id)
            if u:
                members.append({
                    "user_id": gm.user_id,
                    "name": u.name,
                    "email": u.email,
                    "major": u.major,
                })

        return jsonify({
            "group_id": group_id,
            "members": members
        }), 200
        
        
        
    @app.route("/groups/<int:group_id>/posts", methods=["POST"])
    def create_post(group_id):
        ################ Auth checks and case handling ##############################
        
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Hiányzó token"}), 401

        try:
            token = auth_header.split(" ")[1]
            decoded = verify_jwt_token(token)
        except Exception:
            return jsonify({"error": "Hibás token"}), 401

        if not decoded:
            return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401

        user_id = decoded["user_id"]

        group = Group.query.get(group_id)
        if not group:
            return jsonify({"error": "Csoport nem található"}), 404


        membership = GroupMember.query.filter_by(
            user_id=user_id, group_id=group_id
        ).first()
        if not membership:
            return jsonify({"error": "Nem vagy tagja a csoportnak"}), 403

        data = request.get_json()
        if not data:
            return jsonify({"error": "Nincs JSON adat"}), 400
        
        #####################################################################

        title = data.get("title")
        content = data.get("content")

        if not title or not content:
            return jsonify({"error": "title és content kötelező"}), 400

        new_post = Post(
            title=title,
            content=content,
            group_id=group_id,
            author_id=user_id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        db.session.add(new_post)
        db.session.commit()

        return jsonify({
            "message": "Poszt sikeresen létrehozva",
            "post": {
                "id": new_post.id,
                "title": new_post.title,
                "content": new_post.content,
                "group_id": new_post.group_id,
                "author_id": new_post.author_id,
                "created_at": new_post.created_at.isoformat(),
                "updated_at": new_post.updated_at.isoformat()
            }
        }), 201

    @app.route("/groups/<int:group_id>/posts", methods=["GET"])
    def list_posts(group_id):
        
        ###### Necessery checks############
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Hiányzó token"}), 401

        try:
            token = auth_header.split(" ")[1]
            decoded = verify_jwt_token(token)
        except Exception:
            return jsonify({"error": "Hibás token"}), 401

        if not decoded:
            return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401


        group = Group.query.get(group_id)
        if not group:
            return jsonify({"error": "Csoport nem található"}), 404

        ##############################################x
        posts = (
            Post.query
            .filter_by(group_id=group_id, deleted_at=None)
            .order_by(Post.created_at.desc())
            .all()
        )

        posts_json = []
        for p in posts:
            posts_json.append({
                "id": p.id,
                "title": p.title,
                "content": p.content,
                "group_id": p.group_id,
                "author_id": p.author_id,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            })

        return jsonify({
            "group_id": group_id,
            "posts": posts_json
        }), 200

    @app.route("/posts/<int:post_id>", methods=["PUT", "DELETE"])
    def update_or_delete_post(post_id):
        ################### Auth check and case handling
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Hiányzó token"}), 401

        try:
            token = auth_header.split(" ")[1]
            decoded = verify_jwt_token(token)
        except Exception:
            return jsonify({"error": "Hibás token"}), 401

        if not decoded:
            return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401

        user_id = decoded["user_id"]

        post = Post.query.get(post_id)
        if not post or post.deleted_at is not None:
            return jsonify({"error": "Poszt nem található"}), 404

        # Csak a poszt szerzője módosíthatja vagy törölheti
        if post.author_id != user_id:
            return jsonify({"error": "Nincs jogosultságod a poszt módosításához"}), 403

        if request.method == "PUT":
            # Szerkesztés
            data = request.get_json()
            if not data:
                return jsonify({"error": "Nincs JSON adat"}), 400

            title = data.get("title")
            content = data.get("content")

            if not title or not content:
                return jsonify({"error": "title és content kötelező"}), 400

            post.title = title
            post.content = content
            post.updated_at = datetime.now(timezone.utc)
            db.session.commit()

            return jsonify({
                "message": "Poszt sikeresen frissítve",
                "post": {
                    "id": post.id,
                    "title": post.title,
                    "content": post.content,
                    "group_id": post.group_id,
                    "author_id": post.author_id,
                    "created_at": post.created_at.isoformat() if post.created_at else None,
                    "updated_at": post.updated_at.isoformat() if post.updated_at else None,
                }
            }), 200

        elif request.method == "DELETE":
            # Soft delete
            post.deleted_at = datetime.now(timezone.utc)
            db.session.commit()

            return jsonify({
                "message": "Poszt sikeresen törölve"
            }), 200

    @app.route("/posts/<int:post_id>/comments", methods=["POST", "OPTIONS"])
    def create_comment(post_id):
        if request.method == "OPTIONS":
            return "", 200

        ################### Auth check and case handling
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Hiányzó token"}), 401

        try:
            token = auth_header.split(" ")[1]
            decoded = verify_jwt_token(token)
        except Exception:
            return jsonify({"error": "Hibás token"}), 401

        if not decoded:
            return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401

        user_id = decoded["user_id"]

        
        post = Post.query.get(post_id)
        if not post or post.deleted_at is not None:
            return jsonify({"error": "Poszt nem található"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "Nincs JSON adat"}), 400

        content = data.get("content")
        if not content:
            return jsonify({"error": "A comment content kötelező"}), 400
        
        
        ################################################################

        new_comment = Comment(
            comment=content,
            post_id=post_id,
            author_id=user_id,
            created_at=datetime.now(timezone.utc)
        )

        db.session.add(new_comment)
        db.session.commit()

        return jsonify({
            "message": "Komment sikeresen létrehozva",
            "comment": {
                "id": new_comment.id,
                "content": new_comment.comment,
                "post_id": new_comment.post_id,
                "author_id": new_comment.author_id,
                "created_at": new_comment.created_at.isoformat()
            }
        }), 201

    @app.route("/posts/<int:post_id>/comments", methods=["GET"])
    def list_comments(post_id):
        
        
        ################# Case handling###############################xx

        post = Post.query.get(post_id)
        if not post or post.deleted_at is not None:
            return jsonify({"error": "Poszt nem található"}), 404
        
        #############################################

        comments = (
            Comment.query
            .filter_by(post_id=post_id, deleted_at=None)
            .order_by(Comment.created_at.asc())
            .all()
        )

        comments_json = []
        for c in comments:
            comments_json.append({
                "id": c.id,
                "content": c.comment,
                "post_id": c.post_id,
                "author_id": c.author_id,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            })

        return jsonify({
            "post_id": post_id,
            "comments": comments_json
        }), 200

    @app.route("/comments/<int:comment_id>", methods=["PUT", "DELETE"])
    def update_or_delete_comment(comment_id):
        ################### Auth check and case handling
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Hiányzó token"}), 401

        try:
            token = auth_header.split(" ")[1]
            decoded = verify_jwt_token(token)
        except Exception:
            return jsonify({"error": "Hibás token"}), 401

        if not decoded:
            return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401

        user_id = decoded["user_id"]

        comment = Comment.query.get(comment_id)
        if not comment or comment.deleted_at is not None:
            return jsonify({"error": "Komment nem található"}), 404

        # Csak a komment szerzője módosíthatja vagy törölheti
        if comment.author_id != user_id:
            return jsonify({"error": "Nincs jogosultságod a komment módosításához"}), 403

        if request.method == "PUT":
            # Szerkesztés
            data = request.get_json()
            if not data:
                return jsonify({"error": "Nincs JSON adat"}), 400

            content = data.get("content")
            if not content:
                return jsonify({"error": "A comment content kötelező"}), 400

            comment.comment = content
            comment.updated_at = datetime.now(timezone.utc)
            db.session.commit()

            return jsonify({
                "message": "Komment sikeresen frissítve",
                "comment": {
                    "id": comment.id,
                    "content": comment.comment,
                    "post_id": comment.post_id,
                    "author_id": comment.author_id,
                    "created_at": comment.created_at.isoformat() if comment.created_at else None,
                    "updated_at": comment.updated_at.isoformat() if comment.updated_at else None,
                }
            }), 200

        elif request.method == "DELETE":
            # Soft delete
            comment.deleted_at = datetime.now(timezone.utc)
            db.session.commit()

            return jsonify({
                "message": "Komment sikeresen törölve"
            }), 200
        



    @app.route("/groups/<int:group_id>/events", methods=["GET"])
    def list_events(group_id):
        # 1. Autentikáció és Jogosultság Ellenőrzés
        auth_header = request.headers.get("Authorization")
        if not auth_header: return jsonify({"error": "Hiányzó token"}), 401
        try:
            token = auth_header.split(" ")[1]
            decoded = verify_jwt_token(token)
        except: return jsonify({"error": "Hibás token"}), 401
        if not decoded: return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401
        user_id = decoded["user_id"]

        # Csoport létezik-e és tag-e a felhasználó? (Csak tagok láthatják az eseményeket)
        group = Group.query.get(group_id)
        if not group: return jsonify({"error": "Csoport nem található"}), 404
        
        membership = GroupMember.query.filter_by(user_id=user_id, group_id=group_id).first()
        if not membership: return jsonify({"error": "Nem vagy tagja a csoportnak"}), 403

        # 2. Események lekérése szűréssel (opcionális: start/end dátum)
        # Bár az Event modelled event_date-et használ, a naptár frontendek (pl. FullCalendar) 
        # gyakran küldenek start és end paramétert a nézethez.
        
        # event_date az event_date_re szűrés
        
        events = (
            Event.query
            .filter_by(group_id=group_id, deleted_at=None)
            .order_by(Event.event_date.asc())
            .all()
        )

        events_json = [
            {
                "id": e.id,
                "title": e.title,
                "description": e.description,
                # Fontos: event_date néven adjuk vissza, de ISO formátumban
                "date": e.event_date.isoformat(), 
                "location": e.location,
                "creator_id": e.creator_id,
                "group_id": e.group_id,
            } 
            for e in events
        ]

        return jsonify({"events": events_json}), 200


    @app.route("/groups/<int:group_id>/events", methods=["POST"])
    def create_event(group_id):
        # Auth ellenőrzés (ugyanaz, mint fent)
        auth_header = request.headers.get("Authorization")
        if not auth_header: return jsonify({"error": "Hiányzó token"}), 401
        try:
            token = auth_header.split(" ")[1]
            decoded = verify_jwt_token(token)
        except: return jsonify({"error": "Hibás token"}), 401
        if not decoded: return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401
        user_id = decoded["user_id"]

        group = Group.query.get(group_id)
        if not group: return jsonify({"error": "Csoport nem található"}), 404
        membership = GroupMember.query.filter_by(user_id=user_id, group_id=group_id).first()
        if not membership: return jsonify({"error": "Nem vagy tagja a csoportnak"}), 403
        
        data = request.get_json()
        if not data: return jsonify({"error": "Nincs JSON adat"}), 400

        title = data.get("title")
        date_str = data.get("date") # Itt a frontend valószínűleg "date" vagy "event_date"-t küld
        content = data.get("description")

        if not title or not date_str:
            return jsonify({"error": "title és date kötelező"}), 400

        try:
            # A datetime-ot a timezone-nal együtt kell kezelni
            # datetime.fromisoformat nem kezeli a 'Z' végű UTC dátumokat, 
            # ezért a .replace('Z', '+00:00') trükköt használjuk, ha szükséges.
            event_dt = datetime.fromisoformat(date_str.replace('Z', '+00:00')).astimezone(timezone.utc)
        except ValueError:
            return jsonify({"error": "Hibás dátum formátum. Használd az ISO 8601 formátumot."}), 400
        
        
        new_event = Event(
            title=title,
            description=content,
            event_date=event_dt,
            location=data.get("location"),
            group_id=group_id,
            creator_id=user_id, # Az aktuális user az event létrehozója
            created_at=datetime.now(timezone.utc),
        )

        db.session.add(new_event)
        db.session.commit()

        return jsonify({
            "message": "Esemény sikeresen létrehozva",
            "event": {
                "id": new_event.id,
                "title": new_event.title,
                "date": new_event.event_date.isoformat(),
                "creator_id": new_event.creator_id,
            }
        }), 201

    @app.route("/events/<int:event_id>", methods=["PUT", "DELETE"])
    def update_or_delete_event(event_id):
        # Auth ellenőrzés
        auth_header = request.headers.get("Authorization")
        if not auth_header: return jsonify({"error": "Hiányzó token"}), 401
        try:
            token = auth_header.split(" ")[1]
            decoded = verify_jwt_token(token)
        except: return jsonify({"error": "Hibás token"}), 401
        if not decoded: return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401
        user_id = decoded["user_id"]

        event = Event.query.get(event_id)
        if not event or event.deleted_at is not None:
            return jsonify({"error": "Esemény nem található"}), 404

        # Csak az esemény létrehozója módosíthatja
        if event.creator_id != user_id:
            return jsonify({"error": "Nincs jogosultságod az esemény módosításához"}), 403

        if request.method == "PUT":
            data = request.get_json()
            if not data: return jsonify({"error": "Nincs JSON adat"}), 400

            # Frissítési logika
            if "title" in data:
                event.title = data["title"]
            if "description" in data:
                event.description = data["description"]
            if "location" in data:
                event.location = data["location"]
            if "date" in data:
                try:
                    event_dt = datetime.fromisoformat(data["date"].replace('Z', '+00:00')).astimezone(timezone.utc)
                    event.event_date = event_dt
                except ValueError:
                    return jsonify({"error": "Hibás dátum formátum"}), 400

            event.updated_at = datetime.now(timezone.utc)
            db.session.commit()

            return jsonify({
                "message": "Esemény sikeresen frissítve",
                "event": {
                    "id": event.id,
                    "title": event.title,
                    "date": event.event_date.isoformat(),
                }
            }), 200

        elif request.method == "DELETE":
            # Soft delete
            event.deleted_at = datetime.now(timezone.utc)
            db.session.commit()

            return jsonify({"message": "Esemény sikeresen törölve"}), 200