-- Database functions for CharlestonHacks profile/directory system
-- These need to be run in Supabase SQL Editor

-- Function to get all unique skills from community table
CREATE OR REPLACE FUNCTION get_all_skills()
RETURNS TEXT[] AS $$
  SELECT ARRAY(
    SELECT DISTINCT unnest(skills)
    FROM community
    WHERE skills IS NOT NULL
    ORDER BY 1
  );
$$ LANGUAGE SQL STABLE;

-- Function to get all unique interests from community table
CREATE OR REPLACE FUNCTION get_all_interests()
RETURNS TEXT[] AS $$
  SELECT ARRAY(
    SELECT DISTINCT unnest(interests)
    FROM community
    WHERE interests IS NOT NULL
    ORDER BY 1
  );
$$ LANGUAGE SQL STABLE;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_all_skills() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_interests() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_skills() TO anon;
GRANT EXECUTE ON FUNCTION get_all_interests() TO anon;
