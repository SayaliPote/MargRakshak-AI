import json
from datetime import datetime, timezone
from geoalchemy2.elements import WKTElement

from app.core.database import SessionLocal
from app.models.hotspot import Hotspot


def seed():
    db = SessionLocal()
    try:
        with open('app/seed_hotspots.json', 'r', encoding='utf-8') as f:
            items = json.load(f)

        existing_spots = {h.name.lower().strip(): h for h in db.query(Hotspot).all()}
        print(f"Initially in DB: {len(existing_spots)} records")

        added_count = 0
        for item in items:
            name_key = item['name'].lower().strip()
            if name_key in existing_spots:
                continue

            lat = float(item['lat'])
            lng = float(item['lng'])
            if 9.0 < lat < 11.0:
                lat += 10.0

            geom_wkt = WKTElement(f"POINT({lng} {lat})", srid=4326)

            road_class = item.get('roadClass', 'Road')
            peak_time = item.get('peakTime', 'Night')
            peak_day = item.get('peakDay', 'Weekdays')
            season = item.get('season', 'All')
            collision = item.get('collisionType', 'Vehicle')

            h = Hotspot(
                name=item['name'],
                latitude=lat,
                longitude=lng,
                geom=geom_wkt,
                risk_level=item.get('riskLevel', 'MEDIUM').upper(),
                risk_score=float(item.get('riskScore', 0.5)),
                density=float(item.get('density', 0.0)),
                accident_count=int(item.get('accidentCount', 0)),
                fatalities=int(item.get('fatalities', 0)),
                radius_meters=float(item.get('radius', 200.0)),
                safety_recommendation=item.get('safetyRecommendation', ''),
                risk_factors=item.get('riskFactors', []),
                algorithm=item.get('algorithm', 'HDBSCAN'),
                source='SEED',
                description=f"Road Class: {road_class}. Peak: {peak_time} ({peak_day}). Season: {season}. Collision: {collision}",
                is_active=True,
                last_updated=datetime.now(timezone.utc),
            )
            db.add(h)
            added_count += 1

        db.commit()
        total = db.query(Hotspot).count()
        print(f"Successfully added {added_count} hotspots. Total hotspots in DB now: {total}")
    finally:
        db.close()


if __name__ == '__main__':
    seed()
