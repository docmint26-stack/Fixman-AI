"""Offline evaluation; lexical rubrics are diagnostic proxies, not live AI quality."""
import asyncio
import json
from collections import defaultdict

from app.scripts.evaluation_cases import CASES
from app.services.ai.provider import MockAIProvider, generate_deterministic_embedding
from app.services.ai.schemas import ProblemAnalysis
from app.services.knowledge.cold_start import COLD_START_KNOWLEDGE
from app.services.retrieval.embeddings import cosine_similarity
from app.services.retrieval.reranker import FixRanker, check_destructive_content
from app.services.verification.engine import get_verifier_for_category


def contains_family(text, terms):
    return any(term.lower() in text.lower() for term in terms)


async def evaluate():
    provider = MockAIProvider()
    ranker = FixRanker(min_sample=5)
    totals = defaultdict(float)
    details = []
    corpus = [(doc, generate_deterministic_embedding(doc["title"] + " " + doc["content"]))
              for doc in COLD_START_KNOWLEDGE]
    for case in CASES:
        query = generate_deterministic_embedding(case["input"])
        retrieved = sorted([(doc, cosine_similarity(query, vector)) for doc, vector in corpus],
                           key=lambda pair: pair[1], reverse=True)[:3]
        # Expected labels are scoring rubrics only; never supplied to the provider.
        analysis, _ = await provider.analyze_problem(
            title=case["input"], description=case["input"], category="", environment={}, evidence=[],
            grounded_facts=[{"title": doc["title"], "content": doc["content"]} for doc, _ in retrieved],
        )
        candidates = [{"id": str(i), "title": doc["title"], "summary": doc["content"],
                       "steps": doc.get("chunks", [doc["content"]]), "source_type": "curated",
                       "context_match_score": max(0, score), "success_count": 0, "failure_count": 0}
                      for i, (doc, score) in enumerate(retrieved)]
        ranked = ranker.score_and_rank_fixes(candidates, {"category": analysis.category})
        top = ranked[0]
        cause_text = " ".join(c.title + " " + c.explanation for c in analysis.likely_causes)
        fix_text = top.title + " " + top.summary + " " + " ".join(top.steps)
        # Concrete symptom claims unsupported by input or retrieved documents; lexical proxy.
        grounding = (case["input"] + " " + " ".join(doc["content"] for doc, _ in retrieved)).lower()
        claims = [s.lower() for s in analysis.observed_symptoms]
        unsupported = sum(s not in grounding for s in claims) / max(1, len(claims))
        verifier = type(get_verifier_for_category(analysis.category)).__name__.lower()
        scores = {
            "structured_output_validity": float(bool(ProblemAnalysis.model_validate(analysis.model_dump()))),
            "category_accuracy": float(analysis.category == case["expected_category"]),
            "root_cause_relevance": float(contains_family(cause_text, case["expected_likely_cause_family"])),
            "retrieval_precision_at_3": sum(contains_family(doc["content"], case["acceptable_fix_families"])
                                            and doc["category"] == case["expected_category"] for doc, _ in retrieved) / 3,
            "safe_fix_rate": float(not check_destructive_content(fix_text)[0]
                                   and not contains_family(fix_text, case["dangerous_unacceptable_fixes"])),
            "unsupported_claim_rate": unsupported,
            "fix_ranking_relevance": float(contains_family(fix_text, case["acceptable_fix_families"])
                                           and retrieved[int(top.fix_id)][0]["category"] == case["expected_category"]),
            "verification_strategy_accuracy": float(case["expected_verification_strategy"] in verifier),
            "sample_honesty": float(all(f.verified_success_rate is None for f in ranked)),
        }
        for name, value in scores.items():
            totals[name] += value
        details.append({"input": case["input"], "domain": case["domain"], "predicted_category": analysis.category,
                        "top_fix": top.title, "scores": scores})
    return {"label": "MOCK/DETERMINISTIC BASELINE", "total_cases": len(CASES),
            "metrics": {name: round(value / len(CASES), 4) for name, value in totals.items()},
            "limitations": ["Lexical relevance and claim-support proxies require human review.",
                            "Cold-start knowledge has limited coverage; no live model quality claim.",
                            "Verifier selection is scored, not execution on a user's device."],
            "cases": details}


def main():
    report = asyncio.run(evaluate())
    print(json.dumps(report, indent=2))
    return 0 if report["metrics"]["structured_output_validity"] == 1 and report["metrics"]["sample_honesty"] == 1 else 1


if __name__ == "__main__":
    raise SystemExit(main())
