"""Curated cold-start knowledge base for FixMind AI.

Contains authoritative technical troubleshooting guides from official documentation
and curated engineering knowledge to bootstrap cold-start retrieval without fabricating community metrics.
"""

COLD_START_KNOWLEDGE = [
    {
        "title": "Resolving Next.js Hydration Mismatch Errors",
        "category": "Coding Error",
        "source_type": "official",
        "source_name": "Next.js Official Documentation",
        "source_url": "https://nextjs.org/docs/messages/react-hydration-error",
        "trust_level": "official",
        "version": "1.0",
        "content": """Symptom: Browser console displays "Text content does not match server-rendered HTML" or "Hydration failed because the server-rendered HTML didn't match the client".
Root Causes:
1. Rendering dynamic, locale-dependent values like `new Date().toLocaleString()` directly in component render passes. The server timezone/locale differs from client browser.
2. Checking browser-only globals (`window`, `localStorage`, `document`) during initial render.
3. Invalid HTML nesting (e.g. `<p>` tag enclosing `<div>` or `<table>`).
Resolution:
1. For client-only values, render only after mounting using `useEffect`:
   const [mounted, setMounted] = useState(false);
   useEffect(() => setMounted(true), []);
   if (!mounted) return null; // or stable placeholder
2. Alternatively, use `suppressHydrationWarning={true}` on the enclosing tag if the text difference is harmless and intentional.
3. For stable timestamps, render ISO format or format using an explicit UTC timezone on both server and client.
Verification:
Reload page in production build (`next build && next start`). Confirm browser console contains 0 hydration warnings.""",
        "chunks": [
            "Next.js Hydration Mismatch: Caused by differences between server pre-rendered HTML and client initial DOM render.",
            "Root Cause 1: Locale-dependent dates using new Date().toLocaleString(). Server locale differs from client browser locale.",
            "Root Cause 2: Accessing window or localStorage directly in initial JSX render before component mounts.",
            "Fix: Render dynamic timestamp only after mounting via useEffect (const [isMounted, setIsMounted] = useState(false); useEffect(() => setIsMounted(true), [])).",
            "Verification: Run next build and next start. Confirm browser DevTools console has zero React hydration mismatch warnings.",
        ],
    },
    {
        "title": "Python ModuleNotFoundError and Virtualenv Resolution",
        "category": "Coding Error",
        "source_type": "official",
        "source_name": "Python Packaging User Guide",
        "source_url": "https://packaging.python.org/en/latest/tutorials/installing-packages/",
        "trust_level": "official",
        "version": "1.0",
        "content": """Symptom: Running script raises `ModuleNotFoundError: No module named 'xyz'` even though package was installed.
Root Causes:
1. The package was installed in a different Python environment than the one executing the script.
2. The virtual environment is not activated in the current terminal session.
3. In IDEs (VS Code / PyCharm), the selected Python interpreter does not point to the project virtualenv.
Resolution:
1. Verify which Python is currently running:
   Windows: `where python`
   Unix: `which python`
2. Activate your virtual environment:
   Windows: `.venv\\Scripts\\activate`
   Unix: `source .venv/bin/activate`
3. Install package explicitly using the interpreter:
   `python -m pip install xyz` or `uv pip install xyz`
4. In VS Code: Press Ctrl+Shift+P -> "Python: Select Interpreter" -> pick `.venv`.
Verification:
Run `python -c "import xyz; print(xyz.__file__)"`. Script exits with 0 and prints package path.""",
        "chunks": [
            "Python ModuleNotFoundError: Occurs when the active interpreter cannot find installed package in its sys.path.",
            "Root Cause: Disconnect between pip installation target and python interpreter invocation (e.g. installing globally vs running virtualenv).",
            "Fix Procedure: Activate project virtualenv (.venv/bin/activate or .venv\\Scripts\\activate) and run python -m pip install <package>.",
            "VS Code Integration: Use Ctrl+Shift+P 'Python: Select Interpreter' to point to workspace .venv.",
            "Verification: Run python -c 'import <package>' and verify zero exit code and correct file path.",
        ],
    },
    {
        "title": "Docker Port Collision (0.0.0.0 Port Already Allocated)",
        "category": "Apps & Productivity",
        "source_type": "official",
        "source_name": "Docker Documentation",
        "source_url": "https://docs.docker.com/engine/troubleshoot/",
        "trust_level": "official",
        "version": "1.0",
        "content": """Symptom: `docker run` or `docker compose up` fails with:
`Bind for 0.0.0.0:8000 failed: port is already allocated` or `listen tcp 0.0.0.0:5432: bind: address already in use`.
Root Causes:
1. An existing or orphaned Docker container is already running and binding the host port.
2. A local native daemon (e.g. native PostgreSQL service, local web server) is already listening on the port.
Resolution:
1. Check running Docker containers binding the port:
   `docker ps --filter "publish=8000"`
2. Stop the conflicting container:
   `docker stop <container_id>`
3. If not in Docker, identify the host process:
   Windows: `netstat -ano | findstr :8000` -> `taskkill /PID <pid> /F`
   Linux/macOS: `lsof -i :8000` or `ss -lptn 'sport = :8000'` -> `kill -9 <pid>`
4. Or remap host port in docker-compose.yml: e.g. `"8080:8000"`.
Verification:
Run `docker compose up -d`. Container starts and stays in `Up` state without port conflict errors.""",
        "chunks": [
            "Docker Port Allocation Failure: Occurs when host port specified in port binding (-p host:container) is already bound.",
            "Diagnostic Step: Run docker ps --filter 'publish=<port>' to check container conflicts.",
            "Host Process Diagnostic: Use netstat -ano on Windows or lsof -i on Unix to identify conflicting host PID.",
            "Fix: Terminate conflicting container via docker stop, or remap host port in docker-compose.yml to an unused port.",
            "Verification: docker compose up -d succeeds and docker ps confirms port binding status.",
        ],
    },
    {
        "title": "Windows Wi-Fi Adapter Driver Regression After Windows Update",
        "category": "Network & Wi-Fi",
        "source_type": "official",
        "source_name": "Microsoft Windows Support Documentation",
        "source_url": "https://support.microsoft.com/en-us/windows/fix-wi-fi-connection-issues-in-windows-9b72cd60-b13c-d454-4647-52f3e0f80f63",
        "trust_level": "official",
        "version": "1.0",
        "content": """Symptom: Wi-Fi disconnects intermittently (every 5-15 minutes) or drops under load immediately following a Windows update.
Root Causes:
1. Windows Update replaced the vendor OEM wireless driver with a generic Microsoft driver that has power-state regression.
2. "Allow the computer to turn off this device to save power" is resetting the network interface.
Resolution:
1. Roll back network adapter driver:
   - Press Win+X -> Device Manager -> Network Adapters.
   - Right-click wireless adapter (Intel, Realtek, MediaTek) -> Properties -> Driver tab.
   - Click "Roll Back Driver" (select "Previous version worked better") and reboot.
2. Disable power management shutdown:
   - In Adapter Properties -> Power Management tab -> Uncheck "Allow computer to turn off this device to save power".
3. Reset network stack:
   `netsh winsock reset && netsh int ip reset` in Admin Command Prompt.
Verification:
Network adapter maintains continuous ping (`ping 8.8.8.8 -t`) without timeout spikes over 30-minute period.""",
        "chunks": [
            "Windows Wi-Fi Drops Post-Update: Caused by driver regressions or aggressive power management in updated wireless drivers.",
            "Fix: Roll Back Driver in Device Manager under Network Adapters -> Properties -> Driver tab.",
            "Power Saving Fix: Uncheck 'Allow the computer to turn off this device to save power' in adapter Power Management properties.",
            "Stack Reset: Run netsh winsock reset and netsh int ip reset from Administrator prompt and reboot.",
            "Verification: Observe continuous connection stability without adapter resets over 24-hour window.",
        ],
    },
    {
        "title": "Excel XLOOKUP Returns #N/A (Whitespace and Formatting Mismatch)",
        "category": "Apps & Productivity",
        "source_type": "official",
        "source_name": "Microsoft Excel Documentation",
        "source_url": "https://support.microsoft.com/en-us/office/xlookup-function-b7fd680e-6d10-43e6-84f9-88ae8bfdb959",
        "trust_level": "official",
        "version": "1.0",
        "content": """Symptom: `=XLOOKUP(lookup_value, lookup_array, return_array)` returns `#N/A` even though the value visually appears in the lookup column.
Root Causes:
1. Hidden leading, trailing, or non-breaking spaces (`CHAR(160)`) in lookup value or lookup column.
2. Number stored as Text mismatch: lookup_value is numeric (e.g. `1042`), but lookup_array cells are stored as text (`'1042`), or vice-versa.
Resolution:
1. Normalize whitespace with `TRIM` and `CLEAN`:
   `=XLOOKUP(TRIM(A2), TRIM(B:B), C:C)`
   Or clean the data column: Select column -> Data tab -> Text to Columns -> Finish.
2. Coerce text to number:
   `=XLOOKUP(--A2, B:B, C:C)` or `=XLOOKUP(A2 & "", B:B, C:C)`
3. Provide default fallback in XLOOKUP 4th argument:
   `=XLOOKUP(A2, B:B, C:C, "Not Found")`
Verification:
Formula recalculates and returns expected matched cell content instead of `#N/A` error.""",
        "chunks": [
            "Excel XLOOKUP #N/A Error: Occurs when exact match fails due to hidden whitespace or text vs numeric data type mismatch.",
            "Root Cause 1: Trailing or leading spaces or non-breaking spaces (CHAR(160)) from web/CSV copy-pastes.",
            "Root Cause 2: Numerical ID stored as text string in one column and integer number in the other.",
            "Fix: Apply TRIM/CLEAN or use Text-to-Columns to re-parse data types uniformly.",
            "Verification: Formula returns the matched lookup value cleanly without #N/A.",
        ],
    },
    {
        "title": "Git Merge Conflict Resolution and Conflict Markers",
        "category": "Coding Error",
        "source_type": "official",
        "source_name": "Git SCM Official Documentation",
        "source_url": "https://git-scm.com/docs/git-merge",
        "trust_level": "official",
        "version": "1.0",
        "content": """Symptom: `git merge` or `git pull` stops with:
`CONFLICT (content): Merge conflict in <file>`
`Automatic merge failed; fix conflicts and then commit the result.`
Root Causes:
Both branches modified the same lines in the file since the common ancestor commit.
Resolution:
1. Run `git status` to see all unmerged paths.
2. Open conflicting files and locate markers:
   `<<<<<<< HEAD` (current branch content)
   `=======` (separator)
   `>>>>>>> branch_name` (incoming branch content)
3. Edit the file to keep desired code, remove all marker lines (`<<<<<<<`, `=======`, `>>>>>>>`).
4. Stage resolved files:
   `git add <file>`
5. Complete the merge commit:
   `git commit -m "Resolve merge conflict in <file>"`
6. If merge was started by mistake, abort safely:
   `git merge --abort`
Verification:
`git status` outputs "nothing to commit, working tree clean".""",
        "chunks": [
            "Git Merge Conflict: Triggered when two branches edit the same lines in a file concurrently.",
            "Diagnostic: git status lists files under 'Unmerged paths'.",
            "Resolution: Manually inspect conflict markers <<<<<<< HEAD, =======, and >>>>>>>, keep desired code, delete markers.",
            "Safety: Run git merge --abort to safely return to pre-merge state at any time.",
            "Verification: Stage with git add and run git commit; git status confirms clean working tree.",
        ],
    },
    {
        "title": "Supabase Row Level Security (RLS) Policy Violations",
        "category": "Coding Error",
        "source_type": "official",
        "source_name": "Supabase Official Documentation",
        "source_url": "https://supabase.com/docs/guides/database/postgres/row-level-security",
        "trust_level": "official",
        "version": "1.0",
        "content": """Symptom: Queries return empty arrays `[]` or API returns `403 Forbidden` / `new row violates row-level security policy for table`.
Root Causes:
1. Row Level Security is enabled on table, but no policy permits the current role (`anon` or `authenticated`) to perform the operation.
2. Client request lacks valid Authorization header containing Supabase JWT, causing session to fall back to `anon`.
3. Policy checks `auth.uid() = user_id`, but `user_id` in INSERT payload does not match `auth.uid()`.
Resolution:
1. Ensure client passes valid session token (`Authorization: Bearer <access_token>`).
2. Verify policy exists for operation:
   `CREATE POLICY "Users can insert own cases" ON cases FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);`
3. Never use `service_role` key in public frontend client code.
Verification:
API call with user bearer token completes with 200/201 and returns inserted or queried row.""",
        "chunks": [
            "Supabase RLS Policy Violation: Occurs when Row Level Security blocks SELECT, INSERT, UPDATE, or DELETE.",
            "Root Cause: Missing policy for role (authenticated/anon) or mismatch between auth.uid() and record owner column.",
            "Fix: Authorize appropriate policy (e.g. CREATE POLICY ... FOR SELECT TO authenticated USING (auth.uid() = user_id)).",
            "Client Token: Ensure frontend passes Bearer session token and does not fall back to anonymous role.",
            "Verification: Test query with authenticated JWT; query returns expected record with 200 OK.",
        ],
    },
]

