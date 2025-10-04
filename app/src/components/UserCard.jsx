import { Card, Avatar, Text, Badge, Group, Button, Stack, Tooltip } from '@mantine/core';
import { IconMail, IconUser } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { availabilityColors } from '../theme/mantineTheme';

export function UserCard({ user, onEndorse, endorsements = {} }) {
  const navigate = useNavigate();

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack spacing="md">
        {/* Avatar and Name */}
        <Group position="apart">
          <Group>
            <Avatar src={user.image_url} size={80} radius="xl">
              {getInitials(user.name || 'U')}
            </Avatar>
            <div>
              <Text size="xl" weight={500}>
                {user.name}
              </Text>
              <Group spacing={4}>
                <IconMail size={14} />
                <Text size="sm" color="dimmed">
                  {user.email}
                </Text>
              </Group>
            </div>
          </Group>
          {user.availability && (
            <Badge color={availabilityColors[user.availability] || 'gray'} size="lg">
              {user.availability}
            </Badge>
          )}
        </Group>

        {/* Bio */}
        {user.bio && (
          <Text size="sm" lineClamp={3} color="dimmed">
            {user.bio}
          </Text>
        )}

        {/* Skills */}
        {user.skills && user.skills.length > 0 && (
          <div>
            <Text size="xs" weight={500} color="dimmed" mb={4}>
              SKILLS
            </Text>
            <Group spacing="xs">
              {user.skills.map((skill) => {
                const count = endorsements[skill] || 0;
                return (
                  <Tooltip
                    key={skill}
                    label={count > 0 ? `${count} endorsement${count > 1 ? 's' : ''}` : 'No endorsements'}
                    withArrow
                  >
                    <Badge variant="filled" size="md">
                      {skill}
                      {count > 0 && ` (${count})`}
                    </Badge>
                  </Tooltip>
                );
              })}
            </Group>
          </div>
        )}

        {/* Interests */}
        {user.interests && user.interests.length > 0 && (
          <div>
            <Text size="xs" weight={500} color="dimmed" mb={4}>
              INTERESTS
            </Text>
            <Group spacing="xs">
              {user.interests.map((interest) => (
                <Badge key={interest} variant="outline" size="md">
                  {interest}
                </Badge>
              ))}
            </Group>
          </div>
        )}

        {/* Actions */}
        <Group mt="md" spacing="sm">
          <Button
            variant="light"
            fullWidth
            onClick={() => navigate(`/profile/${user.id}`)}
          >
            View Profile
          </Button>
          {onEndorse && (
            <Button
              variant="subtle"
              fullWidth
              onClick={() => onEndorse(user)}
            >
              Endorse
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
