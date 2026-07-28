"""fix JSON null literal in record_sets.routing_config/alias_target

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-28 00:00:00.000000

Data-only fix, no structural change. SQLAlchemy's JSON column type stores Python
None as the JSON literal `'null'` (a real, non-NULL text value) unless the column
is declared with `none_as_null=True` — every row written before that model change
has the literal string 'null' in these columns instead of SQL NULL, which silently
broke `IS NULL`/`IS NOT NULL` filters (the Records tab's Alias filter matched every
row identically regardless of whether it had an alias target).
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, Sequence[str], None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE record_sets SET alias_target = NULL WHERE alias_target = 'null'")
    op.execute("UPDATE record_sets SET routing_config = NULL WHERE routing_config = 'null'")


def downgrade() -> None:
    # Intentionally a no-op: reverting to the JSON-literal-'null' representation
    # would just reintroduce the bug this migration fixes.
    pass
