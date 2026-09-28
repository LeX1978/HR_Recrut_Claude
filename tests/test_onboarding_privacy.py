"""Guards for the onboarding privacy posture (issue #345, superseded 17-09-2026).

Upstream's README/SETUP walked a new user into creating a **public** GitHub
fork (forks of public repos cannot be private) and then had /setup write
personal data into tracked files - a real user hit exactly that. This fork
(Рекрутер) sidesteps the whole class of failure differently: no fork
workflow is documented at all, no push is configured, commits stay local by
design (see project-context.md in the Obsidian vault). These tests pin that
posture - that neither doc reintroduces a `gh repo fork` recipe without the
same privacy discussion, and that /setup still checks the origin's
visibility BEFORE writing anything, for the edge case of a user who cloned
from a public origin anyway.
"""
import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
README = REPO / "README.md"
SETUP_GUIDE = REPO / "SETUP.md"
SETUP_COMMAND = REPO / ".claude" / "commands" / "setup.md"


class TestNoForkWorkflowReintroduced(unittest.TestCase):
    def test_readme_states_local_only_no_push(self):
        text = README.read_text(encoding="utf-8")
        self.assertNotIn("gh repo fork", text, "README must not reintroduce the fork recipe without its privacy warning")
        # README is in Russian (this fork's language, per CLAUDE.md) - "пуш" is the
        # Cyrillic transliteration used throughout the repo's own commit history.
        self.assertIn("пуш", text.lower(), "README must say plainly that no push/remote is configured")

    def test_setup_guide_states_local_only_no_push(self):
        text = SETUP_GUIDE.read_text(encoding="utf-8")
        self.assertNotIn("gh repo fork", text, "SETUP.md must not reintroduce the fork recipe without its privacy warning")
        self.assertIn("local-only", text.lower(), "SETUP.md must say plainly this is a local-only project")


class TestSetupChecksOriginBeforeWriting(unittest.TestCase):
    def test_preflight_exists_and_precedes_profile_generation(self):
        text = SETUP_COMMAND.read_text(encoding="utf-8")
        self.assertIn(
            "git remote get-url origin",
            text,
            "/setup must check where the working copy would publish to",
        )
        preflight_at = text.index("git remote get-url origin")
        writes_at = text.index("## Step 3: Generate Profile Files")
        self.assertLess(
            preflight_at,
            writes_at,
            "the origin check must run before any profile file is written - the "
            "existing Step 4 note fires after everything is already on disk",
        )
        self.assertIn(
            "public",
            text[max(0, preflight_at - 2000) : preflight_at + 2000].lower(),
            "the preflight must be about public visibility, not just remote presence",
        )


if __name__ == "__main__":
    unittest.main()
