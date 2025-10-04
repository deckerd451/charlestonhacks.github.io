import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TextInput,
  Textarea,
  MultiSelect,
  Select,
  Checkbox,
  Button,
  Stack,
  Group,
  Progress,
  Text,
  FileInput,
  Avatar,
  Card,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconUpload, IconUser } from '@tabler/icons-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { calculateProfileCompleteness } from '../theme/mantineTheme';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const AVAILABILITY_OPTIONS = [
  'Full-time',
  'Part-time',
  'Weekends',
  'Evenings',
  'Flexible',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ProfileForm() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Fetch existing skills for autocomplete
  const { data: existingSkills = [] } = useQuery({
    queryKey: ['all-skills'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_skills');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch existing interests for autocomplete
  const { data: existingInterests = [] } = useQuery({
    queryKey: ['all-interests'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_interests');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('community')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const form = useForm({
    initialValues: {
      name: '',
      email: user?.email || '',
      skills: [],
      interests: [],
      bio: '',
      availability: '',
      newsletter_opt_in: false,
    },
    validate: {
      name: (value) => {
        if (!value || value.length < 2) return 'Name must be at least 2 characters';
        if (value.length > 50) return 'Name must be less than 50 characters';
        return null;
      },
      email: (value) => {
        if (!value) return 'Email is required';
        if (!/^\S+@\S+\.\S+$/.test(value)) return 'Invalid email format';
        return null;
      },
      skills: (value) => {
        if (!value || value.length === 0) return 'At least 1 skill is required';
        if (value.length > 20) return 'Maximum 20 skills allowed';
        return null;
      },
      bio: (value) => {
        if (value && value.length > 500) return 'Bio must be less than 500 characters';
        return null;
      },
      interests: (value) => {
        if (value && value.length > 10) return 'Maximum 10 interests allowed';
        return null;
      },
    },
  });

  // Load profile data into form
  useEffect(() => {
    if (profile) {
      form.setValues({
        name: profile.name || '',
        email: profile.email || user?.email || '',
        skills: profile.skills || [],
        interests: profile.interests || [],
        bio: profile.bio || '',
        availability: profile.availability || '',
        newsletter_opt_in: profile.newsletter_opt_in || false,
      });
      if (profile.image_url) {
        setPhotoPreview(profile.image_url);
      }
    }
  }, [profile]);

  // Auto-save to localStorage
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem('profile-draft', JSON.stringify(form.values));
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [form.values]);

  // Load draft from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem('profile-draft');
    if (draft && !profile) {
      try {
        const parsedDraft = JSON.parse(draft);
        form.setValues(parsedDraft);
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, []);

  // Handle photo file selection
  const handlePhotoChange = (file) => {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      notifications.show({
        title: 'File too large',
        message: 'Photo must be less than 5MB',
        color: 'red',
      });
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Upload photo to Supabase Storage
  const uploadPhoto = async () => {
    if (!photoFile || !user) return null;

    setUploading(true);
    try {
      // Delete old photo if exists
      if (profile?.image_url) {
        const oldPath = profile.image_url.split('/').pop();
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Upload new photo
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, photoFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      return data.publicUrl;
    } finally {
      setUploading(false);
    }
  };

  // Save profile mutation
  const saveMutation = useMutation({
    mutationFn: async (values) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Upload photo if changed
      let imageUrl = profile?.image_url;
      if (photoFile) {
        imageUrl = await uploadPhoto();
      }

      const profileData = {
        user_id: user.id,
        name: values.name,
        email: values.email,
        skills: values.skills,
        interests: values.interests,
        bio: values.bio,
        availability: values.availability,
        newsletter_opt_in: values.newsletter_opt_in,
        newsletter_opt_in_at: values.newsletter_opt_in && !profile?.newsletter_opt_in
          ? new Date().toISOString()
          : profile?.newsletter_opt_in_at,
        image_url: imageUrl,
      };

      const { data, error } = await supabase
        .from('community')
        .upsert(profileData, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['profile', user?.id]);
      localStorage.removeItem('profile-draft');
      notifications.show({
        title: 'Profile saved',
        message: 'Your profile has been updated successfully',
        color: 'green',
      });
      navigate('/profile');
    },
    onError: (error) => {
      notifications.show({
        title: 'Error saving profile',
        message: error.message,
        color: 'red',
      });
    },
  });

  const handleSubmit = (values) => {
    saveMutation.mutate(values);
  };

  const completeness = calculateProfileCompleteness({
    ...form.values,
    image_url: photoPreview,
  });

  if (isLoading) {
    return <Text>Loading profile...</Text>;
  }

  return (
    <Card shadow="md" padding="xl" radius="md" withBorder>
      <Title order={2} mb="md">
        {profile ? 'Edit Profile' : 'Create Profile'}
      </Title>

      <Stack spacing="md">
        {/* Profile Completeness */}
        <div>
          <Group position="apart" mb={5}>
            <Text size="sm" weight={500}>Profile Completeness</Text>
            <Text size="sm" color="dimmed">{completeness}%</Text>
          </Group>
          <Progress value={completeness} color={completeness === 100 ? 'green' : 'cyan'} />
        </div>

        {/* Photo Upload */}
        <Stack spacing="xs" align="center">
          <Avatar src={photoPreview} size={120} radius="xl">
            <IconUser size={60} />
          </Avatar>
          <FileInput
            placeholder="Upload profile photo"
            icon={<IconUpload size={14} />}
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handlePhotoChange}
            disabled={uploading}
          />
          <Text size="xs" color="dimmed">Max 5MB • JPG, PNG, WebP</Text>
        </Stack>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack spacing="md">
            <TextInput
              label="Name"
              placeholder="Your full name"
              required
              {...form.getInputProps('name')}
            />

            <TextInput
              label="Email"
              placeholder="your@email.com"
              type="email"
              required
              {...form.getInputProps('email')}
            />

            <MultiSelect
              label="Skills"
              placeholder="Select or add skills"
              data={existingSkills}
              searchable
              creatable
              required
              getCreateLabel={(query) => `+ Add "${query}"`}
              onCreate={(query) => {
                const item = query;
                return item;
              }}
              {...form.getInputProps('skills')}
            />

            <MultiSelect
              label="Interests"
              placeholder="Select or add interests"
              data={existingInterests}
              searchable
              creatable
              getCreateLabel={(query) => `+ Add "${query}"`}
              onCreate={(query) => {
                const item = query;
                return item;
              }}
              {...form.getInputProps('interests')}
            />

            <Select
              label="Availability"
              placeholder="Select your availability"
              data={AVAILABILITY_OPTIONS}
              {...form.getInputProps('availability')}
            />

            <Textarea
              label="Bio"
              placeholder="Tell us about yourself..."
              minRows={4}
              maxRows={8}
              maxLength={500}
              {...form.getInputProps('bio')}
            />
            <Text size="xs" color="dimmed" align="right">
              {form.values.bio.length}/500 characters
            </Text>

            <Checkbox
              label="Subscribe to newsletter"
              {...form.getInputProps('newsletter_opt_in', { type: 'checkbox' })}
            />

            <Group position="right" mt="md">
              <Button variant="subtle" onClick={() => navigate('/profile')}>
                Cancel
              </Button>
              <Button type="submit" loading={saveMutation.isLoading || uploading}>
                Save Profile
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Card>
  );
}
