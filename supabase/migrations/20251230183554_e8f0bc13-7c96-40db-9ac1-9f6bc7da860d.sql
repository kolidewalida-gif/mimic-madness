-- Set REPLICA IDENTITY FULL on lobbies table to ensure all columns are visible in realtime updates
ALTER TABLE lobbies REPLICA IDENTITY FULL;