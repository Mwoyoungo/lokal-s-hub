import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, MapPin, Save, User, X, Camera } from 'lucide-react';
import LocationPicker from '@/components/LocationPicker';
import DeveloperLayout from '@/components/DeveloperLayout';

interface DeveloperProfileDetail {
  id?: string;
  user_id: string;
  bio: string;
  skills: string[];
  hourly_rate: number;
  portfolio_url: string;
  github_url: string;
  linkedin_url: string;
  years_experience: number;
  service_radius: number;
  experience_years: number;
  avatar_url?: string;
  average_rating?: number;
  total_jobs?: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_image_url: string;
  phone: string;
  // Location fields
  lat?: number;
  lng?: number;
  address?: string;
  availability?: boolean;
}

const DeveloperProfile: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DeveloperProfileDetail>({
    user_id: '',
    bio: '',
    skills: [],
    hourly_rate: 0,
    portfolio_url: '',
    github_url: '',
    linkedin_url: '',
    years_experience: 0,
    service_radius: 10,
    experience_years: 0,
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    profile_image_url: '', // Add missing required field
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    
    // Get current user ID
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      toast.error('Not authenticated');
      navigate('/login');
      return;
    }
    
    // First get user details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name, email, profile_image_url')
      .eq('id', userId)
      .single();
    
    if (userError && userError.code !== 'PGRST116') {
      toast.error(`Error fetching user data: ${userError.message}`);
      setLoading(false);
      return;
    }
    
    // Then get developer profile
    const { data: profileData, error: profileError } = await supabase
      .from('developer_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (profileError && profileError.code !== 'PGRST116') {
      toast.error(`Error fetching profile: ${profileError.message}`);
      setLoading(false);
      return;
    }
    
    // Combine the data
    setProfile({
      user_id: userId,
      id: profileData?.id,
      bio: profileData?.bio || '',
      skills: profileData?.skills || [],
      hourly_rate: profileData?.hourly_rate || 0,
      portfolio_url: profileData?.portfolio_url || '',
      github_url: profileData?.github_url || '',
      linkedin_url: profileData?.linkedin_url || '',
      years_experience: profileData?.years_experience || 0,
      service_radius: profileData?.service_radius || 10,
      experience_years: profileData?.experience_years || 0,
      avatar_url: profileData?.avatar_url,
      average_rating: profileData?.average_rating,
      total_jobs: profileData?.total_jobs,
      first_name: userData?.first_name || '',
      last_name: userData?.last_name || '',
      email: userData?.email || '',
      profile_image_url: userData?.profile_image_url || '',
      phone: profileData?.phone || '',
      lat: profileData?.lat,
      lng: profileData?.lng,
      address: profileData?.address || '',
      availability: profileData?.availability || false
    });
    
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    
    try {
      // First update user details
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone
        })
        .eq('id', profile.user_id);
      
      if (userError) throw userError;

      // Prepare profile data without user fields
      const profileData = {
        user_id: profile.user_id,
        bio: profile.bio,
        skills: profile.skills,
        hourly_rate: profile.hourly_rate,
        portfolio_url: profile.portfolio_url,
        github_url: profile.github_url,
        linkedin_url: profile.linkedin_url,
        years_experience: profile.years_experience,
        service_radius: profile.service_radius,
        avatar_url: profile.avatar_url,
        // Save location data in profile table as well
        lat: profile.lat,
        lng: profile.lng,
        address: profile.address
      };
      
      let error;
      
      // Check if profile exists
      if (profile.id) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('developer_profiles')
          .update(profileData)
          .eq('id', profile.id);
        error = updateError;
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('developer_profiles')
          .insert([profileData]);
        error = insertError;
      }
      
      if (error) throw error;
      
      toast.success('Profile saved successfully');
      fetchProfile(); // Refresh data
    } catch (error: any) {
      toast.error(`Error saving profile: ${error.message}`);
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFD700] flex items-center justify-center">
        <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-black mb-4" />
          <p className="text-xl font-black">Loading Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFD700] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-2">Developer Profile</h1>
          <p className="text-black font-medium">Update your profile information and showcase your skills to clients</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column - Avatar and personal details */}
          <Card className="col-span-1 bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex flex-col items-center mb-6">
              <div className="relative group mb-4">
                <div className="w-32 h-32 overflow-hidden border-4 border-black mx-auto bg-yellow-200">
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="Profile preview" 
                      className="w-full h-full object-cover" 
                    />
                  ) : profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full bg-yellow-200 flex items-center justify-center">
                      <User size={48} className="text-black" />
                    </div>
                  )}
                </div>
                
                <label className="absolute bottom-0 right-0 bg-green-500 border-3 border-black p-2 cursor-pointer
                  hover:bg-green-600 transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <Camera size={18} className="text-black" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
              
              <h2 className="text-xl font-black">{profile.first_name} {profile.last_name}</h2>
              <p className="text-gray-700 font-bold text-sm">Developer</p>
              {profile.average_rating !== undefined && (
                <div className="flex items-center bg-yellow-300 border-2 border-black px-2 py-1 mt-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <span className="font-black mr-1">{profile.average_rating.toFixed(1)}</span>
                  <span>★</span>
                </div>
              )}
            </div>
            
            <div className="space-y-4 bg-yellow-100 border-3 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)]">
              <div>
                <Label htmlFor="first_name" className="font-bold">First Name</Label>
                <Input 
                  id="first_name" 
                  name="first_name" 
                  value={profile.first_name} 
                  onChange={handleInputChange}
                  className="mt-1 bg-white border-3 border-black"
                />
              </div>
              
              <div>
                <Label htmlFor="last_name" className="font-bold">Last Name</Label>
                <Input 
                  id="last_name" 
                  name="last_name" 
                  value={profile.last_name} 
                  onChange={handleInputChange}
                  className="mt-1 bg-white border-3 border-black"
                />
              </div>
              
              <div>
                <Label htmlFor="email" className="font-bold">Email</Label>
                <Input 
                  id="email" 
                  name="email" 
                  value={profile.email} 
                  disabled
                  className="mt-1 bg-gray-100 border-3 border-black text-gray-500"
                />
                <p className="text-xs font-medium text-gray-700 mt-1">Contact support to change email</p>
              </div>
              
              <div>
                <Label htmlFor="phone" className="font-bold">Phone</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  value={profile.phone} 
                  onChange={handleInputChange}
                  className="mt-1 bg-white border-3 border-black"
                />
              </div>
            </div>
          </Card>
          
          {/* Right column - Skills */}
          <Card className="md:col-span-2 bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-xl font-black mb-4 bg-blue-400 border-3 border-black inline-block px-3 py-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">Your Skills</h3>
            
            <div className="mb-4">
              <Label htmlFor="bio" className="font-bold">Bio</Label>
              <Textarea 
                id="bio" 
                name="bio" 
                value={profile.bio} 
                onChange={handleInputChange}
                placeholder="Tell clients about yourself and your expertise..."
                className="mt-1 min-h-[120px] bg-pink-100 border-3 border-black"
              />
            </div>
            
            <div className="mb-4">
              <Label htmlFor="experience_years" className="font-bold">Years of Experience</Label>
              <Input 
                id="experience_years" 
                name="experience_years" 
                type="number" 
                min="0"
                value={profile.experience_years} 
                onChange={handleNumberChange}
                className="mt-1 bg-white border-3 border-black"
              />
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-cyan-100 border-3 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)]">
                <Label className="font-bold mb-2 block">Skills</Label>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {profile.skills.map((skill, index) => (
                    <Badge 
                      key={index} 
                      className="bg-white border-2 border-black text-black font-bold py-1 px-3 flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="ml-1 bg-red-300 border border-black rounded-full w-4 h-4 flex items-center justify-center"
                      >
                        <X size={10} className="text-black" />
                      </button>
                    </Badge>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a skill"
                    onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                    className="bg-white border-3 border-black"
                  />
                  <Button 
                    onClick={addSkill}
                    disabled={!newSkill.trim()} 
                    className="bg-green-500 hover:bg-green-600 text-black font-bold border-3 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.7)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.7)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all disabled:opacity-50"
                  >
                    Add
                  </Button>
                </div>
              </div>
            
              <div>
                <Label htmlFor="service_radius" className="font-bold">
                  Service Radius (km)
                </Label>
                <Input 
                  id="service_radius" 
                  name="service_radius" 
                  type="number" 
                  min="1" 
                  max="100"
                  value={profile.service_radius} 
                  onChange={handleNumberChange}
                  className="mt-1 bg-white border-3 border-black"
                />
                <p className="text-xs font-medium text-gray-700 mt-1">
                  Maximum distance you're willing to travel to provide services
                </p>
              </div>
              
              <div>
                <Label htmlFor="hourly_rate" className="font-bold">
                  Hourly Rate ($)
                </Label>
                <Input 
                  id="hourly_rate" 
                  name="hourly_rate" 
                  type="number" 
                  min="0" 
                  step="0.01"
                  value={profile.hourly_rate} 
                  onChange={handleNumberChange}
                  className="mt-1 bg-white border-3 border-black"
                />
              </div>
              
              {/* Add manual location picker section */}
              <div className="mt-6">
                <div className="flex items-center mb-2">
                  <MapPin className="h-5 w-5 mr-2 text-black" />
                  <Label className="font-bold text-lg">Your Location</Label>
                </div>
                <p className="mb-4 text-sm text-gray-700">
                  Set your location to help clients find you. You can use your current location or manually select a location on the map.
                </p>
                
                <LocationPicker
                  userId={profile.user_id}
                  autoSave={false}
                  buttonText="Update Location"
                  onLocationSaved={(location, address) => {
                    setProfile(prev => ({
                      ...prev,
                      lat: location.lat,
                      lng: location.lng,
                      address: address
                    }));
                  }}
                />
                
                {profile.address && (
                  <div className="mt-2 p-3 bg-yellow-100 border-2 border-black rounded-md">
                    <p className="font-bold">Current Address:</p>
                    <p className="text-sm text-gray-800">{profile.address}</p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="portfolio_url" className="font-bold">Portfolio URL</Label>
                  <Input 
                    id="portfolio_url" 
                    name="portfolio_url" 
                    value={profile.portfolio_url} 
                    onChange={handleInputChange}
                    className="mt-1 bg-white border-3 border-black"
                    placeholder="https://your-portfolio.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="github_url" className="font-bold">GitHub URL</Label>
                  <Input 
                    id="github_url" 
                    name="github_url" 
                    value={profile.github_url} 
                    onChange={handleInputChange}
                    className="mt-1 bg-white border-3 border-black"
                    placeholder="https://github.com/username"
                  />
                </div>
              </div>
            </div>
            
            {/* Save button */}
            <div className="flex justify-center mt-8">
              <Button 
                onClick={saveProfile} 
                disabled={saving}
                className="bg-black hover:bg-gray-800 text-white font-black border-3 border-black py-6 px-8 text-lg shadow-[5px_5px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] hover:translate-y-[-2px] hover:translate-x-[-2px] transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    SAVING...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    SAVE PROFILE
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DeveloperProfile;
