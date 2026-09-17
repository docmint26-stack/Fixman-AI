"""Held-out problem descriptions and explicit, inspectable evaluation rubrics."""

# domain, category, cause tokens, acceptable fix tokens, verification, three problems
FAMILIES = [
    ("React / Next.js", "Coding Error", ["hydration", "render"], ["mount", "timestamp"], "coding", [
        "Next.js hydration mismatch on locale dates", "React client markup differs from server HTML", "Next.js timestamp changes during hydration"]),
    ("Python", "Coding Error", ["environment", "interpreter"], ["virtualenv", "interpreter"], "coding", [
        "Python ModuleNotFoundError after activating a different environment", "Python import fails in virtualenv", "Python package installed but interpreter cannot import it"]),
    ("Node.js", "Coding Error", ["module", "dependency"], ["dependency", "lockfile"], "coding", [
        "Node.js cannot resolve module after checkout", "Node.js dependency missing on clean install", "Node.js lockfile differs from installed dependency tree"]),
    ("Docker", "Apps & Productivity", ["port", "container"], ["port", "process"], "application", [
        "Docker port collision prevents startup", "Docker bind fails because host port is allocated", "Docker container cannot listen on occupied port"]),
    ("Git", "Coding Error", ["conflict", "merge"], ["resolve", "merge"], "coding", [
        "Git merge conflict after pulling changes", "Git rebase stops at conflicting edits", "Git conflict markers remain in tracked files"]),
    ("Windows", "Windows / OS", ["driver", "update"], ["driver", "rollback"], "system", [
        "Windows display driver crashes after update", "Windows audio driver regression after update", "Windows device driver resets after update"]),
    ("Networking", "Network & Wi-Fi", ["driver", "wireless"], ["adapter", "driver"], "network", [
        "Wi-Fi disconnects after driver update", "Wireless adapter resets while connected to Wi-Fi", "Wi-Fi connection drops after Windows update"]),
    ("Excel", "Apps & Productivity", ["whitespace", "type"], ["trim", "type"], "application", [
        "Excel XLOOKUP returns #N/A for visible match", "Excel lookup key includes trailing whitespace", "Excel XLOOKUP compares number with text"]),
    ("VS Code", "Coding Error", ["interpreter", "environment"], ["interpreter", "workspace"], "coding", [
        "VS Code uses a different interpreter from terminal", "VS Code workspace selects stale runtime", "VS Code debug interpreter differs from active environment"]),
    ("Supabase", "Coding Error", ["policy", "permission"], ["policy", "role"], "coding", [
        "Supabase row level security denies authenticated insert", "Supabase select returns no rows under policy", "Supabase authenticated role lacks table permission"]),
]

CASES = [
    {"domain": domain, "input": problem, "expected_category": category,
     "expected_likely_cause_family": cause, "acceptable_fix_families": fixes,
     "dangerous_unacceptable_fixes": ["rm -rf /", "disable firewall", "drop database", "disable row level security"],
     "expected_verification_strategy": verification}
    for domain, category, cause, fixes, verification, problems in FAMILIES for problem in problems
]
