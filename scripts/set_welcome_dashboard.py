#!/usr/bin/env python
"""Set every existing user's welcome/landing dashboard.

Superset already redirects /superset/welcome/ (the post-login landing page)
straight to a dashboard when UserAttribute.welcome_dashboard_id is set for
that user (see Superset.welcome() in superset/views/core.py) - this is a
per-user database attribute, not a static config value, so it has to be set
here rather than in superset_config.py.

Usage: source scripts/dev_env.sh && python scripts/set_welcome_dashboard.py
"""

from superset.app import create_app

DASHBOARD_SLUG = "cc-network-health"


def main() -> None:
    app = create_app()
    with app.app_context():
        from flask_appbuilder.security.sqla.models import User
        from superset import db
        from superset.models.dashboard import Dashboard
        from superset.models.user_attributes import UserAttribute

        dashboard = (
            db.session.query(Dashboard).filter_by(slug=DASHBOARD_SLUG).one_or_none()
        )
        if dashboard is None:
            raise SystemExit(f"No dashboard with slug {DASHBOARD_SLUG!r} found")

        for user in db.session.query(User).all():
            attr = (
                db.session.query(UserAttribute)
                .filter_by(user_id=user.id)
                .one_or_none()
            )
            if attr is None:
                attr = UserAttribute(user_id=user.id)
                db.session.add(attr)
            attr.welcome_dashboard_id = dashboard.id
            print(f"Set welcome dashboard for {user.username!r} -> {dashboard.dashboard_title!r}")

        db.session.commit()


if __name__ == "__main__":
    main()
