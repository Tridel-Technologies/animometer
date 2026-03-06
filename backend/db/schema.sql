-- Table for main cruise details
CREATE TABLE IF NOT EXISTS ship_cruises (
  id VARCHAR(50) PRIMARY KEY, -- e.g. CR-02-2026
  vessel VARCHAR(100) NOT NULL,
  project VARCHAR(200) NOT NULL,
  chief_scientist VARCHAR(100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration INTEGER NOT NULL,
  departure_port VARCHAR(100) NOT NULL,
  arrival_port VARCHAR(100) NOT NULL,
  study_area VARCHAR(200),
  sample_plan TEXT,
  equipment TEXT,
  status VARCHAR(50) DEFAULT 'Proposed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for dynamic route stations
CREATE TABLE IF NOT EXISTS cruise_stations (
  id SERIAL PRIMARY KEY,
  cruise_id VARCHAR(50) REFERENCES ship_cruises(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(11, 6) NOT NULL,
  activity VARCHAR(200),
  station_order INTEGER NOT NULL -- To maintain sequence of traversal
);
