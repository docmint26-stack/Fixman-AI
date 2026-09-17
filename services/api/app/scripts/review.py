"""Trusted local operator tools. No public route or client-selected confidence/reward."""
import argparse
import asyncio

from sqlalchemy import select

from app.db.models import Case, CaseFixRecommendation, DiagnosisRun, Fix
from app.db.session import Session
from app.services.workflows import accept_outcome, audit, transition


async def run(args):
    async with Session() as db, db.begin():
        if args.action == "accept-outcome":
            await accept_outcome(db, args.id)
        else:
            case = await db.get(Case, args.id)
            fix = await db.get(Fix, args.fix_id)
            if not case or not fix or fix.source_type != "curated":
                raise ValueError("Provide an existing case and curated fix.")
            diagnosis = await db.scalar(select(DiagnosisRun).where(DiagnosisRun.case_id == case.id).order_by(DiagnosisRun.created_at.desc()))
            if not diagnosis:
                raise ValueError("Start a diagnosis request first.")
            transition(case, "suggested")
            db.add(CaseFixRecommendation(case_id=case.id, diagnosis_run_id=diagnosis.id, fix_id=fix.id, rank=1, explanation="Curated recommendation associated by an operator; not an AI diagnosis."))
            audit(db, case.user_id, "curated_recommendation_associated", "case", case.id)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["recommend", "accept-outcome"])
    parser.add_argument("id")
    parser.add_argument("--fix-id")
    asyncio.run(run(parser.parse_args()))
