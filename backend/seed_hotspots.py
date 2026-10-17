"""
Seed script: loads the 102 unified Nashik blackspot records
(integrated from Blackspot_Data 80 and Nashik_27_Blackspot_Data)
into the PostgreSQL hotspots table.

Run from the backend/ folder with the venv activated:
    python seed_hotspots.py
"""
import json
import os
from app.core.database import SessionLocal
from app.models.hotspot import Hotspot
from sqlalchemy import func

def load_seed_data():
    seed_path = os.path.join(os.path.dirname(__file__), "app", "seed_hotspots.json")
    with open(seed_path, "r", encoding="utf-8") as f:
        return json.load(f)

def seed():
    db = SessionLocal()
    try:
        existing_count = db.query(func.count(Hotspot.id)).scalar()
        print(f"Current hotspots in database: {existing_count}")
        
        hotspots_data = load_seed_data()
        print(f"Seeding {len(hotspots_data)} unified blackspots...")

        db.query(Hotspot).delete()
        db.commit()

        for item in hotspots_data:
            spot = Hotspot(
                id=item["id"],
                name=item["name"],
                latitude=item["lat"],
                longitude=item["lng"],
                risk_level=item["riskLevel"],
                risk_score=item["riskScore"],
                accident_count=item["accidentCount"],
                fatalities=item["fatalities"],
                safety_recommendation=item["safetyRecommendation"],
                risk_factors=item["riskFactors"],
                algorithm=item.get("algorithm", "HDBSCAN / Traffic Police"),
                source="Unified Blackspot Integration 2026",
                is_active=True
            )
            db.add(spot)
        db.commit()
        print(f"Successfully seeded {len(hotspots_data)} hotspots into database.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
