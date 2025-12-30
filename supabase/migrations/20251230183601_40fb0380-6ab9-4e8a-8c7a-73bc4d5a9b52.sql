-- Set REPLICA IDENTITY FULL on audio_phone_rounds and audio_phone_recordings to ensure all columns are visible in realtime updates
ALTER TABLE audio_phone_rounds REPLICA IDENTITY FULL;
ALTER TABLE audio_phone_recordings REPLICA IDENTITY FULL;