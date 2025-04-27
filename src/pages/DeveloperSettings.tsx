import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import DeveloperLayout from '@/components/DeveloperLayout';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Save, ShieldAlert, Bell, Moon, Lock, Globe } from 'lucide-react';

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  newRequestAlerts: boolean;
  marketingEmails: boolean;
}

interface AppearanceSettings {
  darkMode: boolean;
  compactView: boolean;
  highContrast: boolean;
}

const DeveloperSettings: React.FC = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    newRequestAlerts: true,
    marketingEmails: false
  });
  
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    darkMode: true,
    compactView: false,
    highContrast: false
  });
  
  const handleNotificationChange = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  const handleAppearanceChange = (key: keyof AppearanceSettings) => {
    setAppearance(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  const handlePasswordChange = async () => {
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(`Failed to update password: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  const saveSettings = () => {
    setSaving(true);
    
    // Simulate saving settings
    setTimeout(() => {
      toast.success('Settings saved successfully');
      setSaving(false);
    }, 1000);
    
    // In a real app, you would save these settings to Supabase
    // For example:
    // await supabase.from('user_settings').upsert({
    //   user_id: userId,
    //   notifications: notifications,
    //   appearance: appearance
    // });
  };
  
  return (
    <DeveloperLayout>
      <div className="min-h-screen bg-[#0E1116] text-white p-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1">Settings</h1>
            <p className="text-gray-400">Manage your account settings and preferences</p>
          </div>
          
          {/* Security Settings */}
          <Card className="bg-[#1A1D24] border-[#2A2D34] text-white p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="text-purple-500" />
              <h2 className="text-lg font-semibold">Security</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-md font-medium mb-3 text-gray-200">Change Password</h3>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="current-password" className="text-sm text-gray-400">Current Password</Label>
                    <Input 
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="mt-1 bg-[#2A2D34] border-[#3A3D44] text-white"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="new-password" className="text-sm text-gray-400">New Password</Label>
                    <Input 
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="mt-1 bg-[#2A2D34] border-[#3A3D44] text-white"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="confirm-password" className="text-sm text-gray-400">Confirm New Password</Label>
                    <Input 
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="mt-1 bg-[#2A2D34] border-[#3A3D44] text-white"
                    />
                  </div>
                  
                  <div>
                    <Button 
                      onClick={handlePasswordChange}
                      disabled={saving}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-[#2A2D34]">
                <h3 className="text-md font-medium mb-4 text-gray-200">Two-Factor Authentication</h3>
                
                <Button className="bg-[#2A2D34] hover:bg-[#3A3D44] text-white">
                  Enable 2FA
                </Button>
                <p className="text-xs text-gray-500 mt-2">Protect your account with an additional security layer</p>
              </div>
            </div>
          </Card>
          
          {/* Notification Settings */}
          <Card className="bg-[#1A1D24] border-[#2A2D34] text-white p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="text-blue-500" />
              <h2 className="text-lg font-semibold">Notifications</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-md font-medium text-gray-200">Email Notifications</h3>
                  <p className="text-sm text-gray-400">Receive emails about your activity</p>
                </div>
                <Switch 
                  checked={notifications.emailNotifications} 
                  onCheckedChange={() => handleNotificationChange('emailNotifications')}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-md font-medium text-gray-200">Push Notifications</h3>
                  <p className="text-sm text-gray-400">Receive notifications in the browser</p>
                </div>
                <Switch 
                  checked={notifications.pushNotifications} 
                  onCheckedChange={() => handleNotificationChange('pushNotifications')}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-md font-medium text-gray-200">New Request Alerts</h3>
                  <p className="text-sm text-gray-400">Get notified when new service requests come in</p>
                </div>
                <Switch 
                  checked={notifications.newRequestAlerts} 
                  onCheckedChange={() => handleNotificationChange('newRequestAlerts')}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-md font-medium text-gray-200">Marketing Emails</h3>
                  <p className="text-sm text-gray-400">Receive tips, product updates and offers</p>
                </div>
                <Switch 
                  checked={notifications.marketingEmails} 
                  onCheckedChange={() => handleNotificationChange('marketingEmails')}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
            </div>
          </Card>
          
          {/* Appearance Settings */}
          <Card className="bg-[#1A1D24] border-[#2A2D34] text-white p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Moon className="text-green-500" />
              <h2 className="text-lg font-semibold">Appearance</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-md font-medium text-gray-200">Dark Mode</h3>
                  <p className="text-sm text-gray-400">Use dark theme</p>
                </div>
                <Switch 
                  checked={appearance.darkMode} 
                  onCheckedChange={() => handleAppearanceChange('darkMode')}
                  className="data-[state=checked]:bg-green-600"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-md font-medium text-gray-200">Compact View</h3>
                  <p className="text-sm text-gray-400">Reduce spacing between elements</p>
                </div>
                <Switch 
                  checked={appearance.compactView} 
                  onCheckedChange={() => handleAppearanceChange('compactView')}
                  className="data-[state=checked]:bg-green-600"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-md font-medium text-gray-200">High Contrast</h3>
                  <p className="text-sm text-gray-400">Increase contrast for better accessibility</p>
                </div>
                <Switch 
                  checked={appearance.highContrast} 
                  onCheckedChange={() => handleAppearanceChange('highContrast')}
                  className="data-[state=checked]:bg-green-600"
                />
              </div>
            </div>
          </Card>
          
          {/* Language & Region */}
          <Card className="bg-[#1A1D24] border-[#2A2D34] text-white p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="text-yellow-500" />
              <h2 className="text-lg font-semibold">Language & Region</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="language" className="text-sm text-gray-400">Language</Label>
                <select 
                  id="language"
                  className="w-full mt-1 py-2 px-3 bg-[#2A2D34] border border-[#3A3D44] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="timezone" className="text-sm text-gray-400">Timezone</Label>
                <select 
                  id="timezone"
                  className="w-full mt-1 py-2 px-3 bg-[#2A2D34] border border-[#3A3D44] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="utc-8">Pacific Time (UTC-8)</option>
                  <option value="utc-5">Eastern Time (UTC-5)</option>
                  <option value="utc+0">Greenwich Mean Time (UTC+0)</option>
                  <option value="utc+1">Central European Time (UTC+1)</option>
                  <option value="utc+2">Eastern European Time (UTC+2)</option>
                  <option value="utc+5:30">Indian Standard Time (UTC+5:30)</option>
                </select>
              </div>
            </div>
          </Card>
          
          {/* Save button */}
          <div className="flex justify-end">
            <Button 
              onClick={saveSettings}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </DeveloperLayout>
  );
};

export default DeveloperSettings;
