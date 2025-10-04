import { useState, useEffect } from 'react';
import {
  TextInput,
  MultiSelect,
  Select,
  Switch,
  Button,
  Stack,
  Group,
  SimpleGrid,
  Text,
  Card,
  Center,
  Loader,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch, IconFilterOff } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { UserCard } from './UserCard';

const AVAILABILITY_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'Full-time', label: 'Full-time' },
  { value: 'Part-time', label: 'Part-time' },
  { value: 'Weekends', label: 'Weekends' },
  { value: 'Evenings', label: 'Evenings' },
  { value: 'Flexible', label: 'Flexible' },
];

export function DirectorySearch() {
  const [nameQuery, setNameQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [availability, setAvailability] = useState('any');
  const [matchAllSkills, setMatchAllSkills] = useState(false);
  const [debouncedName] = useDebouncedValue(nameQuery, 300);

  // Fetch all unique skills for filter
  const { data: allSkills = [] } = useQuery({
    queryKey: ['all-skills'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_skills');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch users with filters
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['directory', debouncedName, selectedSkills, availability, matchAllSkills],
    queryFn: async () => {
      let query = supabase
        .from('community')
        .select('*')
        .order('created_at', { ascending: false });

      // Name search
      if (debouncedName) {
        query = query.ilike('name', `%${debouncedName}%`);
      }

      // Skills filter
      if (selectedSkills.length > 0) {
        if (matchAllSkills) {
          // Match ALL skills (user must have all selected skills)
          query = query.contains('skills', selectedSkills);
        } else {
          // Match ANY skills (user must have at least one selected skill)
          query = query.overlaps('skills', selectedSkills);
        }
      }

      // Availability filter
      if (availability && availability !== 'any') {
        query = query.eq('availability', availability);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch endorsements for all displayed users
  const { data: endorsementsData = {} } = useQuery({
    queryKey: ['endorsements', users.map(u => u.id)],
    queryFn: async () => {
      if (users.length === 0) return {};

      const userIds = users.map(u => u.id);
      const { data, error } = await supabase
        .from('endorsements')
        .select('endorsed_user_id, skill, count')
        .in('endorsed_user_id', userIds);

      if (error) throw error;

      // Group by user_id and skill
      const grouped = {};
      data?.forEach((endorsement) => {
        if (!grouped[endorsement.endorsed_user_id]) {
          grouped[endorsement.endorsed_user_id] = {};
        }
        grouped[endorsement.endorsed_user_id][endorsement.skill] = endorsement.count;
      });

      return grouped;
    },
    enabled: users.length > 0,
  });

  const clearFilters = () => {
    setNameQuery('');
    setSelectedSkills([]);
    setAvailability('any');
    setMatchAllSkills(false);
  };

  const hasActiveFilters = nameQuery || selectedSkills.length > 0 || availability !== 'any';

  return (
    <Stack spacing="lg">
      {/* Search and Filters */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack spacing="md">
          <TextInput
            icon={<IconSearch size={16} />}
            placeholder="Search by name..."
            value={nameQuery}
            onChange={(e) => setNameQuery(e.currentTarget.value)}
            size="md"
          />

          <MultiSelect
            label="Skills"
            placeholder="Filter by skills"
            data={allSkills}
            value={selectedSkills}
            onChange={setSelectedSkills}
            searchable
            clearable
          />

          <Select
            label="Availability"
            placeholder="Filter by availability"
            data={AVAILABILITY_OPTIONS}
            value={availability}
            onChange={setAvailability}
            clearable
          />

          <Group position="apart">
            <Switch
              label="Match ALL skills (instead of ANY)"
              checked={matchAllSkills}
              onChange={(e) => setMatchAllSkills(e.currentTarget.checked)}
              disabled={selectedSkills.length === 0}
            />

            {hasActiveFilters && (
              <Button
                variant="subtle"
                leftIcon={<IconFilterOff size={16} />}
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            )}
          </Group>
        </Stack>
      </Card>

      {/* Results */}
      {isLoading ? (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      ) : users.length === 0 ? (
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Center>
            <Stack align="center" spacing="xs">
              <Text size="lg" weight={500} color="dimmed">
                {hasActiveFilters ? 'No users match your search' : 'No profiles yet'}
              </Text>
              <Text size="sm" color="dimmed">
                {hasActiveFilters
                  ? 'Try different filters or search terms'
                  : 'Be the first to create a profile!'}
              </Text>
            </Stack>
          </Center>
        </Card>
      ) : (
        <>
          <Text size="sm" color="dimmed">
            Found {users.length} user{users.length !== 1 ? 's' : ''}
          </Text>
          <SimpleGrid
            cols={3}
            spacing="lg"
            breakpoints={[
              { maxWidth: 'md', cols: 2 },
              { maxWidth: 'sm', cols: 1 },
            ]}
          >
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                endorsements={endorsementsData[user.id] || {}}
              />
            ))}
          </SimpleGrid>
        </>
      )}
    </Stack>
  );
}
