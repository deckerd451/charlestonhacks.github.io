import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Avatar,
  Text,
  Badge,
  Group,
  Button,
  Stack,
  Title,
  Center,
  Loader,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { IconEdit, IconMail, IconUser } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { availabilityColors } from '../theme/mantineTheme';

export function ProfileView() {
  const { userId } = useParams();
  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();

  // If no userId in params, use current user's ID
  const profileUserId = userId || currentUser?.id;
  const isOwnProfile = !userId || userId === currentUser?.id;

  // Fetch profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-view', profileUserId],
    queryFn: async () => {
      if (!profileUserId) return null;

      const { data, error } = await supabase
        .from('community')
        .select('*')
        .eq(userId ? 'id' : 'user_id', profileUserId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!profileUserId,
  });

  // Fetch endorsements for this profile
  const { data: endorsements = {} } = useQuery({
    queryKey: ['endorsements', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return {};

      const { data, error } = await supabase
        .from('endorsements')
        .select('skill, count')
        .eq('endorsed_user_id', profile.id);

      if (error) throw error;

      // Group by skill
      const grouped = {};
      data?.forEach((endorsement) => {
        grouped[endorsement.skill] = endorsement.count;
      });

      return grouped;
    },
    enabled: !!profile?.id,
  });

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSkillClick = (skill) => {
    navigate(`/directory?skill=${encodeURIComponent(skill)}`);
  };

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  if (!profile) {
    return (
      <Card shadow="md" padding="xl" radius="md" withBorder>
        <Center>
          <Stack align="center" spacing="md">
            <IconUser size={64} />
            <Title order={3}>No profile found</Title>
            {isOwnProfile && (
              <>
                <Text color="dimmed">You haven't created a profile yet</Text>
                <Button onClick={() => navigate('/profile/edit')}>
                  Create Profile
                </Button>
              </>
            )}
          </Stack>
        </Center>
      </Card>
    );
  }

  return (
    <Stack spacing="lg">
      {/* Header Card */}
      <Card shadow="md" padding="xl" radius="md" withBorder>
        <Group position="apart" align="start" mb="md">
          <Group>
            <Avatar src={profile.image_url} size={150} radius="xl">
              {getInitials(profile.name || 'U')}
            </Avatar>
            <Stack spacing="xs">
              <Title order={1}>{profile.name}</Title>
              <Group spacing={8}>
                <IconMail size={18} />
                <Text size="md" color="dimmed" component="a" href={`mailto:${profile.email}`}>
                  {profile.email}
                </Text>
              </Group>
              {profile.availability && (
                <Badge color={availabilityColors[profile.availability] || 'gray'} size="lg">
                  {profile.availability}
                </Badge>
              )}
            </Stack>
          </Group>

          {isOwnProfile && (
            <Tooltip label="Edit Profile" withArrow>
              <ActionIcon
                variant="light"
                size="lg"
                onClick={() => navigate('/profile/edit')}
              >
                <IconEdit size={20} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>

        {/* Bio */}
        {profile.bio && (
          <Text size="md" color="dimmed" mt="md">
            {profile.bio}
          </Text>
        )}
      </Card>

      {/* Skills Card */}
      {profile.skills && profile.skills.length > 0 && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">Skills</Title>
          <Group spacing="md">
            {profile.skills.map((skill) => {
              const count = endorsements[skill] || 0;
              return (
                <Tooltip
                  key={skill}
                  label={
                    count > 0
                      ? `${count} endorsement${count > 1 ? 's' : ''} • Click to search`
                      : 'Click to search directory'
                  }
                  withArrow
                >
                  <Badge
                    variant="filled"
                    size="xl"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSkillClick(skill)}
                  >
                    {skill}
                    {count > 0 && ` (${count})`}
                  </Badge>
                </Tooltip>
              );
            })}
          </Group>
        </Card>
      )}

      {/* Interests Card */}
      {profile.interests && profile.interests.length > 0 && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">Interests</Title>
          <Group spacing="md">
            {profile.interests.map((interest) => (
              <Badge key={interest} variant="outline" size="xl">
                {interest}
              </Badge>
            ))}
          </Group>
        </Card>
      )}

      {/* Actions for own profile */}
      {isOwnProfile && (
        <Group position="right">
          <Button variant="light" onClick={() => navigate('/directory')}>
            Browse Directory
          </Button>
        </Group>
      )}
    </Stack>
  );
}
