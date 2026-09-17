"""Code analysis and execution sandbox interface for FixMind AI.

Prevents untrusted user code from executing directly on the host.
Provides DisabledSandbox default and language/framework detection utilities.
"""
import re
from dataclasses import dataclass
from typing import Protocol


@dataclass
class CodeAnalysisResult:
    language: str
    framework: str | None
    detected_errors: list[str]
    has_unsafe_patterns: bool
    unsafe_patterns: list[str]
    imports: list[str]
    summary: str


@dataclass
class SandboxRunResult:
    success: bool
    exit_code: int
    stdout: str
    stderr: str
    execution_time_ms: int
    is_sandboxed: bool
    status: str  # "disabled", "completed", "timeout", "error"


class CodeSandbox(Protocol):
    async def run_snippet(self, code: str, language: str, timeout_seconds: int = 5) -> SandboxRunResult: ...
    async def run_tests(self, test_code: str, solution_code: str, language: str) -> SandboxRunResult: ...
    async def collect_output(self, command: str) -> SandboxRunResult: ...


class DisabledSandbox:
    """Safe default sandbox implementation that refuses execution of untrusted code."""

    async def run_snippet(self, code: str, language: str, timeout_seconds: int = 5) -> SandboxRunResult:
        return SandboxRunResult(
            success=False,
            exit_code=-1,
            stdout="",
            stderr="Code execution sandbox is disabled by default for host security. Static analysis only.",
            execution_time_ms=0,
            is_sandboxed=False,
            status="disabled",
        )

    async def run_tests(self, test_code: str, solution_code: str, language: str) -> SandboxRunResult:
        return SandboxRunResult(
            success=False,
            exit_code=-1,
            stdout="",
            stderr="Test execution sandbox is disabled by default.",
            execution_time_ms=0,
            is_sandboxed=False,
            status="disabled",
        )

    async def collect_output(self, command: str) -> SandboxRunResult:
        return SandboxRunResult(
            success=False,
            exit_code=-1,
            stdout="",
            stderr="Direct command execution is disabled.",
            execution_time_ms=0,
            is_sandboxed=False,
            status="disabled",
        )


UNSAFE_CODE_PATTERNS = [
    re.compile(r"\b(os\.system|subprocess\.|eval\(|exec\(|__import__|shutil\.rmtree)\b"),
    re.compile(r"\b(child_process|fs\.unlinkSync|fs\.rmdirSync|eval\(|require\(['\"]child_process['\"]\))\b"),
    re.compile(r"\b(rm\s+-rf|format\s+[A-Z]:|mkfs|dd\s+if=)\b"),
    re.compile(r"\b(DROP\s+TABLE|DELETE\s+FROM|TRUNCATE\s+TABLE)\b", re.IGNORECASE),
]

LANGUAGE_PATTERNS = [
    ("python", re.compile(r"\b(def |class |import |from |print\(|elif |except |self\.)\b")),
    ("typescript", re.compile(r"\b(interface |type |export |import .* from |const |let |as |function |console\.log)\b")),
    ("javascript", re.compile(r"\b(function |const |let |var |console\.log|require\(|module\.exports)\b")),
    ("sql", re.compile(r"\b(SELECT |INSERT INTO |UPDATE |DELETE |CREATE TABLE |ALTER TABLE)\b", re.IGNORECASE)),
    ("shell", re.compile(r"\b(echo |export |source |grep |chmod |mkdir |cd |sudo )\b")),
    ("dockerfile", re.compile(r"^(FROM|RUN|COPY|ADD|ENTRYPOINT|CMD|WORKDIR|EXPOSE)\s+", re.MULTILINE)),
]

FRAMEWORK_PATTERNS = [
    ("Next.js", re.compile(r"\b(next/|useRouter|getServerSideProps|getStaticProps|NextPage|useSelectedLayoutSegment)\b")),
    ("React", re.compile(r"\b(useState|useEffect|useContext|useMemo|useCallback|React\.)\b")),
    ("FastAPI", re.compile(r"\b(FastAPI|APIRouter|Depends|HTTPException)\b")),
    ("Django", re.compile(r"\b(django\.|models\.Model|views\.View|render\(request)\b")),
    ("Express", re.compile(r"\b(express\(\)|app\.get\(|app\.post\(|res\.status\()\b")),
    ("Docker", re.compile(r"\b(docker-compose|docker run|container_name)\b")),
]


def analyze_code_snippet(code: str, fallback_language: str | None = None) -> CodeAnalysisResult:
    """Performs static analysis on user code without executing it."""
    if not code or not code.strip():
        return CodeAnalysisResult(
            language=fallback_language or "text",
            framework=None,
            detected_errors=[],
            has_unsafe_patterns=False,
            unsafe_patterns=[],
            imports=[],
            summary="Empty code snippet",
        )

    # Detect language
    detected_lang = fallback_language
    if not detected_lang or detected_lang in ("text", "unknown"):
        for lang, pattern in LANGUAGE_PATTERNS:
            if pattern.search(code):
                detected_lang = lang
                break
    detected_lang = detected_lang or "text"

    # Detect framework
    detected_fw = None
    for fw, pattern in FRAMEWORK_PATTERNS:
        if pattern.search(code):
            detected_fw = fw
            break

    # Detect unsafe patterns
    unsafe_matches = []
    for pat in UNSAFE_CODE_PATTERNS:
        m = pat.search(code)
        if m:
            unsafe_matches.append(m.group(0))

    # Extract imports
    imports: list[str] = []
    import_pat = re.compile(r"^(?:import\s+([a-zA-Z0-9_.]+)|from\s+([a-zA-Z0-9_.]+)|(?:const|var|let)\s+.*=\s*require\(['\"]([^'\"]+)['\"]\))", re.MULTILINE)
    for m in import_pat.finditer(code):
        imp = m.group(1) or m.group(2) or m.group(3)
        if imp:
            imports.append(imp.split(".")[0])

    summary = f"Language: {detected_lang} | Framework: {detected_fw or 'None'} | Imports: {', '.join(set(imports)) or 'None'}"

    return CodeAnalysisResult(
        language=detected_lang,
        framework=detected_fw,
        detected_errors=[],
        has_unsafe_patterns=bool(unsafe_matches),
        unsafe_patterns=unsafe_matches,
        imports=sorted(list(set(imports))),
        summary=summary,
    )

